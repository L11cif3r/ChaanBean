import crypto from "crypto";

// PAN is personal data for proprietors: stored AES-256-GCM encrypted, plus a peppered SHA-256
// hash for exact-match lookup (PRD §11.1, §13.3). Keys come from the environment only.

function key(): Buffer | null {
  const raw = process.env.COMPANY_CHECK_PAN_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("COMPANY_CHECK_PAN_KEY must be 32 bytes, base64-encoded");
  return buf;
}

function pepper(): string {
  const p = process.env.COMPANY_CHECK_PAN_PEPPER;
  if (p) return p;
  if (process.env.NODE_ENV === "production") throw new Error("COMPANY_CHECK_PAN_PEPPER is required in production");
  return "dev-only-pepper";
}

export function panHash(pan: string): string {
  return crypto.createHash("sha256").update(`${pan.trim().toUpperCase()}:${pepper()}`).digest("hex");
}

/** Returns null when no key is configured (development); the hash is still stored. */
export function encryptPan(pan: string): Buffer | null {
  const k = key();
  if (!k) {
    if (process.env.NODE_ENV === "production") throw new Error("COMPANY_CHECK_PAN_KEY is required in production");
    return null;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(pan.trim().toUpperCase(), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decryptPan(blob: Buffer): string {
  const k = key();
  if (!k) throw new Error("COMPANY_CHECK_PAN_KEY not configured");
  const decipher = crypto.createDecipheriv("aes-256-gcm", k, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString("utf8");
}

/** Peppered SHA-256 for other personal identifiers (e.g. a signatory's email), lower-cased. */
export function hashPii(value: string): string {
  return crypto.createHash("sha256").update(`${value.trim().toLowerCase()}:${pepper()}`).digest("hex");
}
