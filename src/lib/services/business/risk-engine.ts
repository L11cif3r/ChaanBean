/**
 * Risk Engine
 * 12 deterministic risk signals → composite score → GREEN / AMBER / RED
 * NO LLM. NO randomness. Pure rule-based scoring.
 *
 * Signal codes:
 *   REVENUE_STABILITY | PROFITABILITY | CASH_FLOW | DEBT_BURDEN | LIQUIDITY
 *   FINANCIAL_CONSISTENCY | LITIGATION | IDENTITY_MATCH | MSME_STATUS
 *   GST_COMPLIANCE | DIRECTOR_HISTORY | INDUSTRY_RISK
 *
 * Hard Red Flag overrides → immediate RED regardless of score:
 *   ACTIVE_LITIGATION | IDENTITY_MISMATCH | MAJOR_FINANCIAL_INCONSISTENCY | MISSING_CRITICAL_DOCS
 */

import { prisma } from "@/lib/db";
import { computeHealthScore } from "./health-engine";
import { analyseMultiYear } from "./financial-analyser";
import { logAuditEvent } from "./audit-logger";

// Configurable thresholds (could be moved to a settings table later)
const THRESHOLDS = {
  GREEN_MIN_SCORE: 65,
  AMBER_MIN_SCORE: 35,
  GREEN_CREDIT_LIMIT_MIN: 2000000,  // ₹20L
  GREEN_CREDIT_LIMIT_MAX: 3000000,  // ₹30L
  AMBER_CREDIT_LIMIT_MIN: 800000,   // ₹8L
  AMBER_CREDIT_LIMIT_MAX: 1500000,  // ₹15L
};

export interface RiskSignalResult {
  signalCode: string;
  label: string;
  color: "GREEN" | "AMBER" | "RED" | "GREY";
  score: number;
  weight: number;
  rationale: string;
  sourceRefs: string[];
}

function colorFromScore(score: number): "GREEN" | "AMBER" | "RED" {
  if (score >= 65) return "GREEN";
  if (score >= 35) return "AMBER";
  return "RED";
}

