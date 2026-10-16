// Credit Worthiness checks (PRD v3.0 section 6.1) and the normalised result each one stores (adapter contract 12.3).
// Shared by the server and the screens. Item codes are the Part 3 price list codes.

import type { CounterpartyType } from "@/lib/counterparties";

export type CheckGroup = "gst" | "cibil" | "identity" | "company";

export interface CheckDef {
  code: CwCode;
  group: CheckGroup;
  /** GST turnover and CIBIL need the buyer to say yes by OTP (v2.0 section 5). */
  consent: boolean;
  /** A result younger than this can be opened again without a charge (FR-CW-06, 9.1 "Reuse"). */
  reuseDays: number;
}

export const CW_CODES = [
  "CW_GST_SEARCH", "CW_GST_TURNOVER_CY", "CW_GST_TURNOVER_4Y", "CW_CIBIL_COMPANY", "CW_CIBIL_PERSONAL",
  "CW_MSME", "CW_PAN", "CW_IEC_PROFILE", "CW_IEC_TURNOVER", "CW_COMPANY", "CW_DIRECTORS", "CW_CREDIT_RATING",
] as const;
export type CwCode = (typeof CW_CODES)[number];

export const CW_CHECKS: CheckDef[] = [
  { code: "CW_GST_SEARCH", group: "gst", consent: false, reuseDays: 7 },
  { code: "CW_GST_TURNOVER_CY", group: "gst", consent: true, reuseDays: 30 },
  { code: "CW_GST_TURNOVER_4Y", group: "gst", consent: true, reuseDays: 30 },
  { code: "CW_CIBIL_COMPANY", group: "cibil", consent: true, reuseDays: 30 },
  { code: "CW_CIBIL_PERSONAL", group: "cibil", consent: true, reuseDays: 30 },
  { code: "CW_MSME", group: "identity", consent: false, reuseDays: 30 },
  { code: "CW_PAN", group: "identity", consent: false, reuseDays: 30 },
  { code: "CW_IEC_PROFILE", group: "identity", consent: false, reuseDays: 30 },
  { code: "CW_IEC_TURNOVER", group: "identity", consent: false, reuseDays: 30 },
  { code: "CW_COMPANY", group: "company", consent: false, reuseDays: 15 },
  { code: "CW_DIRECTORS", group: "company", consent: false, reuseDays: 15 },
  { code: "CW_CREDIT_RATING", group: "company", consent: false, reuseDays: 30 },
];

export const checkDef = (code: string) => CW_CHECKS.find((c) => c.code === code);
export const isCwCode = (code: string): code is CwCode => (CW_CODES as readonly string[]).includes(code);

/** The identifiers on the counterparty that decide which checks can run. */
export interface CheckIdentifiers {
  type: CounterpartyType;
  gstin: string | null;
  /** PAN on record, or the PAN inside the GSTIN. */
  pan: string | null;
  cin: string | null;
  udyam: string | null;
  iec: string | null;
}

/** Why a check cannot run for this counterparty, or null when it can (v3 6.5: disabled with a reason). */
export function unavailableReason(code: CwCode, id: CheckIdentifiers): string | null {
  const business = id.type !== "individual";
  switch (code) {
    case "CW_GST_SEARCH": return id.gstin || id.pan ? null : "needsGstinOrPan";
    case "CW_GST_TURNOVER_CY":
    case "CW_GST_TURNOVER_4Y": return id.type === "business_gstin" ? null : "needsGstin";
    case "CW_CIBIL_COMPANY": return business ? null : "businessOnly";
    case "CW_CIBIL_PERSONAL": return null; // the person's details are entered with the choice
    case "CW_MSME": return id.udyam || id.pan ? null : "needsUdyamOrPan";
    case "CW_PAN": return id.pan || id.gstin || id.cin ? null : "needsPan";
    case "CW_IEC_PROFILE": return id.iec || id.pan ? null : "needsIecOrPan";
    case "CW_IEC_TURNOVER": return id.iec || business ? null : "needsIecOrPan";
    case "CW_COMPANY":
    case "CW_DIRECTORS":
    case "CW_CREDIT_RATING": return business ? null : "businessOnly";
  }
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
  years: { fy: string; turnoverPaise: number; partial: boolean; months: { month: string; turnoverPaise: number }[] }[];
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

/** MSME (Udyam) registration (v3 6.1). */
export interface MsmeData {
  udyamNumber: string;
  name: string;
  category: "Micro" | "Small" | "Medium";
  majorActivity: "Manufacturing" | "Services" | "Trading";
  nicCodes: string[];
  registeredOn: string;
  address: string;
}

/** PAN check (v3 6.1). */
export interface PanData {
  pan: string;
  name: string;
  status: "Valid" | "Inactive" | "Deleted";
  aadhaarLinked: boolean | null;
}

/** Import export profile from DGFT (v3 6.1). */
export interface IecProfileData {
  iec: string;
  status: "Active" | "Suspended" | "Cancelled";
  issuedOn: string;
  name: string;
  address: string;
  branches: number;
  partners: string[];
}

/** Import and export value by financial year (v3 6.1). */
export interface IecTurnoverData {
  iec: string | null;
  years: { fy: string; exportPaise: number; importPaise: number }[];
  topPorts: string[];
  topHs: string[];
}

export type CheckData = GstSearchData | CompanyData | DirectorData | CreditRatingData | TurnoverData | CibilData | MsmeData | PanData | IecProfileData | IecTurnoverData;
