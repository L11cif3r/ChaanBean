// Provider contracts for onboarding checks (S02). Results follow the PRD 12.3 adapter shape so Part 5's adapter layer
// can take these over unchanged: status success / no_data / failed / not_available, plus provider and fetch time.

export type ProviderStatus = "success" | "no_data" | "failed" | "not_available";

export interface ProviderResult<T> {
  status: ProviderStatus;
  provider: string;
  fetchedAt: string;
  data?: T;
  error?: { code: string; message: string };
}

export type GstStatus = "Active" | "Cancelled" | "Suspended";

export interface GstTaxpayer {
  gstin: string;
  legalName: string;
  tradeName: string | null;
  constitution: string;
  status: GstStatus;
  registrationDate: string;
  /** Set for cancelled or suspended registrations. */
  statusDate: string | null;
  stateCode: string;
  stateName: string;
  taxpayerType: string;
  address: { line: string; city: string; state: string; pincode: string };
}

export interface PanResult {
  pan: string;
  nameOnPan: string;
  holderType: string;
  status: "Valid" | "Invalid";
  nameMatches: boolean;
}

export interface IdentityProvider {
  name: string;
  /** Sample data, shown with a "test data" tag. */
  isMock: boolean;
  searchGstin(gstin: string): Promise<ProviderResult<GstTaxpayer>>;
  verifyPan(pan: string, name: string): Promise<ProviderResult<PanResult>>;
}
