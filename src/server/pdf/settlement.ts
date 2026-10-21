import "server-only";
import { formatDate, formatDateTimeIst } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { settlementClauses, type Row, type SettlementMode } from "@/lib/settlements";
import type { AgreementParty } from "./agreement";
import { textDoc } from "./kit";

// The E-Settlement PDF (PRD v3.0 8.7, FR-ES-04): the preview both sides see (marked PREVIEW) and the copy sealed on
// the debtor's OTP acceptance, with the same footer, verify link and QR code as an agreement.

export interface SettlementDoc {
  reference: string;
  version: number;
  creditor: AgreementParty;
  debtor: AgreementParty;
  original: { reference: string | null; billNo: string | null; billDate: string | null };
  owedPaise: number;
  owedOn: string;
  settlementPaise: number;
  interestAgreedPaise: number;
  waivedPaise: number;
  mode: SettlementMode;
  rows: Row[];
  graceDays: number;
  terms: string;
  jurisdiction: string;
  verifyUrl: string;
  acceptance?: { name: string; mobileMasked: string; otpRef: string; at: Date; ip: string | null; device: string | null };
  generatedAt: Date;
}

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

export async function settlementPdf(doc: SettlementDoc): Promise<Uint8Array> {
  const d = await textDoc({
    title: "E-SETTLEMENT AGREEMENT",
    reference: `${doc.reference} · Version ${doc.version}`,
    verifyUrl: doc.verifyUrl,
    generatedAt: doc.generatedAt,
    stamp: doc.acceptance ? `Sealed ${formatDateTimeIst(doc.acceptance.at)}` : undefined,
    watermark: doc.acceptance ? undefined : "PREVIEW",
  });
  const party = (role: string, p: AgreementParty) => {
    d.para(`${role}: ${p.name}${p.gstin ? `, GSTIN ${p.gstin}` : ""}`);
    if (p.address) d.para(p.address, 9);
  };
  party("Creditor", doc.creditor);
  party("Debtor", doc.debtor);
  if (doc.original.reference) d.para(`Settles agreement ${doc.original.reference}`);
  else d.para(`Settles GST bill ${doc.original.billNo ?? "—"}${doc.original.billDate ? ` dated ${formatDate(doc.original.billDate)}` : ""} (outside ChaanBean)`);
  d.gap();
  d.rule();

  d.rows([
    [`Owed on ${formatDate(doc.owedOn)} (balance and interest)`, inr(doc.owedPaise)],
    ["Settlement amount", inr(doc.settlementPaise)],
    ["Interest agreed", inr(doc.interestAgreedPaise)],
    [doc.waivedPaise >= 0 ? "Amount waived" : "Extra over what is owed", inr(Math.abs(doc.waivedPaise))],
    ["To be paid", inr(doc.settlementPaise + doc.interestAgreedPaise)],
    ["Mode", doc.mode === "full" ? "In full, on one date" : `${doc.rows.length} instalments`],
  ]);
  d.gap(4);
  d.rule();

  d.heading("Payment schedule");
  d.table(["#", "Pay by", "Amount"], doc.rows.map((r, i) => [String(i + 1), formatDate(r.dueDate), inr(r.amountPaise)]), [0, 40, 300], { rightLast: true });
  d.gap(4);
  d.rule();

  d.heading("Terms");
  settlementClauses({ graceDays: doc.graceDays, originalReference: doc.original.reference, outsideBillNo: doc.original.billNo, jurisdiction: doc.jurisdiction })
    .forEach((c, i) => d.para(`${i + 1}. ${c}`, 9.5));
  if (doc.terms.trim()) {
    d.gap(4);
    d.para("Additional terms", 10);
    d.para(doc.terms.trim(), 9.5);
  }
  d.gap();
  d.rule();

  d.heading("Acceptance");
  if (doc.acceptance) {
    const a = doc.acceptance;
    d.para(`Accepted by ${a.name} (${a.mobileMasked}) by OTP, reference ${a.otpRef}, on ${formatDateTimeIst(a.at)}.`, 9.5);
    d.para(`IP address ${a.ip ?? "not recorded"} · Device ${a.device ?? "not recorded"}`, 9);
    d.para("The SHA-256 hash of this file is kept by ChaanBean; check it on the verify page.", 9);
  } else {
    d.para("Not yet accepted. When the debtor accepts by OTP, this block records their name, masked mobile, OTP reference, date and time (IST), IP address and device.", 9);
  }
  return d.save();
}
