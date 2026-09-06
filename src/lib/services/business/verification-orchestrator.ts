/**
 * Verification Orchestrator
 * Runs MCA + GST + Udyam + eCourts adapters concurrently via Promise.allSettled.
 * Then runs risk engine + credit engine.
 * All adapters set up AWAITING_MANUAL tasks — the user completes them via the UI.
 */

import { prisma } from "@/lib/db";
import { initMcaVerification } from "./mca-adapter";
import { initGstVerification } from "./gst-adapter";
import { initUdyamVerification } from "./udyam-adapter";
import { initEcourtsVerification } from "./ecourts-adapter";
import { runConsistencyChecks } from "./consistency-engine";
import { runRiskEngine } from "./risk-engine";
import { computeCreditRecommendation } from "./credit-engine";
import { logAuditEvent } from "./audit-logger";

export async function runBusinessVerification(businessId: string): Promise<void> {
  const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!biz) throw new Error("Business not found");

  await logAuditEvent({
    businessId,
    eventType: "VERIFICATION_STARTED",
    description: "Verification orchestrator started — initiating MCA, GST, Udyam, eCourts tasks",
  });

  // Initialize all verification tasks concurrently
  const results = await Promise.allSettled([
    initMcaVerification(businessId),
    initGstVerification(businessId),
    initUdyamVerification(businessId),
    initEcourtsVerification(businessId),
  ]);

  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "rejected") {
      errors.push(result.reason?.message ?? String(result.reason));
    }
  }

  // Run consistency checks (may have no data yet — that's fine, will re-run after document uploads)
  try {
    await runConsistencyChecks(businessId);
  } catch (_err) {
    // Non-fatal — no financial data yet
  }

  // Run initial risk engine pass
  try {
    await runRiskEngine(businessId);
    await computeCreditRecommendation(businessId);
  } catch (_err) {
    // Non-fatal — risk engine handles missing data gracefully
  }

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: { overallStatus: "ACTIVE" },
  });

  await logAuditEvent({
    businessId,
    eventType: "VERIFICATION_COMPLETED",
    description: `Verification orchestration complete. ${errors.length ? `Errors: ${errors.join("; ")}` : "All tasks initiated."}`,
    metadata: { errors },
  });
}

/** Re-run consistency + risk + credit engines after new document uploaded */
export async function rerunAnalysis(businessId: string): Promise<void> {
  try {
    await runConsistencyChecks(businessId);
    await runRiskEngine(businessId);
    await computeCreditRecommendation(businessId);
  } catch (err) {
    // Log but don't crash — partial data is acceptable
    await logAuditEvent({
      businessId,
      eventType: "RISK_COMPUTED",
      description: `Re-analysis partial failure: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
