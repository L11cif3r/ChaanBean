import type { CompanyData, GstSearchData } from "./checks";
import { GST_STATES } from "@/server/providers/identity/states";

// PRD v4.0 section 7.2: the quick screen's rule-based result from public records (GST search and MCA company check).
// A first filter, not a credit decision (FR-QS-05). Thresholds are Ops-editable later; the defaults are the PRD's.

export type ScreenResult = "avoid" | "check_further" | "looks_good" | "not_enough_data";
export const SCREEN_RESULTS: ScreenResult[] = ["looks_good", "check_further", "avoid", "not_enough_data"];

export interface ScreenFacts {
  gstStatus: string | null;
  /** GSTR-3B filed in the last 12 months (out of the months shown). */
  filed12: number | null;
  months12: number | null;
  lateOrMissing12: number | null;
  mcaStatus: string | null;
  yearsInBusiness: number | null;
  paidUpCapitalPaise: number | null;
  state: string | null;
}

export const SCREEN_RULES = {
  avoidMcaStatuses: ["strike off", "under liquidation", "dissolved", "amalgamated", "under process of striking off"],
  noFilingMonths: 6,
  maxLateOrMissing: 1,
  minYears: 2,
  minPaidUpPaise: 1_00_000 * 100,
};

const yearsSince = (date: string | null | undefined, today: string) => {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return null;
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
};

export function screenFacts(gst: GstSearchData | null, company: CompanyData | null, today: string): ScreenFacts {
  // No filing data from the source (API Setu has none): unknown, not "0 late".
  const filings = gst?.filings.length ? gst.filings.slice(0, 12) : null;
  const since = [gst?.registrationDate, company?.incorporationDate].map((d) => yearsSince(d, today)).filter((n): n is number => n !== null);
  return {
    gstStatus: gst?.status ?? null,
    filed12: filings ? filings.filter((f) => f.filed).length : null,
    months12: filings ? filings.length : null,
    lateOrMissing12: filings ? filings.filter((f) => !f.filed || !f.onTime).length : null,
    mcaStatus: company?.status ?? null,
    yearsInBusiness: since.length ? Math.max(...since) : null,
    paidUpCapitalPaise: company ? company.paidUpCapitalPaise : null,
    state: gst?.gstinsOnPan.find((g) => g.gstin === gst.gstin)?.state ?? (gst ? GST_STATES[gst.gstin.slice(0, 2)] ?? null : null),
  };
}

/** The result and the reasons, as message keys with values (report.screen.reason.*). */
export function screenResult(gst: GstSearchData | null, company: CompanyData | null, today: string): { result: ScreenResult; reasons: { key: string; values?: Record<string, string | number> }[]; facts: ScreenFacts } {
  const facts = screenFacts(gst, company, today);
  if (!gst && !company) return { result: "not_enough_data", reasons: [{ key: "noRecords" }], facts };
  const avoid: { key: string; values?: Record<string, string | number> }[] = [];
  const bad = gst ? [{ gstin: gst.gstin, status: gst.status }, ...gst.gstinsOnPan].filter((g) => g.status !== "Active") : [];
  if (bad.length) avoid.push({ key: "gstinInactive", values: { gstin: bad[0].gstin, status: bad[0].status } });
  if (company && SCREEN_RULES.avoidMcaStatuses.includes(company.status.toLowerCase())) avoid.push({ key: "mcaStatus", values: { status: company.status } });
  if (gst && gst.filings.length >= SCREEN_RULES.noFilingMonths && gst.filings.slice(0, SCREEN_RULES.noFilingMonths).every((f) => !f.filed)) {
    avoid.push({ key: "noFilings", values: { months: SCREEN_RULES.noFilingMonths } });
  }
  if (avoid.length) return { result: "avoid", reasons: avoid, facts };
  const further: { key: string; values?: Record<string, string | number> }[] = [];
  if (facts.lateOrMissing12 !== null && facts.lateOrMissing12 > SCREEN_RULES.maxLateOrMissing) further.push({ key: "lateFilings", values: { count: facts.lateOrMissing12 } });
  if (facts.yearsInBusiness !== null && facts.yearsInBusiness < SCREEN_RULES.minYears) further.push({ key: "young", values: { years: facts.yearsInBusiness } });
  if (company && company.paidUpCapitalPaise < SCREEN_RULES.minPaidUpPaise) further.push({ key: "lowCapital" });
  if (further.length) return { result: "check_further", reasons: further, facts };
  return { result: "looks_good", reasons: [], facts };
}
