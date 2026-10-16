// Risk level and safe credit range for the credit report (PRD v2.0 section 6, v1.0 sections 9.2 and 9.3).
// Pure functions, so the server can store the result on the request and the tests can pin every rule.
//
//   High: any serious problem (red signal).
//   Not enough data: no GST turnover and no CIBIL report (unless something serious already makes it High).
//   Medium: some warning signs, or too few good signs to call it Low.
//   Low: no warning signs and at least 3 good signs.
// Safe credit range: 1% to 2% of last year's filed turnover; 0.5% to 1% if turnover is falling; none when High.

import type { CibilData, CompanyData, CreditRatingData, DirectorData, GstSearchData, TurnoverData } from "./checks";

export type RiskLevel = "high" | "medium" | "low" | "not_enough_data";
export type SignalTone = "red" | "caution" | "positive";

export interface Signal {
  key: string;
  tone: SignalTone;
  /** The report section the signal comes from, for the "Why" list links. */
  section: "gst" | "turnover" | "cibil" | "company" | "directors" | "cases";
  /** Values the screen puts into the signal's sentence. */
  values?: Record<string, string | number>;
}

export interface ReportInputs {
  gst?: GstSearchData | null;
  company?: CompanyData | null;
  directors?: DirectorData | null;
  rating?: CreditRatingData | null;
  turnover?: TurnoverData | null;
  turnoverCurrentYear?: TurnoverData | null;
  cibil?: CibilData[];
  /** Confirmed Case Check results (Part 8). */
  cases?: { pendingChequeBounce: number; amlHit: boolean } | null;
  /** "Today" in IST as YYYY-MM-DD, so tests are stable. */
  today: string;
}

export interface CreditRange {
  lowPaise: number;
  highPaise: number;
  basePaise: number;
  baseYear: string;
  reduced: boolean;
}

export interface ReportOutcome {
  level: RiskLevel;
  signals: Signal[];
  counts: { positive: number; caution: number; red: number };
  range: CreditRange | null;
  /** Why there is no range: high risk, no turnover, or only current-year turnover. */
  rangeNote: "high_risk" | "no_turnover" | "needs_full_year" | null;
}

/** Thresholds from 9.2 and 9.3 (ops can change them later from the admin panel). */
export const RULES = {
  seriousOverdueDays: 90,
  moderateOverdueDays: 31,
  fallingTurnoverPct: 20,
  irregularFilings: 2,
  manyEnquiries: 6,
  longStandingYears: 5,
  growingYears: 3,
  minPositiveForLow: 3,
  rangeLowPct: 1,
  rangeHighPct: 2,
  reducedLowPct: 0.5,
  reducedHighPct: 1,
} as const;

const yearsBetween = (from: string, to: string) => {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  let years = b.getUTCFullYear() - a.getUTCFullYear();
  if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) years -= 1;
  return years;
};

/** Full financial years only, oldest first. */
const fullYears = (t: TurnoverData | null | undefined) => (t?.years ?? []).filter((y) => !y.partial);

