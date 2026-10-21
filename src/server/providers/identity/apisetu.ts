import "server-only";
import { notConnected } from "@/server/providers/slots";
import type { GstStatus, GstTaxpayer, IdentityProvider, ProviderResult } from "./types";
import { GST_STATES } from "./states";

// API Setu GSTN Tax Payer API v2 (PRD v4.0 2.1, adapter apisetu_gst). GET {base}/gstn/v2/taxpayers/{gstin} with the
// headers X-APISETU-CLIENTID and X-APISETU-APIKEY (spec: cf-media.api-setu.in/specfiles/1673347455_gstn-v2.yaml).
// API Setu has no return-filing API: filing history needs a GSP. Keys: GSTN_CLIENT_ID (com.chaanbean), GSTN_API_KEY,
// GSTN_BASE_URL (default https://apisetu.gov.in; the beta host answered 503 on 20 Oct). The older APISETU_* names work too.

const env = (...keys: string[]) => keys.map((k) => process.env[k]?.replace(/^["']|["']$/g, "").trim()).find(Boolean) ?? "";
export const apisetuKeys = () => ({
  clientId: env("GSTN_CLIENT_ID", "APISETU_CLIENT_ID"),
  key: env("GSTN_API_KEY", "APISETU_API_KEY"),
  base: (env("GSTN_BASE_URL", "APISETU_BASE_URL") || "https://apisetu.gov.in").replace(/\/$/, ""),
});
const now = () => new Date().toISOString();

interface V2Address { buildingName?: string; buildingNumber?: string; floorNumber?: string; streetName?: string; location?: string; locality?: string; city?: string; districtName?: string; stateName?: string; pincode?: string }
interface V2 {
  gstIdentificationNumber?: string; legalNameOfBusiness?: string; tradeName?: string; gstnStatus?: string; dateOfRegistration?: string;
  dateOfCancellation?: string; constitutionOfBusiness?: string; taxpayerType?: string; taxPayerType?: string;
  principalPlaceOfBusinessFields?: { principalPlaceOfBusinessAddress?: V2Address };
  additionalPlaceOfBusinessFields?: unknown[]; natureOfBusinessActivity?: string[]; eInvoiceStatus?: string;
  centerJurisdiction?: string; stateJurisdiction?: string;
  error?: string; errorDescription?: string; error_description?: string;
}

/** DD/MM/YYYY → YYYY-MM-DD. */
const isoDate = (s?: string) => (s && /^\d{2}\/\d{2}\/\d{4}$/.test(s) ? `${s.slice(6)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : s || "");
const status = (s?: string): GstStatus => (/cancel/i.test(s ?? "") ? "Cancelled" : /suspend/i.test(s ?? "") ? "Suspended" : "Active");

export function mapTaxpayer(gstin: string, d: V2): GstTaxpayer {
  const a = d.principalPlaceOfBusinessFields?.principalPlaceOfBusinessAddress ?? {};
  const line = [a.floorNumber, a.buildingNumber, a.buildingName, a.streetName, a.locality, a.location].filter(Boolean).join(", ");
  const stateCode = gstin.slice(0, 2);
  return {
    gstin,
    legalName: d.legalNameOfBusiness ?? "",
    tradeName: d.tradeName || null,
    constitution: d.constitutionOfBusiness ?? "",
    status: status(d.gstnStatus),
    registrationDate: isoDate(d.dateOfRegistration),
    statusDate: d.dateOfCancellation ? isoDate(d.dateOfCancellation) : null,
    stateCode,
    stateName: a.stateName || GST_STATES[stateCode] || stateCode,
    taxpayerType: d.taxpayerType ?? d.taxPayerType ?? "",
    address: { line: line || a.districtName || "", city: a.districtName || a.city || a.location || "", state: a.stateName || GST_STATES[stateCode] || "", pincode: a.pincode ?? "" },
    natureOfBusiness: d.natureOfBusinessActivity ?? [],
    eInvoice: d.eInvoiceStatus ? /^y/i.test(d.eInvoiceStatus) : null,
    otherPlaces: d.additionalPlaceOfBusinessFields?.length ?? 0,
    jurisdiction: [d.stateJurisdiction, d.centerJurisdiction].filter(Boolean).join(" · ") || null,
  };
}

/** Tax Payer API V1 (fewer fields, no address): used only when V2 is not answering. */
interface V1 { gstin?: string; legalName?: string; constitution?: string; status?: string; registrationDate?: string; cancellationDate?: string; taxPayerType?: string; natureBusinessActivities?: string[]; centerJurisdiction?: string; stateJurisdiction?: string }
export function mapTaxpayerV1(gstin: string, d: V1): GstTaxpayer {
  const stateCode = gstin.slice(0, 2);
  return {
    gstin, legalName: d.legalName ?? "", tradeName: null, constitution: d.constitution ?? "", status: status(d.status),
    registrationDate: isoDate(d.registrationDate), statusDate: d.cancellationDate ? isoDate(d.cancellationDate) : null, stateCode,
    stateName: GST_STATES[stateCode] ?? stateCode, taxpayerType: d.taxPayerType ?? "",
    address: { line: "", city: "", state: GST_STATES[stateCode] ?? "", pincode: "" },
    natureOfBusiness: d.natureBusinessActivities ?? [], eInvoice: null, otherPlaces: 0,
    jurisdiction: [d.stateJurisdiction, d.centerJurisdiction].filter(Boolean).join(" · ") || null,
  };
}

export const apisetuIdentityProvider: IdentityProvider = {
  name: "apisetu",
  isMock: false,
  async searchGstin(gstin): Promise<ProviderResult<GstTaxpayer>> {
    const { clientId, key, base } = apisetuKeys();
    if (!clientId || !key) return notConnected("apisetu", "GST taxpayer details");
    let res: Response;
    try {
      res = await fetch(`${base}/gstn/v2/taxpayers/${encodeURIComponent(gstin)}`, {
        headers: { "X-APISETU-CLIENTID": clientId, "X-APISETU-APIKEY": key, accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      return { status: "not_available", provider: "apisetu", fetchedAt: now(), error: { code: "NETWORK", message: "API Setu did not answer.", retryable: true } };
    }
    const json = (await res.json().catch(() => ({}))) as V2 | unknown[];
    // An unknown GSTIN comes back as 200 with an empty list.
    if (res.ok && Array.isArray(json) && json.length === 0) {
      return { status: "no_data", provider: "apisetu", fetchedAt: now(), error: { code: "NOT_FOUND", message: "No GST registration found." } };
    }
    const body = (Array.isArray(json) ? json[0] ?? {} : json) as V2;
    if (res.status === 404) return { status: "no_data", provider: "apisetu", fetchedAt: now(), error: { code: "NOT_FOUND", message: "No GST registration found." } };
    if (res.status === 401 || res.status === 403) {
      return { status: "not_available", provider: "apisetu", fetchedAt: now(), error: { code: "AUTH", message: `API Setu refused the key: ${body.errorDescription ?? body.error_description ?? res.status}.`, retryable: false } };
    }
    if (!res.ok || !body.legalNameOfBusiness) {
      // V2 down: try Tax Payer API V1 (same subscription) before giving up.
      if (res.status >= 500) {
        const v1 = await fetch(`${base}/gstn/v1/taxpayers/${encodeURIComponent(gstin)}`, {
          headers: { "X-APISETU-CLIENTID": clientId, "X-APISETU-APIKEY": key, accept: "application/json" }, signal: AbortSignal.timeout(15_000), cache: "no-store",
        }).catch(() => null);
        const b1 = v1?.ok ? ((await v1.json().catch(() => null)) as V1 | null) : null;
        if (b1?.legalName) return { status: "success", provider: "apisetu", fetchedAt: now(), data: mapTaxpayerV1(gstin, b1) };
      }
      return { status: "not_available", provider: "apisetu", fetchedAt: now(), error: { code: `HTTP_${res.status}`, message: "GST network is not answering.", retryable: res.status >= 500 } };
    }
    return { status: "success", provider: "apisetu", fetchedAt: now(), data: mapTaxpayer(gstin, body) };
  },
  verifyPan: async () => notConnected("apisetu", "PAN check"),
};
