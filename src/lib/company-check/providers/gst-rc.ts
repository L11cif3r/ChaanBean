// GST verification by OTP: API Setu GSTN Registration Certificate API v1.0.1.
// Step 1 sends an OTP to the buyer's primary authorised signatory; step 2 exchanges that OTP for
// the legal name, trade name, constitution and the official registration certificate (PDF).
// This needs the buyer's cooperation, so it is an optional step on a Company Check report.

import { encryptGSTNPayload } from "@/lib/gstn/encryption";

export type GstRcErrorCode =
  | "DETAILS_MISMATCH" // GSTIN / legal name / signatory email do not match GST records
  | "OTP_INCORRECT"
  | "OTP_EXPIRED"
  | "RATE_LIMITED"
  | "AUTH_ERROR" // our API Setu credentials were rejected or are missing
  | "TIMEOUT"
  | "ERROR";

export type GstRcResult<T> =
  | { ok: true; data: T; provider: string; latencyMs: number }
  | { ok: false; code: GstRcErrorCode; message: string; providerCode?: string; provider: string; latencyMs: number };

export interface GstRcCertificate {
  gstin: string;
  legalName: string;
  tradeName?: string;
  constitution?: string;
  pdf: Buffer;
}

export interface GstRcProvider {
  name: string;
  initiate(p: { gstin: string; legalName: string; signatoryEmail: string }): Promise<GstRcResult<{ txnId: string; message: string }>>;
  validate(p: { gstin: string; otp: string; txnId: string }): Promise<GstRcResult<GstRcCertificate>>;
}

interface ApiSetuResponse<T> {
  status_cd?: "0" | "1";
  data?: T;
  error?: { message?: string; errorCode?: string; error_cd?: string };
}

