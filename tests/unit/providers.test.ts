import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chain, PROVIDER_KEYS, providerStatus, SERVICES } from "@/server/providers/registry";
import { checkProvider } from "@/server/providers/checks";
import { caseProvider } from "@/server/providers/cases";
import { identityProvider } from "@/server/providers/identity";

// The provider switchboard (docs/PROVIDERS.md): dummies by default, real providers by environment variable,
// fallback down the chain, and a plain report of missing keys.
const saved = { ...process.env };
// Start every test from the dummies, whatever the developer has switched on in .env.local.
beforeEach(() => {
  for (const k of Object.keys(process.env)) if (k.startsWith("PROVIDER_")) delete process.env[k];
});
afterEach(() => {
  for (const k of Object.keys(process.env)) if (k.startsWith("PROVIDER_") || k.includes("ZOOP") || k.includes("SUREPASS")) delete process.env[k];
  Object.assign(process.env, saved);
});

describe("provider switchboard", () => {
  it("uses the dummy when nothing is set, and stops on a typo", () => {
    expect(chain("CW_MSME", {})).toEqual(["mock"]);
    expect(chain("CW_MSME", { PROVIDER_CW_MSME: " Zoop , surepass " })).toEqual(["zoop", "surepass"]);
    expect(() => chain("CW_MSME", { PROVIDER_CW_MSME: "zoopp" })).toThrow(/unknown provider zoopp/);
  });

  it("knows the keys of every real provider it lists", () => {
    for (const names of Object.values(SERVICES)) for (const n of names) expect(PROVIDER_KEYS[n], n).toBeDefined();
  });

  it("reports which keys a chosen provider still needs, by name only", () => {
    const s = providerStatus({ PROVIDER_CW_MSME: "zoop", ZOOP_APP_ID: "x" }).find((p) => p.service === "CW_MSME")!;
    expect(s).toEqual({ service: "CW_MSME", providers: ["zoop"], missingKeys: ["ZOOP_API_KEY"] });
  });

  it("answers 'not connected' for a real provider whose adapter is not written, and falls back down the chain", async () => {
    const subject = { type: "business_gstin" as const, gstin: "27AABCK1234K1Z5", pan: "AABCK1234K", cin: null, udyam: null, iec: null, legalName: "Om Builders", stateCode: "27" };
    process.env.PROVIDER_CW_PAN = "surepass";
    const alone = await checkProvider().run("CW_PAN", subject, { today: "2026-10-18" });
    expect(alone).toMatchObject({ status: "not_available", provider: "surepass", error: { code: "PROVIDER_NOT_CONNECTED" } });
    expect(alone.error?.message).toMatch(/SUREPASS_API_TOKEN is not set/);
    process.env.PROVIDER_CW_PAN = "surepass,mock";
    expect((await checkProvider().run("CW_PAN", subject, { today: "2026-10-18" })).status).toBe("success");
    expect(checkProvider().isMock).toBe(false);
  });

  it("switches Case Check and sign-up providers the same way", async () => {
    process.env.PROVIDER_CC_AML = "signzy";
    const r = await caseProvider().run("CC_AML", { name: "X", state: "29", district: "B", address: "A" }, { today: "2026-10-18" });
    expect(r.error?.code).toBe("PROVIDER_NOT_CONNECTED");
    expect(identityProvider().isMock).toBe(true);
    process.env.PROVIDER_IDENTITY = "surepass";
    expect(identityProvider()).toMatchObject({ name: "surepass", isMock: false });
  });
});

describe("Supabase Send SMS hook signature (v4 11.1)", () => {
  it("accepts a Standard Webhooks signature and refuses a wrong or old one", async () => {
    const { verifyStandardWebhook } = await import("@/server/auth/sms-hook");
    const crypto = await import("node:crypto");
    const key = crypto.randomBytes(24);
    const secret = `v1,whsec_${key.toString("base64")}`;
    const raw = JSON.stringify({ user: { phone: "919000000001" }, sms: { otp: "123456" } });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac("sha256", key).update(`msg_1.${ts}.${raw}`).digest("base64");
    const h = (s: string, t = ts) => new Headers({ "webhook-id": "msg_1", "webhook-timestamp": t, "webhook-signature": `v1,${s}` });
    expect(verifyStandardWebhook(raw, h(sig), secret)).toBe(true);
    expect(verifyStandardWebhook(raw + " ", h(sig), secret)).toBe(false);
    expect(verifyStandardWebhook(raw, h(sig, String(Number(ts) - 3600)), secret)).toBe(false);
  });
});
