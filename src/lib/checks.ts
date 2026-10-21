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
  /** v4: a buyer picked from search may have no contact yet; checks that need the buyer's OTP wait for one. */
  hasMobile?: boolean;
}

/** Why a check cannot run for this counterparty, or null when it can (v3 6.5: disabled with a reason). */
export function unavailableReason(code: CwCode, id: CheckIdentifiers): string | null {
  const business = id.type !== "individual";
  if (id.hasMobile === false && CW_CHECKS.find((c) => c.code === code)?.consent && code !== "CW_CIBIL_PERSONAL") return "needsContact";
  switch (code) {
    case "CW_GST_SEARCH": return id.gstin || id.pan ? null : "needsGstinOrPan";
    case "CW_GST_TURNOVER_CY":
    case "CW_GST_TURNOVER_4Y": return id.gstin ? null : "needsGstin";
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
  /** From API Setu (v4): nature of business, e-invoicing, other places of business, tax office. */
  natureOfBusiness?: string[];
  eInvoice?: boolean | null;
  otherPlaces?: number;
  jurisdiction?: string | null;
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
  /** False when the source has no charge (loan) data, such as MCA open data (v4). */
  chargesKnown?: boolean;
  /** MCA open data: when MCA last refreshed the record (FR-RP-04). */
  datasetDate?: string;
  /** More from the MCA master data: sub-category, listed or not, Indian or foreign, business activity, registrar office. */
  subCategory?: string | null;
  listing?: string | null;
  origin?: string | null;
  activity?: string | null;
  nicCode?: string | null;
  registrar?: string | null;
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

// ---------------------------------------------------------------- turnover chart (v4 FR-RP-01 to 05)

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Years oldest first with short labels (FY 2023-24), and the current year's months for the monthly view. */
export function turnoverSeries(d: TurnoverData) {
  const years = [...d.years].sort((a, b) => a.fy.localeCompare(b.fy)).map((y) => ({ ...y, label: `FY ${y.fy}` }));
  const cur = years.find((y) => y.partial) ?? null;
  return {
    years,
    current: cur ? { label: cur.label, months: cur.months.map((m) => ({ label: MONTH[Number(m.month.slice(5, 7)) - 1] ?? m.month, turnoverPaise: m.turnoverPaise })) } : null,
  };
}

/** Year-on-year change in whole per cent, or null when the earlier year is zero. */
export const yoyChange = (before: number, after: number) => (before > 0 ? Math.round(((after - before) / before) * 100) : null);

/** The same bar chart as an SVG string, for the report PDF (FR-RP-05). */
export function turnoverBarsSvg(d: TurnoverData, fmt: (paise: number) => string): string {
  const { years } = turnoverSeries(d);
  const W = 560, H = 220, pad = 24, gap = 14;
  const max = Math.max(1, ...years.map((y) => y.turnoverPaise));
  const bw = (W - 2 * pad - gap * (years.length - 1)) / Math.max(1, years.length);
  const bars = years.map((y, i) => {
    const h = Math.max(4, (y.turnoverPaise / max) * 130);
    const x = pad + i * (bw + gap);
    const top = H - 34 - h;
    const change = i > 0 && !y.partial ? yoyChange(years[i - 1].turnoverPaise, y.turnoverPaise) : null;
    return `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${y.partial ? "#fdc9a0" : "#fc8019"}"/>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${(top - 6).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#171717">${fmt(y.turnoverPaise)}</text>`
      + (change === null ? "" : `<text x="${(x + bw / 2).toFixed(1)}" y="${(top - 22).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${change >= 0 ? "#047857" : "#e11d48"}">${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}%</text>`)
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="11" fill="#666">${y.label}${y.partial ? " (so far)" : ""}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img">${bars.join("")}</svg>`;
}

// ---------------------------------------------------------------- section source (v4 FR-RP-04)

const PROVIDER_NAMES: Record<string, string> = {
  apisetu: "API Setu", mca: "MCA open data", surepass: "Surepass", setu: "Setu", finagg: "Finagg", vayana: "Vayana", cibil: "CIBIL",
  crif: "CRIF", experian: "Experian", zoop: "Zoop", gridlines: "Gridlines", cashfree: "Cashfree", volza: "Volza", eximpedia: "Eximpedia",
  probe42: "Probe42", signzy: "Signzy", legalkart: "LegalKart", authbridge: "AuthBridge", idfy: "IDfy", hyperverge: "HyperVerge",
};
export const providerName = (p: string | null | undefined) => (p ? PROVIDER_NAMES[p] ?? p : "");

/** Message key (report.src.*) and values for a section's source line: "GST (API Setu), 20 Oct 13:51". */
export function sourceLine(provider: string | null | undefined, time: string, data?: unknown): { key: string; values: Record<string, string> } {
  if (!provider || provider.startsWith("mock")) return { key: "sample", values: { time } };
  const dataset = (data as { datasetDate?: string } | null | undefined)?.datasetDate;
  if (provider === "mca") return dataset ? { key: "mca", values: { date: dataset } } : { key: "live", values: { provider: providerName(provider), time } };
  return { key: "live", values: { provider: providerName(provider), time } };
}

