import type { LoanApplication } from "./types";
import { CAPITAL_ACCESS_LOAN_PRODUCTS } from "./loan-catalog";

// Global in-memory storage persisted across hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __capital_access_loan_applications__: LoanApplication[] | undefined;
  // eslint-disable-next-line no-var
  var __capitalx_loan_applications__: LoanApplication[] | undefined;
}

const INITIAL_DEMO_APPLICATIONS: LoanApplication[] = [
  {
    id: "app-init-001",
    applicationRef: "CA-2026-481920",
    productId: "sme-msme-loan",
    productName: "SME-MSME Loan",
    category: "Business & MSME",
    facilityType: "term_loan",
    requestedAmount: 7500000,
    tenureYears: 5,
    annualRate: 8.5,
    estimatedEmiOrCost: 153922,
    applicantName: "Rajesh Sharma",
    entityName: "Acme Traders Pvt Ltd",
    entityType: "Private Limited",
    phone: "9820123456",
    email: "finance@acmetraders.in",
    city: "Mumbai",
    state: "Maharashtra",
    pan: "AAECG1234H",
    gstin: "27AAECG1234H1Z5",
    udyamNumber: "UDYAM-MH-12-0012345",
    annualTurnover: 85000000,
    primaryBank: "State Bank of India",
    loanPurpose: "Plant Modernization & Working Capital Cushion",
    collateralType: "CGTMSE Guarantee",
    status: "lender_matched",
    statusLabel: "Lender Matched · Term Sheet Issued",
    preliminaryScore: 92,
    matchedLenders: CAPITAL_ACCESS_LOAN_PRODUCTS.find((p) => p.id === "sme-msme-loan")?.matchedLenders || [],
    appliedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "app-init-002",
    applicationRef: "CA-2026-319084",
    productId: "commercial-property-loan",
    productName: "Commercial Property Loan",
    category: "Property & Housing",
    facilityType: "term_loan",
    requestedAmount: 25000000,
    tenureYears: 10,
    annualRate: 9.25,
    estimatedEmiOrCost: 320140,
    applicantName: "Sunil Varma",
    entityName: "Acme Traders Pvt Ltd",
    entityType: "Private Limited",
    phone: "9820123456",
    email: "finance@acmetraders.in",
    city: "Mumbai",
    state: "Maharashtra",
    pan: "AAECG1234H",
    gstin: "27AAECG1234H1Z5",
    annualTurnover: 85000000,
    primaryBank: "HDFC Bank",
    loanPurpose: "Acquisition of 4,000 sq ft Logistics Warehouse in Bhiwandi",
    collateralType: "Commercial Asset Mortgage",
    status: "under_review",
    statusLabel: "Legal & Valuation Review in Progress",
    preliminaryScore: 88,
    matchedLenders: CAPITAL_ACCESS_LOAN_PRODUCTS.find((p) => p.id === "commercial-property-loan")?.matchedLenders || [],
    appliedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export function getLoanApplications(): LoanApplication[] {
  if (!globalThis.__capital_access_loan_applications__) {
    globalThis.__capital_access_loan_applications__ = globalThis.__capitalx_loan_applications__ || [...INITIAL_DEMO_APPLICATIONS];
  }
  return globalThis.__capital_access_loan_applications__;
}

export function saveLoanApplication(app: LoanApplication): LoanApplication {
  const list = getLoanApplications();
  list.unshift(app);
  return app;
}
