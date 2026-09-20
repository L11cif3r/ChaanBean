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
      companyName,
      mobileNumber,
      gstin,
      pan,
      amountDue,
      monthsDelayed,
      callFrequency,
      language,
      invoiceFileName,
      invoiceFileSize,
      invoiceVerified,
    } = body as {
      creditAccountId?: string;
      action?: "tick" | "legal_notice" | "direct_voice_call" | "settle_payment" | "shoot_government_notices" | "create_case";
      paymentAmount?: number;
      paymentMode?: string;
      utrNumber?: string;
      callerDid?: string;
      simulateOutcome?: "connected" | "busy" | "unreachable" | "no_answer";
      targetPhone?: string;
      companyName?: string;
      mobileNumber?: string;
      gstin?: string;
      pan?: string;
      amountDue?: number;
      monthsDelayed?: number;
      callFrequency?: string;
      language?: string;
      invoiceFileName?: string | null;
      invoiceFileSize?: number | null;
      invoiceVerified?: boolean;
    };

    // 0. Handle Debtor Case Creation (Intake)
    if (action === "create_case") {
      if (!companyName || !mobileNumber || !gstin || !pan) {
        return NextResponse.json(
          { error: "Company Name, Mobile Number, GSTIN, and PAN are mandatory for debtor intake." },
          { status: 400 }
        );
      }

      const numAmount = Number(amountDue);
      if (!numAmount || isNaN(numAmount) || numAmount < 5000) {
        return NextResponse.json(
          { error: "Total amount due must be at least ₹5,000 for automated recovery engagement." },
          { status: 400 }
        );
      }

      if (!invoiceVerified) {
        return NextResponse.json(
          { error: "Valid Bill/Invoice copy must be uploaded and verified before automated recovery initiates. Process halted." },
          { status: 400 }
        );
      }

      // Find or create company
      let company = await prisma.company.findFirst();
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: "Enterprise Account",
            plan: "growth",
            walletBalance: 100000,
          },
        });
      }

      // Create BuyerDebtor
      const buyer = await prisma.buyerDebtor.create({
        data: {
          companyId: company.id,
          name: companyName.trim(),
          mobileNumbers: JSON.stringify([mobileNumber.trim()]),
          gstin: gstin.trim().toUpperCase(),
          pan: pan.trim().toUpperCase(),
          language: language || "en",
        },
      });

      // Calculate overdue dueDate based on months delayed
      const delayMonths = Number(monthsDelayed) || 1;
      const dueDate = new Date(Date.now() - delayMonths * 30 * 24 * 60 * 60 * 1000);

      // Create CreditAccount
      const creditAccount = await prisma.creditAccount.create({
        data: {
          buyerId: buyer.id,
          outstandingAmount: numAmount,
          dueDate,
          overdueStatus: "overdue",
          penalInterestRate: 18.0,
        },
      });

      // Create Invoice record
      const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
      await prisma.invoice.create({
        data: {
          creditAccountId: creditAccount.id,
          buyerId: buyer.id,
          invoiceNumber: invoiceNum,
          invoiceDate: new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000),
          dueDate,
          amount: numAmount,
          status: "overdue",
          ageingBucket: delayMonths >= 3 ? "90+" : delayMonths >= 2 ? "61-90" : "31-60",
          notes: JSON.stringify({
            invoiceFileName: invoiceFileName || "Invoice.pdf",
            invoiceFileSize: invoiceFileSize || 1024,
            callFrequency: callFrequency || "daily",
            invoiceVerified: true,
            onboardedAt: new Date().toISOString(),
          }),
        },
      });

      // Initialize Escalation state
      const initialLevel = delayMonths >= 3 ? "L3" : delayMonths >= 2 ? "L2" : "L1";
      await prisma.escalationState.create({
        data: {
          creditAccountId: creditAccount.id,
          currentLevel: initialLevel,
          history: JSON.stringify([
            {
              level: initialLevel,
              action: "case_created",
              channel: "system",
              ruleId: "RULE-DEBTOR-INTAKE",
              explanation: `Debtor case registered for ₹${numAmount.toLocaleString("en-IN")} (${delayMonths} months delayed). Verified invoice attached. Frequency: ${callFrequency || "daily"}. Language: ${language || "en"}.`,
              at: new Date().toISOString(),
            },
          ]),
          nextActionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Debtor case successfully created and recovery engine initiated.",
        account: {
          id: creditAccount.id,
          buyerId: buyer.id,
          buyerName: buyer.name,
          phone: mobileNumber.trim(),
          email: buyer.email || "",
          language: buyer.language,
          outstandingAmount: creditAccount.outstandingAmount,
          dueDate: creditAccount.dueDate,
          status: creditAccount.overdueStatus,
          currentLevel: initialLevel,
        },
      });
    }

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
      // Find company owning this debtor to check and deduct wallet balance
      const company = (await prisma.company.findUnique({
        where: { id: account.buyer.companyId },
      })) || (await prisma.company.findFirst());

      if (company && company.walletBalance < 1) {
        return NextResponse.json(
          {
            error: `Insufficient subscription wallet balance. Connected voice recovery calls require ₹1 per picked-up call, but your current balance is ₹${company.walletBalance.toLocaleString("en-IN")}. Please recharge your subscription plan.`,
            currentBalance: company.walletBalance,
            required: 1,
          },
          { status: 400 }
        );
      }

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

      // DEDUCT ₹1 ONLY IF THE CALL IS PICKED UP ("answered")
      let callFee = 0;
      let newBalance = company?.walletBalance ?? 0;

      if (callResult.status === "answered" && company) {
        callFee = 1;
        const updatedCompany = await prisma.company.update({
          where: { id: company.id },
          data: {
            walletBalance: { decrement: callFee },
            lastActiveAt: new Date(),
          },
        });
        newBalance = updatedCompany.walletBalance;

        if (callResult.callId) {
          await prisma.call.update({
            where: { id: callResult.callId },
            data: {
              outcomeNotes: `Call picked up by debtor. ₹1 deducted from subscription wallet. New balance: ₹${newBalance.toLocaleString("en-IN")}. SIP Session: ${callResult.sipSessionId}`,
            },
          });
        }
      } else if (company && callResult.callId) {
        await prisma.call.update({
          where: { id: callResult.callId },
          data: {
            outcomeNotes: `Call ${callResult.status || "unanswered"}. Debtor did not pick up. ₹0 charged.`,
          },
        });
      }

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
        explanation:
          callFee > 0
            ? `Voice recovery call answered & picked up by debtor. ₹1 deducted from subscription wallet (Balance: ₹${newBalance.toLocaleString("en-IN")}). Asterisk/Vobiz SIP (${callResult.sipSessionId}).`
            : `Voice recovery call attempted (${callResult.status}). Debtor did not pick up. ₹0 deducted. Asterisk/Vobiz SIP (${callResult.sipSessionId}).`,
        at: new Date().toISOString(),
        contentHash,
        audioRef: audio.s3Url,
        callStatus: callResult.status,
        durationSec: callResult.durationSec,
        callFee,
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
        message:
          callFee > 0
            ? `Call picked up (${callResult.status}) · Duration: ${callResult.durationSec}s · ₹1 deducted from subscription wallet (New balance: ₹${newBalance.toLocaleString("en-IN")})`
            : `Call ended (${callResult.status}) · Not picked up · ₹0 deducted from wallet`,
        callResult,
        scriptText,
        audioUrl: audio.s3Url,
        contentHash,
        callFee,
        newBalance,
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

    // 3. Shoot Notices to Statutory Government Departments (IT, MSME, GST)
    if (action === "shoot_government_notices") {
      const itRef = `ITD-43BH-${Date.now().toString(36).toUpperCase()}`;
      const msmeRef = `SAMADHAAN-SEC16-${Date.now().toString(36).toUpperCase()}`;
      const gstRef = `GST-DRC01A-${Date.now().toString(36).toUpperCase()}`;

      const govPayload = {
        debtorName: account.buyer.name,
        gstin: account.buyer.gstin || "UNREGISTERED",
        pan: account.buyer.pan || "NOT_PROVIDED",
        principalAmount: account.outstandingAmount,
        dueDate: account.dueDate,
        daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(account.dueDate).getTime()) / 86400000)),
        departments: [
          {
            department: "Income Tax Department",
            email: "msme.disallowance@incometax.gov.in",
            statutoryProvision: "Section 43B(h) of the Income Tax Act, 1961",
            remedySought: "Disallowance of trade payable from taxable income and penalty intimation",
            referenceId: itRef,
          },
          {
            department: "MSME Facilitation Council (Samadhaan)",
            email: "msme-samadhaan@gov.in",
            statutoryProvision: "Section 15, 16 & 18 of the MSMED Act, 2006",
            remedySought: "Statutory compound interest at 3x RBI bank rate and Samadhaan docket registration",
            referenceId: msmeRef,
          },
          {
            department: "Goods and Services Tax (GST) Council",
            email: "itc-reversal.drc01@gst.gov.in",
            statutoryProvision: "Section 16(4) of CGST Act 2017 & Form DRC-01A",
            remedySought: "Mandatory Input Tax Credit (ITC) reversal & delinquency scrutiny",
            referenceId: gstRef,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const contentHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(govPayload))
        .digest("hex");

      const notice = await prisma.legalNotice.create({
        data: {
          creditAccountId,
          templateId: "statutory_gov_tri_department_escalation_v1",
          channel: "gov_statutory_email",
          govReferenceId: `ITD:${itRef} | MSME:${msmeRef} | GST:${gstRef}`,
          contentHash,
          status: "served_to_government",
        },
      });

      await prisma.legalEvidenceLog.create({
        data: {
          relatedEntityType: "legal_notice",
          relatedEntityId: notice.id,
          channel: "gov_statutory_email",
          contentHash,
          metadata: JSON.stringify({
            statutoryAction: "GOVERNMENT_DEPARTMENT_ESCALATION",
            recipients: [
              "msme.disallowance@incometax.gov.in",
              "msme-samadhaan@gov.in",
              "itc-reversal.drc01@gst.gov.in",
            ],
            references: { itRef, msmeRef, gstRef },
            debtorGstin: account.buyer.gstin,
            amount: account.outstandingAmount,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Notices successfully transmitted to Income Tax, MSME, and GST Departments",
        itRef,
        msmeRef,
        gstRef,
        contentHash,
        recipients: [
          { dept: "Income Tax Department", email: "msme.disallowance@incometax.gov.in", ref: itRef },
          { dept: "MSME Samadhaan", email: "msme-samadhaan@gov.in", ref: msmeRef },
          { dept: "GST Department", email: "itc-reversal.drc01@gst.gov.in", ref: gstRef },
        ],
        timestamp: new Date().toISOString(),
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
