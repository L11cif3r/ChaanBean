// Supabase Auth "Send SMS" hook → WhatsApp.
// Supabase Auth generates the login OTP and calls this function (signed with Standard Webhooks);
// we deliver the code as a WhatsApp authentication template via the Meta Cloud API.
//
// Secrets: SEND_SMS_HOOK_SECRET (from Auth → Hooks, "v1,whsec_…") + the WHATSAPP_* values in whatsapp.ts.
// Deployed with verify_jwt = false: Supabase Auth authenticates with the webhook signature, not a JWT.

import { Webhook } from "npm:standardwebhooks@1.0.0";
import { configFromEnv, maskPhone, sendWhatsAppOtp } from "./whatsapp.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const hookError = (http_code: number, message: string) => json({ error: { http_code, message } }, http_code);

Deno.serve(async (req) => {
  if (req.method !== "POST") return hookError(405, "Method not allowed");

  const secret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  if (!secret) return hookError(500, "WhatsApp login is not configured yet.");

  const payload = await req.text();
  let event: { user?: { id?: string; phone?: string }; sms?: { otp?: string } };
  try {
    event = new Webhook(secret.replace(/^v1,whsec_/, "")).verify(payload, Object.fromEntries(req.headers)) as typeof event;
  } catch {
    return hookError(401, "Invalid signature");
  }

  const phone = event.user?.phone ?? "";
  const otp = event.sms?.otp ?? "";
  const result = await sendWhatsAppOtp({ phone, otp }, configFromEnv((k) => Deno.env.get(k)));

  if (!result.ok) {
    // Never log the OTP or the full number.
    console.error(JSON.stringify({ event: "whatsapp_otp_failed", user: event.user?.id, phone: maskPhone(phone), reason: result.reason }));
    return hookError(result.httpCode, result.message);
  }
  console.log(JSON.stringify({ event: "whatsapp_otp_sent", user: event.user?.id, phone: maskPhone(phone), message_id: result.messageId }));
  return json({});
});
