// The S17 form's draft shape (strings as typed), shared by the server pages that fill it and the form itself.

import { addDays, istDate } from "@/lib/dates";
import { SETTLEMENT_RULES, type SettlementMode } from "@/lib/settlements";

export interface ScheduleRowDraft {
  dueDate: string;
  amount: string;
}

export interface SettlementDraft {
  id?: string;
  source: "agreement" | "outside";
  transactionId: string;
  counterpartyId: string;
  outsideBillNo: string;
  outsideBillDate: string;
  outsideOwed: string;
  settlement: string;
  interestAgreed: string;
  mode: SettlementMode;
  fullDate: string;
  rows: ScheduleRowDraft[];
  graceDays: number;
  terms: string;
}

export const toPaise = (rupees: string) => Math.round(Number((rupees || "0").replace(/[,\s₹]/g, "")) * 100) || 0;
export const rupees = (paise: number) => (paise / 100).toString();

export function blankSettlement(transactionId = "", counterpartyId = ""): SettlementDraft {
  const today = istDate(new Date());
  return {
    source: transactionId || !counterpartyId ? "agreement" : "outside",
    transactionId, counterpartyId, outsideBillNo: "", outsideBillDate: "", outsideOwed: "",
    settlement: "", interestAgreed: "0", mode: "instalments", fullDate: addDays(today, 7), rows: [],
    graceDays: SETTLEMENT_RULES.graceDaysDefault, terms: "",
  };
}

/** The request body the S17 API takes. */
export function settlementBody(d: SettlementDraft) {
  const outside = d.source === "outside";
  return {
    transactionId: outside ? undefined : d.transactionId || undefined,
    counterpartyId: d.counterpartyId,
    outsideBillNo: outside ? d.outsideBillNo.trim() || undefined : undefined,
    outsideBillDate: outside ? d.outsideBillDate || undefined : undefined,
    outsideOwedPaise: outside ? toPaise(d.outsideOwed) : undefined,
    settlementPaise: toPaise(d.settlement),
    interestAgreedPaise: toPaise(d.interestAgreed),
    mode: d.mode,
    fullDate: d.mode === "full" ? d.fullDate : undefined,
    instalments: d.mode === "instalments" ? d.rows.map((r) => ({ dueDate: r.dueDate, amountPaise: toPaise(r.amount) })) : [],
    graceDays: d.graceDays,
    terms: d.terms,
  };
}
