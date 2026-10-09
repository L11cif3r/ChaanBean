import { createDataGovProviders } from "./datagov";
import { createFileSureProviders } from "./filesure";
import { createApiSetuGstRcProvider, createMockGstRcProvider, type GstRcProvider } from "./gst-rc";
import { createMockProviders, MOCK_FIXTURES, type MockOptions } from "./mock";
import type { ProviderMeta, ProviderMode, ProviderResult, ProviderSet } from "./types";

export * from "./types";

/**
 * COMPANY_CHECK_PROVIDER_MODE = MOCK | SANDBOX | LIVE (default MOCK outside production).
 * Production never falls back to mock data (PRD §18 "Data truth"); a missing live adapter
 * makes the section fail with SOURCE_ERROR instead.
 */
export function providerMode(): ProviderMode {
  const raw = (process.env.COMPANY_CHECK_PROVIDER_MODE ?? "").toUpperCase();
  if (raw === "LIVE" || raw === "SANDBOX") return raw;
  if (process.env.NODE_ENV === "production") return "LIVE";
  return "MOCK";
}

let override: ProviderSet | null = null;
/** Tests inject providers (e.g. mock with failures). */
export function setProvidersForTesting(set: ProviderSet | null) {
  override = set;
}

export function getProviders(mockOptions?: MockOptions): ProviderSet {
  if (override) return override;
  const mode = providerMode();
  if (mode === "MOCK") {
    if (process.env.NODE_ENV === "production") throw new Error("Mock providers are not allowed in production");
    return createMockProviders(mockOptions);
  }
  // Live sources: FileSure (search, MCA master, directors, charges, financial statements) when
  // FILESURE_API_KEY is set, otherwise data.gov.in (search + MCA master only).
  // Still to plug in as access arrives: GST details and return filings without the buyer's OTP.
  const pending = notConfiguredProviders(mode);
  if (process.env.FILESURE_API_KEY?.trim()) {
    const filesure = createFileSureProviders();
    return { ...pending, search: filesure.search, mca: filesure.mca, financials: filesure.financials };
  }
  const datagov = createDataGovProviders({ mode });
  return { ...pending, search: datagov.search, mca: datagov.mca };
}

function notConfiguredProviders(mode: ProviderMode): ProviderSet {
  const fail = <T,>(operation: string): Promise<ProviderResult<T>> => {
    const meta: ProviderMeta = { provider: "unconfigured", operation, mode, latencyMs: 0, costPaise: 0n };
    return Promise.resolve({ outcome: "AUTH_ERROR", error: `No ${mode} provider configured for ${operation}`, meta });
  };
  return {
    search: { searchByName: () => fail("searchByName") },
    mca: { getCompanyMaster: () => fail("getCompanyMaster"), getDirectors: () => fail("getDirectors"), getCharges: () => fail("getCharges") },
    financials: { getFinancials: () => fail("getFinancials") },
    gst: { getTaxpayer: () => fail("getTaxpayer"), getGstinsByPan: () => fail("getGstinsByPan"), getFilingStatus: () => fail("getFilingStatus") },
  };
}

// ---------------------------------------------------------------- GST verification by OTP


let gstRcOverride: GstRcProvider | null = null;
export function setGstRcProviderForTesting(p: GstRcProvider | null) {
  gstRcOverride = p;
}

export function getGstRcProvider(): GstRcProvider {
  if (gstRcOverride) return gstRcOverride;
  if (providerMode() === "MOCK") {
    if (process.env.NODE_ENV === "production") throw new Error("Mock providers are not allowed in production");
    return createMockGstRcProvider(
      Object.fromEntries(
        MOCK_FIXTURES.map((f) => [f.taxpayer.gstin, { legalName: f.taxpayer.legalName ?? "", tradeName: f.taxpayer.tradeName, constitution: f.taxpayer.constitution }]),
      ),
    );
  }
  return createApiSetuGstRcProvider();
}
