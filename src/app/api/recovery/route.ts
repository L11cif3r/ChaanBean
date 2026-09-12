import { NextResponse } from "next/server";
import { runRecoveryTick } from "@/lib/payment-recovery/engine";
import { prisma } from "@/lib/db";
import { deliverMessage } from "@/lib/policy-engine";
import { calculateMSMEPenalInterest } from "@/lib/arbitration/interest";
import { getOrSynthesizePollyAudio } from "@/lib/communication/polly-s3";
import { placeOutboundPlaybackCall } from "@/lib/communication/asterisk-vobiz";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creditAccountId = searchParams.get("creditAccountId");

  if (!creditAccountId) {
    const accounts = await prisma.creditAccount.findMany({
      include: {
        buyer: true,
        escalationStates: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json({ accounts });
  }

  const account = await prisma.creditAccount.findUnique({
    where: { id: creditAccountId },
    include: {
      buyer: true,
      escalationStates: { orderBy: { updatedAt: "desc" }, take: 1 },
      legalNotices: { orderBy: { sentAt: "desc" } },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  }

  const lang = account.buyer.language || "en";
  const templateId = "l2_voice_reminder_v1";

  // Fetch pre-approved template for voice announcement
  let translation = await prisma.templateTranslation.findUnique({
    where: { templateId_languageCode: { templateId, languageCode: lang } },
  });

  if (!translation) {
    translation = await prisma.templateTranslation.findUnique({
      where: { templateId_languageCode: { templateId, languageCode: "en" } },
    });
  }

  const dueDateStr = new Date(account.dueDate).toLocaleDateString("en-IN");
  const amountFormatted = `₹${account.outstandingAmount.toLocaleString("en-IN")}`;
  let scriptText = translation?.bodyTemplate || "Immediate payment required for your overdue account.";
  scriptText = scriptText
    .replace(/\{\{buyerName\}\}/g, account.buyer.name)
    .replace(/\{\{amount\}\}/g, amountFormatted)
    .replace(/\{\{dueDate\}\}/g, dueDateStr);

  // Compute audio asset hash & URL
  const audio = await getOrSynthesizePollyAudio(scriptText, lang, templateId);

  // Calculate MSMED Act §16 statutory penal interest
  const interest = calculateMSMEPenalInterest(account.outstandingAmount, account.dueDate);

  // Parse phone
  let phone = "+919876543210";
  try {
    const mobiles = JSON.parse(account.buyer.mobileNumbers);
    if (Array.isArray(mobiles) && mobiles.length > 0) phone = mobiles[0];
  } catch {
    // fallback
  }

  return NextResponse.json({
    account: {
      id: account.id,
      buyerId: account.buyerId,
      buyerName: account.buyer.name,
      phone,
      email: account.buyer.email,
      language: lang,
      outstandingAmount: account.outstandingAmount,
      dueDate: account.dueDate,
      status: account.overdueStatus,
      currentLevel: account.escalationStates[0]?.currentLevel || "L1",
    },
    statutoryInterest: interest,
    voiceCall: {
      templateId,
      language: lang,
      scriptText,
      audioUrl: audio.s3Url,
      contentHash: audio.contentHash,
      voiceConfig: audio.voiceConfig,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      creditAccountId,
      action = "tick",
      callerDid,
      simulateOutcome,
      targetPhone,
    } = body as {
      creditAccountId: string;
      action?: "tick" | "legal_notice" | "direct_voice_call" | "settle_payment";
      paymentAmount?: number;
      paymentMode?: string;
      utrNumber?: string;
      callerDid?: string;
      simulateOutcome?: "connected" | "busy" | "unreachable" | "no_answer";
      targetPhone?: string;
    };

    if (!creditAccountId) {
      return NextResponse.json({ error: "creditAccountId required" }, { status: 400 });
    }

    const account = await prisma.creditAccount.findUnique({
      where: { id: creditAccountId },
      include: { buyer: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
    }

    let phone = targetPhone || "+919876543210";
    if (!targetPhone) {
      try {
        const mobiles = JSON.parse(account.buyer.mobileNumbers);
        if (Array.isArray(mobiles) && mobiles.length > 0) phone = mobiles[0];
      } catch {
        // fallback
      }
    }

    // 1. Direct Voice Outbound Call Execution
    if (action === "direct_voice_call") {
      const lang = account.buyer.language || "en";
      const templateId = "l2_voice_reminder_v1";

      let translation = await prisma.templateTranslation.findUnique({
        where: { templateId_languageCode: { templateId, languageCode: lang } },
      });

      if (!translation) {
        translation = await prisma.templateTranslation.findUnique({
          where: { templateId_languageCode: { templateId, languageCode: "en" } },
        });
      }

      const dueDateStr = new Date(account.dueDate).toLocaleDateString("en-IN");
      const amountFormatted = `₹${account.outstandingAmount.toLocaleString("en-IN")}`;
      let scriptText = translation?.bodyTemplate || "Payment reminder: Your account has an overdue balance.";
      scriptText = scriptText
        .replace(/\{\{buyerName\}\}/g, account.buyer.name)
        .replace(/\{\{amount\}\}/g, amountFormatted)
        .replace(/\{\{dueDate\}\}/g, dueDateStr);

      const contentHash = crypto
        .createHash("sha256")
        .update(`${templateId}:${lang}:${scriptText}`)
        .digest("hex");

      const audio = await getOrSynthesizePollyAudio(scriptText, lang, templateId);

      const callResult = await placeOutboundPlaybackCall({
        buyerId: account.buyer.id,
        phoneNumber: phone,
        audioUrl: audio.s3Url,
        contentHash,
        templateId,
        language: lang,
        scriptText,
        callerDid,
        simulateOutcome,
      });

      // Update escalation state to L2
      const state = await prisma.escalationState.findFirst({
        where: { creditAccountId },
        orderBy: { updatedAt: "desc" },
      });

      const historyEntry = {
        level: "L2",
        action: "direct_voice_announcement",
        channel: "voice",
        ruleId: "POL-L2-MANUAL",
        explanation: `Manual one-way voice recovery call executed via Asterisk PBX / Vobiz SIP Trunk (${callResult.sipSessionId}).`,
        at: new Date().toISOString(),
        contentHash,
        audioRef: audio.s3Url,
        callStatus: callResult.status,
        durationSec: callResult.durationSec,
      };

      if (state) {
        const history = JSON.parse(state.history || "[]");
        history.push(historyEntry);
        await prisma.escalationState.update({
          where: { id: state.id },
          data: {
            currentLevel: "L2",
            history: JSON.stringify(history),
            nextActionAt: new Date(Date.now() + 48 * 3600000),
          },
        });
      } else {
        await prisma.escalationState.create({
          data: {
            creditAccountId,
            currentLevel: "L2",
            history: JSON.stringify([historyEntry]),
            nextActionAt: new Date(Date.now() + 48 * 3600000),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `One-way call connected (${callResult.status}) · Duration: ${callResult.durationSec}s · SIP Session: ${callResult.sipSessionId}`,
        callResult,
        scriptText,
        audioUrl: audio.s3Url,
        contentHash,
      });
    }

    // 2. Legal Demand Notice
    if (action === "legal_notice") {
      const delivery = await deliverMessage(
        "legal_notice",
        "legal_notice_demand_v1",
        {
          id: account.buyer.id,
          name: account.buyer.name,
          phone,
          email: account.buyer.email ?? "accounts@debtor.in",
          language: account.buyer.language || "en",
        },
        {
          id: account.id,
          amount: account.outstandingAmount,
          dueDate: account.dueDate,
        }
      );

      const notice = await prisma.legalNotice.create({
        data: {
          creditAccountId,
          templateId: "legal_notice_demand_v1",
          channel: "registered_post_email",
          govReferenceId: delivery.govReferenceId,
          contentHash: delivery.contentHash,
          status: "served",
        },
      });

      await prisma.legalEvidenceLog.create({
        data: {
          relatedEntityType: "legal_notice",
          relatedEntityId: notice.id,
          channel: "legal_notice",
          contentHash: delivery.contentHash,
          metadata: JSON.stringify({
            manual: true,
            govReferenceId: delivery.govReferenceId,
            details: delivery.details,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Legal demand notice issued · Gov Ref ID: ${delivery.govReferenceId}`,
        govReferenceId: delivery.govReferenceId,
        contentHash: delivery.contentHash,
      });
    }

    // 3. Default Recovery Tick
    const result = await runRecoveryTick(creditAccountId);
    return NextResponse.json({
      success: true,
      message: `Recovery tick executed · ${result.action} via ${result.channel} (${result.level})`,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recovery execution error" },
      { status: 500 }
    );
  }
}