export function evaluateReport(input: ReportInputs): ReportOutcome {
  const signals: Signal[] = [];
  const add = (s: Signal) => signals.push(s);

  // ---- GST
  const gst = input.gst;
  if (gst) {
    const bad = [gst.status, ...gst.gstinsOnPan.map((g) => g.status)].find((s) => s !== "Active");
    if (bad) add({ key: "gst_not_active", tone: "red", section: "gst", values: { status: bad.toLowerCase() } });
    const late = gst.filings.slice(0, 12).filter((f) => !f.filed || !f.onTime).length;
    if (late >= RULES.irregularFilings) add({ key: "irregular_filing", tone: "caution", section: "gst", values: { count: late } });
    else if (gst.filings.length >= 12 && late === 0) add({ key: "regular_filing", tone: "positive", section: "gst" });
  }

  // ---- Company and directors
  const company = input.company;
  if (company && company.status !== "Active") add({ key: "company_not_active", tone: "red", section: "company", values: { status: company.status } });
  const started = gst?.registrationDate ?? company?.incorporationDate;
  if (started && yearsBetween(started, input.today) >= RULES.longStandingYears) {
    add({ key: "long_standing", tone: "positive", section: gst ? "gst" : "company", values: { years: yearsBetween(started, input.today) } });
  }
  const disqualified = input.directors?.directors.filter((d) => d.disqualified).length ?? 0;
  if (disqualified > 0) add({ key: "director_disqualified", tone: "caution", section: "directors", values: { count: disqualified } });

  // ---- Turnover (last 4 years)
  const years = fullYears(input.turnover);
  if (years.length >= 2) {
    const last = years[years.length - 1].turnoverPaise;
    const prev = years[years.length - 2].turnoverPaise;
    if (prev > 0 && ((prev - last) / prev) * 100 >= RULES.fallingTurnoverPct) {
      add({ key: "falling_turnover", tone: "caution", section: "turnover", values: { pct: Math.round(((prev - last) / prev) * 100) } });
    }
  }
  if (years.length >= RULES.growingYears + 1) {
    const recent = years.slice(-(RULES.growingYears + 1));
    if (recent.every((y, i) => i === 0 || y.turnoverPaise > recent[i - 1].turnoverPaise)) {
      add({ key: "growing_turnover", tone: "positive", section: "turnover", values: { years: RULES.growingYears } });
    }
  }

  // ---- CIBIL
  for (const c of input.cibil ?? []) {
    if (c.wilfulDefaulter) add({ key: "wilful_defaulter", tone: "red", section: "cibil", values: { bureau: c.bureau } });
    if (c.suitFiled) add({ key: "suit_filed", tone: "red", section: "cibil", values: { bureau: c.bureau } });
    const maxDpd = Math.max(0, ...c.overdue.map((o) => o.daysPastDue));
    if (maxDpd >= RULES.seriousOverdueDays) add({ key: "serious_overdue", tone: "red", section: "cibil", values: { days: maxDpd } });
    else if (maxDpd >= RULES.moderateOverdueDays) add({ key: "moderate_overdue", tone: "caution", section: "cibil", values: { days: maxDpd } });
    else if (c.overdue.length === 0) add({ key: "clean_bureau", tone: "positive", section: "cibil" });
    if (c.enquiries6m >= RULES.manyEnquiries) add({ key: "many_enquiries", tone: "caution", section: "cibil", values: { count: c.enquiries6m } });
  }

  // ---- Case Check (confirmed matches only)
  if (input.cases?.amlHit) add({ key: "aml_hit", tone: "red", section: "cases" });
  if ((input.cases?.pendingChequeBounce ?? 0) > 0) {
    add({ key: "pending_cases", tone: "caution", section: "cases", values: { count: input.cases!.pendingChequeBounce } });
  }

  // One signal per key (two CIBIL reports can say the same thing).
  const unique = signals.filter((s, i) => signals.findIndex((x) => x.key === s.key) === i);
  const counts = {
    red: unique.filter((s) => s.tone === "red").length,
    caution: unique.filter((s) => s.tone === "caution").length,
    positive: unique.filter((s) => s.tone === "positive").length,
  };

  const hasFinancials = Boolean(input.turnover?.years.length || input.turnoverCurrentYear?.years.length || input.cibil?.length);
  const level: RiskLevel =
    counts.red > 0 ? "high"
      : !hasFinancials ? "not_enough_data"
        : counts.caution > 0 ? "medium"
          : counts.positive >= RULES.minPositiveForLow ? "low"
            : "medium";

  // ---- Safe credit range (9.3)
  let range: CreditRange | null = null;
  let rangeNote: ReportOutcome["rangeNote"] = null;
  const latest = years[years.length - 1];
  if (level === "high") rangeNote = "high_risk";
  else if (!latest) rangeNote = input.turnoverCurrentYear?.years.length ? "needs_full_year" : "no_turnover";
  else {
    const reduced = unique.some((s) => s.key === "falling_turnover");
    const lowPct = reduced ? RULES.reducedLowPct : RULES.rangeLowPct;
    const highPct = reduced ? RULES.reducedHighPct : RULES.rangeHighPct;
    range = {
      basePaise: latest.turnoverPaise,
      baseYear: latest.fy,
      lowPaise: Math.round((latest.turnoverPaise * lowPct) / 100),
      highPaise: Math.round((latest.turnoverPaise * highPct) / 100),
      reduced,
    };
  }

  return { level, signals: unique, counts, range, rangeNote };
}
