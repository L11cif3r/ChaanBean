import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, degrees, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { fixedClauses, type ItemLine, type TxType } from "@/lib/transactions";
import { formatDate, formatDateTimeIst } from "@/lib/dates";
import { formatInr } from "@/lib/money";

// The agreement PDF (PRD v3.0 8.4–8.5, FR-BS-02, FR-TX-02/06). The same function draws the preview the creator and the
// counterparty see (marked PREVIEW, acceptance block empty) and the final copy sealed on acceptance (acceptance block
// filled). Every page carries the reference, the verify link and a QR code to it in the footer.
// Not yet PDF/A: the archival profile arrives with the production PDF engine (build plan T5).

export interface AgreementParty {
  name: string;
  gstin: string | null;
  address: string | null;
}

export interface AgreementDoc {
  reference: string;
  version: number;
  type: TxType;
  creator: AgreementParty;
  counterparty: AgreementParty;
  invoiceNo: string | null;
  invoiceDate: string;
  placeOfSupply: string | null;
  items: ItemLine[];
  totalPaise: number;
  paidNowPaise: number;
  dueDate: string;
  interestBp: number;
  terms: string;
  jurisdiction: string;
  verifyUrl: string;
  /** Present on the sealed copy only. */
  acceptance?: { name: string; mobileMasked: string; otpRef: string; at: Date; ip: string | null; device: string | null };
  /** For the document's own dates: the time it was generated or sealed. */
  generatedAt: Date;
}

const TITLE: Record<TxType, string> = {
  seller: "SUPPLY ON CREDIT AGREEMENT",
  buyer: "ADVANCE PAYMENT AGREEMENT",
  lender: "LOAN AGREEMENT",
};
const ROLES: Record<TxType, [string, string]> = {
  seller: ["Seller", "Buyer"],
  buyer: ["Buyer", "Seller"],
  lender: ["Lender", "Borrower"],
};

