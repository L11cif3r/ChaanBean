// Buyer consent rules (PRD v2.0 section 5; v1.0 5.4, S09 "States and rules", S10, FR-CON-01–07).
// Pure functions shared by the server and the screens, so the limits are unit-tested without a database.

import type { CwCode } from "@/lib/checks";

export const CONSENT_RULES = {
  /** The link works for 72 hours; after that the request expires and nothing is charged (FR-CON-01). */
  linkMs: 72 * 3600_000,
  /** One automatic reminder after 24 hours (FR-CON-07). */
  reminderMs: 24 * 3600_000,
  /** Approved data stays in the requester's view for 30 days. */
  visibleMs: 30 * 86_400_000,
  /** A consent approved in the last 30 days for the same data is used again without asking (S09). */
  reuseMs: 30 * 86_400_000,
  /** At most 3 requests to the same buyer in 7 days; a "no" in the last 7 days warns first (S09, FR-CON-07). */
  limitWindowMs: 7 * 86_400_000,
  maxPerWindow: 3,
  /** Mobile OTP: 5 minutes, 5 tries, 5 sends an hour, resend after 30 seconds (S10). */
  otpMs: 5 * 60_000,
  otpAttempts: 5,
  otpSendsPerHour: 5,
  resendAfterMs: 30_000,
  /** After the OTP the buyer has 30 minutes to finish on that device. */
  verifiedMs: 30 * 60_000,
} as const;

export const CONSENT_PURPOSES = ["supply_on_credit", "advance_against_order", "loan", "review_existing"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_CHANNELS = ["sms", "whatsapp", "email"] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

export type ConsentStatus = "pending" | "approved" | "declined" | "expired" | "withdrawn";

export const needsGst = (scope: readonly string[]) => scope.includes("CW_GST_TURNOVER") || scope.includes("CW_GST_TURNOVER_CY");
export const needsCompanyBureau = (scope: readonly string[]) => scope.includes("CW_CIBIL_COMPANY");
export const needsPersonalBureau = (scope: readonly string[]) => scope.includes("CW_CIBIL_PERSONAL");

/** S09 rate limit: may another request go to this buyer now, and if not, from when. */
export function sendAllowance(sentAt: Date[], now: Date) {
  const recent = sentAt.filter((d) => now.getTime() - d.getTime() < CONSENT_RULES.limitWindowMs).sort((a, b) => a.getTime() - b.getTime());
  if (recent.length < CONSENT_RULES.maxPerWindow) return { allowed: true as const, sent: recent.length, nextAt: null };
  const nextAt = new Date(recent[recent.length - CONSENT_RULES.maxPerWindow].getTime() + CONSENT_RULES.limitWindowMs);
  return { allowed: false as const, sent: recent.length, nextAt };
}

export interface ConsentSummary {
  id: string;
  status: ConsentStatus;
  scope: string[];
  approvedAt: Date | null;
  declinedAt: Date | null;
  /** When the GST portal access given with this consent ends (GST scope only). */
  gstAccessUntil: Date | null;
}

/** S09: an approved consent from the last 30 days that covers every item asked for, so the buyer is not asked again. */
export function reusableConsent(consents: ConsentSummary[], codes: readonly CwCode[], now: Date): ConsentSummary | null {
  const usable = consents
    .filter((c) => c.status === "approved" && c.approvedAt && now.getTime() - c.approvedAt.getTime() < CONSENT_RULES.reuseMs)
    .filter((c) => codes.every((code) => c.scope.includes(code)))
    .filter((c) => !needsGst(codes) || (c.gstAccessUntil !== null && c.gstAccessUntil > now))
    .sort((a, b) => b.approvedAt!.getTime() - a.approvedAt!.getTime());
  return usable[0] ?? null;
}

/** S09: the buyer said no in the last 7 days. */
export function recentDecline(consents: ConsentSummary[], now: Date): Date | null {
  const d = consents
    .filter((c) => c.status === "declined" && c.declinedAt && now.getTime() - c.declinedAt.getTime() < CONSENT_RULES.limitWindowMs)
    .map((c) => c.declinedAt!)
    .sort((a, b) => b.getTime() - a.getTime());
  return d[0] ?? null;
}

/**
 * Whether data fetched under a consent may still be shown to the requester: hidden at once when the buyer withdraws
 * (S10, FR-CON-06 allows up to 24 hours) and after the 30 days the buyer agreed to.
 */
export function consentDataHidden(c: { status: ConsentStatus; visibleUntil: Date | null } | null, now: Date): "withdrawn" | "lapsed" | null {
  if (!c) return null;
  if (c.status === "withdrawn") return "withdrawn";
  if (c.status === "approved" && c.visibleUntil && c.visibleUntil <= now) return "lapsed";
  return null;
}

/** Age in whole years on a date (YYYY-MM-DD), for the 18-or-over rule on a date of birth. */
export function ageOn(birth: string, today: string): number {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
