/**
 * Cross-Document Consistency Engine
 * Compares financial data across sources:
 *   - GST turnover vs P&L revenue
 *   - Bank inflows vs declared revenue
 *   - Multi-year revenue continuity
 *
 * Flags discrepancies as REVIEW_REQUIRED (not fraud — just needs clarification).
 * All checks are deterministic. NO LLM.
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";

const DISCREPANCY_THRESHOLD_PCT = 20; // flag if >20% difference

function computeDiscrepancyPct(a: number, b: number): number {
  const maxVal = Math.max(Math.abs(a), Math.abs(b));
  if (maxVal === 0) return 0;
  return (Math.abs(a - b) / maxVal) * 100;
}

export async function runConsistencyChecks(businessId: string): Promise<void> {
  // Clear old checks
  await prisma.financialConsistencyCheck.deleteMany({ where: { businessId } });

  const summaries = await prisma.financialYearSummary.findMany({
    where: { businessId },
    orderBy: { fiscalYear: "asc" },
  });

  for (const summary of summaries) {
    const fy = summary.fiscalYear;

    // Check 1: GST turnover vs P&L revenue
    if (summary.gstTurnover != null && summary.revenue != null) {
      const discPct = computeDiscrepancyPct(summary.gstTurnover, summary.revenue);
      const result =
        discPct > DISCREPANCY_THRESHOLD_PCT
          ? "REVIEW_REQUIRED"
          : "PASS";

      await prisma.financialConsistencyCheck.create({
        data: {
          businessId,
          checkName: "GST_VS_PNL",
          fiscalYear: fy,
          valueA: summary.gstTurnover,
          labelA: "GST Turnover (GSTR-3B)",
          valueB: summary.revenue,
          labelB: "P&L Revenue",
          discrepancyPct: discPct,
          result,
          note:
            result === "REVIEW_REQUIRED"
              ? `GST turnover (₹${(summary.gstTurnover / 1e5).toFixed(2)}L) differs from P&L revenue (₹${(summary.revenue / 1e5).toFixed(2)}L) by ${discPct.toFixed(1)}%. Possible: exempt supplies, timing differences, or misreporting. Seek clarification.`
              : "GST turnover and P&L revenue are consistent.",
        },
      });
    }

    // Check 2: Bank inflows vs declared revenue
    if (summary.bankInflows != null && summary.revenue != null) {
      const discPct = computeDiscrepancyPct(summary.bankInflows, summary.revenue);
      // Allow wider tolerance for bank vs revenue (credit sales, timing)
      const result = discPct > 40 ? "REVIEW_REQUIRED" : "PASS";

      await prisma.financialConsistencyCheck.create({
        data: {
          businessId,
          checkName: "BANK_VS_DECLARED",
          fiscalYear: fy,
          valueA: summary.bankInflows,
          labelA: "Bank Inflows",
          valueB: summary.revenue,
          labelB: "Declared Revenue",
          discrepancyPct: discPct,
          result,
          note:
            result === "REVIEW_REQUIRED"
              ? `Bank inflows (₹${(summary.bankInflows / 1e5).toFixed(2)}L) differ significantly from declared revenue (₹${(summary.revenue / 1e5).toFixed(2)}L). May indicate credit sales, advances, or inter-bank transfers. Seek explanation.`
              : "Bank inflows and declared revenue are reasonably consistent.",
        },
      });
    }
  }

  // Check 3: Multi-year revenue continuity (detect sudden spikes/drops >50%)
  if (summaries.length >= 2) {
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1];
      const curr = summaries[i];
      if (prev.revenue != null && curr.revenue != null && prev.revenue > 0) {
        const changePct = ((curr.revenue - prev.revenue) / prev.revenue) * 100;
        if (Math.abs(changePct) > 50) {
          await prisma.financialConsistencyCheck.create({
            data: {
              businessId,
              checkName: "MULTI_YEAR_REVENUE",
              fiscalYear: curr.fiscalYear,
              valueA: prev.revenue,
              labelA: `Revenue ${prev.fiscalYear}`,
              valueB: curr.revenue,
              labelB: `Revenue ${curr.fiscalYear}`,
              discrepancyPct: Math.abs(changePct),
              result: "REVIEW_REQUIRED",
              note: `Revenue changed by ${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}% year-on-year (${prev.fiscalYear} → ${curr.fiscalYear}). Large swings should be explained by business events.`,
            },
          });
        }
      }
    }
  }

  await logAuditEvent({
    businessId,
    eventType: "CONSISTENCY_CHECKED",
    description: "Cross-document consistency checks completed",
    metadata: { fiscalYearsChecked: summaries.map(s => s.fiscalYear) },
  });
}
