import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ExotelAdapter, ExotelWebhookPayload } from "@/lib/integrations/exotel/exotel-adapter";
import { RulesAuthorizer } from "@/lib/rules-engine/rules-authorizer";

/**
 * EXOTEL WEBHOOK HANDLER
 *
 * Receives Exotel terminal status callbacks, updates call telemetry,
 * appends to recovery timeline, and triggers next action evaluation.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let payload: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((val, key) => {
        payload[key] = typeof val === "string" ? val : val.name;
      });
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        params.forEach((val, key) => {
          payload[key] = val;
        });
      }
    }

    const tokenHeader = req.headers.get("x-exotel-token") || req.nextUrl.searchParams.get("token");
    if (!ExotelAdapter.verifyWebhookSignature(tokenHeader)) {
      return NextResponse.json({ error: "Unauthorized webhook signature." }, { status: 401 });
    }

    const callSid = String(payload.CallSid || payload.sid || req.nextUrl.searchParams.get("CallSid") || "");
    const status = String(payload.Status || payload.status || "completed").toLowerCase() as ExotelWebhookPayload["Status"];
    const duration = parseInt(String(payload.Duration || payload.DialCallDuration || payload.duration || "15"), 10) || 15;
    const recordingUrl = payload.RecordingUrl ? String(payload.RecordingUrl) : undefined;

    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid in callback." }, { status: 400 });
    }

    // 1. Locate call record in database
    const callLog = await prisma.exotelCallLog.findUnique({
      where: { callSid },
      include: { recoveryCase: true },
    });

    if (!callLog) {
      console.warn(`[Exotel Webhook] No existing CallLog found for CallSid: ${callSid}`);
      return NextResponse.json({ received: true, note: "Call record not matched" }, { status: 200 });
    }

    // Check if terminal callback already processed (Idempotency protection against webhook replays)
    if (callLog.status === status && callLog.completedAt) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        callSid,
        updatedStatus: status,
        callLogId: callLog.id,
      });
    }

    // 2. Formulate AI Summary of call outcome
    let aiSummary = "";
    if (status === "completed") {
      aiSummary = `15-second statutory voice reminder successfully delivered to debtor (${callLog.toPhone}). Duration: ${duration}s. Reminder audio completed.`;
    } else if (status === "busy") {
      aiSummary = `Debtor line was busy at ${callLog.toPhone}. Scheduled for retry per TRAI window and spacing rules.`;
    } else if (status === "no-answer") {
      aiSummary = `Debtor did not answer call at ${callLog.toPhone}. Escalation cadence prompted.`;
    } else {
      aiSummary = `Telephony carrier returned status "${status}" for debtor line ${callLog.toPhone}.`;
    }

    // 3. Update CallLog
    const updatedCallLog = await prisma.exotelCallLog.update({
      where: { id: callLog.id },
      data: {
        status,
        durationSec: duration,
        recordingUrl,
        aiSummary,
        webhookPayload: JSON.stringify(payload),
        completedAt: new Date(),
      },
    });

    // 4. Update RecoveryCase and Timeline if linked
    if (callLog.recoveryCaseId) {
      await prisma.caseTimeline.create({
        data: {
          companyId: callLog.companyId,
          recoveryCaseId: callLog.recoveryCaseId,
          eventType: "EXOTEL_CALL_COMPLETED",
          actor: "exotel_telephony",
          title: `Voice Reminder ${status.toUpperCase()} (${duration}s)`,
          description: aiSummary,
          metadata: JSON.stringify({
            callSid,
            duration,
            status,
            recordingUrl,
            phone: callLog.toPhone,
          }),
        },
      });

      // Update case metadata
      await prisma.recoveryCase.update({
        where: { id: callLog.recoveryCaseId },
        data: {
          lastActionType: "exotel_voice_call",
          lastActionAt: new Date(),
        },
      });

      // 5. Evaluate next approved recovery action via Rules Engine
      const nextAction = await RulesAuthorizer.determineNextRecoveryAction(
        { tenantId: callLog.companyId },
        callLog.recoveryCaseId
      );

      await prisma.recoveryCase.update({
        where: { id: callLog.recoveryCaseId },
        data: {
          nextActionType: nextAction.actionType,
        },
      });
    }

    return NextResponse.json({
      success: true,
      callSid,
      updatedStatus: status,
      callLogId: updatedCallLog.id,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown webhook error";
    console.error("[Exotel Webhook Exception]", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Exotel also uses GET requests for URL-based callbacks
  return POST(req);
}
