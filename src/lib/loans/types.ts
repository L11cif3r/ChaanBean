export type LoanCategory =
  | "All"
  | "Business & MSME"
  | "Property & Housing"
  | "Trade & Working Capital"
  | "Vehicles & Equipment"
  | "Professional & Education";

export type FacilityType =
  | "term_loan"
  | "revolving_credit"
  | "discounting"
  | "guarantee";

export interface LenderMatch {
  id: string;
  name: string;
  type: "Public Sector Bank" | "Private Commercial Bank" | "NBFC" | "Development Financial Institution";
  logoText: string;
  indicativeRate: string;
  maxDisbursalDays: number;
  matchScore: number; // 0 - 100
  featureHighlight: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  shortName: string;
  category: LoanCategory;
  facilityType: FacilityType;
  badge: string;
  rateText: string;
  annualRate: number; // base reference rate in %
  minAmount: number;
  maxAmount: number;
  defaultAmount: number;
  minTenureYears: number;
  maxTenureYears: number;
  defaultTenureYears: number;
  tenureUnit?: "years" | "months" | "days";
  description: string;
  highlights: string[];
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  matchedLenders: LenderMatch[];
}

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "credit_assessment"
  | "lender_matched"
  | "sanctioned";

export interface LoanApplication {
  id: string;
  applicationRef: string;
  productId: string;
  productName: string;
  category: LoanCategory;
  requestedAmount: number;
  tenureYears: number;
  annualRate: number;
  estimatedEmiOrCost: number;
  facilityType: FacilityType;
  
  // Applicant details
  applicantName: string;
  entityName?: string;
  entityType: string;
  phone: string;
  email?: string;
  city: string;
  state?: string;
  
  // Financial credentials
  pan?: string;
  gstin?: string;
  udyamNumber?: string;
  annualTurnover?: number;
  primaryBank?: string;
  
  // Purpose & Collateral
  loanPurpose: string;
  collateralType: string;
  
  // Status & Matches
  status: ApplicationStatus;
  statusLabel: string;
  preliminaryScore: number;
  matchedLenders: LenderMatch[];
  appliedAt: string;
  updatedAt: string;
}
