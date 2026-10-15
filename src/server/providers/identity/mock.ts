import crypto from "node:crypto";
import { normaliseIdentifier, panFromGstin, panHolderType } from "@/lib/validators";
import { CONSTITUTION_BY_PAN_TYPE, GST_STATES } from "./states";
import type { GstTaxpayer, IdentityProvider, PanResult, ProviderResult } from "./types";

// Mock identity provider used until a GST and PAN data provider is contracted (Part 5). Every result is sample data.
// The 13th character of a GSTIN (the entity number) picks the scenario, so every S02 path can be tested:
//   9 = cancelled, 8 = suspended, 7 = not found, 6 = provider unavailable, anything else = active.
// For PAN: a number part of 0000 is "not found"; anything else is valid.

const PROVIDER = "mock_identity";

const SAMPLE_NAMES = [
  "Shree Ganesh Enterprises", "Om Sai Traders", "Kaveri Steel Distributors", "Sahyadri Agro Industries",
  "Nandi Hardware and Tools", "Coastal Packaging Solutions", "Deccan Cement Agencies", "Vishwas Textiles",
];

const now = () => new Date().toISOString();

function pick(seed: string, list: string[]) {
  return list[crypto.createHash("sha256").update(seed).digest()[0] % list.length];
}

function suffixFor(holderType: string) {
  return holderType === "C" ? " Private Limited" : holderType === "E" ? " LLP" : "";
}

export const mockIdentityProvider: IdentityProvider = {
  name: PROVIDER,
  isMock: true,

  async searchGstin(raw) {
    const gstin = normaliseIdentifier(raw);
    const scenario = gstin[12];
    if (scenario === "6") {
      return { status: "not_available", provider: PROVIDER, fetchedAt: now(), error: { code: "PROVIDER_DOWN", message: "GST service unavailable" } };
    }
    if (scenario === "7") {
      return { status: "no_data", provider: PROVIDER, fetchedAt: now(), error: { code: "NOT_FOUND", message: "GSTIN not found" } };
    }
    const pan = panFromGstin(gstin);
    const holder = panHolderType(pan) ?? "F";
    const base = pick(pan, SAMPLE_NAMES);
    const stateCode = gstin.slice(0, 2);
    const stateName = GST_STATES[stateCode] ?? "Unknown";
    const status = scenario === "9" ? "Cancelled" : scenario === "8" ? "Suspended" : "Active";
    const data: GstTaxpayer = {
      gstin,
      legalName: `${base.toUpperCase()}${suffixFor(holder).toUpperCase()}`,
      tradeName: base,
      constitution: CONSTITUTION_BY_PAN_TYPE[holder] ?? "Partnership",
      status,
      registrationDate: "2019-07-01",
      statusDate: status === "Active" ? null : "2025-03-31",
      stateCode,
      stateName,
      taxpayerType: "Regular",
      address: { line: "12, Industrial Estate, Main Road", city: "Sample City", state: stateName, pincode: "560058" },
    };
    return { status: "success", provider: PROVIDER, fetchedAt: now(), data };
  },

  async verifyPan(raw, name) {
    const pan = normaliseIdentifier(raw);
    if (pan.slice(5, 9) === "0000") {
      return { status: "no_data", provider: PROVIDER, fetchedAt: now(), error: { code: "NOT_FOUND", message: "PAN not found at source" } };
    }
    const holder = panHolderType(pan) ?? "P";
    const data: PanResult = {
      pan,
      nameOnPan: name.trim().toUpperCase(),
      holderType: CONSTITUTION_BY_PAN_TYPE[holder] ?? "Individual",
      status: "Valid",
      nameMatches: true,
    };
    return { status: "success", provider: PROVIDER, fetchedAt: now(), data } satisfies ProviderResult<PanResult>;
  },
};
