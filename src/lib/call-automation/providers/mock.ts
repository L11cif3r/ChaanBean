// SIMULATED provider for local development and tests. It never contacts a telephony network.
// Outcome is deterministic from the last digit of the number and encoded in the call id, so status lookups are
// stateless and survive restarts:
//   0-4 answered+completed | 5-6 no answer | 7 busy | 8 accepted then failed | 9 rejected at request time

import type { AttemptStatus } from "../status";
import type { CallRequest, CallResult, CallStatusResult, VoiceProvider } from "./types";

type Outcome = "completed" | "noanswer" | "busy" | "failed";

function outcomeFor(phone: string): Outcome | "reject" {
  const d = Number(phone.slice(-1));
  if (d <= 4) return "completed";
  if (d <= 6) return "noanswer";
  if (d === 7) return "busy";
  if (d === 8) return "failed";
  return "reject";
}

const TO_STATUS: Record<Outcome, AttemptStatus> = {
  completed: "COMPLETED",
  noanswer: "NO_ANSWER",
  busy: "BUSY",
  failed: "FAILED",
};

export const mockProvider: VoiceProvider = {
  name: "MOCK",
  isReady: () => ({ ready: true }),

  async initiateCall(req: CallRequest): Promise<CallResult> {
    const outcome = outcomeFor(req.toPhone);
    if (outcome === "reject") return { accepted: false, failureReason: "MOCK_PROVIDER_REJECTED" };
    const providerCallId = `mock_${outcome}_${req.attemptId}`;
    if (req.callbackUrl && process.env.CALL_MOCK_SEND_CALLBACKS === "1" && process.env.NODE_ENV !== "production") {
      emitCallbacks(req.callbackUrl, providerCallId, req.attemptId, outcome);
    }
    return { accepted: true, providerCallId };
  },

  async getCallStatus(providerCallId: string): Promise<CallStatusResult | null> {
    const m = /^mock_(completed|noanswer|busy|failed)_/.exec(providerCallId);
    if (!m) return null;
    const o = m[1] as Outcome;
    return { status: TO_STATUS[o], durationSeconds: o === "completed" ? 42 : 0 };
  },
};

const CALLBACK_STATUS: Record<Outcome, string> = { completed: "completed", noanswer: "no-answer", busy: "busy", failed: "failed" };

/** Sends Exotel-shaped status callbacks to our own signed endpoint (dev only; never contacts a telephony network). */
function emitCallbacks(url: string, sid: string, attemptId: string, outcome: Outcome) {
  const send = (status: string, extra: Record<string, string> = {}) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ CallSid: sid, Status: status, CustomField: attemptId, ...extra }),
    }).catch(() => undefined);
  if (outcome === "completed") setTimeout(() => void send("in-progress"), 1500);
  setTimeout(() => void send(CALLBACK_STATUS[outcome], outcome === "completed" ? { ConversationDuration: "42" } : {}), 4000);
}
