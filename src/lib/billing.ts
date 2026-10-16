import { gstOn } from "@/lib/money";

// Billing rules shared by the browser and the server (PRD S03, S19, 5.9). The database functions in
// supabase/migrations/*_part3_billing.sql are the authority; these mirror them for previews and form checks.

export const GST_RATE = 18;
export const TOPUP_MIN_PAISE = 100_000n; // ₹1,000
export const TOPUP_MAX_PAISE = 50_000_000n; // ₹5,00,000
export const ALERT_MAX_PAISE = 10_000_000n; // ₹1,00,000

/** S03 marker 1: the six items each plan card shows before "See all items" (PRD v2.0 section 10). */
export const HEADLINE_ITEMS = ["CW_GST_SEARCH", "CW_GST_TURNOVER_4Y", "CW_CIBIL_COMPANY", "CW_DIRECTORS", "CC_COURT", "BS_SETTLEMENT"] as const;

export type PlanCode = "plan_a" | "plan_b";
export const PLAN_CODES: readonly PlanCode[] = ["plan_a", "plan_b"];

/** Price excluding GST → GST at 18% and total (S03 marker 5, order summary). */
export function withGst(pricePaise: bigint) {
  const gst = gstOn(pricePaise, GST_RATE);
  return { taxable: pricePaise, gst, total: pricePaise + gst };
}

/** A top-up goes into the wallet in full; its GST is worked out of the amount paid (amount / 1.18, half up). */
export function topupSplit(amountPaise: bigint) {
  const taxable = (amountPaise * 10_000n + 5_900n) / 11_800n;
  return { taxable, gst: amountPaise - taxable, total: amountPaise };
}

export const isTopupInRange = (paise: bigint) => paise >= TOPUP_MIN_PAISE && paise <= TOPUP_MAX_PAISE;
