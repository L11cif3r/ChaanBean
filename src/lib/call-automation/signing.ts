// Signed provider callbacks. The callback URL carries `attempt=<id>&sig=<hmac>`; a request without a valid
// signature is rejected, so a third party cannot forge "payment"/"completed" outcomes for an attempt.

import crypto from "crypto";

function secret(): string | null {
  const s = process.env.COLLECT_WEBHOOK_SECRET;
  return s && s.length >= 16 ? s : null;
}

export function signAttempt(attemptId: string): string {
  const s = secret();
  if (!s) throw new Error("COLLECT_WEBHOOK_SECRET is not configured (min 16 chars).");
  return crypto.createHmac("sha256", s).update(attemptId).digest("hex");
}

/** Fails closed: no secret configured means nothing verifies. */
export function verifyAttemptSignature(attemptId: string, sig: string | null | undefined): boolean {
  const s = secret();
  if (!s || !sig) return false;
  const expected = crypto.createHmac("sha256", s).update(attemptId).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// ---- Trusted server-to-server payment events (Feature 2 / reconciliation jobs) ----------------------------
// Signature = HMAC-SHA256(COLLECT_PAYMENT_WEBHOOK_SECRET, `${timestamp}.${rawBody}`), sent as
// `x-collect-timestamp` (unix seconds, accepted within 5 minutes) and `x-collect-signature` (hex).

export const PAYMENT_EVENT_TOLERANCE_SECONDS = 300;

function paymentSecret(): string | null {
  const s = process.env.COLLECT_PAYMENT_WEBHOOK_SECRET;
  return s && s.length >= 16 ? s : null;
}

export function signPaymentEvent(timestamp: string, rawBody: string): string {
  const s = paymentSecret();
  if (!s) throw new Error("COLLECT_PAYMENT_WEBHOOK_SECRET is not configured (min 16 chars).");
  return crypto.createHmac("sha256", s).update(`${timestamp}.${rawBody}`).digest("hex");
}

/** Fails closed: no secret, stale timestamp, or bad signature => false. */
export function verifyPaymentEvent(timestamp: string | null, signature: string | null, rawBody: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const s = paymentSecret();
  if (!s || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > PAYMENT_EVENT_TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac("sha256", s).update(`${timestamp}.${rawBody}`).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
