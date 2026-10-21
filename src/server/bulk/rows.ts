import "server-only";
import { isValidCin, isValidGstin, isValidLlpin, normaliseIdentifier, normaliseMobile } from "@/lib/validators";
import { normaliseName } from "@/server/providers/mca";
import { readSheet, SheetError } from "@/server/sheets";
import { AppError } from "@/server/errors";

// PRD v4.0 6.1: the rows of a multiple search, typed (up to 10) or from an Excel/CSV file (up to 50 rows, 2 MB).
// Template columns: company_name, gstin, cin, city, state, contact_name, contact_mobile, contact_email. Each row needs
// at least one of company_name, gstin or cin. Ops raise the limits with BULK_MAX_ROWS and BULK_MAX_TYPED.

export const bulkMaxRows = () => Math.min(1000, Math.max(1, Number(process.env.BULK_MAX_ROWS ?? 50) || 50));
export const bulkMaxTyped = () => Math.min(50, Math.max(1, Number(process.env.BULK_MAX_TYPED ?? 10) || 10));
export const BULK_MAX_FILE_BYTES = 2 * 1024 * 1024;

export interface BulkInputRow {
  companyName: string;
  gstin: string;
  cin: string;
  city: string;
  state: string;
  contactName: string;
  contactMobile: string;
  contactEmail: string;
}

export const TEMPLATE_COLUMNS = ["company_name", "gstin", "cin", "city", "state", "contact_name", "contact_mobile", "contact_email"] as const;

const HEADERS: Record<keyof BulkInputRow, string[]> = {
  companyName: ["companyname", "company", "name", "legalname", "businessname", "buyer", "buyername"],
  gstin: ["gstin", "gst", "gstno", "gstnumber", "gstinuin"],
  cin: ["cin", "llpin", "cinllpin", "cinorllpin", "companyid"],
  city: ["city", "town", "district"],
  state: ["state"],
  contactName: ["contactname", "contact", "contactperson", "owner", "person"],
  contactMobile: ["contactmobile", "mobile", "phone", "mobileno", "mobilenumber", "phonenumber", "contactnumber", "whatsapp"],
  contactEmail: ["contactemail", "email", "emailid", "mail", "emailaddress"],
};
const headKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export const blankRow = (): BulkInputRow => ({ companyName: "", gstin: "", cin: "", city: "", state: "", contactName: "", contactMobile: "", contactEmail: "" });

/** Finds the template columns by heading (any order, common spellings) and returns the filled rows. */
export function tableRows(table: string[][]): BulkInputRow[] {
  if (!table.length) throw new AppError("validation_failed", "The file is empty.", { file: "The file is empty." });
  const head = table[0].map(headKey);
  const idx = Object.fromEntries((Object.keys(HEADERS) as (keyof BulkInputRow)[]).map((k) => [k, head.findIndex((h) => HEADERS[k].includes(h))])) as Record<keyof BulkInputRow, number>;
  if (idx.companyName < 0 && idx.gstin < 0 && idx.cin < 0) {
    throw new AppError("validation_failed", "No company_name, gstin or cin column found.", { file: "Use the template: it needs a company_name, gstin or cin column." });
  }
  const at = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");
  const rows = table.slice(1)
    .map((r) => Object.fromEntries((Object.keys(HEADERS) as (keyof BulkInputRow)[]).map((k) => [k, at(r, idx[k])])) as unknown as BulkInputRow)
    .filter((r) => Object.values(r).some(Boolean));
  if (!rows.length) throw new AppError("validation_failed", "The file has no rows.", { file: "The file has headings but no rows." });
  const max = bulkMaxRows();
  if (rows.length > max) throw new AppError("validation_failed", `Up to ${max} rows per file.`, { file: `Up to ${max} rows per file. Split the file and upload again.` });
  return rows;
}

export function parseBulkFile(bytes: Uint8Array, fileName: string): BulkInputRow[] {
  if (bytes.byteLength > BULK_MAX_FILE_BYTES) throw new AppError("validation_failed", "The file is over 2 MB.", { file: "The file is over 2 MB." });
  try {
    return tableRows(readSheet(bytes, fileName));
  } catch (e) {
    if (e instanceof SheetError) throw new AppError("validation_failed", e.message, { file: e.message });
    throw e;
  }
}

export function checkTyped(rows: BulkInputRow[]): BulkInputRow[] {
  const filled = rows.map((r) => ({ ...blankRow(), ...r })).filter((r) => r.companyName.trim() || r.gstin.trim() || r.cin.trim());
  if (!filled.length) throw new AppError("validation_failed", "Type at least one company.", { rows: "Type at least one company name, GSTIN or CIN." });
  const max = bulkMaxTyped();
  if (filled.length > max) throw new AppError("validation_failed", `Up to ${max} companies at a time.`, { rows: `Up to ${max} companies at a time.` });
  return filled;
}

export type RowKey = { kind: "gstin" | "cin" | "name"; value: string } | { kind: "invalid"; reason: string };

/** FR-BK-01: GSTIN first, then CIN/LLPIN, then the name. A filled but malformed GSTIN or CIN makes the row invalid. */
export function rowKey(r: BulkInputRow): RowKey {
  const gstin = normaliseIdentifier(r.gstin);
  const cin = normaliseIdentifier(r.cin);
  if (gstin) return isValidGstin(gstin) ? { kind: "gstin", value: gstin } : { kind: "invalid", reason: "badGstin" };
  if (cin) return isValidCin(cin) || isValidLlpin(cin) ? { kind: "cin", value: cin } : { kind: "invalid", reason: "badCin" };
  const name = normaliseName(r.companyName);
  if (name.replace(/\s/g, "").length < 3) return { kind: "invalid", reason: "shortName" };
  return { kind: "name", value: name };
}

/** The contact from the file, kept when it is usable (a valid mobile). */
export function rowContact(r: BulkInputRow): { name: string; mobile: string; email: string | null } | null {
  const mobile = normaliseMobile(r.contactMobile);
  if (!mobile || r.contactName.trim().length < 2) return null;
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.contactEmail.trim()) ? r.contactEmail.trim().toLowerCase() : null;
  return { name: r.contactName.trim().slice(0, 80), mobile, email };
}

export const TEMPLATE_CSV = `${TEMPLATE_COLUMNS.join(",")}\nOm Builders Private Limited,,,Pune,Maharashtra,Ramesh Patil,9876543210,accounts@example.com\n,29AAPFQ4691F2ZL,,,,,,\n,,U52609KA2022PTC158514,,,,,\n`;
