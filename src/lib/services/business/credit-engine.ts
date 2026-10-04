/**
 * Credit Engine
 * Deterministic credit limit recommendation based on risk flag.
 * GREEN: ₹20–30L | AMBER: ₹8–15L | RED: BLOCKED
 * Full rationale with document traceability.
 */

import { prisma } from "@/lib/db";
import { logAuditEvent } from "./audit-logger";

export async function computeCreditRecommendation(businessId: string): Promise<void> {
  const riskFlag = await prisma.bizRiskFlag.findUnique({ where: { businessId } });
  if (!riskFlag) throw new Error("Risk flag not computed yet. Run risk engine first.");

  const signals = await prisma.bizRiskSignal.findMany({ where: { businessId } });
  const biz = await prisma.businessProfile.findUnique({
    where: { id: businessId },
    include: {
      yearSummaries: { orderBy: { fiscalYear: "desc" } },
      financialDocuments: { where: { processingStatus: "COMPLETED" } },
    },
  });
  if (!biz) throw new Error("Business not found");

  const flag = riskFlag.flag as "GREEN" | "AMBER" | "RED";
  const hardRedFlags: string[] = riskFlag.hardRedFlags
    ? JSON.parse(riskFlag.hardRedFlags)
    : [];

  const creditLimit = riskFlag.recommendedLimit;
  const tenor = riskFlag.recommendedTenor;

  // Build plain-English rationale
  let rationale = "";
  if (flag === "GREEN") {
    rationale = `Risk assessment: GREEN (composite score ${riskFlag.compositeScore}/100). `;
    rationale += `Recommended credit limit: ₹${(creditLimit / 100000).toFixed(1)}L for ${tenor} days. `;
    rationale += `Key positive signals: ${signals.filter(s => s.color === "GREEN").map(s => s.label).join(", ") || "none"}.`;
  } else if (flag === "AMBER") {
    rationale = `Risk assessment: AMBER (composite score ${riskFlag.compositeScore}/100). `;
    rationale += `Moderate risk — reduced credit limit: ₹${(creditLimit / 100000).toFixed(1)}L for ${tenor} days. `;
    const amberSignals = signals.filter(s => s.color === "AMBER" || s.color === "RED");
    if (amberSignals.length) {
      rationale += `Concerns: ${amberSignals.map(s => s.label).join(", ")}. Close monitoring recommended.`;
    }
  } else {
    rationale = `Risk assessment: RED (composite score ${riskFlag.compositeScore}/100). CREDIT BLOCKED. `;
    if (hardRedFlags.length) {
      rationale += `Hard red flags triggered: ${hardRedFlags.join(", ")}. `;
    }
    rationale += "Credit should not be extended until flagged issues are resolved.";
  }

  // Build signal reference list
  const signalRefs = signals.map(s => s.signalCode);

  // Build document trail mapping
  const latestSummary = biz.yearSummaries[0];
  const documentTrail: Record<string, unknown> = {
    creditLimit,
    flag,
    compositeScore: riskFlag.compositeScore,
    drivenBy: signals
      .filter(s => s.color !== "GREEN")
      .map(s => ({
        signal: s.signalCode,
        label: s.label,
        color: s.color,
        score: s.score,
        rationale: s.rationale,
      })),
    latestFiscalYear: latestSummary?.fiscalYear,
    latestRevenue: latestSummary?.revenue,
    documentsUsed: biz.financialDocuments.map(d => ({
      id: d.id,
      name: d.originalName,
      category: d.category,
      fiscalYear: d.fiscalYear,
    })),
  };

  await prisma.creditRecommendation.upsert({
    where: { businessId },
    create: {
      businessId,
      creditLimit,
      tenor,
      flag,
      rationale,
      signalRefs: JSON.stringify(signalRefs),
      documentTrail: JSON.stringify(documentTrail),
      isBlocked: flag === "RED",
      blockReason: flag === "RED" ? hardRedFlags.join(", ") || "Composite risk score below threshold" : null,
    },
    update: {
      creditLimit,
      tenor,
      flag,
      rationale,
      signalRefs: JSON.stringify(signalRefs),
      documentTrail: JSON.stringify(documentTrail),
      isBlocked: flag === "RED",
      blockReason: flag === "RED" ? hardRedFlags.join(", ") || "Composite risk score below threshold" : null,
      computedAt: new Date(),
    },
  });

  await logAuditEvent({
    businessId,
    eventType: "CREDIT_COMPUTED",
    description: `Credit recommendation: ${flag} — ₹${(creditLimit / 100000).toFixed(1)}L for ${tenor} days.`,
    metadata: { flag, creditLimit, tenor, compositeScore: riskFlag.compositeScore },
  });
}
