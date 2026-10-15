import "server-only";
import { blindIndex } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { otpState, type OtpEvent, type OtpState } from "./otp-limits";

// Records OTP sends and results per phone (blind index only: no phone numbers or OTP values are stored).

export const phoneHash = (mobile10: string) => blindIndex(mobile10, "mobile");

export async function currentOtpState(mobile10: string, now = new Date()): Promise<OtpState> {
  const rows = await sql()<OtpEvent[]>`
    select kind, at from app_private.otp_events
     where phone_hash = ${phoneHash(mobile10)} and at > now() - interval '1 hour'`;
  return otpState(rows, now);
}

export async function recordOtpEvent(mobile10: string, kind: OtpEvent["kind"], ip: string | null) {
  await sql()`insert into app_private.otp_events (phone_hash, kind, ip) values (${phoneHash(mobile10)}, ${kind}, ${ip}::inet)`;
}