export async function runRiskEngine(businessId: string): Promise<void> {
  const biz = await prisma.businessProfile.findUnique({
    where: { id: businessId },
    include: {
      courtCases: true,
      sourceRecords: true,
      yearSummaries: { orderBy: { fiscalYear: "desc" } },
      financialDocuments: true,
      consistencyChecks: true,
    },
  });
  if (!biz) throw new Error("Business not found");

  const health = await computeHealthScore(businessId);
  const analysis = await analyseMultiYear(businessId);
  const signals: RiskSignalResult[] = [];

  // ── Signal 1: Revenue Stability ──
  const revSig = health.subScores.find(s => s.name === "Revenue Stability")!;
  signals.push({
    signalCode: "REVENUE_STABILITY",
    label: "Revenue Stability",
    color: colorFromScore(revSig.score),
    score: revSig.score,
    weight: 1.5,
    rationale: revSig.rationale,
    sourceRefs: [],
  });

  // ── Signal 2: Profitability ──
  const profitSig = health.subScores.find(s => s.name === "Profitability")!;
  signals.push({
    signalCode: "PROFITABILITY",
    label: "Profitability",
    color: colorFromScore(profitSig.score),
    score: profitSig.score,
    weight: 1.5,
    rationale: profitSig.rationale,
    sourceRefs: [],
  });

  // ── Signal 3: Cash Flow ──
  const cfSig = health.subScores.find(s => s.name === "Cash Flow")!;
  signals.push({
    signalCode: "CASH_FLOW",
    label: "Cash Flow Health",
    color: colorFromScore(cfSig.score),
    score: cfSig.score,
    weight: 1.2,
    rationale: cfSig.rationale,
    sourceRefs: [],
  });

  // ── Signal 4: Debt Burden ──
  const debtSig = health.subScores.find(s => s.name === "Debt Burden")!;
  signals.push({
    signalCode: "DEBT_BURDEN",
    label: "Debt Burden",
    color: colorFromScore(debtSig.score),
    score: debtSig.score,
    weight: 1.5,
    rationale: debtSig.rationale,
    sourceRefs: [],
  });

  // ── Signal 5: Liquidity ──
  const liqSig = health.subScores.find(s => s.name === "Liquidity")!;
  signals.push({
    signalCode: "LIQUIDITY",
    label: "Liquidity Position",
    color: colorFromScore(liqSig.score),
    score: liqSig.score,
    weight: 1.2,
    rationale: liqSig.rationale,
    sourceRefs: [],
  });

  // ── Signal 6: Financial Consistency ──
  const conSig = health.subScores.find(s => s.name === "Financial Consistency")!;
  const reviewRequired = biz.consistencyChecks.filter(c => c.result === "REVIEW_REQUIRED").length;
  signals.push({
    signalCode: "FINANCIAL_CONSISTENCY",
    label: "Financial Consistency",
    color: colorFromScore(conSig.score),
    score: conSig.score,
    weight: 1.0,
    rationale:
      reviewRequired > 0
        ? `${reviewRequired} cross-document discrepancy/ies flagged for review. ${conSig.rationale}`
        : conSig.rationale,
    sourceRefs: [],
  });

  // ── Signal 7: Litigation ──
  const activeCases = biz.courtCases.filter(
    c => c.status === "PENDING" || c.status === "ACTIVE"
  );
  const litigationScore = activeCases.length === 0 ? 90 : activeCases.length === 1 ? 45 : 15;
  signals.push({
    signalCode: "LITIGATION",
    label: "Litigation History",
    color: activeCases.length === 0 ? "GREEN" : activeCases.length === 1 ? "AMBER" : "RED",
    score: litigationScore,
    weight: 2.0,
    rationale:
      activeCases.length === 0
        ? "No active court cases found."
        : `${activeCases.length} active court case(s) found: ${activeCases.map(c => c.caseNumber || "Unknown").join(", ")}.`,
    sourceRefs: activeCases.map(c => c.id),
  });

  // ── Signal 8: Identity Match ──
  const hasGstin = !!biz.gstin;
  const hasCin = !!biz.cin;
  const hasPan = !!biz.pan;
  const identityCount = [hasGstin, hasCin, hasPan].filter(Boolean).length;
  const identityScore = identityCount >= 2 ? 85 : identityCount === 1 ? 55 : 30;
  signals.push({
    signalCode: "IDENTITY_MATCH",
    label: "Identity Verification",
    color: colorFromScore(identityScore),
    score: identityScore,
    weight: 1.5,
    rationale:
      identityCount >= 2
        ? `${identityCount} identifiers present (GSTIN, CIN, PAN). Identity reasonably established.`
        : `Only ${identityCount} identifier(s) present. Additional verification recommended.`,
    sourceRefs: [],
  });

  // ── Signal 9: MSME Status ──
  const isRegisteredMsme = !!biz.udyamNo;
  const msmeScore = isRegisteredMsme ? 80 : 45;
  signals.push({
    signalCode: "MSME_STATUS",
    label: "MSME / Udyam Registration",
    color: isRegisteredMsme ? "GREEN" : "AMBER",
    score: msmeScore,
    weight: 0.8,
    rationale: isRegisteredMsme
      ? `Udyam registered (${biz.udyamNo}). Enterprise type: ${biz.enterpriseType || "verified"}.`
      : "Not registered under Udyam/MSME. MSME legal protections may not apply.",
    sourceRefs: [],
  });

  // ── Signal 10: GST Compliance ──
  const gstRecord = biz.sourceRecords.find(r => r.sourceType === "GST");
  let gstScore = 40;
  let gstRationale = "GST verification not yet completed.";
  if (gstRecord) {
    const parsed = gstRecord.parsedFields ? JSON.parse(gstRecord.parsedFields) : {};
    if (parsed.gstStatus === "Active") {
      gstScore = 85;
      gstRationale = `GST registration active. Taxpayer type: ${parsed.taxPayerType || "Regular"}.`;
    } else if (parsed.gstStatus) {
      gstScore = 20;
      gstRationale = `GST status: ${parsed.gstStatus}. Active registration required for trade credit.`;
    }
  }
  signals.push({
    signalCode: "GST_COMPLIANCE",
    label: "GST Compliance",
    color: colorFromScore(gstScore),
    score: gstScore,
    weight: 1.2,
    rationale: gstRationale,
    sourceRefs: gstRecord ? [gstRecord.id] : [],
  });

  // ── Signal 11: Director History ──
  const mcaRecord = biz.sourceRecords.find(r => r.sourceType === "MCA");
  let directorScore = 50;
  let directorRationale = "MCA director data not yet submitted.";
  if (mcaRecord) {
    const parsed = mcaRecord.parsedFields ? JSON.parse(mcaRecord.parsedFields) : {};
    const directorCount = Array.isArray(parsed.directors) ? parsed.directors.length : 0;
    directorScore = directorCount > 0 ? 75 : 50;
    directorRationale =
      directorCount > 0
        ? `${directorCount} director(s) on record. No DIN disqualification check available in V0.`
        : "No director details submitted. Manual MCA lookup pending.";
  }
  signals.push({
    signalCode: "DIRECTOR_HISTORY",
    label: "Director / Promoter Background",
    color: colorFromScore(directorScore),
    score: directorScore,
    weight: 0.8,
    rationale: directorRationale,
    sourceRefs: mcaRecord ? [mcaRecord.id] : [],
  });

  // ── Signal 12: Industry Risk ──
  // Generic — no external industry database in V0
  const industryScore = 65;
  signals.push({
    signalCode: "INDUSTRY_RISK",
    label: "Industry Risk",
    color: "AMBER",
    score: industryScore,
    weight: 0.5,
    rationale: biz.primaryActivity
      ? `Industry: ${biz.primaryActivity}. No sector-specific risk data available in V0.`
      : "Primary business activity not specified. Defaulting to neutral industry risk.",
    sourceRefs: [],
  });

  // ── Hard Red Flag Detection ──
  const hardRedFlags: string[] = [];

  if (activeCases.length >= 2) {
    hardRedFlags.push("ACTIVE_LITIGATION");
  }

  if (identityCount === 0) {
    hardRedFlags.push("IDENTITY_MISMATCH");
  }

  if (reviewRequired >= 2) {
    hardRedFlags.push("MAJOR_FINANCIAL_INCONSISTENCY");
  }

  const hasCriticalDocs = biz.financialDocuments.some(
    d => d.processingStatus === "COMPLETED" &&
      (d.category === "PNL" || d.category === "BALANCE_SHEET" || d.category === "BANK_STATEMENT")
  );
  if (!hasCriticalDocs) {
    hardRedFlags.push("MISSING_CRITICAL_DOCS");
  }

  // ── Composite Score ──
  const totalWeight = signals.reduce((a, s) => a + s.weight, 0);
  const compositeScore = Math.round(
    signals.reduce((a, s) => a + (s.score * s.weight) / totalWeight, 0)
  );

  let flag: "GREEN" | "AMBER" | "RED";
  if (hardRedFlags.length > 0) {
    flag = "RED";
  } else if (compositeScore >= THRESHOLDS.GREEN_MIN_SCORE) {
    flag = "GREEN";
  } else if (compositeScore >= THRESHOLDS.AMBER_MIN_SCORE) {
    flag = "AMBER";
  } else {
    flag = "RED";
  }

  // ── Persist signals ──
  await prisma.bizRiskSignal.deleteMany({ where: { businessId } });
  for (const sig of signals) {
    await prisma.bizRiskSignal.create({
      data: {
        businessId,
        signalCode: sig.signalCode,
        label: sig.label,
        color: sig.color,
        score: sig.score,
        weight: sig.weight,
        rationale: sig.rationale,
        sourceRefs: JSON.stringify(sig.sourceRefs),
      },
    });
  }

  // ── Persist risk flag ──
  const signalBreakdown: Record<string, unknown> = {};
  for (const sig of signals) {
    signalBreakdown[sig.signalCode] = {
      label: sig.label,
      color: sig.color,
      score: sig.score,
      rationale: sig.rationale,
    };
  }

  const latest = biz.yearSummaries[0];
  const recommendedRevenue = latest?.revenue ?? 0;
  let recommendedLimit = 0;
  if (flag === "GREEN") {
    recommendedLimit = Math.min(
      THRESHOLDS.GREEN_CREDIT_LIMIT_MAX,
      Math.max(THRESHOLDS.GREEN_CREDIT_LIMIT_MIN, recommendedRevenue * 0.15)
    );
  } else if (flag === "AMBER") {
    recommendedLimit = Math.min(
      THRESHOLDS.AMBER_CREDIT_LIMIT_MAX,
      Math.max(THRESHOLDS.AMBER_CREDIT_LIMIT_MIN, recommendedRevenue * 0.06)
    );
  } else {
    recommendedLimit = 0;
  }

  await prisma.bizRiskFlag.upsert({
    where: { businessId },
    create: {
      businessId,
      flag,
      compositeScore,
      signalBreakdown: JSON.stringify(signalBreakdown),
      hardRedFlags: hardRedFlags.length ? JSON.stringify(hardRedFlags) : null,
      recommendedLimit,
      recommendedTenor: 30,
      configSnapshot: JSON.stringify(THRESHOLDS),
    },
    update: {
      flag,
      compositeScore,
      signalBreakdown: JSON.stringify(signalBreakdown),
      hardRedFlags: hardRedFlags.length ? JSON.stringify(hardRedFlags) : null,
      recommendedLimit,
      recommendedTenor: 30,
      computedAt: new Date(),
      configSnapshot: JSON.stringify(THRESHOLDS),
    },
  });

  await logAuditEvent({
    businessId,
    eventType: "RISK_COMPUTED",
    description: `Risk flag computed: ${flag} (score: ${compositeScore}). Hard red flags: ${hardRedFlags.join(", ") || "none"}.`,
    metadata: { flag, compositeScore, hardRedFlags },
  });
}
