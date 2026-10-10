// Debtor phone numbers are personal data: stored encrypted (AES-256-GCM), shown masked, never logged.

import crypto from "crypto";
import { AppError } from "../company-check/errors";

/** Accepts 9876543210, 09876543210, 919876543210, +91 98765 43210 ... returns E.164 or null. */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export const last4 = (e164: string) => e164.slice(-4);
export const maskPhone = (l4: string) => `+91 ••••• ••${l4.slice(-4).padStart(4, "•").slice(-4)}`;

function key(): Buffer {
  const raw = process.env.COLLECT_PII_KEY;
  const k = raw ? Buffer.from(raw, "base64") : null;
  // Fail closed: never fall back to a default key.
  if (!k || k.length !== 32) {
    throw new AppError(500, "PII_KEY_NOT_CONFIGURED", "Data encryption is not configured on the server.");
  }
  return k;
}

/** iv(12) | tag(16) | ciphertext */
export function encryptPhone(e164: string): Buffer {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(e164, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}

export function decryptPhone(blob: Buffer): string {
  const d = crypto.createDecipheriv("aes-256-gcm", key(), blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([d.update(blob.subarray(28)), d.final()]).toString("utf8");
}
