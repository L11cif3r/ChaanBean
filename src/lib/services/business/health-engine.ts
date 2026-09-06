/**
 * Financial Health Engine
 * Computes 6 deterministic sub-scores → composite health score 0–100
 * NO LLM. Pure rule-based arithmetic.
 *
 * Sub-scores:
 *   1. Revenue Stability  (weight 20) — CAGR + volatility
 *   2. Profitability       (weight 20) — net margin + EBITDA margin
 *   3. Cash Flow           (weight 15) — bank inflow/outflow ratio
 *   4. Debt Burden         (weight 20) — debt-to-equity, interest coverage
 *   5. Liquidity           (weight 15) — current ratio
 *   6. Financial Consistency (weight 10) — consistency check results
 */

import { analyseMultiYear } from "./financial-analyser";
import { prisma } from "@/lib/db";

export interface HealthSubScore {
  name: string;
  score: number;      // 0–100
  weight: number;     // weight in composite
  rationale: string;
}

export interface HealthEngineResult {
  overallScore: number;      // 0–100 weighted average
  subScores: HealthSubScore[];
  dataQuality: "HIGH" | "MEDIUM" | "LOW";
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, val));
}

function scoreRevenue(revenueCagr: number | null, summaryCount: number): HealthSubScore {
  let score = 50; // default: neutral
  let rationale = "Insufficient data to assess revenue stability.";

  if (revenueCagr !== null && summaryCount >= 2) {
    if (revenueCagr >= 15) {
      score = 90;
      rationale = `Strong revenue growth: CAGR of ${revenueCagr.toFixed(1)}% over ${summaryCount} years.`;
    } else if (revenueCagr >= 8) {
      score = 70;
      rationale = `Moderate revenue growth: CAGR of ${revenueCagr.toFixed(1)}%.`;
    } else if (revenueCagr >= 0) {
      score = 50;
      rationale = `Slow revenue growth: CAGR of ${revenueCagr.toFixed(1)}%.`;
    } else if (revenueCagr >= -10) {
      score = 30;
      rationale = `Revenue declining: CAGR of ${revenueCagr.toFixed(1)}%.`;
    } else {
      score = 10;
      rationale = `Significant revenue decline: CAGR of ${revenueCagr.toFixed(1)}%.`;
    }
  } else if (summaryCount === 1) {
    score = 40;
    rationale = "Only one year of data available — cannot assess trend.";
  }

  return { name: "Revenue Stability", score: clamp(score), weight: 20, rationale };
}

function scoreProfitability(avgNetMargin: number | null, avgGrossMargin: number | null): HealthSubScore {
  let score = 40;
  let rationale = "Insufficient margin data.";

  if (avgNetMargin !== null) {
    if (avgNetMargin >= 15) {
      score = 90;
      rationale = `Excellent net margin: avg ${avgNetMargin.toFixed(1)}%.`;
    } else if (avgNetMargin >= 8) {
      score = 70;
      rationale = `Good net margin: avg ${avgNetMargin.toFixed(1)}%.`;
    } else if (avgNetMargin >= 3) {
      score = 50;
      rationale = `Thin net margin: avg ${avgNetMargin.toFixed(1)}%.`;
    } else if (avgNetMargin >= 0) {
      score = 30;
      rationale = `Very thin or breakeven: avg net margin ${avgNetMargin.toFixed(1)}%.`;
    } else {
      score = 10;
      rationale = `Loss-making: avg net margin ${avgNetMargin.toFixed(1)}%.`;
    }
  }

  if (avgGrossMargin !== null && avgGrossMargin < 10) {
    score = Math.max(10, score - 10);
    rationale += ` Gross margin also low at ${avgGrossMargin.toFixed(1)}%.`;
  }

  return { name: "Profitability", score: clamp(score), weight: 20, rationale };
}

function scoreCashFlow(latestBankInflow: number | null, latestBankOutflow: number | null): HealthSubScore {
  let score = 50;
  let rationale = "No bank statement data available.";

  if (latestBankInflow != null && latestBankOutflow != null && latestBankOutflow > 0) {
    const ratio = latestBankInflow / latestBankOutflow;
    if (ratio >= 1.2) {
      score = 85;
      rationale = `Bank inflow/outflow ratio: ${ratio.toFixed(2)} — positive cash flow.`;
    } else if (ratio >= 1.0) {
      score = 60;
      rationale = `Bank inflow/outflow ratio: ${ratio.toFixed(2)} — approximately breakeven cash flow.`;
    } else if (ratio >= 0.8) {
      score = 35;
      rationale = `Bank inflow/outflow ratio: ${ratio.toFixed(2)} — cash outflows exceeding inflows.`;
    } else {
      score = 15;
      rationale = `Bank inflow/outflow ratio: ${ratio.toFixed(2)} — significant cash deficit.`;
    }
  }

  return { name: "Cash Flow", score: clamp(score), weight: 15, rationale };
}

