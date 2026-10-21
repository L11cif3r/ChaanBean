// E-Settlement (PRD v3.0 8.7; v1.0 5.8, S17, FR-ES-01–05). Pure rules shared by the server and the screens, so the
// waiver, the schedule and missed instalments are unit-tested without a database.
//
// A settlement is a new agreement for less than what is owed, or paid in parts. It starts from an overdue agreement
// (the amount owed is its balance plus interest to today) or on its own for a debt made outside ChaanBean. The
// debtor accepts by OTP, rejects, or proposes another amount or dates; the creditor revises and sends again.

import { z } from "zod";
import { addDays, daysBetween } from "@/lib/dates";

export type SettlementStatus =
  | "draft" | "sent" | "viewed" | "counter_proposed" | "accepted" | "completed" | "defaulted" | "rejected" | "expired"
  | "cancelled";
export type SettlementMode = "full" | "instalments";
export type InstalmentStatus = "due" | "paid" | "missed";

export const SETTLEMENT_ITEM = "BS_SETTLEMENT";

export const SETTLEMENT_RULES = {
  minInstalments: 2,
  maxInstalments: 24,
  /** "Missed" once an instalment is unpaid this many days after its date (v3 8.7); editable within limits (S17 marker 4). */
  graceDaysDefault: 7,
  graceDaysMin: 7,
  graceDaysMax: 30,
  maxTermsChars: 2000,
  maxScheduleYears: 3,
  /** Outside debts (S17 marker 1): the same range as a lender agreement. */
  minOwedPaise: 100_00,
  maxOwedPaise: 10_00_00_000_00,
} as const;

/** Statuses in which the debtor can still answer on the link. */
export const SETTLEMENT_AWAITING: SettlementStatus[] = ["sent", "viewed"];
/** Statuses the creditor can edit (the next send is a new version). */
export const SETTLEMENT_EDITABLE: SettlementStatus[] = ["draft", "counter_proposed"];
/** Statuses that block a second settlement on the same agreement. */
export const SETTLEMENT_OPEN: SettlementStatus[] = ["draft", "sent", "viewed", "counter_proposed", "accepted", "completed"];

/** Amount waived: what is owed minus the settlement amount minus the interest agreed (v3 8.7). Negative = extra. */
export const waivedPaise = (owedPaise: number, settlementPaise: number, interestAgreedPaise: number) =>
  owedPaise - settlementPaise - interestAgreedPaise;

export interface Row {
  dueDate: string;
  amountPaise: number;
}

/**
 * "Split equally" (S17 marker 3): `count` instalments of the same amount, the first on `firstDate` and then every
 * month on the same day (or every `everyDays` days). Paise left over go on the last row, so the total always matches.
 */
export function splitEqually(totalPaise: number, count: number, firstDate: string, everyDays?: number): Row[] {
  const n = Math.max(1, Math.floor(count));
  const each = Math.floor(totalPaise / n);
  return Array.from({ length: n }, (_, i) => ({
    dueDate: everyDays ? addDays(firstDate, i * everyDays) : addMonths(firstDate, i),
    amountPaise: i === n - 1 ? totalPaise - each * (n - 1) : each,
  }));
}

/** Same day of the month, `months` later; the 31st becomes the last day of a shorter month. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- the schedule as it runs

export interface PaymentIn {
  paidOn: string;
  amountPaise: number;
}

export interface InstalmentState extends Row {
  seq: number;
  paidPaise: number;
  status: InstalmentStatus;
  /** The day the payments first covered this instalment in full. */
  paidOn: string | null;
  /** The last day it can be paid before it counts as missed. */
  graceUntil: string;
}

export interface ScheduleState {
  instalments: InstalmentState[];
  paidPaise: number;
  remainingPaise: number;
  /** Completed when every instalment is paid; defaulted when one was missed (the default clause applies). */
  outcome: "running" | "completed" | "defaulted";
  next: InstalmentState | null;
}

/**
 * Where an accepted settlement stands on `today`. Payments fill the instalments in order (oldest first). An
 * instalment not fully paid by its date plus the grace days is Missed, and a missed instalment puts the settlement
 * in default (v3 8.7 default clause), even if it is paid later.
 */
