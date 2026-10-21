import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { formatDateTimeIst } from "@/lib/dates";

// A small text-document builder on pdf-lib, for the E-Settlement agreement and the evidence pack documents
// (acceptance certificate, activity log, section 63 draft). Same look as the agreement PDF (src/server/pdf/agreement.ts):
// A4, the Geist font so ₹ prints, and a footer on every page with the reference and, when given, the verify link and QR.

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
export const INK = rgb(0.06, 0.09, 0.16);
export const MUTED = rgb(0.39, 0.45, 0.55);
const LINE = rgb(0.87, 0.89, 0.92);
const BRAND = rgb(0.99, 0.5, 0.1);

let fontBytes: Promise<Buffer> | null = null;
const loadFont = () => (fontBytes ??= fs.readFile(path.join(process.cwd(), "src/server/pdf/fonts/Geist-Regular.ttf")));

export function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) out.push(line);
        // A single word wider than the line (a hash, a URL): break it by characters.
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width) {
          let cut = w.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
          out.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

export interface DocOptions {
  title: string;
  reference: string;
  /** Printed with a QR code in every footer when given. */
  verifyUrl?: string;
  generatedAt: Date;
  /** Footer line 3, e.g. "Sealed 05 Mar 2027, 14:07 IST". Default "Generated …". */
  stamp?: string;
  /** Diagonal mark on every page: PREVIEW, DRAFT. */
  watermark?: string;
}

export async function textDoc(o: DocOptions) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await loadFont(), { subset: true });
  const qr = o.verifyUrl ? await pdf.embedPng(await QRCode.toBuffer(o.verifyUrl, { margin: 0, width: 160, errorCorrectionLevel: "M" })) : null;
  pdf.setTitle(`${o.reference} ${o.title}`);
  pdf.setAuthor("ChaanBean");
  pdf.setCreator("ChaanBean");
  pdf.setProducer("ChaanBean");
  pdf.setCreationDate(o.generatedAt);
  pdf.setModificationDate(o.generatedAt);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([A4.w, A4.h]);
    pages.push(page);
    y = A4.h - M;
  };
  const room = (h: number) => {
    if (y - h < M + 70) newPage();
  };
  const width = A4.w - 2 * M;
  const at = (s: string, x: number, size = 10, color = INK) => page.drawText(s, { x, y, size, font, color });

  const api = {
    font,
    width,
    para(s: string, size = 10, color = INK, indent = 0) {
      for (const l of wrap(font, s, size, width - indent)) {
        room(size + 4);
        at(l, M + indent, size, color);
        y -= size + 4;
      }
    },
    heading(s: string, size = 11) {
      room(size + 10);
      y -= 2;
      at(s, M, size);
      y -= size + 6;
    },
    rule() {
      room(10);
      page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.7, color: LINE });
      y -= 10;
    },
    gap(h = 6) {
      y -= h;
    },
    /** Label on the left, value on the right (values that do not fit wrap below the label). */
    rows(rows: [string, string][], size = 10) {
      for (const [k, v] of rows) {
        const vw = font.widthOfTextAtSize(v, size);
        const kw = font.widthOfTextAtSize(k, size);
        if (kw + vw + 16 <= width) {
          room(size + 5);
          at(k, M, size, MUTED);
          at(v, A4.w - M - vw, size);
          y -= size + 5;
        } else {
          room(size + 5);
          at(k, M, size, MUTED);
          y -= size + 4;
          api.para(v, size, INK, 12);
          y -= 1;
        }
      }
    },
    /** A simple table: column x offsets from the left margin; the last column is right-aligned when `rightLast`. */
    table(head: string[], body: string[][], cols: number[], opts: { size?: number; rightLast?: boolean } = {}) {
      const size = opts.size ?? 9;
      const xs = cols.map((c) => M + c);
      const cell = (s: string, i: number, color = INK) => {
        const max = (i + 1 < xs.length ? xs[i + 1] : A4.w - M) - xs[i] - 6;
        const text = wrap(font, s, size, Math.max(20, max))[0] ?? "";
        if (opts.rightLast && i === xs.length - 1) at(text, A4.w - M - font.widthOfTextAtSize(text, size), size, color);
        else at(text, xs[i], size, color);
      };
      const header = () => {
        room(size + 6);
        head.forEach((h, i) => cell(h, i, MUTED));
        y -= size + 5;
      };
      header();
      for (const r of body) {
        if (y - (size + 5) < M + 70) {
          newPage();
          header();
        }
        r.forEach((c, i) => cell(c, i));
        y -= size + 5;
      }
    },
    async save(): Promise<Uint8Array> {
      pages.forEach((p, i) => {
        const fy = M - 8;
        if (qr) p.drawImage(qr, { x: A4.w - M - 46, y: fy - 4, width: 46, height: 46 });
        p.drawText(`${o.reference} · Page ${i + 1} of ${pages.length}`, { x: M, y: fy + 26, size: 8, font, color: MUTED });
        if (o.verifyUrl) p.drawText(`Verify this document: ${o.verifyUrl}`, { x: M, y: fy + 14, size: 8, font, color: MUTED });
        p.drawText(o.stamp ?? `Generated ${formatDateTimeIst(o.generatedAt)}`, { x: M, y: fy + 2, size: 8, font, color: MUTED });
        if (o.watermark) p.drawText(o.watermark, { x: 150, y: 380, size: 90, font, color: rgb(0.88, 0.11, 0.28), opacity: 0.1, rotate: degrees(35) });
      });
      return pdf.save({ useObjectStreams: false });
    },
  };

  newPage();
  at("Chaan", M, 13);
  page.drawText("Bean", { x: M + font.widthOfTextAtSize("Chaan", 13), y, size: 13, font, color: BRAND });
  at(o.reference, A4.w - M - font.widthOfTextAtSize(o.reference, 9), 9, MUTED);
  y -= 26;
  for (const l of wrap(font, o.title, 15, width)) {
    at(l, M, 15);
    y -= 20;
  }
  y -= 2;
  return api;
}
