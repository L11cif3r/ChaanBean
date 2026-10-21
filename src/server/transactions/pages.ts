import "server-only";
import { sql } from "@/server/db/sql";
import { GST_STATES } from "@/server/providers/identity/states";
import type { AgreementDraft, BuyerOption } from "@/lib/agreement-draft";
import type { TxView } from "./service";

// Data the S13 form needs on the server: the counterparties to pick from and the court city for the clauses.

export async function formData(orgId: string): Promise<{ buyers: BuyerOption[]; jurisdiction: string }> {
  const [buyers, [org]] = await Promise.all([
    sql()<{ id: string; legal_name: string; mobile_masked: string; state_code: string | null; upi_status: string }[]>`
      select id, legal_name, mobile_masked, state_code, upi_status::text as upi_status from public.counterparties
       where org_id = ${orgId} and status = 'active' and mobile_hash is not null order by lower(legal_name) limit 500`,
    sql()<{ address: { city?: string } | null; state_code: string | null }[]>`select address, state_code from public.organisations where id = ${orgId}`,
  ]);
  return {
    buyers: buyers.map((b) => ({ id: b.id, name: b.legal_name, mobileMasked: b.mobile_masked, stateCode: b.state_code, bankLinked: b.upi_status === "linked" })),
    jurisdiction: org?.address?.city || (org?.state_code ? GST_STATES[org.state_code] : null) || "India",
  };
}

const rupees = (paise: number) => (paise / 100).toString();

/** The S13 form filled from an existing draft (edit, or after a change request). */
export function draftFrom(v: TxView): AgreementDraft {
  return {
    id: v.id,
    type: v.type,
    counterpartyId: v.counterparty.id,
    invoiceNo: v.invoiceNo ?? "",
    invoiceDate: v.invoiceDate,
    placeOfSupply: v.placeOfSupply ?? "",
    items: v.items.length
      ? v.items.map((i) => ({ product: i.product, hsn: i.hsn ?? "", qty: String(i.qty), unit: i.unit, rate: rupees(i.ratePaise), gst: String(i.gstBp) }))
      : [{ product: "", hsn: "", qty: "", unit: "", rate: "", gst: "1800" }],
    principal: v.type === "lender" ? rupees(v.totalPaise) : "",
    paidNow: rupees(v.paidNowPaise),
    dueDate: v.dueDate,
    interest: String(v.interestBp / 100),
    terms: v.terms,
  };
}
