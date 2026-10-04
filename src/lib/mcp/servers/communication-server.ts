/**
 * COMMUNICATION DOMAIN MCP SERVER
 *
 * Implements priority tools:
 * 1. make_voice_call (15-second Exotel outbound reminder)
 * 2. get_call_status
 * 3. process_communication_webhook
 */

import { prisma } from "@/lib/db";
import { McpContext, McpToolDefinition, McpToolHandler } from "../types";
import { ExotelAdapter } from "@/lib/integrations/exotel/exotel-adapter";
import { RulesAuthorizer } from "@/lib/rules-engine/rules-authorizer";

export const COMMUNICATION_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "make_voice_call",
    domain: "communication",
    description: "Initiates a 15-second outbound statutory Exotel voice reminder to a debtor.",
    isSideEffecting: true,
    parameters: {
      toPhone: { type: "string", description: "Destination 10-digit Indian mobile number.", required: true },
      debtorName: { type: "string", description: "Target debtor name.", required: true },
      overdueAmount: { type: "number", description: "Overdue principal amount.", required: true },
      overdueDpd: { type: "number", description: "Days past due.", required: true },
      recoveryCaseId: { type: "string", description: "Optional linked recovery case ID.", required: false },
      language: { type: "string", description: "en | hi (default en)", required: false },
    },
  },
  {
    name: "get_call_status",
    domain: "communication",
    description: "Queries real-time carrier status, duration, and recording for an Exotel call.",
    parameters: {
      callSid: { type: "string", description: "Exotel Call SID identifier.", required: true },
    },
  },
  {
    name: "process_communication_webhook",
    domain: "communication",
    description: "Processes an incoming terminal status callback from Exotel carrier infrastructure.",
    isSideEffecting: true,
    parameters: {
      callSid: { type: "string", description: "Exotel Call SID.", required: true },
      status: { type: "string", description: "completed | busy | no-answer | failed", required: true },
      duration: { type: "number", description: "Duration in seconds.", required: false },
      recordingUrl: { type: "string", description: "Recording audio URL.", required: false },
    },
  },
];

export const COMMUNICATION_TOOL_HANDLERS: Record<string, McpToolHandler> = {
  make_voice_call: async (args, context: McpContext) => {
    const { toPhone, debtorName, overdueAmount, overdueDpd, recoveryCaseId, language } = args;

    // 1. Rules Authorizer Guardrail (TRAI Window & Frequency Cap)
    const ruleCheck = await RulesAuthorizer.evaluateVoiceCallPermission(context, toPhone);
    if (!ruleCheck.permitted) {
      throw new Error(`Voice call unauthorized by Rules Engine: [${ruleCheck.ruleCode}] ${ruleCheck.reason}`);
    }

    const tenant = await prisma.company.findUnique({
      where: { id: context.tenantId },
    });

    // 2. Execute via Exotel Adapter
    const callResult = await ExotelAdapter.initiateOutboundReminder({
      toPhone,
      debtorName,
      companyName: tenant?.name || "ChaanBean Client",
      overdueAmount: Number(overdueAmount) || 100000,
      overdueDpd: Number(overdueDpd) || 30,
      language: language === "hi" ? "hi" : "en",
    });

    // 3. Persist in ExotelCallLog
    const callLog = await prisma.exotelCallLog.create({
      data: {
        companyId: context.tenantId,
        recoveryCaseId: recoveryCaseId || null,
        callSid: callResult.callSid,
        toPhone: callResult.toPhone,
        fromPhone: callResult.fromPhone,
        status: callResult.status,
        durationSec: 15,
        exoml: callResult.exoml,
        reminderText: callResult.reminderText,
        aiSummary: `Initiated 15-second statutory voice reminder to ${debtorName} (${toPhone}). Carrier SID: ${callResult.callSid}.`,
        webhookPayload: JSON.stringify(callResult.rawResponse || {}),
      },
    });

    // 4. Record to CaseTimeline
    if (recoveryCaseId) {
      await prisma.caseTimeline.create({
        data: {
          companyId: context.tenantId,
          recoveryCaseId,
          eventType: "EXOTEL_CALL_TRIGGERED",
          actor: "communication_agent",
          title: `15s Voice Reminder Dispatched (${callResult.callSid.substring(0, 14)}...)`,
          description: `Dispatched to ${debtorName} at ${toPhone}. Amount: ₹${Number(overdueAmount).toLocaleString("en-IN")}.`,
          metadata: JSON.stringify({
            callSid: callResult.callSid,
            provider: callResult.provider,
            phone: toPhone,
          }),
        },
      });

      await prisma.recoveryCase.update({
        where: { id: recoveryCaseId },
        data: {
          lastActionType: "exotel_voice_call",
          lastActionAt: new Date(),
        },
      });
    }

    return {
      callSid: callResult.callSid,
      status: callResult.status,
      provider: callResult.provider,
      reminderText: callResult.reminderText,
      callLogId: callLog.id,
    };
  },

  get_call_status: async (args, context: McpContext) => {
    const { callSid } = args;
    const callLog = await prisma.exotelCallLog.findUnique({
      where: { callSid },
      include: { recoveryCase: true },
    });

    if (!callLog) throw new Error(`Call record not found: ${callSid}`);
    if (callLog.companyId !== context.tenantId) throw new Error("Cross-tenant access blocked.");

    return callLog;
  },

  process_communication_webhook: async (args, context: McpContext) => {
    const { callSid, status, duration, recordingUrl } = args;

    const callLog = await prisma.exotelCallLog.findUnique({
      where: { callSid },
    });

    if (!callLog) throw new Error(`Call not found: ${callSid}`);
    if (callLog.companyId !== context.tenantId) throw new Error("Cross-tenant access blocked.");

    const updated = await prisma.exotelCallLog.update({
      where: { id: callLog.id },
      data: {
        status,
        durationSec: Number(duration) || 15,
        recordingUrl: recordingUrl || null,
        completedAt: new Date(),
      },
    });

    if (callLog.recoveryCaseId) {
      await prisma.caseTimeline.create({
        data: {
          companyId: context.tenantId,
          recoveryCaseId: callLog.recoveryCaseId,
          eventType: "EXOTEL_CALL_COMPLETED",
          actor: "exotel_telephony",
          title: `Voice Reminder Finished: ${status.toUpperCase()}`,
          description: `Call duration: ${duration || 15}s. Debtor acknowledged reminder.`,
          metadata: JSON.stringify({ callSid, status, duration }),
        },
      });
    }

    return updated;
  },
};
