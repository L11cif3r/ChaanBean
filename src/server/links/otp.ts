import "server-only";
import crypto from "node:crypto";
import { decryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { serverEnv } from "@/server/env";
import { AppError } from "@/server/errors";
import { otpSender } from "@/server/providers/otp";

// OTPs on single-purpose link pages for people without an account: accepting an agreement (S15) or an E-Settlement.
// The code goes to the mobile on record through the OTP provider (dummy: nothing sent, code 123456); only its HMAC is
// kept in app_private.link_otps. 5 minutes, 5 wrong tries, 5 sends an hour, 30 seconds between sends.

export type LinkSubject = "transaction" | "settlement";

const OTP_MS = 5 * 60_000;
const OTP_ATTEMPTS = 5;
const OTP_SENDS_PER_HOUR = 5;
export const RESEND_AFTER_MS = 30_000;

const PREFIX: Record<LinkSubject, string> = { transaction: "tx-otp", settlement: "st-otp" };

const codeHash = (subject: LinkSubject, id: string, code: string) =>
  crypto.createHmac("sha256", serverEnv().SESSION_COOKIE_SECRET).update(`${PREFIX[subject]}:${id}:${code}`).digest("hex");
const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** "Android Chrome", "iOS Safari"…: the device line of the acceptance record. */
export const deviceOf = (ua: string | null) => {
  if (!ua) return null;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${os} ${browser}`;
};

export async function sendLinkOtp(
  subject: LinkSubject,
  id: string,
  to: { mobileCiphertext: string; mobileMasked: string },
  requester: string,
) {
  const db = sql();
  const sends = await db<{ sent_at: Date }[]>`
    select sent_at from app_private.link_otps
     where subject_type = ${subject} and subject_id = ${id} and sent_at > now() - interval '1 hour' order by sent_at`;
  const last = sends.at(-1)?.sent_at;
  if (last && Date.now() - last.getTime() < RESEND_AFTER_MS) throw new AppError("rate_limited", "Please wait a few seconds before asking for a new code.");
  if (sends.length >= OTP_SENDS_PER_HOUR) throw new AppError("rate_limited", "Too many codes asked for. Please try again in an hour.");
  const sent = await otpSender().send({
    mobile10: decryptField(to.mobileCiphertext, "counterparties.mobile"),
    purpose: subject === "transaction" ? "agreement" : "settlement",
    requester,
  });
  await db`
    insert into app_private.link_otps (subject_type, subject_id, code_hash, ref, expires_at)
    values (${subject}, ${id}, ${codeHash(subject, id, sent.code)}, ${sent.ref}, ${new Date(Date.now() + OTP_MS)})`;
  return { sentTo: to.mobileMasked, resendAfterSeconds: RESEND_AFTER_MS / 1000 };
}

/** Checks the OTP in the same step as the decision (v3 15.3). Returns the OTP reference for the record. */
export async function checkLinkOtp(subject: LinkSubject, id: string, code: string) {
  const db = sql();
  const [otp] = await db<{ id: string; code_hash: string; ref: string; expires_at: Date; attempts: number }[]>`
    select id, code_hash, ref, expires_at, attempts from app_private.link_otps
     where subject_type = ${subject} and subject_id = ${id} and verified_at is null order by sent_at desc limit 1`;
  if (!otp || otp.expires_at <= new Date()) throw new AppError("validation_failed", "This code has expired.", { otp: "This code has expired. Send a new one." });
  if (otp.attempts >= OTP_ATTEMPTS) throw new AppError("validation_failed", "Too many wrong codes.", { otp: "Too many wrong codes. Send a new one." });
  if (!/^\d{6}$/.test(code) || !safeEqual(otp.code_hash, codeHash(subject, id, code))) {
    const [{ attempts }] = await db<{ attempts: number }[]>`update app_private.link_otps set attempts = attempts + 1 where id = ${otp.id} returning attempts`;
    const left = OTP_ATTEMPTS - attempts;
    throw new AppError("validation_failed", "The OTP is incorrect.", { otp: left > 0 ? `The OTP is incorrect. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Send a new one." });
  }
  await db`update app_private.link_otps set verified_at = now() where id = ${otp.id}`;
  return otp.ref;
}
