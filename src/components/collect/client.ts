// Client helpers for the Collect UI. The browser only ever talks to our own /api/collect routes.

export class ApiError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.error?.message ?? "Something went wrong. Try again.", json?.error?.code ?? "ERROR", res.status);
  }
  return json as T;
}

export const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);

const IST = "Asia/Kolkata";
export const fmtDateTime = (v: string | Date | null | undefined) =>
  v ? new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(v)) + " IST" : "-";
export const fmtDate = (v: string | null | undefined) =>
  v ? new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${v}T00:00:00Z`)) : "-";

export type Tone = "Ok" | "Bad" | "Warn" | "Brand" | "Info" | "Neutral";

export function caseTone(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "ACTIVE": return { label: "Active", tone: "Brand" };
    case "PAID": return { label: "Paid", tone: "Ok" };
    case "DISPUTED": return { label: "Disputed", tone: "Warn" };
    case "CLOSED": return { label: "Closed", tone: "Neutral" };
    default: return { label: status, tone: "Neutral" };
  }
}

const STOP_REASONS: Record<string, string> = {
  PAID: "Paid", CLOSED: "Case closed", DISPUTED: "Disputed", MAX_ATTEMPTS: "Attempt limit reached",
  STOPPED_BY_USER: "Stopped by you", PAUSED_BY_USER: "Paused by you", CONTACT_WITHDRAWN: "Contact permission withdrawn",
  PROVIDER_FAILURES: "Paused after repeated call failures", CONTACT_AUTHORITY_NOT_CONFIRMED: "Contact permission not confirmed",
};
export const stopReason = (r: string | null) => (r ? STOP_REASONS[r] ?? r.replace(/_/g, " ").toLowerCase() : null);

export function automationTone(a: { state: string; stop_reason: string | null } | null): { label: string; tone: Tone } {
  if (!a) return { label: "Not set up", tone: "Neutral" };
  if (a.state === "ACTIVE") return { label: "Running", tone: "Ok" };
  if (a.state === "PAUSED") return { label: "Paused", tone: "Warn" };
  return { label: a.stop_reason === "MAX_ATTEMPTS" ? "Limit reached" : "Stopped", tone: "Neutral" };
}

export function attemptTone(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "QUEUED": return { label: "Queued", tone: "Neutral" };
    case "INITIATED": return { label: "Request accepted", tone: "Info" };
    case "ANSWERED": return { label: "In progress", tone: "Info" };
    case "COMPLETED": return { label: "Completed", tone: "Ok" };
    case "NO_ANSWER": return { label: "No answer", tone: "Warn" };
    case "BUSY": return { label: "Busy", tone: "Warn" };
    case "FAILED": return { label: "Failed", tone: "Bad" };
    default: return { label: status, tone: "Neutral" };
  }
}

const FAILURE: Record<string, string> = {
  MOCK_PROVIDER_REJECTED: "The provider rejected the request (simulated).",
  PROVIDER_REPORTED_FAILED: "The provider reported the call failed.",
  NO_PROVIDER_RESPONSE: "No response from the provider. The call may not have been placed.",
  PROVIDER_NOT_READY: "Calling isn't configured.",
};
export const failureText = (r: string | null) =>
  r ? (r.startsWith("SUPPRESSED_") ? `Not placed: ${r.slice(11).replace(/_/g, " ").toLowerCase()}.` : FAILURE[r] ?? r.replace(/_/g, " ").toLowerCase()) : null;

const EVENTS: Record<string, string> = {
  CASE_CREATED: "Case created",
  CONTACT_AUTHORITY_CONFIRMED: "Contact permission confirmed",
  CONTACT_AUTHORITY_WITHDRAWN: "Contact permission withdrawn",
  AUTOMATION_CONFIGURED: "Automation set up",
  AUTOMATION_PAUSED: "Automation paused",
  AUTOMATION_RESUMED: "Automation resumed",
  AUTOMATION_STOPPED: "Automation stopped",
  CALL_REQUESTED: "Call requested",
  CALL_DEFERRED: "Call deferred",
  CALL_ACCEPTED: "Provider accepted the call request",
  CALL_REJECTED: "Provider rejected the call request",
  CALL_REQUEST_UNCONFIRMED: "No response from provider",
  CALL_SUPPRESSED: "Call not placed",
  CALL_INITIATED: "Call ringing",
  CALL_ANSWERED: "Recipient answered",
  CALL_COMPLETED: "Call completed",
  CALL_NO_ANSWER: "No answer",
  CALL_BUSY: "Line busy",
  CALL_FAILED: "Call failed",
  PAYMENT_RECORDED: "Payment recorded",
  DISPUTE_RAISED: "Dispute raised",
  DISPUTE_RESOLVED: "Dispute resolved",
  PROMISE_RECORDED: "Promise to pay recorded",
  CASE_CLOSED: "Case closed",
};
export const eventText = (t: string) => EVENTS[t] ?? t.replace(/_/g, " ").toLowerCase();
