// Exotel Calls/connect adapter. Deliberately independent of the legacy ExotelAdapter, which silently falls back
// to a sandbox and reports success; here missing credentials or any provider error is reported honestly.

import { normalizeProviderStatus } from "../status";
import { policyApproved } from "../policy";
import type { CallRequest, CallResult, CallStatusResult, VoiceProvider } from "./types";

const REQUIRED = [
  "EXOTEL_API_KEY",
  "EXOTEL_API_TOKEN",
  "EXOTEL_ACCOUNT_SID",
  "EXOTEL_CALLER_ID", // the single approved ExoPhone. Numbers are NOT rotated to evade blocking.
  "EXOTEL_CALL_FLOW_URL", // the approved flow/app that plays the approved script
  "COLLECT_PUBLIC_BASE_URL", // reachable origin for status callbacks
] as const;

const TIMEOUT_MS = 10_000;

function host() {
  return process.env.EXOTEL_SUBDOMAIN || "api.in.exotel.com";
}
function authHeader() {
  const raw = `${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export const exotelProvider: VoiceProvider = {
  name: "EXOTEL",

  isReady() {
    const missing = REQUIRED.filter((k) => !process.env[k]);
    if (missing.length) return { ready: false, reason: `Missing configuration: ${missing.join(", ")}` };
    if (!policyApproved()) {
      return { ready: false, reason: "Calling policy is not approved (CALL_AUTOMATION_POLICY_APPROVED)." };
    }
    return { ready: true };
  },

  async initiateCall(req: CallRequest): Promise<CallResult> {
    const ready = this.isReady();
    if (!ready.ready) return { accepted: false, failureReason: "PROVIDER_NOT_READY" };

    const body = new URLSearchParams({
      From: req.toPhone,
      CallerId: process.env.EXOTEL_CALLER_ID!,
      Url: process.env.EXOTEL_CALL_FLOW_URL!,
      CustomField: req.attemptId, // <=128 chars; echoed back in the callback
      StatusCallbackEvents: "terminal",
    });
    if (req.callbackUrl) body.set("StatusCallback", req.callbackUrl);

    const res = await fetch(
      `https://${host()}/v1/Accounts/${process.env.EXOTEL_ACCOUNT_SID}/Calls/connect.json`,
      {
        method: "POST",
        headers: { Authorization: authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    // Never log the body/headers: they contain the debtor's number.
    if (!res.ok) return { accepted: false, failureReason: `EXOTEL_HTTP_${res.status}` };
    const json = (await res.json().catch(() => null)) as { Call?: { Sid?: string } } | null;
    const sid = json?.Call?.Sid;
    if (!sid) return { accepted: false, failureReason: "EXOTEL_NO_CALL_SID" };
    return { accepted: true, providerCallId: sid };
  },

  async getCallStatus(providerCallId: string): Promise<CallStatusResult | null> {
    if (!this.isReady().ready) return null;
    const res = await fetch(
      `https://${host()}/v1/Accounts/${process.env.EXOTEL_ACCOUNT_SID}/Calls/${encodeURIComponent(providerCallId)}.json`,
      { headers: { Authorization: authHeader() }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { Call?: { Status?: string; Duration?: string } } | null;
    const status = normalizeProviderStatus(json?.Call?.Status);
    if (!status) return null;
    const d = Number(json?.Call?.Duration);
    return { status, durationSeconds: Number.isFinite(d) ? d : undefined };
  },
};
