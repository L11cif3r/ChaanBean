import type { RiskFlagColor } from "@/lib/risk-scoring/engine";
import type { NormalizedReport } from "@/lib/verification-gateway/types";

const FLAG_MULTIPLIERS: Record<RiskFlagColor, number> = {
  green: 1.0,
  amber: 0.45,
  red: 0,
};

/** Deterministic credit limit from turnover + bureau + flag */
export function computeRecommendedCreditLimit(
  flag: RiskFlagColor,
  reports: NormalizedReport[]
): number {
  if (flag === "red") return 0;

  const turnoverReport = reports.find((r) => r.reportType === "gst_exact_turnover");
  const annual = turnoverReport?.data?.annualTurnover as { year: string; amount: number }[] | undefined;
  const latestTurnover = annual?.[annual.length - 1]?.amount ?? 15000000;

  const bureauReport = reports.find((r) => r.reportType === "bureau_report");
  const bureauScore = Number(bureauReport?.data?.bureauScore ?? 650);

  const bureauFactor =
    bureauScore >= 750 ? 0.15 : bureauScore >= 700 ? 0.12 : bureauScore >= 650 ? 0.08 : 0.05;
  const baseLimit = latestTurnover * bureauFactor;
  const limited = baseLimit * FLAG_MULTIPLIERS[flag];

  return Math.round(Math.min(limited, flag === "amber" ? 500000 : 2500000));
}

/** Deterministic tenor recommendation */
export function computeRecommendedTenor(flag: RiskFlagColor, reports: NormalizedReport[]): number {
  if (flag === "red") return 0;
  if (flag === "amber") return 30; // Shortened tenor for caution

  const bureauReport = reports.find((r) => r.reportType === "bureau_report");
  const bureauScore = Number(bureauReport?.data?.bureauScore ?? 650);
  return bureauScore >= 720 ? 60 : 45;
}
