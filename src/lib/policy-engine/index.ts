import { prisma } from "@/lib/db";
import crypto from "crypto";
import { getOrSynthesizePollyAudio } from "../communication/polly-s3";
import { placeOutboundPlaybackCall } from "../communication/asterisk-vobiz";
import { sendEmailReminder, sendWhatsAppMessage, sendSmsReminder } from "../communication/channels";
import { generateGovReferenceId } from "../verification-gateway/clients";

export type EscalationLevel = "L1" | "L2" | "L3";

export interface EscalationContext {
  currentLevel: EscalationLevel;
  daysOverdue: number;
  outstandingAmount: number;
  l1Attempts: number;
  l2Attempts: number;
  lastResponseAt?: Date | null;
  legalNoticeSent: boolean;
  language: string; // en, hi, ml, ta, te, kn, tu
}

export interface PolicyDecision {
  nextLevel: EscalationLevel;
  action: string;
  channel: "voice" | "whatsapp" | "email" | "sms" | "legal_notice" | "arbitration";
  templateId: string;
  scheduledInHours: number;
  ruleId: string;
  explanation: string;
}

/**
 * Deterministic L1/L2/L3 Policy Engine — NEVER uses an LLM for escalation level decisions.
 */
export function evaluatePolicy(ctx: EscalationContext): PolicyDecision {
  const { daysOverdue, outstandingAmount, l1Attempts, l2Attempts, legalNoticeSent } = ctx;

  // L3: Legal demand notice / Arbitration path (Overdue >= 60 days with exhausted L2, or Overdue >= 90 days)
  if (daysOverdue >= 90 || (daysOverdue >= 60 && l2Attempts >= 3)) {
    if (!legalNoticeSent) {
      return {
        nextLevel: "L3",
        action: "send_legal_notice",
        channel: "legal_notice",
        templateId: "legal_notice_demand_v1",
        scheduledInHours: 0,
        ruleId: "POL-L3-NOTICE-001",
        explanation: `${daysOverdue} days overdue — L3 Statutory Demand Notice required per policy.`,
      };
    }
    return {
      nextLevel: "L3",
      action: "escalate_arbitration",
      channel: "arbitration",
      templateId: "arbitration_intake_v1",
      scheduledInHours: 48,
      ruleId: "POL-L3-ARB-001",
      explanation: "Legal notice sent without dispute resolution — route to in-house Arbitration Center.",
    };
  }

  // L2: Firm reminders multi-channel including Outbound Voice (Overdue >= 30 days or L1 attempts >= 4)
  if (daysOverdue >= 30 || l1Attempts >= 4) {
    // Channel rotation: Voice -> WhatsApp -> Email
    const channels: ("voice" | "whatsapp" | "email" | "sms")[] = ["voice", "whatsapp", "email", "sms"];
    const channel = channels[l2Attempts % channels.length];

    return {
      nextLevel: "L2",
      action: "firm_reminder",
      channel,
      templateId: `l2_${channel}_reminder_v1`,
      scheduledInHours: 48,
      ruleId: "POL-L2-001",
      explanation: `Day ${daysOverdue} overdue, L1 exhausted (${l1Attempts} attempts) — Escalate to L2 ${channel}.`,
    };
  }

  // L1: Polite reminders via WhatsApp, SMS, or Email
  const l1Channels: ("whatsapp" | "email" | "sms")[] = ["whatsapp", "email", "sms"];
  const l1Channel = l1Channels[l1Attempts % l1Channels.length];

  return {
    nextLevel: "L1",
    action: "polite_reminder",
    channel: l1Channel,
    templateId: `l1_${l1Channel}_reminder_v1`,
    scheduledInHours: outstandingAmount > 500000 ? 24 : 72,
    ruleId: "POL-L1-001",
    explanation: `Day ${daysOverdue} overdue — L1 ${l1Channel} polite reminder (attempt ${l1Attempts + 1}).`,
  };
}

export interface DeliveryResult {
  success: boolean;
  channel: string;
  contentHash: string;
  deliveredAt: string;
  audioRef?: string;
  govReferenceId?: string;
  messageId?: string;
  details?: Record<string, unknown>;
}

/**
 * Executes delivery across the selected communication channel with template translations.
 */
