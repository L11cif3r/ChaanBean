// Deterministic, versioned credit engine (PRD §9). Pure function: inputs + policy → result.
// The same inputs and policy version always give the same output. Nothing here is estimated:
// missing inputs lower confidence or exclude a factor, they are never filled in.

export interface FinancialYearInput {
  fiscalYear: string; // "2024-25"
  revenuePaise: bigint | null;
}

export interface GstFilingInput {
  returnType: string; // only GSTR3B is used for the on-time ratio
  taxPeriod: string; // MMYYYY
  dueDate: string | null; // YYYY-MM-DD
  filedOn: string | null;
}

export interface CreditEngineInput {
  asOf: string; // YYYY-MM-DD, date the assessment is made
  entityRegisteredWithMca: boolean;
  companyStatus: string | null; // MCA status (cc_company_status)
  gstStatuses: string[]; // one per GSTIN found
  incorporationDate: string | null;
  lastBalanceSheetDate: string | null;
  financials: FinancialYearInput[]; // any order; standalone figures
  gstFilings: GstFilingInput[]; // all GSTINs, any period
  activeDirectors: number | null; // null = not available
  disqualifiedDirectors: number | null;
  openChargesPaise: bigint | null; // null = charges not available
  requestedPaise: bigint | null;
}

export interface Band { min: number | null; mult: number }
export interface CreditPolicyParams {
  base_pct: number;
  growth_bands: { min_cagr: number | null; mult: number }[];
  gst_bands: { min_ratio: number | null; mult: number }[];
  gst_missing_mult: number;
  young_company_years: number;
  young_company_mult: number;
  max_limit_paise: number;
  round_down_paise: number;
  hard_stop_statuses: string[];
  weights: { financial: number; gst: number; stability: number; management: number; borrowing: number };
  band_cutoffs: { LOW: number; MODERATE: number; HIGH: number };
  exceed_high_risk_ratio: number;
  /** Size tiers for the financial-strength factor, highest first (rupees). Not in seed v1; defaults below. */
  size_tiers?: { min_rupees: number; points: number }[];
}

export const DEFAULT_SIZE_TIERS = [
  { min_rupees: 100_00_00_000, points: 15 }, // ≥ ₹100 crore
  { min_rupees: 25_00_00_000, points: 12 },
  { min_rupees: 5_00_00_000, points: 9 },
  { min_rupees: 1_00_00_000, points: 6 },
  { min_rupees: 25_00_000, points: 3 },
  { min_rupees: 0, points: 1 },
];

export type RiskBand = "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | "INSUFFICIENT_DATA";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface Factor {
  code: string;
  label: string;
  direction: "+" | "-" | "=";
  points: number | null;
  max: number;
  value?: number | string | null;
}

export interface CreditEngineResult {
  recommendedLimitPaise: bigint | null;
  score: number | null;
  riskBand: RiskBand;
  confidence: Confidence;
  turnoverLatestPaise: bigint | null;
  turnoverCagr: number | null;
  gstOnTimeRatio: number | null;
  multipliers: { growth: number; gst: number; age: number } | null;
  factors: Factor[];
  hardStops: string[];
  requestedPaise: bigint | null;
  exceedsLimit: boolean | null;
  exceedRatio: number | null;
  requestVerdict: "WITHIN_LIMIT" | "ABOVE_LIMIT" | "HIGH_RISK" | null;
  yearsOfRevenue: number;
}

const DAY_MS = 86_400_000;
const yearsBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / (365.25 * DAY_MS);
const monthsBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / (30.4375 * DAY_MS);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function pickBand<T extends { mult: number }>(bands: T[], value: number, key: keyof T): number {
  for (const b of bands) {
    const min = b[key] as unknown as number | null;
    if (min === null || value >= min) return b.mult;
  }
  return bands[bands.length - 1].mult;
}

/** GSTR-3B returns filed on/before the due date ÷ returns due, for the 12 months before asOf. */
export function gstOnTimeRatio(filings: GstFilingInput[], asOf: string): number | null {
  const cutoff = new Date(asOf);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
  const due = filings.filter(
    (f) => f.returnType === "GSTR3B" && f.dueDate && Date.parse(f.dueDate) > cutoff.getTime() && Date.parse(f.dueDate) <= Date.parse(asOf),
  );
  if (due.length === 0) return null;
  const onTime = due.filter((f) => f.filedOn && Date.parse(f.filedOn) <= Date.parse(f.dueDate!)).length;
  return onTime / due.length;
}

