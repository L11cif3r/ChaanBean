import crypto from "crypto";

/**
 * GSTN & API Setu Request Payload Encryption Adapter
 * 
 * Requirement from API Setu GSTN v1.0.1 OpenAPI Specification:
 * "The request payload must be encrypted and Base64 encoded before being sent to the API."
 * 
 * Current Technical Status:
 * 1. The OpenAPI specification (apisetu_taxpayers_gstn_reg_1_0_1.yaml) specifies that request
 *    payloads must be encrypted and Base64 encoded, but the schema definition does not provide
 *    a public RSA certificate, shared symmetric AES secret, initialization vector (IV), or 
 *    encryption headers.
 * 2. In API Setu UAT (beta.api-setu.in), sending the standard JSON payload directly via HTTP POST
 *    is accepted by the gateway and successfully routed to the GSTN backend (returning official
 *    GSTN status codes such as INTR_002).
 * 3. In production, API Setu typically issues an AES-256-CBC key (or RSA public key certificate)
 *    associated with the subscriber's Client ID (com.chaanbean).
 * 
 * Configuration:
 * - GSTN_ENCRYPTION_ENABLED: Set to "true" to enforce AES-256-CBC / Base64 encryption.
 * - GSTN_ENCRYPTION_KEY: 32-byte (256-bit) hexadecimal or base64 key provided by API Setu / GSTN.
 * - GSTN_ENCRYPTION_IV: 16-byte initialization vector (optional; randomly generated if omitted).
 */

export interface EncryptedPayloadResult {
  body: string | Record<string, unknown>;
  isEncrypted: boolean;
  contentType: string;
  notes?: string;
}

/**
 * Encrypts or formats a GSTN request payload prior to transmission.
 *
 * @param payload Plain JSON request object (e.g. initiate or validate parameters)
 * @returns Encrypted payload string or raw JSON structure for transmission
 */
export function encryptGSTNPayload(payload: Record<string, unknown>): EncryptedPayloadResult {
  const encryptionEnabled = process.env.GSTN_ENCRYPTION_ENABLED === "true";
  const encryptionKey = process.env.GSTN_ENCRYPTION_KEY;

  if (encryptionEnabled) {
    if (!encryptionKey) {
      throw new Error(
        "GSTN Encryption Misconfiguration: GSTN_ENCRYPTION_ENABLED is true, but GSTN_ENCRYPTION_KEY is missing. " +
        "Please configure the 256-bit key provided by API Setu / GSTN for client 'com.chaanbean'."
      );
    }

    try {
      const jsonStr = JSON.stringify(payload);
      
      // Parse key buffer (support hex or utf8)
      const keyBuffer = Buffer.isBuffer(encryptionKey)
        ? encryptionKey
        : encryptionKey.length === 64
        ? Buffer.from(encryptionKey, "hex")
        : Buffer.from(encryptionKey.slice(0, 32), "utf8");

      // 16-byte IV (either configured or generated)
      const ivBuffer = process.env.GSTN_ENCRYPTION_IV
        ? Buffer.from(process.env.GSTN_ENCRYPTION_IV.slice(0, 16), "utf8")
        : crypto.randomBytes(16);

      const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, ivBuffer);
      let encrypted = cipher.update(jsonStr, "utf8", "base64");
      encrypted += cipher.final("base64");

      // Standard API Setu envelope: prepend or bundle IV if required
      return {
        body: JSON.stringify({
          data: encrypted,
          iv: ivBuffer.toString("base64"),
        }),
        isEncrypted: true,
        contentType: "application/json",
        notes: "AES-256-CBC PKCS7 encrypted and Base64 encoded payload",
      };
    } catch (err) {
      throw new Error(
        `Failed to execute GSTN payload encryption: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // UAT mode: API Setu UAT server (beta.api-setu.in) accepts direct JSON
  return {
    body: payload,
    isEncrypted: false,
    contentType: "application/json",
    notes: "Direct JSON transmission active for API Setu UAT environment. To enable encryption, set GSTN_ENCRYPTION_ENABLED=true and provide GSTN_ENCRYPTION_KEY.",
  };
}