export function createApiSetuGstRcProvider(opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): GstRcProvider {
  const name = "apisetu_gstn_rc";
  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 20_000;

  async function post<T>(path: string, action: "INITIATE" | "VALIDATE", payload: Record<string, unknown>) {
    const started = Date.now();
    const apiKey = process.env.GSTN_API_KEY;
    const clientId = process.env.GSTN_CLIENT_ID;
    const base = (process.env.GSTN_BASE_URL || "https://beta.api-setu.in").replace(/\/+$/, "");
    if (!apiKey || !clientId) return { kind: "auth" as const, latencyMs: 0 };
    const encrypted = encryptGSTNPayload(payload);
    try {
      const res = await doFetch(`${base}/mof/gst/srv/govtapiext/v1.0/rc/${path}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": encrypted.contentType,
          action,
          "X-APISETU-CLIENTID": clientId,
          "X-APISETU-APIKEY": apiKey,
        },
        body: typeof encrypted.body === "string" ? encrypted.body : JSON.stringify(encrypted.body),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      const latencyMs = Date.now() - started;
      if (res.status === 401 || res.status === 403) return { kind: "auth" as const, latencyMs };
      if (res.status === 429) return { kind: "rate" as const, latencyMs };
      let json: ApiSetuResponse<T>;
      try {
        json = (await res.json()) as ApiSetuResponse<T>;
      } catch {
        return { kind: "error" as const, latencyMs, message: `Unexpected response (HTTP ${res.status})` };
      }
      return { kind: "json" as const, latencyMs, status: res.status, json };
    } catch (e) {
      const latencyMs = Date.now() - started;
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      return { kind: timeout ? ("timeout" as const) : ("error" as const), latencyMs, message: "Could not reach API Setu" };
    }
  }

  const fail = <T,>(code: GstRcErrorCode, message: string, latencyMs: number, providerCode?: string): GstRcResult<T> => ({
    ok: false, code, message, providerCode, provider: name, latencyMs,
  });

  function transportFailure<T>(r: { kind: string; latencyMs: number; message?: string }): GstRcResult<T> {
    if (r.kind === "auth") return fail("AUTH_ERROR", "GST verification is not available right now.", r.latencyMs);
    if (r.kind === "rate") return fail("RATE_LIMITED", "Too many GST verification requests. Try again in a few minutes.", r.latencyMs);
    if (r.kind === "timeout") return fail("TIMEOUT", "The GST network took too long to respond. Try again.", r.latencyMs);
    return fail("ERROR", "The GST network could not be reached. Try again.", r.latencyMs);
  }

  return {
    name,
    async initiate(p) {
      const r = await post<{ txnId?: string; message?: string }>("initiate", "INITIATE", {
        gstin: p.gstin, legalName: p.legalName, emailId_pas: p.signatoryEmail,
      });
      if (r.kind !== "json") return transportFailure(r);
      if (r.json.status_cd === "1" && r.json.data?.txnId) {
        return { ok: true, data: { txnId: r.json.data.txnId, message: r.json.data.message ?? "OTP sent" }, provider: name, latencyMs: r.latencyMs };
      }
      const providerCode = r.json.error?.errorCode ?? r.json.error?.error_cd;
      // INTR_002 and plain status_cd 0 mean the GSTIN, legal name and signatory email do not match GST records.
      return fail(
        "DETAILS_MISMATCH",
        "The GSTIN, legal name and signatory email don't match GST records. Check them with the buyer.",
        r.latencyMs,
        providerCode,
      );
    },
    async validate(p) {
      const r = await post<{ txnId?: string; rcPdf?: string; data?: { gstin?: string; legalName?: string; tradeName?: string; constitutionOfBusiness?: string } }>(
        "validate", "VALIDATE", { gstin: p.gstin, otp: p.otp, txnId: p.txnId },
      );
      if (r.kind !== "json") return transportFailure(r);
      const d = r.json.data;
      if (r.json.status_cd === "1" && d?.data) {
        if ((d.data.gstin ?? p.gstin).toUpperCase() !== p.gstin) return fail("ERROR", "The GST network returned a different GSTIN.", r.latencyMs);
        let pdf: Buffer;
        try {
          pdf = Buffer.from(d.rcPdf ?? "", "base64");
          if (pdf.length < 5 || pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("not a PDF");
        } catch {
          return fail("ERROR", "The certificate returned by the GST network could not be read.", r.latencyMs);
        }
        return {
          ok: true,
          data: { gstin: p.gstin, legalName: d.data.legalName ?? "", tradeName: d.data.tradeName, constitution: d.data.constitutionOfBusiness, pdf },
          provider: name,
          latencyMs: r.latencyMs,
        };
      }
      const providerCode = r.json.error?.errorCode ?? r.json.error?.error_cd;
      const msg = (r.json.error?.message ?? "").toLowerCase();
      if (msg.includes("expire")) return fail("OTP_EXPIRED", "This OTP has expired. Send a new one.", r.latencyMs, providerCode);
      return fail("OTP_INCORRECT", "The OTP is incorrect.", r.latencyMs, providerCode);
    },
  };
}

// ---------------------------------------------------------------- mock (development and tests)

/** Minimal valid one-page PDF so the mock certificate downloads and opens. */
const MOCK_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj " +
    "4 0 obj<</Length 58>>stream\nBT /F1 12 Tf 20 50 Td (MOCK GST certificate - not real) Tj ET\nendstream endobj " +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  "latin1",
);

export const MOCK_GST_OTP = "123456";

/**
 * Mock: any GSTIN whose legal name is entered exactly (case-insensitive) as in `knownNames` succeeds,
 * and the OTP is always 123456. Failure paths can be forced for tests.
 */
export function createMockGstRcProvider(knownNames: Record<string, { legalName: string; tradeName?: string; constitution?: string }>, opts: { failInitiate?: GstRcErrorCode } = {}): GstRcProvider {
  const name = "mock_gstn_rc";
  return {
    name,
    async initiate(p) {
      if (opts.failInitiate) return { ok: false, code: opts.failInitiate, message: `Mock ${opts.failInitiate}`, provider: name, latencyMs: 1 };
      const known = knownNames[p.gstin];
      if (!known || known.legalName.toUpperCase() !== p.legalName.trim().toUpperCase()) {
        return { ok: false, code: "DETAILS_MISMATCH", message: "The GSTIN, legal name and signatory email don't match GST records. Check them with the buyer.", provider: name, latencyMs: 1 };
      }
      return { ok: true, data: { txnId: `mock-txn-${p.gstin}-${Date.now()}`, message: "OTP sent (mock: use 123456)" }, provider: name, latencyMs: 1 };
    },
    async validate(p) {
      if (p.otp !== MOCK_GST_OTP) return { ok: false, code: "OTP_INCORRECT", message: "The OTP is incorrect.", provider: name, latencyMs: 1 };
      const known = knownNames[p.gstin];
      return {
        ok: true,
        data: { gstin: p.gstin, legalName: known?.legalName ?? "", tradeName: known?.tradeName, constitution: known?.constitution, pdf: MOCK_PDF },
        provider: name,
        latencyMs: 1,
      };
    },
  };
}
