// Delivers a login OTP as a WhatsApp "authentication" template message through the
// Meta WhatsApp Cloud API. Runtime-neutral (no Deno or Node APIs) so it can be unit-tested.
//
// Config (Supabase Edge Function secrets):
//   WHATSAPP_PHONE_NUMBER_ID   WhatsApp Business phone number id (Meta → WhatsApp → API setup)
//   WHATSAPP_ACCESS_TOKEN      permanent System User access token with whatsapp_business_messaging
//   WHATSAPP_OTP_TEMPLATE      name of the approved authentication template, e.g. "chaanbean_login_otp"
//   WHATSAPP_TEMPLATE_LANG     template language code, default "en"
//   WHATSAPP_TEMPLATE_HAS_COPY_BUTTON  "true" (default) when the template has a copy-code / one-tap button
//   WHATSAPP_GRAPH_VERSION     Graph API version, default below; keep it on a supported version

export const DEFAULT_GRAPH_VERSION = "v23.0";

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  language: string;
  hasCopyButton: boolean;
  graphVersion: string;
}

export function configFromEnv(get: (name: string) => string | undefined): WhatsAppConfig | null {
  const phoneNumberId = get("WHATSAPP_PHONE_NUMBER_ID")?.trim();
  const accessToken = get("WHATSAPP_ACCESS_TOKEN")?.trim();
  const templateName = get("WHATSAPP_OTP_TEMPLATE")?.trim();
  if (!phoneNumberId || !accessToken || !templateName) return null;
  return {
    phoneNumberId,
    accessToken,
    templateName,
    language: get("WHATSAPP_TEMPLATE_LANG")?.trim() || "en",
    hasCopyButton: (get("WHATSAPP_TEMPLATE_HAS_COPY_BUTTON") ?? "true").trim().toLowerCase() !== "false",
    graphVersion: get("WHATSAPP_GRAPH_VERSION")?.trim() || DEFAULT_GRAPH_VERSION,
  };
}

/** "+91 98765-43210" → "919876543210". Returns null if it isn't a plausible E.164 number. */
export function normalisePhone(phone: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** For logs: keep the country code and last 2 digits only. */
export function maskPhone(phone: string): string {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length < 6 ? "***" : `${d.slice(0, 2)}******${d.slice(-2)}`;
}

/** Message body for an authentication template: the code fills {{1}} and, if present, the copy-code button. */
export function buildOtpMessage(to: string, otp: string, cfg: Pick<WhatsAppConfig, "templateName" | "language" | "hasCopyButton">) {
  const components: Record<string, unknown>[] = [{ type: "body", parameters: [{ type: "text", text: otp }] }];
  if (cfg.hasCopyButton) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] });
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: { name: cfg.templateName, language: { code: cfg.language }, components },
  };
}

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; httpCode: number; reason: "NOT_CONFIGURED" | "INVALID_PHONE" | "NOT_ON_WHATSAPP" | "RATE_LIMITED" | "AUTH" | "TEMPLATE" | "PROVIDER_ERROR"; message: string };

// Meta error codes we map to clear outcomes. Anything else is a provider error.
const RATE_LIMIT_CODES = new Set([4, 80007, 130429, 131048, 131056]);
const NOT_ON_WHATSAPP_CODES = new Set([131026]);
const AUTH_CODES = new Set([190, 10, 200]);
const TEMPLATE_CODES = new Set([132000, 132001, 132005, 132007, 132012, 132015, 132016]);

/**
 * Sends the OTP. The OTP and the full phone number never appear in returned messages, so the
 * result is safe to log and to pass back to Supabase Auth (which shows it to the user).
 */
export async function sendWhatsAppOtp(
  input: { phone: string; otp: string },
  cfg: WhatsAppConfig | null,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  if (!cfg) return { ok: false, httpCode: 500, reason: "NOT_CONFIGURED", message: "WhatsApp login is not configured yet." };
  const to = normalisePhone(input.phone);
  if (!to) return { ok: false, httpCode: 400, reason: "INVALID_PHONE", message: "Enter a valid mobile number with country code." };
  if (!/^[0-9]{4,10}$/.test(input.otp ?? "")) return { ok: false, httpCode: 500, reason: "PROVIDER_ERROR", message: "Could not prepare the code. Try again." };

  let res: Response;
  try {
    res = await fetchImpl(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildOtpMessage(to, input.otp, cfg)),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, httpCode: 503, reason: "PROVIDER_ERROR", message: "Could not reach WhatsApp. Try again." };
  }

  let body: { messages?: { id?: string }[]; error?: { code?: number; error_subcode?: number } } = {};
  try {
    body = await res.json();
  } catch {
    // fall through with empty body
  }
  const id = body.messages?.[0]?.id;
  if (res.ok && id) return { ok: true, messageId: id };

  const code = body.error?.code ?? -1;
  if (RATE_LIMIT_CODES.has(code) || res.status === 429)
    return { ok: false, httpCode: 429, reason: "RATE_LIMITED", message: "Too many codes requested. Wait a minute and try again." };
  if (NOT_ON_WHATSAPP_CODES.has(code))
    return { ok: false, httpCode: 400, reason: "NOT_ON_WHATSAPP", message: "We couldn't deliver the code on WhatsApp to this number." };
  if (AUTH_CODES.has(code) || res.status === 401)
    return { ok: false, httpCode: 500, reason: "AUTH", message: "WhatsApp login is temporarily unavailable." };
  if (TEMPLATE_CODES.has(code))
    return { ok: false, httpCode: 500, reason: "TEMPLATE", message: "WhatsApp login is temporarily unavailable." };
  return { ok: false, httpCode: 502, reason: "PROVIDER_ERROR", message: "Could not send the code on WhatsApp. Try again." };
}
