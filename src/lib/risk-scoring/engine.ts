import type { NormalizedReport } from "@/lib/verification-gateway/types";

export type RiskFlagColor = "green" | "amber" | "red";

export interface SignalBreakdown {
  signal: string;
  source: string;
  weight: number;
  subScore: number;
  maxScore: number;
  effect: string;
  ruleId: string;
}

export interface RiskScoreResult {
  flag: RiskFlagColor;
  compositeScore: number;
  signals: SignalBreakdown[];
  pendingReports: string[];
}

const WEIGHTS = {
  turnover: 15,
  gstCompliance: 20,
  bureau: 30,
  litigation: 15,
  network: 10,
  identity: 5,
  standing: 5,
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function scoreTurnover(reports: NormalizedReport[]): SignalBreakdown {
  const r = reports.find((x) => x.reportType === "gst_exact_turnover");
  const trend = (r?.data?.turnoverTrend as string) ?? "stable";
  const map: Record<string, number> = { growing: 95, stable: 80, declining: 45, erratic: 35 };
  const sub = map[trend] ?? 60;
  return {
    signal: "Turnover trend (4-yr)",
    source: "GST Exact Turnover",
    weight: WEIGHTS.turnover,
    subScore: sub,
    maxScore: 100,
    effect: `${trend} trend → ${sub}/100`,
    ruleId: "RS-TURNOVER-001",
  };
}

function scoreGstCompliance(reports: NormalizedReport[]): SignalBreakdown {
  const r = reports.find((x) => x.reportType === "gst_supreme_report");
  if (r?.status === "pending") {
    return {
      signal: "GST compliance",
      source: "GST Supreme Report",
      weight: WEIGHTS.gstCompliance,
      subScore: 50,
      maxScore: 100,
      effect: "Pending OTP — provisional neutral score",
      ruleId: "RS-GST-PENDING",
    };
  }
  const consistency = r?.data?.filingConsistency as string;
  const mismatches = Boolean(r?.data?.mismatches);
  let sub = 85;
  if (consistency === "lapses") sub = 40;
  if (mismatches) sub = Math.min(sub, 25);
  return {
    signal: "GST compliance",
    source: "GST Supreme Report",
    weight: WEIGHTS.gstCompliance,
    subScore: sub,
    maxScore: 100,
    effect: mismatches ? "Filing mismatches detected" : `${consistency ?? "unknown"} filings`,
    ruleId: "RS-GST-002",
  };
}

function scoreBureau(reports: NormalizedReport[]): SignalBreakdown {
  const r = reports.find((x) => x.reportType === "bureau_report");
  const score = Number(r?.data?.bureauScore ?? 600);
  let sub = 50;
  if (score >= 750) sub = 95;
  else if (score >= 700) sub = 85;
  else if (score >= 650) sub = 72;
  else if (score >= 600) sub = 58;
  else if (score >= 550) sub = 42;
  else sub = 25;
  return {
    signal: "Bureau score",
    source: String(r?.data?.provider ?? "CIBIL/Experian/CRIF"),
    weight: WEIGHTS.bureau,
    subScore: sub,
    maxScore: 100,
    effect: `Score ${score} → band sub-score ${sub}`,
    ruleId: "RS-BUREAU-001",
  };
}

function scoreLitigation(reports: NormalizedReport[]): SignalBreakdown {
  const court = reports.find((x) => x.reportType === "court_case_history");
  const fir = reports.find((x) => x.reportType === "fir_check");
  const active = Number(court?.data?.activeCases ?? 0);
  const firRegistered = Boolean(fir?.data?.firRegistered);
  let sub = 90;
  if (active >= 2) sub = 20;
  else if (active === 1) sub = 45;
  if (firRegistered) sub = Math.min(sub, 15);
  return {
    signal: "Litigation exposure",
    source: "Court Case History, FIR Check",
    weight: WEIGHTS.litigation,
    subScore: sub,
    maxScore: 100,
    effect: active > 0 || firRegistered ? "Active/unresolved cases — hard flag" : "Clean",
    ruleId: "RS-LIT-001",
  };
}

function scoreNetwork(peerDefaults: number): SignalBreakdown {
  const sub = peerDefaults > 0 ? 10 : 90;
  return {
    signal: "Network reputation",
    source: "Trust Hub peer reports",
    weight: WEIGHTS.network,
    subScore: sub,
    maxScore: 100,
    effect: peerDefaults > 0 ? `${peerDefaults} peer-reported default(s) — strong Red signal` : "No peer defaults",
    ruleId: "RS-TRUST-001",
  };
}

function scoreIdentity(reports: NormalizedReport[]): SignalBreakdown {
  const pan = reports.find((x) => x.reportType === "mobile_to_pan");
  const mobile = reports.find((x) => x.reportType === "mobile_identity");
  const addr = reports.find((x) => x.reportType === "address_enrichment");
  const mismatch = pan?.data?.panMatch === false || mobile?.data?.mobileVerified === false;
  const lowAddr = Number(addr?.data?.addressConfidence ?? 1) < 0.6;
  let sub = 88;
  if (mismatch) sub = 35;
  else if (lowAddr) sub = 55;
  return {
    signal: "Identity consistency",
    source: "Mobile to PAN, Mobile Identity, Address checks",
    weight: WEIGHTS.identity,
    subScore: sub,
    maxScore: 100,
    effect: mismatch ? "Identity mismatch — fraud signal" : lowAddr ? "Low address confidence" : "Consistent",
    ruleId: "RS-ID-001",
  };
}

function scoreStanding(reports: NormalizedReport[]): SignalBreakdown {
  const msme = reports.find((x) => x.reportType === "msme_report");
  const company = reports.find((x) => x.reportType === "company_supreme_report");
  const directors = reports.find((x) => x.reportType === "director_details");
  const disqualified = Array.isArray(directors?.data?.directors)
    ? (directors.data.directors as { status: string }[]).some((d) => d.status === "disqualified")
    : false;
  const msmeInvalid = msme?.data?.valid === false;
  let sub = 85;
  if (disqualified) sub = 30;
  if (msmeInvalid) sub = Math.min(sub, 40);
  if (!company?.data?.financialsAvailable) sub = Math.min(sub, 60);
  return {
    signal: "MSME/company standing",
    source: "MSME Report, Company Supreme Report, Director Details",
    weight: WEIGHTS.standing,
    subScore: sub,
    maxScore: 100,
    effect: disqualified ? "Disqualified director" : msmeInvalid ? "Invalid MSME" : "Clean registration",
    ruleId: "RS-STAND-001",
  };
}

/** Deterministic rules-based risk scoring — never uses LLM/ML */
export function computeRiskScore(
  reports: NormalizedReport[],
  options?: { peerReportedDefaults?: number }
): RiskScoreResult {
  const signals = [
    scoreTurnover(reports),
    scoreGstCompliance(reports),
    scoreBureau(reports),
    scoreLitigation(reports),
    scoreNetwork(options?.peerReportedDefaults ?? 0),
    scoreIdentity(reports),
    scoreStanding(reports),
  ];

  const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
  const compositeScore = clamp(
    signals.reduce((s, x) => s + (x.subScore * x.weight) / totalWeight, 0)
  );

  const pendingReports = reports.filter((r) => r.status === "pending").map((r) => r.reportType);

  // Hard overrides
  const litigation = signals.find((s) => s.signal === "Litigation exposure");
  const network = signals.find((s) => s.signal === "Network reputation");
  const bureau = signals.find((s) => s.signal === "Bureau score");

  let flag: RiskFlagColor = "green";
  if (
    (network && network.subScore <= 20) ||
    (litigation && litigation.subScore <= 20) ||
    compositeScore < 45 ||
    (bureau && bureau.subScore <= 25)
  ) {
    flag = "red";
  } else if (compositeScore < 65 || (litigation && litigation.subScore <= 45)) {
    flag = "amber";
  }

  return { flag, compositeScore, signals, pendingReports };
}
