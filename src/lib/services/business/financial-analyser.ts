/**
 * Financial Analyser
 * Computes multi-year summaries: revenue/profit CAGR, margin trends, debt trends, working capital.
 * All calculations are deterministic — no LLM, no randomness.
 */

import { prisma } from "@/lib/db";

/** Recompute FinancialYearSummary from FinancialMetric rows for one fiscal year */
export async function recomputeFinancialSummary(
  businessId: string,
  fiscalYear: string
): Promise<void> {
  const metrics = await prisma.financialMetric.findMany({
    where: { businessId, fiscalYear },
  });

  const m: Record<string, number> = {};
  for (const metric of metrics) {
    m[metric.metricName] = metric.value;
  }

  // Derived metrics
  const revenue = m["REVENUE"];
  const cogs = m["COGS"];
  const grossProfit = m["GROSS_PROFIT"] ?? (revenue != null && cogs != null ? revenue - cogs : undefined);
  const grossMarginPct = grossProfit != null && revenue ? (grossProfit / revenue) * 100 : undefined;
  const netProfit = m["NET_PROFIT"];
  const netMarginPct = netProfit != null && revenue ? (netProfit / revenue) * 100 : undefined;
  const ebitda = m["EBITDA"];
  const ebitdaMarginPct = ebitda != null && revenue ? (ebitda / revenue) * 100 : undefined;
  const totalAssets = m["TOTAL_ASSETS"];
  const totalLiabilities = m["TOTAL_LIABILITIES"];
  const equity = m["EQUITY"] ?? (totalAssets != null && totalLiabilities != null ? totalAssets - totalLiabilities : undefined);
  const debtToEquity = totalLiabilities != null && equity && equity > 0 ? totalLiabilities / equity : undefined;
  const currentAssets = m["CURRENT_ASSETS"];
  const currentLiabilities = m["CURRENT_LIABILITIES"];
  const currentRatio = currentAssets != null && currentLiabilities && currentLiabilities > 0 ? currentAssets / currentLiabilities : undefined;

  // Completeness score: count non-null key fields out of 8
  const keyFields = [revenue, cogs, netProfit, totalAssets, totalLiabilities, currentAssets, currentLiabilities, m["BANK_INFLOW"]];
  const dataCompleteness = keyFields.filter(v => v != null).length / keyFields.length;

  const revenueSourceMetric = metrics.find(m => m.metricName === "REVENUE");

  await prisma.financialYearSummary.upsert({
    where: { businessId_fiscalYear: { businessId, fiscalYear } },
    create: {
      businessId,
      fiscalYear,
      revenue,
      cogs,
      grossProfit,
      grossMarginPct,
      ebitda,
      ebitdaMarginPct,
      netProfit,
      netMarginPct,
      totalAssets,
      totalLiabilities,
      equity,
      debtToEquity,
      currentRatio,
      bankInflows: m["BANK_INFLOW"],
      bankOutflows: m["BANK_OUTFLOW"],
      gstTurnover: m["GST_TURNOVER"],
      revenueSource: revenueSourceMetric?.sourceDocId,
      dataCompleteness,
    },
    update: {
      revenue,
      cogs,
      grossProfit,
      grossMarginPct,
      ebitda,
      ebitdaMarginPct,
      netProfit,
      netMarginPct,
      totalAssets,
      totalLiabilities,
      equity,
      debtToEquity,
      currentRatio,
      bankInflows: m["BANK_INFLOW"],
      bankOutflows: m["BANK_OUTFLOW"],
      gstTurnover: m["GST_TURNOVER"],
      revenueSource: revenueSourceMetric?.sourceDocId,
      dataCompleteness,
    },
  });
}

/** Compute CAGR between two values over n years. Returns null if data insufficient. */
export function computeCagr(startVal: number, endVal: number, years: number): number | null {
  if (years <= 0 || startVal <= 0 || endVal <= 0) return null;
  return (Math.pow(endVal / startVal, 1 / years) - 1) * 100;
}

