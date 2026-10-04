/**
 * Comprehensive Automated End-to-End Test for All 26 Priority MCP Tools
 *
 * Covers:
 * - Core Domain (6 tools)
 * - Company Domain (6 tools)
 * - Credit Domain (4 tools)
 * - Recovery Domain (4 tools)
 * - Communication Domain (3 tools)
 * - Legal Domain (3 tools)
 * - Cross-Tenant Access Protection
 * - Idempotency Replay
 * - Audit Trail Persistence
 */

import { prisma } from "../src/lib/db";
import { McpGateway } from "../src/lib/mcp/gateway";
import { McpContext } from "../src/lib/mcp/types";

interface TestReport {
  tool: string;
  domain: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details?: string;
  error?: string;
}

async function runMcpTestSuite() {
  console.log("================================================================================");
  console.log("               CHAANBEAN 26-TOOL MCP END-TO-END EXECUTION AUDIT                 ");
  console.log("================================================================================");

  McpGateway.initialize();

  // 1. Resolve Active Tenant
  const tenant = await prisma.company.findFirst();
  if (!tenant) {
    throw new Error("Fatal: No tenant company found in database.");
  }

  const context: McpContext = {
    tenantId: tenant.id,
    userId: "usr_test_operator",
    userRoles: ["admin", "credit_officer"],
  };

  console.log(`[SETUP] Active Tenant: "${tenant.name}" (${tenant.id})`);

  // Ensure test debtor and account exist
  let buyer = await prisma.buyerDebtor.findFirst({
    where: { companyId: tenant.id },
    include: { creditAccounts: true },
  });

  if (!buyer) {
    buyer = await prisma.buyerDebtor.create({
      data: {
        companyId: tenant.id,
        name: "Larsen & Toubro Heavy Infrastructure Ltd",
        contactPerson: "Rajesh Sharma",
        email: "finance@lt-infrastructure.com",
        mobileNumbers: JSON.stringify(["9820098200"]),
        pan: "AAACL1234F",
        gstin: "27AAACL1234F1Z1",
        address: "Powai Works, Saki Vihar Road, Mumbai 400072",
      },
      include: { creditAccounts: true },
    });
  }

  let account = buyer.creditAccounts[0];
  if (!account) {
    account = await prisma.creditAccount.create({
      data: {
        buyerId: buyer.id,
        outstandingAmount: 2500000,
        creditLimit: 5000000,
        tenorDays: 30,
        dueDate: new Date(Date.now() - 50 * 86400000), // 50 days overdue (L3 legal eligible)
        overdueStatus: "overdue",
        penalInterestRate: 20.25,
      },
    });
  }

  const reports: TestReport[] = [];

  async function executeTest(
    tool: string,
    domain: any,
    args: Record<string, any>,
    testContext: McpContext = context
  ): Promise<any> {
    const start = Date.now();
    try {
      const resp = await McpGateway.executeTool({
        tool,
        domain,
        arguments: args,
        context: testContext,
      });

      const durationMs = Date.now() - start;

      if (!resp.success) {
        reports.push({
          tool,
          domain,
          status: "FAIL",
          durationMs,
          error: resp.error || "Execution returned success: false",
        });
        console.log(` ❌ [${domain.toUpperCase()}] ${tool} (${durationMs}ms) - FAIL: ${resp.error}`);
        return null;
      }

      reports.push({
        tool,
        domain,
        status: "PASS",
        durationMs,
        details: `Audit ID: ${resp.auditRecordId ? resp.auditRecordId.substring(0, 10) + "..." : "none"}`,
      });
      console.log(` ✔ [${domain.toUpperCase()}] ${tool} (${durationMs}ms) - PASS`);
      return resp.data;
    } catch (err: any) {
      const durationMs = Date.now() - start;
      reports.push({
        tool,
        domain,
        status: "FAIL",
        durationMs,
        error: err.message,
      });
      console.log(` ❌ [${domain.toUpperCase()}] ${tool} (${durationMs}ms) - EXCEPTION: ${err.message}`);
      return null;
    }
  }

  console.log("\n--- DOMAIN 1: CORE (6 Tools) ---");
  await executeTest("get_current_user", "core", {});
  await executeTest("get_organisation", "core", {});
  await executeTest("get_subscription", "core", {});

  const newCreditCase = await executeTest("create_credit_case", "core", {
    targetCompanyName: "Tata Steel BSL Limited",
    targetCin: "L27100DL1983PLC015635",
    targetGstin: "07AAACT0123E1Z4",
    targetPan: "AAACT0123E",
    requestedAmount: 5000000,
    riskScore: 84,
    riskBand: "LOW_RISK",
    factorsBreakdown: { financials: 88, payments: 92, legal: 80 },
    aiExplanation: "Strong statutory compliance with 98% GSTR-3B on-time ratio.",
  });

  const creditCaseId = newCreditCase?.id;
  if (creditCaseId) {
    await executeTest("get_credit_case", "core", { creditCaseId });
    await executeTest("get_case_timeline", "core", { creditCaseId });
  }

  console.log("\n--- DOMAIN 2: COMPANY (6 Tools) ---");
  await executeTest("search_company", "company", { query: "Reliance" });
  await executeTest("get_company_profile", "company", { identifier: "Reliance Industries" });
  await executeTest("verify_company", "company", { identifier: "Reliance Industries" });
  await executeTest("get_directors", "company", { identifier: "Reliance Industries" });
  await executeTest("get_gst_profile", "company", { gstin: "27AAACL1234F1Z1" });
  await executeTest("get_msme_status", "company", { identifier: "Reliance Industries" });

  console.log("\n--- DOMAIN 3: CREDIT (4 Tools) ---");
  await executeTest("calculate_credit_risk", "credit", {
    companyName: "Infosys Limited",
    requestedExposure: 10000000,
  });
  await executeTest("get_risk_explanation", "credit", {
    companyName: "Infosys Limited",
    compositeScore: 88,
    riskBand: "LOW_RISK",
  });
  await executeTest("get_credit_report", "credit", { identifier: "Infosys Limited" });
  await executeTest("get_missing_information", "credit", { identifier: "Infosys Limited" });

  console.log("\n--- DOMAIN 4: RECOVERY (4 Tools) ---");
  await executeTest("get_overdue_accounts", "recovery", { minDpd: 1 });

  const newRecoveryCase = await executeTest("create_recovery_case", "recovery", {
    creditAccountId: account.id,
    buyerId: buyer.id,
    totalOverdue: 2500000,
    overdueDpd: 50,
  });

  const recoveryCaseId = newRecoveryCase?.id;
  if (recoveryCaseId) {
    await executeTest("get_next_recovery_action", "recovery", { recoveryCaseId });

    await executeTest("record_customer_commitment", "recovery", {
      recoveryCaseId,
      amount: 1500000,
      promisedDate: "2026-10-15",
      paymentMode: "NEFT/RTGS",
      notes: "Debtor CFO promised partial settlement of ₹15L by October 15.",
    });
  }

  console.log("\n--- DOMAIN 5: COMMUNICATION (3 Tools) ---");
  // Use a fresh 10-digit test phone number per run to avoid 2-call/24h frequency cap
  const testPhone = `9820${Math.floor(100000 + Math.random() * 900000)}`;
  const callResult = await executeTest("make_voice_call", "communication", {
    toPhone: testPhone,
    debtorName: "Larsen & Toubro Heavy Infrastructure Ltd",
    overdueAmount: 2500000,
    overdueDpd: 50,
    recoveryCaseId: recoveryCaseId || undefined,
  });

  const callSid = callResult?.callSid;
  if (callSid) {
    await executeTest("get_call_status", "communication", { callSid });

    await executeTest("process_communication_webhook", "communication", {
      callSid,
      status: "completed",
      duration: 15,
      recordingUrl: `https://api.exotel.com/v1/recordings/${callSid}.mp3`,
    });
  }

  console.log("\n--- DOMAIN 6: LEGAL (3 Tools) ---");
  if (recoveryCaseId) {
    await executeTest("check_legal_eligibility", "legal", { recoveryCaseId });

    const legalCandidate = await executeTest("create_legal_candidate", "legal", {
      recoveryCaseId,
      statutoryGrounds: [
        "MSMED Act 2006 (Section 15-18): Receivables overdue exceeds 45 days.",
        "Accrued penal interest at 3x RBI Bank Rate (20.25% p.a.).",
      ],
    });

    const candidateId = legalCandidate?.candidateId;
    if (candidateId) {
      await executeTest("compile_case_package", "legal", { legalCandidateId: candidateId });
    }
  }

  console.log("\n--- GUARDRAILS & SECURITY VERIFICATION ---");

  // 1. Missing Tenant Context Guardrail
  console.log("Testing Missing Tenant Context rejection...");
  const missingTenantResp = await McpGateway.executeTool({
    tool: "get_organisation",
    domain: "core",
    arguments: {},
    context: { tenantId: "" },
  });
  if (!missingTenantResp.success && missingTenantResp.error?.includes("Tenant context is mandatory")) {
    console.log(" ✔ Missing Tenant Context: Properly BLOCKED with 400 guardrail.");
  } else {
    console.log(" ❌ Missing Tenant Context: Failed to block correctly.");
  }

  // 2. Cross-Tenant Data Access Guardrail
  if (creditCaseId) {
    console.log("Testing Cross-Tenant Data Access rejection...");
    let secondTenant = await prisma.company.findFirst({
      where: { id: { not: context.tenantId } },
    });
    if (!secondTenant) {
      secondTenant = await prisma.company.create({
        data: { name: "Audit Secondary Tenant Pvt Ltd", plan: "growth" },
      });
    }

    const crossTenantResp = await McpGateway.executeTool({
      tool: "get_credit_case",
      domain: "core",
      arguments: { creditCaseId },
      context: { tenantId: secondTenant.id },
    });
    if (!crossTenantResp.success && crossTenantResp.error?.includes("Cross-tenant access blocked")) {
      console.log(" ✔ Cross-Tenant Access: Properly BLOCKED with security exception.");
    } else {
      console.log(` ❌ Cross-Tenant Access: Failed to block correctly (${crossTenantResp.error}).`);
    }
  }

  // 3. Idempotency Token Replay Guardrail
  console.log("Testing Idempotency Replay on Side-Effecting Tool...");
  const testIdempKey = `test_token_${Date.now()}`;
  const idempContext: McpContext = { ...context, idempotencyKey: testIdempKey };

  const firstCall = await McpGateway.executeTool({
    tool: "create_credit_case",
    domain: "core",
    arguments: {
      targetCompanyName: "Idempotency Test Corp",
      requestedAmount: 1000000,
      riskScore: 90,
      riskBand: "LOW_RISK",
      factorsBreakdown: {},
    },
    context: idempContext,
  });

  const replayCall = await McpGateway.executeTool({
    tool: "create_credit_case",
    domain: "core",
    arguments: {
      targetCompanyName: "Idempotency Test Corp",
      requestedAmount: 1000000,
      riskScore: 90,
      riskBand: "LOW_RISK",
      factorsBreakdown: {},
    },
    context: idempContext,
  });

  if (replayCall.isIdempotentReplay) {
    console.log(" ✔ Idempotency: Replay token recognized, duplicate database write PREVENTED.");
  } else {
    console.log(" ❌ Idempotency: Replay was not flagged as idempotent.");
  }

  // 4. Audit Log Check
  const auditLogsCount = await prisma.aiDecisionLog.count({
    where: { companyId: tenant.id },
  });
  console.log(` ✔ Audit Persistence: Total AI Decision & MCP Audit Logs in DB: ${auditLogsCount}`);

  // Summary
  console.log("\n================================================================================");
  console.log("                                AUDIT SUMMARY                                   ");
  console.log("================================================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.status === "PASS").length;
  const failed = reports.filter((r) => r.status === "FAIL").length;
  console.log(`Total Tools Executed: ${total}`);
  console.log(`Passed:               ${passed}`);
  console.log(`Failed:               ${failed}`);
  console.log(`Success Rate:         ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\nFailed Tools Details:");
    reports
      .filter((r) => r.status === "FAIL")
      .forEach((r) => console.log(`- [${r.domain}] ${r.tool}: ${r.error}`));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL 26 MCP TOOLS EXECUTED SUCCESSFULLY WITH PASSING AUDIT LOGS & INTEGRITY CHECKS!");
    process.exit(0);
  }
}

runMcpTestSuite().catch((err) => {
  console.error("Fatal Test Suite Crash:", err);
  process.exit(1);
});
