import "server-only";
import crypto from "node:crypto";

// Field-level encryption for PII (PRD section 15: PAN, mobile, email, address, Aadhaar last 4) and blind indexes for
// exact-match search on encrypted fields. Ported from the old repo's company-check/pan-crypto.ts.
//
// Ciphertext format: "v1.<keyId>.<base64(iv | tag | data)>". The key id lets keys rotate without re-encrypting
// everything at once. Today keys come from the environment; a KMS-backed KeyProvider replaces EnvKeyProvider in
// production without changing callers.

export interface KeyProvider {
  /** Id written into ciphertexts produced now. */
  currentKeyId(): string;
  /** 32-byte AES key for an id found in a ciphertext. */
  dataKey(keyId: string): Buffer;
  /** 32-byte HMAC key for blind indexes. Never rotated without re-indexing. */
  indexKey(): Buffer;
}

function decode32(name: string, raw: string | undefined): Buffer {
  if (!raw) throw new Error(`${name} is not configured`);
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error(`${name} must be 32 bytes, base64-encoded`);
  return buf;
}

export class EnvKeyProvider implements KeyProvider {
  constructor(private readonly env: Record<string, string | undefined> = process.env) {}
  currentKeyId() {
    return "env1";
  }
  dataKey(keyId: string) {
    if (keyId !== "env1") throw new Error(`Unknown encryption key id ${keyId}`);
    return decode32("FIELD_ENCRYPTION_KEY", this.env.FIELD_ENCRYPTION_KEY);
  }
  indexKey() {
    return decode32("BLIND_INDEX_KEY", this.env.BLIND_INDEX_KEY);
  }
}

let provider: KeyProvider = new EnvKeyProvider();

/** For tests and for switching to KMS at start-up. */
export function setKeyProvider(p: KeyProvider) {
  provider = p;
}

/**
 * Encrypts a value. `context` (for example "counterparties.mobile") is bound to the ciphertext, so a value copied into
 * another column will not decrypt.
 */
export function encryptField(plain: string, context: string): string {
  const keyId = provider.currentKeyId();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", provider.dataKey(keyId), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1.${keyId}.${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")}`;
}

export function decryptField(ciphertext: string, context: string): string {
  const [version, keyId, body] = ciphertext.split(".");
  if (version !== "v1" || !keyId || !body) throw new Error("Unrecognised ciphertext format");
  const blob = Buffer.from(body, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", provider.dataKey(keyId), blob.subarray(0, 12));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString("utf8");
}

/**
 * Keyed hash for exact-match lookup on an encrypted field. `purpose` separates indexes ("pan", "mobile", "email") so
 * equal strings in different fields do not collide. Callers normalise the value first (validators.ts).
 */
export function blindIndex(value: string, purpose: string): string {
  return crypto.createHmac("sha256", provider.indexKey()).update(`${purpose}:${value}`).digest("hex");
}