export function assessCredit(input: CreditEngineInput, policy: CreditPolicyParams): CreditEngineResult {
  const factors: Factor[] = [];
  const hardStops: string[] = [];

  // ---- inputs -------------------------------------------------------------------------
  const years = input.financials
    .filter((f) => f.revenuePaise !== null)
    .sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear))
    .slice(0, 4);
  const t0 = years[0]?.revenuePaise ?? null;
  const oldest = years[years.length - 1];
  const span = years.length - 1; // number of growth periods
  const cagr =
    t0 !== null && span >= 1 && oldest.revenuePaise! > 0n && t0 > 0n
      ? Math.pow(Number(t0) / Number(oldest.revenuePaise), 1 / span) - 1
      : null;
  const ratio = gstOnTimeRatio(input.gstFilings, input.asOf);
  const ageYears = input.incorporationDate ? yearsBetween(input.incorporationDate, input.asOf) : null;

  // ---- hard stops (§9.2) -------------------------------------------------------------------
  if (input.companyStatus && policy.hard_stop_statuses.includes(input.companyStatus)) {
    hardStops.push(`MCA_${input.companyStatus}`);
  }
  if (input.gstStatuses.length > 0 && input.gstStatuses.every((s) => s === "CANCELLED" || s === "SUSPENDED")) {
    hardStops.push("ALL_GSTIN_CANCELLED");
  }
  if (t0 !== null && t0 <= 0n) hardStops.push("NO_REVENUE");

  // ---- confidence (§9.3) ------------------------------------------------------------------
  const hasGst = ratio !== null;
  const confidence: Confidence =
    years.length >= 4 && hasGst ? "HIGH" : years.length >= 2 ? "MEDIUM" : "LOW";

  // ---- limit (§9.2) -------------------------------------------------------------------------
  const growthMult = cagr === null ? 1 : pickBand(policy.growth_bands, cagr, "min_cagr");
  const gstMult = ratio === null ? policy.gst_missing_mult : pickBand(policy.gst_bands, ratio, "min_ratio");
  const ageMult = ageYears !== null && ageYears < policy.young_company_years ? policy.young_company_mult : 1;

  const insufficient = t0 === null || (years.length < 2 && !hasGst);
  let limit: bigint | null = null;
  if (hardStops.length > 0) {
    limit = 0n;
  } else if (!insufficient) {
    // Multiply in integer micro-units to keep the result exact and reproducible.
    const scale = 1_000_000;
    const factor = Math.round(policy.base_pct * growthMult * gstMult * ageMult * scale);
    let raw = (t0! * BigInt(factor)) / BigInt(scale);
    const max = BigInt(policy.max_limit_paise);
    if (raw > max) raw = max;
    const step = BigInt(policy.round_down_paise);
    limit = (raw / step) * step;
  }

  // ---- score (§9.3) ------------------------------------------------------------------------
  const w = policy.weights;
  let earned = 0;
  let possible = 0;

  if (t0 !== null && t0 > 0n) {
    const tiers = policy.size_tiers ?? DEFAULT_SIZE_TIERS;
    const rupees = Number(t0 / 100n);
    const sizePts = tiers.find((t) => rupees >= t.min_rupees)?.points ?? 0;
    const trendPts = cagr === null ? 10 : cagr >= 0.15 ? 20 : cagr >= 0 ? 14 : cagr >= -0.15 ? 7 : 0;
    const pts = Math.round(((sizePts + trendPts) / 35) * w.financial);
    earned += pts;
    possible += w.financial;
    factors.push({
      code: "TURNOVER_TREND",
      label:
        cagr === null
          ? "Only one year of revenue available"
          : cagr >= 0
            ? `Revenue grew ${pct(cagr)} a year over ${span} year${span > 1 ? "s" : ""}`
            : `Revenue fell ${pct(-cagr)} a year over ${span} year${span > 1 ? "s" : ""}`,
      direction: cagr === null ? "=" : cagr >= 0 ? "+" : "-",
      points: pts,
      max: w.financial,
      value: cagr,
    });
  }

  if (ratio !== null) {
    const pts = Math.round(ratio * w.gst);
    earned += pts;
    possible += w.gst;
    factors.push({
      code: "GST_ON_TIME",
      label: `GSTR-3B filed on time ${pct(ratio)} of the last 12 months`,
      direction: ratio >= 0.9 ? "+" : "-",
      points: pts,
      max: w.gst,
      value: ratio,
    });
  } else {
    factors.push({ code: "GST_ON_TIME", label: "GST filing record not available", direction: "=", points: null, max: w.gst, value: null });
  }

  if (input.entityRegisteredWithMca || input.companyStatus || ageYears !== null) {
    let pts = 0;
    if (input.companyStatus === "ACTIVE" || (!input.entityRegisteredWithMca && input.gstStatuses.includes("ACTIVE"))) pts += 10;
    if (ageYears !== null && ageYears >= 5) pts += 5;
    if (input.lastBalanceSheetDate && monthsBetween(input.lastBalanceSheetDate, input.asOf) <= 18) pts += 5;
    const scaled = Math.round((pts / 20) * w.stability);
    earned += scaled;
    possible += w.stability;
    factors.push({
      code: "STABILITY",
      label: `${input.companyStatus ?? "Status unknown"}${ageYears !== null ? `, ${Math.floor(ageYears)} years old` : ""}`,
      direction: pts >= 15 ? "+" : "-",
      points: scaled,
      max: w.stability,
    });
  }

  if (input.activeDirectors !== null) {
    let pts = 0;
    if (input.activeDirectors >= 2) pts += 5;
    if ((input.disqualifiedDirectors ?? 0) === 0) pts += 5;
    const scaled = Math.round((pts / 10) * w.management);
    earned += scaled;
    possible += w.management;
    factors.push({
      code: "MANAGEMENT",
      label: `${input.activeDirectors} active director${input.activeDirectors === 1 ? "" : "s"}${input.disqualifiedDirectors ? `, ${input.disqualifiedDirectors} disqualified` : ""}`,
      direction: pts === 10 ? "+" : "-",
      points: scaled,
      max: w.management,
    });
  }

  if (input.openChargesPaise !== null && t0 !== null && t0 > 0n) {
    const exposure = Number(input.openChargesPaise) / Number(t0);
    const pts = exposure < 0.25 ? 10 : exposure <= 0.75 ? 5 : 0;
    const scaled = Math.round((pts / 10) * w.borrowing);
    earned += scaled;
    possible += w.borrowing;
    factors.push({
      code: "BORROWING",
      label: input.openChargesPaise === 0n ? "No open secured loans" : `Open secured loans are ${pct(exposure)} of revenue`,
      direction: pts === 10 ? "+" : "-",
      points: scaled,
      max: w.borrowing,
      value: exposure,
    });
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : null;

  let band: RiskBand;
  if (hardStops.length > 0) band = "VERY_HIGH";
  else if (insufficient || score === null) band = "INSUFFICIENT_DATA";
  else if (score >= policy.band_cutoffs.LOW) band = "LOW";
  else if (score >= policy.band_cutoffs.MODERATE) band = "MODERATE";
  else if (score >= policy.band_cutoffs.HIGH) band = "HIGH";
  else band = "VERY_HIGH";

  // ---- request check (§9.3) ---------------------------------------------------------------
  let exceedsLimit: boolean | null = null;
  let exceedRatio: number | null = null;
  let verdict: CreditEngineResult["requestVerdict"] = null;
  if (input.requestedPaise !== null && limit !== null) {
    exceedsLimit = input.requestedPaise > limit;
    exceedRatio = limit > 0n ? Math.round((Number(input.requestedPaise) / Number(limit)) * 100) / 100 : null;
    verdict = !exceedsLimit
      ? "WITHIN_LIMIT"
      : limit === 0n || (exceedRatio !== null && exceedRatio > policy.exceed_high_risk_ratio)
        ? "HIGH_RISK"
        : "ABOVE_LIMIT";
  }

  return {
    recommendedLimitPaise: limit,
    score: hardStops.length > 0 ? 0 : score,
    riskBand: band,
    confidence,
    turnoverLatestPaise: t0,
    turnoverCagr: cagr === null ? null : Math.round(cagr * 10_000) / 10_000,
    gstOnTimeRatio: ratio === null ? null : Math.round(ratio * 10_000) / 10_000,
    multipliers: insufficient && hardStops.length === 0 ? null : { growth: growthMult, gst: gstMult, age: ageMult },
    factors,
    hardStops,
    requestedPaise: input.requestedPaise,
    exceedsLimit,
    exceedRatio,
    requestVerdict: verdict,
    yearsOfRevenue: years.length,
  };
}