export async function deliverMessage(
  channel: PolicyDecision["channel"],
  templateId: string,
  buyer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    language: string;
  },
  account: {
    id: string;
    amount: number;
    dueDate: Date | string;
  }
): Promise<DeliveryResult> {
  const lang = buyer.language || "en";

  // 1. Fetch pre-approved template translation from database
  let translation = await prisma.templateTranslation.findUnique({
    where: { templateId_languageCode: { templateId, languageCode: lang } },
  });

  // Fallback to English if translation is missing
  if (!translation) {
    translation = await prisma.templateTranslation.findUnique({
      where: { templateId_languageCode: { templateId, languageCode: "en" } },
    });
  }

  // Safety check: L3 templates MUST be pre-approved in DB
  if (templateId.includes("l3") || templateId.includes("legal_notice")) {
    if (!translation || !translation.isApproved) {
      throw new Error(`Execution blocked: Template ${templateId} (${lang}) is not pre-approved by Legal Desk.`);
    }
  }

  // 2. Populate template placeholders
  const dueDateStr = new Date(account.dueDate).toLocaleDateString("en-IN");
  const amountFormatted = `₹${account.amount.toLocaleString("en-IN")}`;
  let bodyText = translation?.bodyTemplate || "Payment reminder: Your account has an overdue balance.";
  bodyText = bodyText
    .replace(/\{\{buyerName\}\}/g, buyer.name)
    .replace(/\{\{amount\}\}/g, amountFormatted)
    .replace(/\{\{dueDate\}\}/g, dueDateStr);

  const subject = (translation?.subject || "Urgent Payment Notice")
    .replace(/\{\{buyerName\}\}/g, buyer.name)
    .replace(/\{\{amount\}\}/g, amountFormatted);

  const contentHash = crypto.createHash("sha256").update(`${templateId}:${lang}:${bodyText}`).digest("hex");

  // 3. Dispatch to channel
  if (channel === "voice") {
    // Amazon Polly TTS -> S3 Audio Cache -> Asterisk / Vobiz SIP Outbound Call
    const audio = await getOrSynthesizePollyAudio(bodyText, lang, templateId);
    const callResult = await placeOutboundPlaybackCall({
      buyerId: buyer.id,
      phoneNumber: buyer.phone,
      audioUrl: audio.s3Url,
      contentHash,
      templateId,
      language: lang,
      scriptText: bodyText,
    });

    return {
      success: callResult.status !== "failed",
      channel: "voice",
      contentHash,
      deliveredAt: callResult.executedAt,
      audioRef: audio.s3Url,
      messageId: callResult.callId,
      details: { ...callResult, cacheHit: audio.cacheHit },
    };
  }

  if (channel === "whatsapp") {
    const wa = await sendWhatsAppMessage(buyer.phone, templateId, [buyer.name, amountFormatted, dueDateStr], account.id);
    return {
      success: wa.success,
      channel: "whatsapp",
      contentHash,
      deliveredAt: wa.deliveredAt,
      messageId: wa.messageId,
      details: wa.gatewayResponse,
    };
  }

  if (channel === "email") {
    const emailRes = await sendEmailReminder(buyer.email || "accounts@debtor.in", subject, bodyText, templateId, account.id);
    return {
      success: emailRes.success,
      channel: "email",
      contentHash,
      deliveredAt: emailRes.deliveredAt,
      messageId: emailRes.messageId,
      details: emailRes.gatewayResponse,
    };
  }

  if (channel === "sms") {
    const dltId = "DLT-TX-1002934";
    const smsRes = await sendSmsReminder(buyer.phone, dltId, bodyText, account.id);
    return {
      success: smsRes.success,
      channel: "sms",
      contentHash,
      deliveredAt: smsRes.deliveredAt,
      messageId: smsRes.messageId,
      details: smsRes.gatewayResponse,
    };
  }

  if (channel === "legal_notice") {
    // Auto-cross-reference Income Tax & GST portal reference ID
    const govRef = await generateGovReferenceId(buyer.name, contentHash);
    return {
      success: true,
      channel: "legal_notice",
      contentHash,
      deliveredAt: govRef.acknowledgedAt,
      govReferenceId: govRef.govReferenceId,
      details: govRef,
    };
  }

  // Arbitration intake channel
  return {
    success: true,
    channel: "arbitration",
    contentHash,
    deliveredAt: new Date().toISOString(),
  };
}
