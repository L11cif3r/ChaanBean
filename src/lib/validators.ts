// Indian identifier validation used by every form and API (PRD S02, S06, S09, S12).
// Ported from the old repo's company-check/identifiers.ts and extended for Phase 1.

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const LLPIN_RE = /^[A-Z]{3}-[0-9]{4}$/;
export const DIN_RE = /^[0-9]{8}$/;
export const UDYAM_RE = /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/;
export const IEC_RE = /^[A-Z0-9]{10}$/;
export const PIN_RE = /^[1-9][0-9]{5}$/;
export const MOBILE_RE = /^[6-9][0-9]{9}$/;

const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// GST state codes 01–38, plus 97 (other territory) and 99 (centre jurisdiction).
const VALID_STATE_CODES = new Set([
  ...Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")),
  "97",
  "99",
]);

/** 4th character of a PAN: who holds it. */
export const PAN_HOLDER_TYPES = {
  P: "Individual",
  C: "Company",
  H: "Hindu Undivided Family",
  F: "Firm or LLP",
  E: "Limited Liability Partnership",
  A: "Association of Persons",
  T: "Trust",
  B: "Body of Individuals",
  L: "Local Authority",
  J: "Artificial Juridical Person",
  G: "Government",
  K: "Krishi (agricultural) entity",
} as const;
export type PanHolderType = keyof typeof PAN_HOLDER_TYPES;

export function normaliseIdentifier(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Mod-36 checksum used by GSTN for the 15th character. */
export function gstinChecksumChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = GSTIN_CHARSET.indexOf(first14[i]);
    if (value < 0) return "";
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARSET[(36 - (sum % 36)) % 36];
}

export function isValidGstin(raw: string): boolean {
  const v = normaliseIdentifier(raw);
  if (!GSTIN_RE.test(v)) return false;
  if (!VALID_STATE_CODES.has(v.slice(0, 2))) return false;
  if (!isValidPan(v.slice(2, 12))) return false;
  return gstinChecksumChar(v.slice(0, 14)) === v[14];
}

/** Format plus a known holder type in the 4th character (S02). */
export function isValidPan(raw: string): boolean {
  const v = normaliseIdentifier(raw);
  return PAN_RE.test(v) && v[3] in PAN_HOLDER_TYPES;
}

export function panHolderType(raw: string): PanHolderType | null {
  const v = normaliseIdentifier(raw);
  return isValidPan(v) ? (v[3] as PanHolderType) : null;
}

/** S06: an individual counterparty's PAN must have P as the 4th character. */
export const isIndividualPan = (raw: string) => panHolderType(raw) === "P";

export function isValidCin(raw: string, now = new Date()): boolean {
  const v = normaliseIdentifier(raw);
  if (!CIN_RE.test(v)) return false;
  const year = Number(v.slice(8, 12));
  return year >= 1850 && year <= now.getFullYear();
}

export const isValidLlpin = (raw: string) => LLPIN_RE.test(normaliseIdentifier(raw));
export const isValidDin = (raw: string) => DIN_RE.test(raw.trim());
export const isValidUdyam = (raw: string) => UDYAM_RE.test(normaliseIdentifier(raw));
export const isValidIec = (raw: string) => IEC_RE.test(normaliseIdentifier(raw));
export const isValidPinCode = (raw: string) => PIN_RE.test(raw.trim());

/** PAN embedded in a GSTIN (characters 3–12). */
export const panFromGstin = (gstin: string) => normaliseIdentifier(gstin).slice(2, 12);

/** GST state code of a GSTIN (first two digits). */
export const stateCodeFromGstin = (gstin: string) => normaliseIdentifier(gstin).slice(0, 2);

/**
 * Indian mobile number as 10 digits, or null. Accepts spaces, dashes, a leading 0, 91 or +91 (S01: "+91 fixed,
 * digits only, spaces ignored").
 */
export function normaliseMobile(raw: string): string | null {
  let d = raw.replace(/[\s\-()]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return MOBILE_RE.test(d) ? d : null;
}

export const isValidMobile = (raw: string) => normaliseMobile(raw) !== null;

/** E.164 form used by Supabase Auth phone sign-in. */
export const toE164 = (mobile10: string) => `+91${mobile10}`;
