// Credit Worthiness checks (PRD v2.0 section 4) and the normalised result each one stores (adapter contract 12.3).
// Shared by the server and the screens. Item codes are the Part 3 price list codes.

import type { CounterpartyType } from "@/lib/counterparties";

export type CheckGroup = "gst" | "cibil" | "company";

export interface CheckDef {
  code: CwCode;
  group: CheckGroup;
  /** GST turnover and CIBIL need the buyer to say yes by OTP (v2.0 section 5). */
  consent: boolean;
  /** A result younger than this can be opened again without a charge (FR-CW-06, 9.1 "Reuse"). */
  reuseDays: number;
}

export const CW_CODES = [
  "CW_GST_SEARCH", "CW_GST_TURNOVER_CY", "CW_GST_TURNOVER", "CW_CIBIL_COMPANY", "CW_CIBIL_PERSONAL",
  "CW_COMPANY", "CW_DIRECTOR", "CW_CREDIT_RATING",
] as const;
export type CwCode = (typeof CW_CODES)[number];

export const CW_CHECKS: CheckDef[] = [
  { code: "CW_GST_SEARCH", group: "gst", consent: false, reuseDays: 7 },
  { code: "CW_GST_TURNOVER_CY", group: "gst", consent: true, reuseDays: 30 },
  { code: "CW_GST_TURNOVER", group: "gst", consent: true, reuseDays: 30 },
  { code: "CW_CIBIL_COMPANY", group: "cibil", consent: true, reuseDays: 30 },
  { code: "CW_CIBIL_PERSONAL", group: "cibil", consent: true, reuseDays: 30 },
  { code: "CW_COMPANY", group: "company", consent: false, reuseDays: 15 },
  { code: "CW_DIRECTOR", group: "company", consent: false, reuseDays: 15 },
  { code: "CW_CREDIT_RATING", group: "company", consent: false, reuseDays: 30 },
];

export const checkDef = (code: string) => CW_CHECKS.find((c) => c.code === code);
export const isCwCode = (code: string): code is CwCode => (CW_CODES as readonly string[]).includes(code);

/** Why a check cannot run for this counterparty, or null when it can (S08 marker 4: disabled with a reason). */
export function unavailableReason(code: CwCode, type: CounterpartyType): string | null {
  if ((code === "CW_GST_TURNOVER" || code === "CW_GST_TURNOVER_CY") && type !== "business_gstin") return "needsGstin";
  if ((code === "CW_COMPANY" || code === "CW_DIRECTOR" || code === "CW_CREDIT_RATING") && type === "individual") return "businessOnly";
  if (code === "CW_CIBIL_COMPANY" && type === "individual") return "businessOnly";
  return null;
}

// ---------------------------------------------------------------- normalised results

export interface GstSearchData {
  gstin: string;
  legalName: string;
  tradeName: string | null;
  status: "Active" | "Cancelled" | "Suspended";
  registrationDate: string; // YYYY-MM-DD
  constitution: string;
  taxpayerType: string;
  address: string;
  gstinsOnPan: { gstin: string; state: string; status: "Active" | "Cancelled" | "Suspended" }[];
  /** GSTR-3B for the last 12 months, newest first. */
  filings: { period: string; filed: boolean; onTime: boolean }[];
  lastReturnPeriod: string | null;
}

export interface CompanyData {
  cin: string;
  name: string;
  status: string; // "Active", "Strike Off", "Under Liquidation", "Dormant"
  incorporationDate: string;
  companyClass: string;
  category: string;
  authorisedCapitalPaise: number;
  paidUpCapitalPaise: number;
  registeredOffice: string;
  lastAgmDate: string | null;
  lastBalanceSheetDate: string | null;
  charges: { holder: string; amountPaise: number; status: "Open" | "Satisfied"; createdOn: string }[];
}

export interface DirectorData {
  directors: { din: string; name: string; designation: string; appointedOn: string; otherCompanies: number; disqualified: boolean }[];
}

export interface CreditRatingData {
  ratings: { agency: string; instrument: string; rating: string; outlook: string; date: string }[];
}

/** GST turnover from filed GSTR-3B (Part 7). Years oldest first; the current year is marked partial. */
export interface TurnoverData {
  years: { fy: string; turnoverPaise: number; partial: boolean }[];
}

/** CIBIL report, company or personal (Part 7). */
export interface CibilData {
  bureau: string;
  scoreOrRank: string;
  activeLoans: number;
  sanctionedPaise: number;
  outstandingPaise: number;
  overdue: { lender: string; amountPaise: number; daysPastDue: number }[];
  enquiries6m: number;
  wilfulDefaulter: boolean;
  suitFiled: boolean;
}

export type CheckData = GstSearchData | CompanyData | DirectorData | CreditRatingData | TurnoverData | CibilData;
