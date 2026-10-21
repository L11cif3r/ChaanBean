import "server-only";
import crypto from "node:crypto";
import { AppError } from "@/server/errors";
import { primary } from "@/server/providers/registry";
import { sendDltOtp } from "@/server/providers/sms/fast2sms";

// Supabase Auth "Send SMS" hook (PRD v4.0 11.1): Supabase makes the sign-in code and calls this endpoint instead of
// its own SMS provider; we deliver it through Fast2SMS on the DLT route. The call is signed the Standard Webhooks
// way with SEND_SMS_HOOK_SECRET ("v1,whsec_<base64>" from the Supabase dashboard). To switch on: set
// PROVIDER_SMS=fast2sms and the Fast2SMS keys, then add this URL as the Send SMS hook in Supabase Auth > Hooks.

const TOLERANCE_S = 5 * 60;

export function verifyStandardWebhook(raw: string, headers: Headers, secret: string, now = Date.now()): boolean {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigs = headers.get("webhook-signature");
  if (!id || !ts || !sigs || !/^\d+$/.test(ts)) return false;
  if (Math.abs(now / 1000 - Number(ts)) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest();
  return sigs.split(" ").some((s) => {
    const [version, value] = s.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

export async function handleSmsHook(raw: string, headers: Headers) {
  const secret = process.env.SEND_SMS_HOOK_SECRET?.trim();
  if (!secret || primary("sms") !== "fast2sms") throw new AppError("not_found", "This hook is not switched on.");
  if (!verifyStandardWebhook(raw, headers, secret)) throw new AppError("unauthenticated", "Bad signature.");
  const body = JSON.parse(raw) as { user?: { phone?: string }; sms?: { otp?: string } };
  const mobile = (body.user?.phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const otp = body.sms?.otp ?? "";
  if (!/^\d{10}$/.test(mobile) || !/^\d{4,8}$/.test(otp)) throw new AppError("validation_failed", "Missing phone or code.");
  await sendDltOtp(mobile, otp);
  return {};
}