function scoreDebtBurden(debtToEquity: number | null, debtTrend: string): HealthSubScore {
  let score = 60;
  let rationale = "No debt data available.";

  if (debtToEquity !== null) {
    if (debtToEquity <= 0.5) {
      score = 90;
      rationale = `Low leverage: D/E ratio ${debtToEquity.toFixed(2)}.`;
    } else if (debtToEquity <= 1.5) {
      score = 65;
      rationale = `Moderate leverage: D/E ratio ${debtToEquity.toFixed(2)}.`;
    } else if (debtToEquity <= 3.0) {
      score = 40;
      rationale = `High leverage: D/E ratio ${debtToEquity.toFixed(2)}.`;
    } else {
      score = 15;
      rationale = `Very high leverage: D/E ratio ${debtToEquity.toFixed(2)}.`;
    }

    if (debtTrend === "INCREASING") {
      score = Math.max(10, score - 15);
      rationale += " Debt is trending upward.";
    } else if (debtTrend === "DECREASING") {
      score = Math.min(100, score + 10);
      rationale += " Debt is trending downward (positive).";
    }
  }

  return { name: "Debt Burden", score: clamp(score), weight: 20, rationale };
}

function scoreLiquidity(currentRatio: number | null): HealthSubScore {
  let score = 50;
  let rationale = "No current ratio data available.";

  if (currentRatio !== null) {
    if (currentRatio >= 2.0) {
      score = 90;
      rationale = `Strong liquidity: current ratio ${currentRatio.toFixed(2)}.`;
    } else if (currentRatio >= 1.5) {
      score = 70;
      rationale = `Good liquidity: current ratio ${currentRatio.toFixed(2)}.`;
    } else if (currentRatio >= 1.0) {
      score = 50;
      rationale = `Adequate liquidity: current ratio ${currentRatio.toFixed(2)}.`;
    } else if (currentRatio >= 0.7) {
      score = 25;
      rationale = `Low liquidity: current ratio ${currentRatio.toFixed(2)} — current liabilities exceed assets.`;
    } else {
      score = 10;
      rationale = `Very low liquidity: current ratio ${currentRatio.toFixed(2)}.`;
    }
  }

  return { name: "Liquidity", score: clamp(score), weight: 15, rationale };
}

async function scoreConsistency(businessId: string): Promise<HealthSubScore> {
  const checks = await prisma.financialConsistencyCheck.findMany({ where: { businessId } });

  if (checks.length === 0) {
    return {
      name: "Financial Consistency",
      score: 50,
      weight: 10,
      rationale: "No cross-document consistency checks run yet.",
    };
  }

  const passed = checks.filter(c => c.result === "PASS").length;
  const ratio = passed / checks.length;
  const score = clamp(Math.round(ratio * 100));
  const rationale =
    ratio === 1
      ? "All cross-document checks passed — financials are consistent."
      : `${passed}/${checks.length} consistency checks passed. ${checks.length - passed} discrepancies flagged for review.`;

  return { name: "Financial Consistency", score, weight: 10, rationale };
}

export async function computeHealthScore(businessId: string): Promise<HealthEngineResult> {
  const analysis = await analyseMultiYear(businessId);
  const summaries = await prisma.financialYearSummary.findMany({ where: { businessId } });

  const latestSummary = summaries.sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear))[0];

  const s1 = scoreRevenue(analysis.revenueCagr, summaries.length);
  const s2 = scoreProfitability(analysis.avgNetMargin, analysis.avgGrossMargin);
  const s3 = scoreCashFlow(latestSummary?.bankInflows ?? null, latestSummary?.bankOutflows ?? null);
  const s4 = scoreDebtBurden(analysis.latestDebtToEquity, analysis.debtTrend);
  const s5 = scoreLiquidity(analysis.latestCurrentRatio);
  const s6 = await scoreConsistency(businessId);

  const subScores = [s1, s2, s3, s4, s5, s6];
  const totalWeight = subScores.reduce((a, s) => a + s.weight, 0);
  const overallScore = clamp(
    Math.round(subScores.reduce((a, s) => a + (s.score * s.weight) / totalWeight, 0))
  );

  const avgCompleteness = summaries.length
    ? summaries.reduce((a, s) => a + s.dataCompleteness, 0) / summaries.length
    : 0;
  const dataQuality: "HIGH" | "MEDIUM" | "LOW" =
    avgCompleteness >= 0.7 ? "HIGH" : avgCompleteness >= 0.4 ? "MEDIUM" : "LOW";

  return { overallScore, subScores, dataQuality };
}
