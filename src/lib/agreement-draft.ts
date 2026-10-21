// The S13 form's draft shape, shared by the server pages that fill it and the form itself.

import { istDate } from "@/lib/dates";
import type { TxType } from "@/lib/transactions";

export interface BuyerOption {
  id: string;
  name: string;
  mobileMasked: string;
  stateCode: string | null;
  bankLinked: boolean;
}

export interface AgreementDraft {
  id?: string;
  type: TxType;
  counterpartyId: string;
  invoiceNo: string;
  invoiceDate: string;
  placeOfSupply: string;
  items: { product: string; hsn: string; qty: string; unit: string; rate: string; gst: string }[];
  principal: string;
  paidNow: string;
  dueDate: string;
  interest: string;
  terms: string;
}

export const emptyItem = () => ({ product: "", hsn: "", qty: "", unit: "", rate: "", gst: "1800" });

export function blankDraft(counterpartyId: string, buyers: BuyerOption[]): AgreementDraft {
  const today = istDate(new Date());
  const due = new Date(`${today}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 30);
  return {
    type: "seller", counterpartyId, invoiceNo: "", invoiceDate: today,
    placeOfSupply: buyers.find((b) => b.id === counterpartyId)?.stateCode ?? "", items: [emptyItem()], principal: "",
    paidNow: "0", dueDate: due.toISOString().slice(0, 10), interest: "18", terms: "",
  };
}
