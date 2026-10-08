// Provider adapter contracts (PRD §16). Screens and the engine only ever see these canonical
// shapes, so a provider can be swapped (mock → API Setu → aggregator) without touching them.

export type ProviderOutcome = "SUCCESS" | "NOT_FOUND" | "TIMEOUT" | "RATE_LIMITED" | "AUTH_ERROR" | "ERROR";
export type ProviderMode = "MOCK" | "SANDBOX" | "LIVE";

export interface ProviderMeta {
  provider: string; // e.g. "mock", "apisetu_gstn"
  operation: string; // e.g. "getCompanyMaster"
  mode: ProviderMode;
  latencyMs: number;
  costPaise: bigint;
  httpStatus?: number;
  /** Raw response for evidence storage; never shown to customers or logged. */
  raw?: unknown;
}

export type ProviderResult<T> =
  | { outcome: "SUCCESS"; data: T; meta: ProviderMeta }
  | { outcome: Exclude<ProviderOutcome, "SUCCESS">; error: string; meta: ProviderMeta };

export type EntityType =
  | "PRIVATE_LTD" | "PUBLIC_LTD" | "OPC" | "LLP" | "PROPRIETORSHIP" | "PARTNERSHIP" | "HUF" | "TRUST" | "OTHER";

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export interface CompanyCandidate {
  legalName: string;
  tradeName?: string;
  entityType: EntityType;
  cin?: string;
  llpin?: string;
  gstins?: string[];
  stateCode?: string;
  status?: string;
  incorporationYear?: number;
  source: string;
}

export interface CompanyMaster {
  cin?: string;
  llpin?: string;
  legalName: string;
  entityType: EntityType;
  companyStatus: string; // cc_company_status
  companyClass?: string;
  category?: string;
  subCategory?: string;
  rocCode?: string;
  incorporationDate?: string;
  authorisedCapitalPaise?: bigint;
  paidUpCapitalPaise?: bigint;
  listingStatus?: string;
  registeredAddress?: Address;
  registeredEmail?: string;
  lastAgmDate?: string;
  lastBalanceSheetDate?: string;
  pan?: string;
}

export interface DirectorRecord {
  din: string;
  fullName: string;
  dinStatus?: string;
  designation?: string;
  appointedOn?: string;
  ceasedOn?: string;
  isSignatory?: boolean;
}

export interface ChargeRecord {
  chargeId?: string;
  chargeHolder?: string;
  amountPaise?: bigint;
  createdOn?: string;
  modifiedOn?: string;
  satisfiedOn?: string;
  status: "OPEN" | "SATISFIED";
}

export interface FinancialRecord {
  fiscalYear: string; // "2024-25"
  periodEnd: string; // "2025-03-31"
  statementType: "STANDALONE" | "CONSOLIDATED";
  revenueFromOperationsPaise?: bigint;
  otherIncomePaise?: bigint;
  totalIncomePaise?: bigint;
  profitBeforeTaxPaise?: bigint;
  profitAfterTaxPaise?: bigint;
  netWorthPaise?: bigint;
  totalBorrowingsPaise?: bigint;
  totalAssetsPaise?: bigint;
  currentAssetsPaise?: bigint;
  currentLiabilitiesPaise?: bigint;
  filingForm?: string;
  filedOn?: string;
  verificationStatus: "VERIFIED" | "PROVIDER_PARSED" | "USER_PROVIDED";
}

export interface GstTaxpayer {
  gstin: string;
  legalName?: string;
  tradeName?: string;
  status: "ACTIVE" | "CANCELLED" | "SUSPENDED" | "INACTIVE" | "PROVISIONAL";
  registrationDate?: string;
  cancellationDate?: string;
  constitution?: string;
  taxpayerType?: string;
  principalAddress?: Address;
  additionalPlaces?: Address[];
  natureOfBusiness?: string[];
  turnoverSlab?: string;
  turnoverSlabFy?: string;
  einvoiceEnabled?: boolean;
}

export interface GstFilingRecord {
  returnType: "GSTR1" | "GSTR3B" | "GSTR4" | "GSTR9" | "CMP08";
  taxPeriod: string; // MMYYYY
  fiscalYear?: string;
  dueDate?: string;
  filedOn?: string;
}

export interface CompanySearchProvider {
  searchByName(query: string): Promise<ProviderResult<CompanyCandidate[]>>;
}
export interface MCARegistryProvider {
  getCompanyMaster(id: { cin?: string; llpin?: string }): Promise<ProviderResult<CompanyMaster>>;
  getDirectors(id: { cin?: string; llpin?: string }): Promise<ProviderResult<DirectorRecord[]>>;
  getCharges(id: { cin?: string; llpin?: string }): Promise<ProviderResult<ChargeRecord[]>>;
}
export interface FinancialsProvider {
  getFinancials(id: { cin?: string; llpin?: string }, years: number): Promise<ProviderResult<FinancialRecord[]>>;
}
export interface GSTProvider {
  getTaxpayer(gstin: string): Promise<ProviderResult<GstTaxpayer>>;
  getGstinsByPan(pan: string): Promise<ProviderResult<string[]>>;
  getFilingStatus(gstin: string, months: number): Promise<ProviderResult<GstFilingRecord[]>>;
}

export interface ProviderSet {
  search: CompanySearchProvider;
  mca: MCARegistryProvider;
  financials: FinancialsProvider;
  gst: GSTProvider;
}