export function scheduleState(rows: Row[], payments: PaymentIn[], today: string, graceDays: number): ScheduleState {
  const paid = [...payments].sort((a, b) => a.paidOn.localeCompare(b.paidOn));
  let cumulative = 0;
  let pi = 0;
  let paidSoFar = 0;
  const instalments = rows.map((r, i): InstalmentState => {
    cumulative += r.amountPaise;
    // The date by which payments reached the running total up to this instalment.
    while (pi < paid.length && paidSoFar < cumulative) {
      paidSoFar += paid[pi].amountPaise;
      pi++;
    }
    const paidOn = paidSoFar >= cumulative ? paid[pi - 1]?.paidOn ?? null : null;
    const totalPaid = paid.reduce((s, p) => s + p.amountPaise, 0);
    const before = cumulative - r.amountPaise;
    const paidPaise = Math.max(0, Math.min(r.amountPaise, totalPaid - before));
    const graceUntil = addDays(r.dueDate, graceDays);
    const late = (paidOn ?? "9999-12-31") > graceUntil;
    const status: InstalmentStatus = late && today > graceUntil ? "missed" : paidOn ? "paid" : "due";
    return { ...r, seq: i + 1, paidPaise, status, paidOn, graceUntil };
  });
  const total = rows.reduce((s, r) => s + r.amountPaise, 0);
  const paidPaise = Math.min(total, paid.reduce((s, p) => s + p.amountPaise, 0));
  const outcome = instalments.some((i) => i.status === "missed") ? "defaulted" : instalments.every((i) => i.status === "paid") ? "completed" : "running";
  return { instalments, paidPaise, remainingPaise: total - paidPaise, outcome, next: instalments.find((i) => i.status === "due") ?? null };
}

// ---------------------------------------------------------------- terms

/**
 * The fixed clauses of a settlement, including the default clause (S17 marker 4). Wording is a placeholder until
 * counsel approves the template (v1.0 A8).
 */
export function settlementClauses(v: { graceDays: number; originalReference: string | null; outsideBillNo: string | null; jurisdiction: string }): string[] {
  const original = v.originalReference ? `agreement ${v.originalReference}` : v.outsideBillNo ? `GST bill ${v.outsideBillNo}` : "the original debt";
  return [
    `This settlement replaces the payment terms of ${original} for as long as it is honoured.`,
    "The debtor will pay the amounts shown above on or before each date. Payments are applied to the instalments in date order.",
    `Default: if any instalment is not paid in full within ${v.graceDays} days of its date, this settlement ends and the full original balance with interest under ${original} becomes due at once, less the payments made under this settlement.`,
    "Any amount shown as waived is waived only when every instalment has been paid on time.",
    "This settlement is accepted electronically by OTP on ChaanBean. The acceptance record (name, mobile, OTP reference, date and time, IP address and device) and the SHA-256 hash of this document form part of it.",
    `Disputes are subject to the jurisdiction of courts at ${v.jurisdiction}.`,
  ];
}

// ---------------------------------------------------------------- input (S17 fields)

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const rowSchema = z.object({ dueDate: date, amountPaise: z.number().int().positive("Enter an amount above 0.") });

export const settlementSchema = z.object({
  /** The overdue agreement it settles; empty for an outside debt. */
  transactionId: z.uuid().optional(),
  counterpartyId: z.uuid("Select the debtor."),
  outsideBillNo: z.string().trim().max(30, "Up to 30 characters.").optional(),
  outsideBillDate: date.optional(),
  outsideOwedPaise: z.number().int().nonnegative().optional(),
  settlementPaise: z.number().int().positive("Enter the settlement amount."),
  interestAgreedPaise: z.number().int().nonnegative("Interest agreed cannot be negative.").default(0),
  mode: z.enum(["full", "instalments"], "Choose full or instalments."),
  fullDate: date.optional(),
  instalments: z.array(rowSchema).max(SETTLEMENT_RULES.maxInstalments, "At most 24 instalments.").default([]),
  graceDays: z.number().int().min(SETTLEMENT_RULES.graceDaysMin).max(SETTLEMENT_RULES.graceDaysMax).default(SETTLEMENT_RULES.graceDaysDefault),
  terms: z.string().max(SETTLEMENT_RULES.maxTermsChars, "Up to 2,000 characters.").default(""),
});
export type SettlementInput = z.infer<typeof settlementSchema>;

