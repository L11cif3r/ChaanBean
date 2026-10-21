import "server-only";
import { requireKeys } from "@/server/providers/registry";

// Fast2SMS on the DLT route (PRD v4.0 11.1, C13 to confirm): SMS OTP to any Indian number through the registered
// entity, header (sender id, e.g. CHNBNI) and OTP template. Keys: FAST2SMS_API_KEY, FAST2SMS_SENDER_ID (DLT header),
// FAST2SMS_DLT_TEMPLATE_ID (the message id Fast2SMS shows for the approved template, whose only variable is the code).
// Template text to register: "{#var#} is your ChaanBean login OTP. Valid for 5 minutes. Do not share it with anyone."

const env = (k: string) => process.env[k]?.replace(/^["']|["']$/g, "").trim() ?? "";

export async function sendDltOtp(mobile10: string, code: string): Promise<{ ref: string }> {
  requireKeys("fast2sms");
  if (!/^[6-9]\d{9}$/.test(mobile10)) throw new Error("Fast2SMS needs a 10-digit Indian mobile number.");
  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: { authorization: env("FAST2SMS_API_KEY"), "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      route: "dlt",
      sender_id: env("FAST2SMS_SENDER_ID"),
      message: env("FAST2SMS_DLT_TEMPLATE_ID"),
      variables_values: code,
      numbers: mobile10,
      flash: 0,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { return?: boolean; request_id?: string; message?: string | string[] };
  if (!res.ok || body.return !== true) {
    const why = Array.isArray(body.message) ? body.message.join(" ") : body.message ?? `HTTP ${res.status}`;
    throw new Error(`Fast2SMS did not send the OTP: ${why}`);
  }
  return { ref: body.request_id ?? "fast2sms" };
}
