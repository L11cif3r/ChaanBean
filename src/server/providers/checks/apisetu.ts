import "server-only";
import type { GstSearchData } from "@/lib/checks";
import { apisetuIdentityProvider } from "@/server/providers/identity/apisetu";
import type { CheckProvider } from "./index";

// GST search (CW_GST_SEARCH, ₹15) from API Setu GSTN (PRD v4.0 section 13). Status, registration date, constitution,
// type and address come from the GSTN; API Setu has no return-filing data and does not list the other GSTINs on the PAN,
// so those stay empty and the report says "Not in this source" (a GSP adds them). Switch on with
// PROVIDER_CW_GST_SEARCH=apisetu.

export const apisetuCheckProvider: CheckProvider = {
  name: "apisetu",
  isMock: false,
  async run(code, subject) {
    const fetchedAt = new Date().toISOString();
    if (code !== "CW_GST_SEARCH") {
      return { status: "not_available", provider: "apisetu", fetchedAt, error: { code: "NOT_OFFERED", message: "API Setu covers the GST search only.", retryable: true }, raw: null };
    }
    if (!subject.gstin) {
      return { status: "not_available", provider: "apisetu", fetchedAt, error: { code: "NEEDS_GSTIN", message: "GST search needs the GSTIN.", retryable: false }, raw: null };
    }
    const r = await apisetuIdentityProvider.searchGstin(subject.gstin);
    if (r.status !== "success" || !r.data) return { ...r, data: undefined, raw: { gstin: subject.gstin } };
    const d = r.data;
    const data: GstSearchData = {
      gstin: d.gstin, legalName: d.legalName, tradeName: d.tradeName, status: d.status, registrationDate: d.registrationDate,
      constitution: d.constitution, taxpayerType: d.taxpayerType,
      address: [d.address.line, d.address.city, d.address.state, d.address.pincode].filter(Boolean).join(", "),
      gstinsOnPan: [], filings: [], lastReturnPeriod: null,
      natureOfBusiness: d.natureOfBusiness, eInvoice: d.eInvoice, otherPlaces: d.otherPlaces, jurisdiction: d.jurisdiction,
    };
    return { status: "success", provider: "apisetu", fetchedAt: r.fetchedAt, data, raw: { source: "apisetu", gstin: d.gstin } };
  },
};