/** The schedule a settlement input describes: one row for Full, the rows for Instalments. */
export const rowsOf = (s: Pick<SettlementInput, "mode" | "fullDate" | "instalments" | "settlementPaise" | "interestAgreedPaise">): Row[] =>
  s.mode === "full" ? (s.fullDate ? [{ dueDate: s.fullDate, amountPaise: s.settlementPaise + s.interestAgreedPaise }] : []) : s.instalments;

/** Schedule rules shared by the creditor's form and the debtor's counter-proposal. Returns field → message. */
export function scheduleProblems(mode: SettlementMode, rows: Row[], totalPaise: number, today: string): Record<string, string> {
  const f: Record<string, string> = {};
  const last = addDays(today, SETTLEMENT_RULES.maxScheduleYears * 366);
  if (mode === "full") {
    if (!rows[0]) f.fullDate = "Enter a payment date.";
    else if (rows[0].dueDate < today || rows[0].dueDate > last) f.fullDate = "Enter a payment date from today, at most 3 years ahead.";
    return f;
  }
  if (rows.length < SETTLEMENT_RULES.minInstalments || rows.length > SETTLEMENT_RULES.maxInstalments) {
    f.instalments = "Add 2 to 24 instalments.";
    return f;
  }
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].dueDate < today || rows[i].dueDate > last) f[`instalments.${i}.dueDate`] = "Enter a date from today, at most 3 years ahead.";
    else if (i > 0 && rows[i].dueDate <= rows[i - 1].dueDate) f[`instalments.${i}.dueDate`] = "Each date must be after the one before.";
  }
  const sum = rows.reduce((s, r) => s + r.amountPaise, 0);
  if (sum !== totalPaise) f.instalments = `Instalments must add up to ${inr(totalPaise)}.`;
  return f;
}

/** S17 rules that need more than one field, the amount owed or today's date. Returns field → message. */
export function settlementProblems(s: SettlementInput, owedPaise: number, today: string): Record<string, string> {
  const f: Record<string, string> = {};
  if (!s.transactionId) {
    if (!s.outsideBillNo) f.outsideBillNo = "Enter the GST bill number.";
    if (!s.outsideBillDate || s.outsideBillDate > today) f.outsideBillDate = "Enter the bill date.";
    if (!s.outsideOwedPaise || s.outsideOwedPaise < SETTLEMENT_RULES.minOwedPaise || s.outsideOwedPaise > SETTLEMENT_RULES.maxOwedPaise) {
      f.outsideOwedPaise = "Enter the amount due, between ₹100 and ₹10 crore.";
    }
  }
  if (owedPaise > 0 && s.settlementPaise > owedPaise) f.settlementPaise = "Settlement amount cannot exceed what is due.";
  Object.assign(f, scheduleProblems(s.mode, rowsOf(s), s.settlementPaise + s.interestAgreedPaise, today));
  return f;
}

// ---------------------------------------------------------------- the debtor's counter-proposal

export const counterSchema = z.object({
  amountPaise: z.number().int().positive("Enter the amount you can pay."),
  mode: z.enum(["full", "instalments"]),
  fullDate: date.optional(),
  instalments: z.array(rowSchema).max(SETTLEMENT_RULES.maxInstalments).default([]),
  comment: z.string().trim().max(1000).default(""),
});
export type CounterInput = z.infer<typeof counterSchema>;

export function counterProblems(c: CounterInput, owedPaise: number, today: string): Record<string, string> {
  const f: Record<string, string> = {};
  if (c.amountPaise > owedPaise) f.amountPaise = "This is more than what is owed.";
  const rows = c.mode === "full" ? (c.fullDate ? [{ dueDate: c.fullDate, amountPaise: c.amountPaise }] : []) : c.instalments;
  Object.assign(f, scheduleProblems(c.mode, rows, c.amountPaise, today));
  return f;
}

export const daysUntil = (today: string, d: string) => daysBetween(today, d);

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
