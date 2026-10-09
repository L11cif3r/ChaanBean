import { describe, expect, it } from "vitest";
import { buildOtpMessage, configFromEnv, maskPhone, normalisePhone, sendWhatsAppOtp, type WhatsAppConfig } from "./whatsapp";

const CFG: WhatsAppConfig = {
  phoneNumberId: "1234567890",
  accessToken: "EAAG-test-token",
  templateName: "chaanbean_login_otp",
  language: "en",
  hasCopyButton: true,
  graphVersion: "v23.0",
};

function fakeFetch(status: number, body: unknown, throws = false) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (throws) throw new Error("ECONNRESET");
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { impl, calls };
}

describe("config", () => {
  it("needs phone number id, token and template; fills sensible defaults", () => {
    expect(configFromEnv(() => undefined)).toBeNull();
    const env: Record<string, string> = { WHATSAPP_PHONE_NUMBER_ID: "1", WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_OTP_TEMPLATE: "otp" };
    expect(configFromEnv((k) => env[k])).toMatchObject({ language: "en", hasCopyButton: true, graphVersion: "v23.0" });
    env.WHATSAPP_TEMPLATE_HAS_COPY_BUTTON = "false";
    expect(configFromEnv((k) => env[k])?.hasCopyButton).toBe(false);
  });
});

describe("message", () => {
  it("puts the code in the body and the copy-code button", () => {
    const m = buildOtpMessage("919876543210", "561166", CFG);
    expect(m).toMatchObject({ messaging_product: "whatsapp", to: "919876543210", type: "template", template: { name: "chaanbean_login_otp", language: { code: "en" } } });
    expect(m.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: "561166" }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "561166" }] },
    ]);
    expect(buildOtpMessage("91", "1", { ...CFG, hasCopyButton: false }).template.components).toHaveLength(1);
  });

  it("normalises and masks phone numbers", () => {
    expect(normalisePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalisePhone("123")).toBeNull();
    expect(maskPhone("+919876543210")).toBe("91******10");
  });
});

describe("sending", () => {
  it("calls the Cloud API with the token and returns the message id", async () => {
    const f = fakeFetch(200, { messages: [{ id: "wamid.ABC" }] });
    const r = await sendWhatsAppOtp({ phone: "+919876543210", otp: "561166" }, CFG, f.impl);
    expect(r).toEqual({ ok: true, messageId: "wamid.ABC" });
    expect(f.calls[0].url).toBe("https://graph.facebook.com/v23.0/1234567890/messages");
    expect((f.calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer EAAG-test-token");
    expect(JSON.parse(String(f.calls[0].init.body)).to).toBe("919876543210");
  });

  it("maps Meta errors to clear outcomes without leaking the OTP or number", async () => {
    const cases: [number, number, string][] = [
      [400, 131026, "NOT_ON_WHATSAPP"],
      [400, 130429, "RATE_LIMITED"],
      [401, 190, "AUTH"],
      [404, 132001, "TEMPLATE"],
      [500, 1, "PROVIDER_ERROR"],
    ];
    for (const [status, code, reason] of cases) {
      const r = await sendWhatsAppOtp({ phone: "+919876543210", otp: "561166" }, CFG, fakeFetch(status, { error: { code } }).impl);
      expect(r).toMatchObject({ ok: false, reason });
      expect(JSON.stringify(r)).not.toMatch(/561166|9876543210/);
    }
  });

  it("refuses to call out when not configured or the number is invalid; handles network failure", async () => {
    const f = fakeFetch(200, {});
    expect(await sendWhatsAppOtp({ phone: "+919876543210", otp: "1234" }, null, f.impl)).toMatchObject({ reason: "NOT_CONFIGURED" });
    expect(await sendWhatsAppOtp({ phone: "12", otp: "1234" }, CFG, f.impl)).toMatchObject({ reason: "INVALID_PHONE" });
    expect(f.calls).toHaveLength(0);
    expect(await sendWhatsAppOtp({ phone: "+919876543210", otp: "1234" }, CFG, fakeFetch(0, {}, true).impl)).toMatchObject({ reason: "PROVIDER_ERROR", httpCode: 503 });
  });
});