export interface MultiYearAnalysis {
  fiscalYears: string[];
  revenueCagr: number | null;
  profitCagr: number | null;
  avgNetMargin: number | null;
  avgGrossMargin: number | null;
  debtTrend: "INCREASING" | "DECREASING" | "STABLE" | "INSUFFICIENT_DATA";
  latestDebtToEquity: number | null;
  latestCurrentRatio: number | null;
  workingCapital: number | null;
  revenueByYear: Array<{ year: string; value: number | null }>;
  netProfitByYear: Array<{ year: string; value: number | null }>;
  ebitdaByYear: Array<{ year: string; value: number | null }>;
  liabilitiesByYear: Array<{ year: string; value: number | null }>;
}

export async function analyseMultiYear(businessId: string): Promise<MultiYearAnalysis> {
  const summaries = await prisma.financialYearSummary.findMany({
    where: { businessId },
    orderBy: { fiscalYear: "asc" },
  });

  const fiscalYears = summaries.map(s => s.fiscalYear);

  const revenueByYear = summaries.map(s => ({ year: s.fiscalYear, value: s.revenue ?? null }));
  const netProfitByYear = summaries.map(s => ({ year: s.fiscalYear, value: s.netProfit ?? null }));
  const ebitdaByYear = summaries.map(s => ({ year: s.fiscalYear, value: s.ebitda ?? null }));
  const liabilitiesByYear = summaries.map(s => ({ year: s.fiscalYear, value: s.totalLiabilities ?? null }));

  // CAGR using first and last year with valid data
  const revenueWithData = summaries.filter(s => s.revenue != null && s.revenue > 0);
  const profitWithData = summaries.filter(s => s.netProfit != null);

  let revenueCagr: number | null = null;
  if (revenueWithData.length >= 2) {
    const first = revenueWithData[0];
    const last = revenueWithData[revenueWithData.length - 1];
    const years = revenueWithData.length - 1;
    revenueCagr = computeCagr(first.revenue!, last.revenue!, years);
  }

  let profitCagr: number | null = null;
  if (profitWithData.length >= 2) {
    const first = profitWithData[0];
    const last = profitWithData[profitWithData.length - 1];
    if (first.netProfit! > 0 && last.netProfit! > 0) {
      profitCagr = computeCagr(first.netProfit!, last.netProfit!, profitWithData.length - 1);
    }
  }

  // Average margins
  const netMargins = summaries.filter(s => s.netMarginPct != null).map(s => s.netMarginPct!);
  const grossMargins = summaries.filter(s => s.grossMarginPct != null).map(s => s.grossMarginPct!);
  const avgNetMargin = netMargins.length ? netMargins.reduce((a, b) => a + b, 0) / netMargins.length : null;
  const avgGrossMargin = grossMargins.length ? grossMargins.reduce((a, b) => a + b, 0) / grossMargins.length : null;

  // Debt trend
  const debtPoints = summaries.filter(s => s.totalLiabilities != null).map(s => s.totalLiabilities!);
  let debtTrend: MultiYearAnalysis["debtTrend"] = "INSUFFICIENT_DATA";
  if (debtPoints.length >= 2) {
    const first = debtPoints[0];
    const last = debtPoints[debtPoints.length - 1];
    const change = (last - first) / first;
    if (change > 0.1) debtTrend = "INCREASING";
    else if (change < -0.1) debtTrend = "DECREASING";
    else debtTrend = "STABLE";
  }

  // Latest values
  const latest = summaries[summaries.length - 1];
  const latestDebtToEquity = latest?.debtToEquity ?? null;
  const latestCurrentRatio = latest?.currentRatio ?? null;
  let workingCapital: number | null = null;
  if (latest) {
    const metrics = await prisma.financialMetric.findMany({
      where: { businessId, fiscalYear: latest.fiscalYear },
    });
    const ca = metrics.find(m => m.metricName === "CURRENT_ASSETS")?.value;
    const cl = metrics.find(m => m.metricName === "CURRENT_LIABILITIES")?.value;
    if (ca != null && cl != null) {
      workingCapital = ca - cl;
    }
  }

  return {
    fiscalYears,
    revenueCagr,
    profitCagr,
    avgNetMargin,
    avgGrossMargin,
    debtTrend,
    latestDebtToEquity,
    latestCurrentRatio,
    workingCapital,
    revenueByYear,
    netProfitByYear,
    ebitdaByYear,
    liabilitiesByYear,
  };
}
