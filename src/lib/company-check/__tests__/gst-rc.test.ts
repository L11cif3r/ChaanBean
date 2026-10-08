import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApiSetuGstRcProvider } from "../providers/gst-rc";
import { maskEmail } from "../gst-verification";

const GSTIN = "27AAPFU0939F1ZV";
const PDF_B64 = Buffer.from("%PDF-1.4 test certificate").toString("base64");

function fakeFetch(respond: (url: string, init: RequestInit) => { status?: number; body?: unknown; throws?: Error }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const r = respond(String(url), init ?? {});
    if (r.throws) throw r.throws;
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  }) as typeof fetch;
  return { impl, calls };
}

const saved = { ...process.env };
beforeEach(() => {
  process.env.GSTN_API_KEY = "test-api-key";
  process.env.GSTN_CLIENT_ID = "com.test";
  process.env.GSTN_BASE_URL = "https://beta.api-setu.in";
  process.env.GSTN_ENCRYPTION_ENABLED = "false";
});
afterEach(() => {
  process.env = { ...saved };
});

describe("API Setu GST registration certificate adapter", () => {
  it("sends the OTP request with API Setu headers and returns the transaction id", async () => {
    const f = fakeFetch(() => ({ body: { status_cd: "1", data: { txnId: "TXN1", message: "OTP sent" } } }));
    const r = await createApiSetuGstRcProvider({ fetchImpl: f.impl }).initiate({ gstin: GSTIN, legalName: "ACME LTD", signatoryEmail: "a@b.in" });
    expect(r).toMatchObject({ ok: true, data: { txnId: "TXN1" } });
    expect(f.calls[0].url).toBe("https://beta.api-setu.in/mof/gst/srv/govtapiext/v1.0/rc/initiate");
    const h = f.calls[0].init.headers as Record<string, string>;
    expect(h.action).toBe("INITIATE");
    expect(h["X-APISETU-CLIENTID"]).toBe("com.test");
    expect(JSON.parse(String(f.calls[0].init.body))).toEqual({ gstin: GSTIN, legalName: "ACME LTD", emailId_pas: "a@b.in" });
  });

  it("reports wrong details as DETAILS_MISMATCH", async () => {
    const f = fakeFetch(() => ({ status: 400, body: { status_cd: "0", error: { errorCode: "INTR_002", message: "x" } } }));
    const r = await createApiSetuGstRcProvider({ fetchImpl: f.impl }).initiate({ gstin: GSTIN, legalName: "WRONG", signatoryEmail: "a@b.in" });
    expect(r).toMatchObject({ ok: false, code: "DETAILS_MISMATCH", providerCode: "INTR_002" });
  });

  it("returns the certificate after a correct OTP", async () => {
    const f = fakeFetch(() => ({
      body: { status_cd: "1", data: { txnId: "TXN1", rcPdf: PDF_B64, data: { gstin: GSTIN, legalName: "ACME LTD", tradeName: "ACME", constitutionOfBusiness: "Public Limited Company" } } },
    }));
    const r = await createApiSetuGstRcProvider({ fetchImpl: f.impl }).validate({ gstin: GSTIN, otp: "123456", txnId: "TXN1" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ legalName: "ACME LTD", tradeName: "ACME", constitution: "Public Limited Company" });
      expect(r.data.pdf.subarray(0, 5).toString()).toBe("%PDF-");
    }
    expect((f.calls[0].init.headers as Record<string, string>).action).toBe("VALIDATE");
  });

  it("maps a wrong OTP, an expired OTP, a non-PDF certificate and a different GSTIN", async () => {
    const wrong = fakeFetch(() => ({ status: 400, body: { status_cd: "0", error: { errorCode: "INTR_006", message: "Invalid OTP" } } }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: wrong.impl }).validate({ gstin: GSTIN, otp: "000000", txnId: "T" })).toMatchObject({ ok: false, code: "OTP_INCORRECT" });
    const expired = fakeFetch(() => ({ status: 400, body: { status_cd: "0", error: { message: "OTP has expired" } } }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: expired.impl }).validate({ gstin: GSTIN, otp: "000000", txnId: "T" })).toMatchObject({ ok: false, code: "OTP_EXPIRED" });
    const notPdf = fakeFetch(() => ({ body: { status_cd: "1", data: { rcPdf: Buffer.from("hello").toString("base64"), data: { gstin: GSTIN, legalName: "X" } } } }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: notPdf.impl }).validate({ gstin: GSTIN, otp: "1", txnId: "T" })).toMatchObject({ ok: false, code: "ERROR" });
    const other = fakeFetch(() => ({ body: { status_cd: "1", data: { rcPdf: PDF_B64, data: { gstin: "29AAPFU0939F1ZX", legalName: "X" } } } }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: other.impl }).validate({ gstin: GSTIN, otp: "1", txnId: "T" })).toMatchObject({ ok: false, code: "ERROR" });
  });

  it("maps rejected credentials, rate limiting and network failure without calling out when keys are missing", async () => {
    const rejected = fakeFetch(() => ({ status: 401 }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: rejected.impl }).initiate({ gstin: GSTIN, legalName: "X", signatoryEmail: "a@b.in" })).toMatchObject({ ok: false, code: "AUTH_ERROR" });
    const limited = fakeFetch(() => ({ status: 429 }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: limited.impl }).initiate({ gstin: GSTIN, legalName: "X", signatoryEmail: "a@b.in" })).toMatchObject({ ok: false, code: "RATE_LIMITED" });
    const down = fakeFetch(() => ({ throws: new Error("ECONNRESET") }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: down.impl }).initiate({ gstin: GSTIN, legalName: "X", signatoryEmail: "a@b.in" })).toMatchObject({ ok: false, code: "ERROR" });
    delete process.env.GSTN_API_KEY;
    const unused = fakeFetch(() => ({ body: {} }));
    expect(await createApiSetuGstRcProvider({ fetchImpl: unused.impl }).initiate({ gstin: GSTIN, legalName: "X", signatoryEmail: "a@b.in" })).toMatchObject({ ok: false, code: "AUTH_ERROR" });
    expect(unused.calls).toHaveLength(0);
  });
});

describe("email masking", () => {
  it("shows only the first letter and the domain", () => {
    expect(maskEmail("Ravi.Sharma@SharmaBuilders.in")).toBe("r**********@sharmabuilders.in");
    expect(maskEmail("ab@x.in")).toBe("a***@x.in");
  });
});
