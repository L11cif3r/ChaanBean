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