const A4 = { w: 595.28, h: 841.89 };
const M = 48; // margin
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LINE = rgb(0.87, 0.89, 0.92);
const BRAND = rgb(0.99, 0.5, 0.1);

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });
const pct = (bp: number) => `${(bp / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;

let fontBytes: Promise<Buffer> | null = null;
const loadFont = () => (fontBytes ??= fs.readFile(path.join(process.cwd(), "src/server/pdf/fonts/Geist-Regular.ttf")));

/** Splits text into lines that fit `width` at `size`. */
function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export async function agreementPdf(doc: AgreementDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await loadFont(), { subset: true });
  const qr: PDFImage = await pdf.embedPng(await QRCode.toBuffer(doc.verifyUrl, { margin: 0, width: 160, errorCorrectionLevel: "M" }));
  pdf.setTitle(`${doc.reference} ${TITLE[doc.type]}`);
  pdf.setAuthor("ChaanBean");
  pdf.setCreator("ChaanBean");
  pdf.setProducer("ChaanBean");
  pdf.setCreationDate(doc.generatedAt);
  pdf.setModificationDate(doc.generatedAt);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([A4.w, A4.h]);
    pages.push(page);
    y = A4.h - M;
  };
  const room = (h: number) => {
    if (y - h < M + 70) newPage(); // keep space for the footer
  };
  const text = (s: string, x: number, size = 10, color = INK) => page.drawText(s, { x, y, size, font, color });
  const para = (s: string, size = 10, color = INK, indent = 0) => {
    for (const l of wrap(font, s, size, A4.w - 2 * M - indent)) {
      room(size + 4);
      text(l, M + indent, size, color);
      y -= size + 4;
    }
  };
  const rule = () => {
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.7, color: LINE });
    y -= 10;
  };

  newPage();
  // ---- header
  text("Chaan", M, 13);
  page.drawText("Bean", { x: M + font.widthOfTextAtSize("Chaan", 13), y, size: 13, font, color: BRAND });
  const ref = `Ref ${doc.reference} · Version ${doc.version}`;
  text(ref, A4.w - M - font.widthOfTextAtSize(ref, 9), 9, MUTED);
  y -= 26;
  text(TITLE[doc.type], M, 15);
  y -= 22;
  const [youRole, theyRole] = ROLES[doc.type];
  const party = (role: string, p: AgreementParty) => {
    para(`${role}: ${p.name}${p.gstin ? `, GSTIN ${p.gstin}` : ""}`, 10);
    if (p.address) para(p.address, 9, MUTED);
  };
  party(youRole, doc.creator);
  party(theyRole, doc.counterparty);
  if (doc.type === "lender") para(`Loan reference: ${doc.invoiceNo ?? "—"} · Disbursed on ${formatDate(doc.invoiceDate)}`, 10);
  else para(`Invoice: ${doc.invoiceNo ?? "—"} dated ${formatDate(doc.invoiceDate)}${doc.placeOfSupply ? ` · Place of supply ${doc.placeOfSupply}` : ""}`, 10);
  y -= 6;
  rule();

  // ---- items or principal
  if (doc.type !== "lender") {
    const cols = [M, M + 190, M + 245, M + 315, M + 395, A4.w - M];
    const head = ["Item", "HSN", "Qty", "Rate", "GST", "Amount"];
    room(16);
    head.forEach((h, i) => (i === 5 ? text(h, cols[5] - font.widthOfTextAtSize(h, 9), 9, MUTED) : text(h, cols[i], 9, MUTED)));
    y -= 14;
    for (const l of doc.items) {
      room(16);
      const name = wrap(font, l.product, 9, 180)[0];
      text(name, cols[0], 9);
      text(l.hsn ?? "—", cols[1], 9);
      text(`${l.qty} ${l.unit}`, cols[2], 9);
      text(inr(l.ratePaise), cols[3], 9);
      text(pct(l.gstBp), cols[4], 9);
      const amt = inr(l.amountPaise);
      text(amt, cols[5] - font.widthOfTextAtSize(amt, 9), 9);
      y -= 14;
    }
    y -= 4;
    rule();
  }

  const balance = doc.totalPaise - doc.paidNowPaise;
  const rows: [string, string][] =
    doc.type === "lender"
      ? [["Principal", inr(doc.totalPaise)], ["Repaid at signing", inr(doc.paidNowPaise)], ["Balance", inr(balance)], ["Repayable by", formatDate(doc.dueDate)]]
      : doc.type === "buyer"
        ? [["Order value", inr(doc.totalPaise)], ["Advance paid", inr(doc.paidNowPaise)], ["Balance on delivery", inr(balance)], ["Goods due by", formatDate(doc.dueDate)]]
        : [["Total", inr(doc.totalPaise)], ["Paid", inr(doc.paidNowPaise)], ["Balance", inr(balance)], ["Due date", formatDate(doc.dueDate)]];
  rows.push(["Interest after due date", doc.interestBp ? `${pct(doc.interestBp)} a year, simple` : "None"]);
  for (const [k, v] of rows) {
    room(15);
    text(k, M, 10, MUTED);
    text(v, A4.w - M - font.widthOfTextAtSize(v, 10), 10);
    y -= 15;
  }
  y -= 4;
  rule();

  // ---- terms
  room(18);
  text("Terms", M, 11);
  y -= 16;
  fixedClauses(doc.type, { rateBp: doc.interestBp, dueDate: formatDate(doc.dueDate), jurisdiction: doc.jurisdiction }).forEach((c, i) =>
    para(`${i + 1}. ${c}`, 9.5),
  );
  if (doc.terms.trim()) {
    y -= 4;
    room(16);
    text("Additional terms", M, 10, MUTED);
    y -= 14;
    para(doc.terms.trim(), 9.5);
  }
  y -= 6;
  rule();

  // ---- acceptance block (v3 8.5 step 1)
  room(90);
  text("Acceptance", M, 11);
  y -= 16;
  if (doc.acceptance) {
    const a = doc.acceptance;
    para(`Accepted by ${a.name} (${a.mobileMasked}) by OTP, reference ${a.otpRef}, on ${formatDateTimeIst(a.at)}.`, 9.5);
    para(`IP address ${a.ip ?? "not recorded"} · Device ${a.device ?? "not recorded"}`, 9, MUTED);
    para("The SHA-256 hash of this file is kept by ChaanBean; check it on the verify page.", 9, MUTED);
  } else {
    para("Not yet accepted. When the counterparty accepts by OTP, this block records their name, masked mobile, OTP reference, date and time (IST), IP address and device.", 9, MUTED);
  }

  // ---- footer on every page, and the preview mark
  pages.forEach((p, i) => {
    const fy = M - 8;
    p.drawImage(qr, { x: A4.w - M - 46, y: fy - 4, width: 46, height: 46 });
    p.drawText(`${doc.reference} · Page ${i + 1} of ${pages.length}`, { x: M, y: fy + 26, size: 8, font, color: MUTED });
    p.drawText(`Verify this document: ${doc.verifyUrl}`, { x: M, y: fy + 14, size: 8, font, color: MUTED });
    p.drawText(doc.acceptance ? `Sealed ${formatDateTimeIst(doc.acceptance.at)}` : `Generated ${formatDateTimeIst(doc.generatedAt)}`, { x: M, y: fy + 2, size: 8, font, color: MUTED });
    if (!doc.acceptance) {
      p.drawText("PREVIEW", { x: 150, y: 380, size: 90, font, color: rgb(0.88, 0.11, 0.28), opacity: 0.1, rotate: degrees(35) });
    }
  });

  return pdf.save({ useObjectStreams: false });
}
