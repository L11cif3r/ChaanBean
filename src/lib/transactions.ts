// Business Security agreements (PRD v3.0 section 8; v1.0 S13–S16). Pure rules shared by the server and the screens,
// so totals, interest and payment allocation are unit-tested without a database.

import { z } from "zod";

export const TX_TYPES = ["seller", "buyer", "lender"] as const;
export type TxType = (typeof TX_TYPES)[number];

export type TxStatus =
  | "draft" | "sent" | "viewed" | "changes_requested" | "accepted" | "active" | "partially_paid" | "overdue" | "paid"
  | "settled" | "rejected" | "expired" | "cancelled";

/** Price list item per type (v3 8.1). */
export const ITEM_CODE: Record<TxType, string> = { seller: "BS_SELLER_TX", buyer: "BS_BUYER_TX", lender: "BS_LENDER_TX" };

/** GST rates allowed on an item line, in basis points (0.25% = 25). v3 8.3. */
export const GST_RATES_BP = [0, 25, 300, 500, 1200, 1800, 2800, 4000] as const;

export const PAYMENT_MODES = ["upi", "neft_rtgs", "cheque", "cash", "other"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const REJECT_REASONS = ["not_mine", "wrong_amount", "goods_not_received", "other"] as const;

export const TX_RULES = {
  maxItems: 100,
  linkDaysDefault: 7,
  linkDaysMin: 1,
  linkDaysMax: 15,
  /** Reminders if the link has not been opened (v3 8.6). */
  reminderDays: [2, 5] as const,
  minPrincipalPaise: 1_000_00,
  maxPrincipalPaise: 10_00_00_000_00,
  maxRateBp: 3600,
  maxTermsChars: 5000,
  invoicePastDays: 365,
  invoiceFutureDays: 30,
  maxDueYears: 3,
} as const;

/** Statuses in which the deal is running and payments can be recorded. */
export const OPEN_STATUSES: TxStatus[] = ["active", "partially_paid", "overdue"];
/** Statuses in which the counterparty can still decide on the link. */
export const AWAITING_STATUSES: TxStatus[] = ["sent", "viewed"];

// ---------------------------------------------------------------- money

export interface ItemInput {
  product: string;
  hsn?: string;
  qty: number;
  unit: string;
  ratePaise: number;
  gstBp: number;
}

export interface ItemLine extends ItemInput {
  taxablePaise: number;
  gstPaise: number;
  amountPaise: number;
}

/** Amount of one line: quantity × rate, plus GST (rounded to the paisa). */
export function lineAmounts(i: ItemInput): ItemLine {
  const taxablePaise = Math.round(i.qty * i.ratePaise);
  const gstPaise = Math.round((taxablePaise * i.gstBp) / 10_000);
  return { ...i, taxablePaise, gstPaise, amountPaise: taxablePaise + gstPaise };
}

export function totals(items: ItemInput[]) {
  const lines = items.map(lineAmounts);
  return {
    lines,
    taxablePaise: lines.reduce((s, l) => s + l.taxablePaise, 0),
    gstPaise: lines.reduce((s, l) => s + l.gstPaise, 0),
    totalPaise: lines.reduce((s, l) => s + l.amountPaise, 0),
  };
}

const DAY = 86_400_000;
export const daysBetweenDates = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

export interface PaymentIn {
  paidOn: string; // YYYY-MM-DD
  amountPaise: number;
}

export interface Position {
  /** Principal still owed. */
  principalPaise: number;
  /** Interest accrued and not yet paid, to `today`. */
  interestPaise: number;
  /** principal + interest. */
  duePaise: number;
  daysOverdue: number;
  /** How each payment was split, in date order: interest first, then principal (v3 8.6). */
  allocations: { paidOn: string; amountPaise: number; interestPaise: number; principalPaise: number }[];
}

/**
 * Where a deal stands on `today` (v3 8.6): simple interest at `rateBp` a year accrues daily on the principal still
 * owed after the due date; each payment pays accrued interest first, then principal. With no payments after the due
 * date this is exactly balance × rate × days overdue / 365.
 */
export function position(input: { openingPaise: number; dueDate: string; rateBp: number; payments: PaymentIn[]; today: string }): Position {
  let principal = input.openingPaise;
  let interest = 0;
  let accruedTo = input.dueDate;
  const accrue = (to: string) => {
    if (to <= accruedTo) return;
    const days = daysBetweenDates(accruedTo, to);
    interest += Math.floor((principal * input.rateBp * days) / (10_000 * 365));
    accruedTo = to;
  };
  const allocations: Position["allocations"] = [];
  for (const p of [...input.payments].sort((a, b) => a.paidOn.localeCompare(b.paidOn))) {
    accrue(p.paidOn);
    const toInterest = Math.min(p.amountPaise, interest);
    const toPrincipal = Math.min(p.amountPaise - toInterest, principal);
    interest -= toInterest;
    principal -= toPrincipal;
    allocations.push({ paidOn: p.paidOn, amountPaise: p.amountPaise, interestPaise: toInterest, principalPaise: toPrincipal });
  }
  accrue(input.today);
  return {
    principalPaise: principal,
    interestPaise: interest,
    duePaise: principal + interest,
    daysOverdue: Math.max(0, daysBetweenDates(input.dueDate, input.today)),
    allocations,
  };
}

/** The status a running deal should have on `today`. */
export function runningStatus(p: Position, hasPayments: boolean, dueDate: string, today: string): TxStatus {
  if (p.duePaise <= 0) return "paid";
  if (today > dueDate) return "overdue";
  return hasPayments ? "partially_paid" : "active";
}

// ---------------------------------------------------------------- terms

/**
 * Fixed clauses by type, which the creator cannot remove (S13 marker 6). The creator adds their own terms below
 * them. Wording is a placeholder until counsel approves the templates (v1.0 A8).
 */
export function fixedClauses(type: TxType, v: { rateBp: number; dueDate: string; jurisdiction: string }): string[] {
  const rate = (v.rateBp / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const interest = v.rateBp > 0 ? `Interest at ${rate}% a year (simple) is payable on any amount unpaid after the due date, from the day after the due date until payment.` : null;
  const common = [
    "This agreement is accepted electronically by OTP on ChaanBean. The acceptance record (name, mobile, OTP reference, date and time, IP address and device) and the SHA-256 hash of this document form part of it.",
    `Disputes are subject to the jurisdiction of courts at ${v.jurisdiction}.`,
  ];
  if (type === "seller") {
    return ["The buyer confirms receiving the goods listed above in good condition.", `The balance is payable by ${v.dueDate}.`, ...(interest ? [interest] : []), ...common];
  }
  if (type === "buyer") {
    return ["The seller confirms receiving the advance shown above for the goods listed.", `The seller will deliver the goods by ${v.dueDate}; if they are not delivered, the advance is refundable on demand.`, ...(interest ? [interest.replace("any amount unpaid", "any advance not refunded")] : []), ...common];
  }
  return ["The borrower confirms receiving the principal shown above.", `The principal is repayable by ${v.dueDate}.`, ...(interest ? [interest] : []), ...common];
}

// ---------------------------------------------------------------- draft input (S13 fields)

const money = z.number().int().nonnegative();

export const itemSchema = z.object({
  product: z.string().trim().min(1, "Enter the product.").max(120),
  hsn: z.string().trim().regex(/^\d{4,8}$/, "HSN has 4 to 8 digits.").optional().or(z.literal("").transform(() => undefined)),
  qty: z.number().positive("Quantity must be above 0."),
  unit: z.string().trim().min(1, "Enter the unit.").max(12),
  ratePaise: z.number().int().positive("Rate must be above 0."),
  gstBp: z.number().int().refine((v) => (GST_RATES_BP as readonly number[]).includes(v), "Choose a GST rate."),
});

export const draftSchema = z.object({
  type: z.enum(TX_TYPES),
  counterpartyId: z.uuid("Select a counterparty with a mobile number."),
  invoiceNo: z.string().trim().max(30, "Up to 30 characters.").optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  placeOfSupply: z.string().regex(/^\d{2}$/, "Select the place of supply.").optional(),
  items: z.array(itemSchema).max(TX_RULES.maxItems).default([]),
  principalPaise: money.optional(),
  paidNowPaise: money.default(0),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  interestBp: z.number().int().min(0).max(TX_RULES.maxRateBp, "Enter a rate between 0% and 36%.").default(0),
  terms: z.string().max(TX_RULES.maxTermsChars, "Up to 5,000 characters.").default(""),
});
export type DraftInput = z.infer<typeof draftSchema>;

/** S13 field rules that need more than one field or today's date. Returns field → message. */
export function draftProblems(d: DraftInput, today: string): Record<string, string> {
  const f: Record<string, string> = {};
  if (d.type !== "lender") {
    if (!d.invoiceNo) f.invoiceNo = "Enter the invoice or GST bill number.";
    if (!d.placeOfSupply) f.placeOfSupply = "Select the place of supply.";
    if (!d.items.length) f.items = "Add at least one item.";
  } else if (!d.principalPaise || d.principalPaise < TX_RULES.minPrincipalPaise || d.principalPaise > TX_RULES.maxPrincipalPaise) {
    f.principalPaise = "Enter an amount between ₹1,000 and ₹10 crore.";
  }
  const back = daysBetweenDates(d.invoiceDate, today);
  if (back > TX_RULES.invoicePastDays || back < -TX_RULES.invoiceFutureDays) f.invoiceDate = "Enter a valid invoice date.";
  const ahead = daysBetweenDates(d.invoiceDate, d.dueDate);
  if (ahead <= 0 || ahead > TX_RULES.maxDueYears * 366) f.dueDate = "Enter a due date after the invoice date, at most 3 years ahead.";
  const total = d.type === "lender" ? (d.principalPaise ?? 0) : totals(d.items).totalPaise;
  if (d.paidNowPaise > total) f.paidNowPaise = "Amount paid cannot be more than the total.";
  return f;
}
