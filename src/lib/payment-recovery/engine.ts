import { evaluatePolicy, deliverMessage, type EscalationContext } from "@/lib/policy-engine";
import { prisma } from "@/lib/db";
import { checkCallingWindowAndLimits } from "../communication/calling-window";
import { calculateMSMEPenalInterest } from "../arbitration/interest";

export interface RecoveryTickResult {
  success: boolean;
  creditAccountId: string;
  level: string;
  action: string;
  channel: string;
  contentHash: string;
  ruleId: string;
  explanation: string;
  govReferenceId?: string;
  callStatus?: string;
  audioRef?: string;
  skippedReason?: string;
}

/**
 * Executes a recovery tick for a credit account:
 * 1. Checks calling hours and frequency caps if voice
 * 2. Evaluates Policy Engine (deterministic L1/L2/L3)
 * 3. Delivers via approved per-language template
 * 4. Synthesizes voice via Polly & caches audio in S3 by hash
 * 5. Appends to immutable LegalEvidenceLog
 * 6. Generates LegalNotice with Gov Reference ID or escalates to Arbitration
 */
export async function runRecoveryTick(creditAccountId: string): Promise<RecoveryTickResult> {
  const account = await prisma.creditAccount.findUnique({
    where: { id: creditAccountId },
    include: {
      buyer: true,
      escalationStates: { orderBy: { updatedAt: "desc" }, take: 1 },
      legalNotices: true,
    },
  });

  if (!account) {
    throw new Error(`Credit account ${creditAccountId} not found.`);
  }

  const state = account.escalationStates[0];
  const history = state ? (JSON.parse(state.history) as any[]) : [];
  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - account.dueDate.getTime()) / 86400000)
  );

  const l1Attempts = history.filter((h: any) => h.level === "L1").length;
  const l2Attempts = history.filter((h: any) => h.level === "L2").length;

  const ctx: EscalationContext = {
    currentLevel: (state?.currentLevel as EscalationContext["currentLevel"]) ?? "L1",
    daysOverdue,
    outstandingAmount: account.outstandingAmount,
    l1Attempts,
    l2Attempts,
    legalNoticeSent: account.legalNotices.length > 0,
    language: account.buyer.language || "en",
  };

  const decision = evaluatePolicy(ctx);

  // Calling window and frequency caps verification for voice calls
  if (decision.channel === "voice") {
    const windowCheck = await checkCallingWindowAndLimits(account.buyerId);
    if (!windowCheck.allowed) {
      return {
        success: false,
        creditAccountId,
        level: decision.nextLevel,
        action: "call_skipped_by_policy",
        channel: "voice",
        contentHash: "none",
        ruleId: decision.ruleId,
        explanation: decision.explanation,
        skippedReason: windowCheck.reason,
      };
    }
  }

  // Parse buyer phone number
  let phone = "+919876543210";
  try {
    const mobiles = JSON.parse(account.buyer.mobileNumbers);
    if (Array.isArray(mobiles) && mobiles.length > 0) phone = mobiles[0];
  } catch {
    // fallback
  }

  const delivery = await deliverMessage(
    decision.channel,
    decision.templateId,
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

  const newHistory = [
    ...history,
    {
      level: decision.nextLevel,
      action: decision.action,
      channel: decision.channel,
      ruleId: decision.ruleId,
      explanation: decision.explanation,
      at: new Date().toISOString(),
      contentHash: delivery.contentHash,
      govReferenceId: delivery.govReferenceId,
      audioRef: delivery.audioRef,
    },
  ];

  if (state) {
    await prisma.escalationState.update({
      where: { id: state.id },
      data: {
        currentLevel: decision.nextLevel,
        history: JSON.stringify(newHistory),
        nextActionAt: new Date(Date.now() + decision.scheduledInHours * 3600000),
      },
    });
  } else {
    await prisma.escalationState.create({
      data: {
        creditAccountId,
        currentLevel: decision.nextLevel,
        history: JSON.stringify(newHistory),
        nextActionAt: new Date(Date.now() + decision.scheduledInHours * 3600000),
      },
    });
  }

  // Immutable Legal Evidence Log entry
  await prisma.legalEvidenceLog.create({
    data: {
      relatedEntityType: "credit_account",
      relatedEntityId: creditAccountId,
      channel: decision.channel,
      contentHash: delivery.contentHash,
      metadata: JSON.stringify({
        ruleId: decision.ruleId,
        templateId: decision.templateId,
        level: decision.nextLevel,
        explanation: decision.explanation,
        govReferenceId: delivery.govReferenceId,
        audioRef: delivery.audioRef,
      }),
    },
  });

  // Handle Legal Notice Creation with Gov Reference ID
  if (decision.channel === "legal_notice" && delivery.govReferenceId) {
    await prisma.legalNotice.create({
      data: {
        creditAccountId,
        templateId: decision.templateId,
        channel: "registered_post_email",
        govReferenceId: delivery.govReferenceId,
        contentHash: delivery.contentHash,
        status: "served",
      },
    });
  }

  // Handle Arbitration Case Creation with MSME Statutory Penal Interest
  if (decision.channel === "arbitration") {
    const existing = await prisma.arbitrationCase.findFirst({
      where: { creditAccountId, status: { in: ["open", "hearing_scheduled", "settlement_pending"] } },
    });

    if (!existing) {
      const interest = calculateMSMEPenalInterest(account.outstandingAmount, account.dueDate);
      await prisma.arbitrationCase.create({
        data: {
          creditAccountId,
          status: "open",
          assignedLegalOwner: "Adv. Rajesh Nair (ChaanBean Legal Desk)",
          claimantName: "Acme Traders Pvt Ltd",
          respondentName: account.buyer.name,
          principalAmount: account.outstandingAmount,
          penalInterestRate: interest.statutoryRatePercent,
          accruedInterest: interest.accruedInterest,
          totalClaimAmount: interest.totalPayable,
          statutoryBasis: interest.statutorySection,
          eSignStatus: "pending",
        },
      });
    }
  }

  return {
    success: true,
    creditAccountId,
    level: decision.nextLevel,
    action: decision.action,
    channel: decision.channel,
    contentHash: delivery.contentHash,
    ruleId: decision.ruleId,
    explanation: decision.explanation,
    govReferenceId: delivery.govReferenceId,
    callStatus: (delivery.details as any)?.status,
    audioRef: delivery.audioRef,
  };
}

export async function scheduleCampaignCalls(campaignId: string): Promise<number> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return 0;

  const buyerIds = JSON.parse(campaign.targetBuyers) as string[];
  let scheduled = 0;

  for (const buyerId of buyerIds) {
    await prisma.call.create({
      data: {
        campaignId,
        buyerId,
        scheduledAt: new Date(Date.now() + scheduled * 3600000),
        status: "scheduled",
      },
    });
    scheduled++;
  }

  return scheduled;
}
