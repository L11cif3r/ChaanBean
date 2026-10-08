// Identifier detection and validation for Company Check (PRD §11.2).

export type IdentifierType = "GSTIN" | "CIN" | "LLPIN" | "PAN" | "NAME";

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const LLPIN_RE = /^[A-Z]{3}-[0-9]{4}$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const DIN_RE = /^[0-9]{8}$/;

const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// GST state codes 01–38, plus 97 (other territory) and 99 (centre jurisdiction).
const VALID_STATE_CODES = new Set([
  ...Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, "0")),
  "97",
  "99",
]);

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
  return gstinChecksumChar(v.slice(0, 14)) === v[14];
}

export function isValidCin(raw: string, now = new Date()): boolean {
  const v = normaliseIdentifier(raw);
  if (!CIN_RE.test(v)) return false;
  const year = Number(v.slice(8, 12));
  return year >= 1850 && year <= now.getFullYear();
}

export const isValidLlpin = (raw: string) => LLPIN_RE.test(normaliseIdentifier(raw));
export const isValidPan = (raw: string) => PAN_RE.test(normaliseIdentifier(raw));

export function normaliseIdentifier(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export interface DetectedQuery {
  type: IdentifierType;
  value: string;
  /** Looks like an identifier of `type` but fails the format/checksum. */
  invalid: boolean;
}

/**
 * Work out what the user typed in the search box.
 * Shape-based first (length + character classes), then the strict check, so a GSTIN with a
 * wrong checksum is reported as an invalid GSTIN rather than searched as a name.
 */
export function detectQuery(raw: string): DetectedQuery {
  const compact = normaliseIdentifier(raw);
  if (/^[0-9]{2}[A-Z0-9]{13}$/.test(compact) && /[A-Z]/.test(compact)) {
    return { type: "GSTIN", value: compact, invalid: !isValidGstin(compact) };
  }
  if (/^[LU][0-9A-Z]{20}$/.test(compact)) {
    return { type: "CIN", value: compact, invalid: !isValidCin(compact) };
  }
  if (/^[A-Z]{3}-?[0-9]{4}$/.test(compact)) {
    const llpin = compact.includes("-") ? compact : `${compact.slice(0, 3)}-${compact.slice(3)}`;
    return { type: "LLPIN", value: llpin, invalid: !isValidLlpin(llpin) };
  }
  if (/^[A-Z]{5}[0-9A-Z]{4}[A-Z]$/.test(compact) && /[0-9]/.test(compact)) {
    return { type: "PAN", value: compact, invalid: !isValidPan(compact) };
  }
  return { type: "NAME", value: raw.trim().replace(/\s+/g, " "), invalid: false };
}

/** PAN embedded in a GSTIN (characters 3–12). */
export const panFromGstin = (gstin: string) => normaliseIdentifier(gstin).slice(2, 12);
