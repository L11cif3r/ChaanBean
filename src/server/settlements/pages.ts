import "server-only";
import { rupees, type SettlementDraft } from "@/lib/settlement-draft";
import type { StView } from "./service";

/** The S17 form filled from a settlement, or from the debtor's counter-proposal when revising it ("Revise"). */
export function settlementDraftFrom(v: StView, useProposal = false): SettlementDraft {
  const p = useProposal ? v.proposal : null;
  const mode = p?.mode ?? v.mode;
  const rows = p?.rows ?? v.schedule.map((r) => ({ dueDate: r.dueDate, amountPaise: r.amountPaise }));
  return {
    id: v.id,
    source: v.original ? "agreement" : "outside",
    transactionId: v.original?.id ?? "",
    counterpartyId: v.counterparty.id,
    outsideBillNo: v.outside?.billNo ?? "",
    outsideBillDate: v.outside?.billDate ?? "",
    outsideOwed: v.original ? "" : rupees(v.owedPaise),
    settlement: rupees(p ? p.amountPaise : v.settlementPaise),
    interestAgreed: rupees(p ? 0 : v.interestAgreedPaise),
    mode,
    fullDate: mode === "full" ? rows[0]?.dueDate ?? "" : "",
    rows: mode === "instalments" ? rows.map((r) => ({ dueDate: r.dueDate, amount: rupees(r.amountPaise) })) : [],
    graceDays: v.graceDays,
    terms: v.terms,
  };
}
