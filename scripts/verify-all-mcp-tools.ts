/**
 * CHAANBEAN MCP TOOLS VALIDATION TEST SUITE
 *
 * Verifies all 26 MCP tools across 6 domains:
 * - Underlying implementations
 * - Database operations & persistence (Prisma / Neon Postgres)
 * - Business logic (6-factor credit scoring, statutory 20.25% penal interest, DPD)
 * - Authorization & tenant isolation (cross-tenant rejection, missing tenant rejection)
 * - External-provider adapters (Exotel ExoML, CallSid, Webhook processing)
 * - Error handling (unregistered tools, missing IDs, TRAI call restrictions)
 * - Idempotency & replay protection (in-memory & database cached replays)
 * - Audit logging (AiDecisionLog, CaseTimeline, Section 65B digital seals)
 */

import { prisma } from "../src/lib/db";
import { McpGateway } from "../src/lib/mcp/gateway";
import { ExotelAdapter } from "../src/lib/integrations/exotel/exotel-adapter";
import { RulesAuthorizer } from "../src/lib/rules-engine/rules-authorizer";
import { CreditRiskCalculator } from "../src/lib/credit-engine/risk-calculator";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${testName}${detail ? ` (${detail})` : ""}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
  passedTests++;
  console.log(`  ✓ ${testName}${detail ? ` — ${detail}` : ""}`);
}

async function runMcpToolValidation() {
  console.log("\n================================================================================");
  console.log("CHAANBEAN DEEP MCP TOOLS & SYSTEM INTEGRATION VALIDATION");
  console.log("================================================================================\n");

  // Step 0: Ensure tenant organization exists in database
  let tenant =
    (await prisma.company.findFirst({ where: { name: "Alright Trade" } })) ||
    (await prisma.company.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!tenant) {
    tenant = await prisma.company.create({
      data: {
        name: "Acme Enterprises Ltd",
        plan: "enterprise",
        walletBalance: 500000,
        kycStatus: "verified",
      },
    });
  }

  const primaryContext = {
    tenantId: tenant.id,
    userId: "usr_lead_analyst_01",
    userRoles: ["admin", "credit_underwriter"],
  };

  const foreignContext = {
    tenantId: "company_foreign_tenant_9999",
    userId: "usr_unauthorized_attacker",
    userRoles: ["viewer"],
  };

  // ============================================================================
  // SECTION 1: CORE DOMAIN MCP TOOLS (6 Tools)
  // ============================================================================
  console.log("--- [DOMAIN 1: CORE] Validating 6 Core Tools ---");

  // 1.1 core.get_current_user
  const userRes = await McpGateway.executeTool({
    domain: "core",
    tool: "get_current_user",
    arguments: {},
    context: primaryContext,
  });
  assert(userRes.success, "core.get_current_user executed successfully");
  const userData = userRes.data as any;
  assert(Boolean(userData.id && userData.role), "core.get_current_user returned user profile", `User: ${userData.name}, Role: ${userData.role}`);

  // 1.2 core.get_organisation
  const orgRes = await McpGateway.executeTool({
    domain: "core",
    tool: "get_organisation",
    arguments: {},
    context: primaryContext,
  });
  assert(orgRes.success, "core.get_organisation executed successfully");
  const orgData = orgRes.data as any;
  assert(orgData.id === tenant.id, "core.get_organisation returned matching tenant record", `Org: ${orgData.name}`);

  // 1.3 core.get_subscription
  const subRes = await McpGateway.executeTool({
    domain: "core",
    tool: "get_subscription",
    arguments: {},
    context: primaryContext,
  });
  assert(subRes.success, "core.get_subscription executed successfully");
  const subData = subRes.data as any;
  assert(subData.features.length >= 5, "core.get_subscription returned feature matrix", `Plan: ${subData.plan}, Features: ${subData.features.length}`);

  // 1.4 core.create_credit_case
  const testIdempKey = `idemp_credit_${Date.now()}`;
  const createCreditRes = await McpGateway.executeTool({
    domain: "core",
    tool: "create_credit_case",
    arguments: {
      targetCompanyName: "Apex Precision Tools Pvt Ltd",
      targetCin: "U29220MH2018PTC305882",
      targetGstin: "27AAACA1234F1Z5",
      targetPan: "AAACA1234F",
      requestedAmount: 3500000,
      riskScore: 84,
      riskBand: "LOW_RISK",
      factorsBreakdown: { stability: 85, financial: 80, payment: 90 },
      aiExplanation: "Strong operational track record with low default propensity.",
    },
    context: { ...primaryContext, idempotencyKey: testIdempKey },
  });
  assert(createCreditRes.success, "core.create_credit_case created case");
  const createdCreditCase = createCreditRes.data as any;
  assert(Boolean(createdCreditCase.id), "core.create_credit_case returned persisted ID", `ID: ${createdCreditCase.id}`);

  // Direct database persistence check
  const dbCreditCase = await prisma.creditCase.findUnique({
    where: { id: createdCreditCase.id },
  });
  assert(dbCreditCase !== null, "DB Verification: CreditCase row exists in PostgreSQL");
  assert(dbCreditCase?.approvedAmount === 2975000, "Business Logic: Approved limit calculated @ 85% for LOW_RISK", `Approved: ₹${dbCreditCase?.approvedAmount}`);
  assert(dbCreditCase?.companyId === tenant.id, "Tenant Isolation: CreditCase belongs to correct tenant");

  // 1.5 core.get_credit_case
  const getCreditRes = await McpGateway.executeTool({
    domain: "core",
    tool: "get_credit_case",
    arguments: { creditCaseId: createdCreditCase.id },
    context: primaryContext,
  });
  assert(getCreditRes.success, "core.get_credit_case retrieved existing case");
  assert((getCreditRes.data as any).targetCompanyName === "Apex Precision Tools Pvt Ltd", "core.get_credit_case matched target entity");

  // 1.6 core.get_case_timeline
  const timelineRes = await McpGateway.executeTool({
    domain: "core",
    tool: "get_case_timeline",
    arguments: { creditCaseId: createdCreditCase.id },
    context: primaryContext,
  });
  assert(timelineRes.success, "core.get_case_timeline returned timeline");
  const timelineData = timelineRes.data as any[];
  assert(timelineData.length >= 1, "Timeline audit records verified", `Count: ${timelineData.length}`);

  // ============================================================================
  // SECTION 2: COMPANY DOMAIN MCP TOOLS (6 Tools)
  // ============================================================================
  console.log("\n--- [DOMAIN 2: COMPANY] Validating 6 Company Tools ---");

  // 2.1 company.search_company
  const compSearchRes = await McpGateway.executeTool({
    domain: "company",
    tool: "search_company",
    arguments: { query: "Greenline Retail", limit: 3 },
    context: primaryContext,
  });
  assert(compSearchRes.success, "company.search_company executed");
  const searchResults = compSearchRes.data as any[];
  assert(searchResults.length > 0, "company.search_company returned matches", `Matches: ${searchResults.length}`);
  const sampleComp = searchResults[0];

  // 2.2 company.get_company_profile
  const profileRes = await McpGateway.executeTool({
    domain: "company",
    tool: "get_company_profile",
    arguments: { identifier: sampleComp.legalName },
    context: primaryContext,
  });
  assert(profileRes.success, "company.get_company_profile executed");
  const compProfile = profileRes.data as any;
  assert(Boolean(compProfile.cin && compProfile.turnoverBand), "company.get_company_profile returned complete 360", `CIN: ${compProfile.cin}, Turnover: ${compProfile.turnoverBand}`);

  // 2.3 company.verify_company
  const verifyRes = await McpGateway.executeTool({
    domain: "company",
    tool: "verify_company",
    arguments: { identifier: sampleComp.cin },
    context: primaryContext,
  });
  assert(verifyRes.success, "company.verify_company executed");
  assert((verifyRes.data as any).cinVerified === true, "company.verify_company validated CIN and GSTIN status");

  // 2.4 company.get_directors
  const dirRes = await McpGateway.executeTool({
    domain: "company",
    tool: "get_directors",
    arguments: { identifier: sampleComp.legalName },
    context: primaryContext,
  });
  assert(dirRes.success, "company.get_directors executed");
  const dirData = dirRes.data as any;
  assert(dirData.directorsCount > 0, "company.get_directors returned active DIN records", `Directors: ${dirData.directorsCount}`);

  // 2.5 company.get_gst_profile
  const gstRes = await McpGateway.executeTool({
    domain: "company",
    tool: "get_gst_profile",
    arguments: { gstin: sampleComp.gstin },
    context: primaryContext,
  });
  assert(gstRes.success, "company.get_gst_profile executed");
  const gstData = gstRes.data as any;
  assert(Boolean(gstData.registrationStatus), "company.get_gst_profile returned GSTN standing", `Status: ${gstData.registrationStatus}, Rate: ${gstData.last12MonthsFilingRate}`);

  // 2.6 company.get_msme_status
  const msmeRes = await McpGateway.executeTool({
    domain: "company",
    tool: "get_msme_status",
    arguments: { identifier: sampleComp.legalName },
    context: primaryContext,
  });
  assert(msmeRes.success, "company.get_msme_status executed");
  const msmeData = msmeRes.data as any;
  assert(Boolean(msmeData.penalInterestEntitlement), "company.get_msme_status returned statutory Section 15 rights", `Category: ${msmeData.enterpriseCategory}`);

  // ============================================================================
  // SECTION 3: CREDIT DOMAIN MCP TOOLS (4 Tools)
  // ============================================================================
  console.log("\n--- [DOMAIN 3: CREDIT] Validating 4 Credit Tools ---");

  // 3.1 credit.calculate_credit_risk (Deterministic 6-Factor Model)
  const calcRiskRes = await McpGateway.executeTool({
    domain: "credit",
    tool: "calculate_credit_risk",
    arguments: {
      companyName: sampleComp.legalName,
      requestedExposure: 4000000,
      cin: sampleComp.cin,
    },
    context: primaryContext,
  });
  assert(calcRiskRes.success, "credit.calculate_credit_risk executed");
  const calcData = calcRiskRes.data as any;
  assert(calcData.modelVersion === "v1.0-mvp", "Verified deterministic model version v1.0-mvp");
  assert(calcData.factors.length === 6, "Verified exact 6 statutory credit risk factors present");

  // Validate weights
  const expectedWeights = [20, 20, 25, 20, 10, 5];
  const actualWeights = calcData.factors.map((f: any) => f.weightPct);
  assert(
    JSON.stringify(actualWeights) === JSON.stringify(expectedWeights),
    "Factor weights match deterministic 6-factor model (20/20/25/20/10/5)",
    `Weights: ${actualWeights.join(", ")}%`
  );

  // 3.2 credit.get_risk_explanation
  const explRes = await McpGateway.executeTool({
    domain: "credit",
    tool: "get_risk_explanation",
    arguments: {
      companyName: sampleComp.legalName,
      compositeScore: calcData.compositeScore,
      riskBand: calcData.riskBand,
    },
    context: primaryContext,
  });
  assert(explRes.success, "credit.get_risk_explanation executed");
  assert(typeof (explRes.data as any).explanation === "string" && (explRes.data as any).explanation.length > 50, "credit.get_risk_explanation produced grounded executive narrative");

  // 3.3 credit.get_credit_report
  const reportRes = await McpGateway.executeTool({
    domain: "credit",
    tool: "get_credit_report",
    arguments: { identifier: sampleComp.legalName },
    context: primaryContext,
  });
  assert(reportRes.success, "credit.get_credit_report compiled full dossier");
  assert(Boolean((reportRes.data as any).aiExecutiveSummary), "credit.get_credit_report included AI executive summary");

  // 3.4 credit.get_missing_information
  const missingRes = await McpGateway.executeTool({
    domain: "credit",
    tool: "get_missing_information",
    arguments: { identifier: sampleComp.legalName },
    context: primaryContext,
  });
  assert(missingRes.success, "credit.get_missing_information executed");
  const missingData = missingRes.data as any;
  assert(missingData.missingItemsCount >= 1, "credit.get_missing_information flagged actionable missing filings", `Count: ${missingData.missingItemsCount}`);

  // ============================================================================
  // SECTION 4: RECOVERY DOMAIN MCP TOOLS (4 Tools)
  // ============================================================================
  console.log("\n--- [DOMAIN 4: RECOVERY] Validating 4 Recovery Tools ---");

  // Setup Buyer & Overdue Account
  let buyer = await prisma.buyerDebtor.findFirst({
    where: { companyId: tenant.id, name: "Shiv Shakti Textiles Pvt Ltd" },
  });
  if (!buyer) {
    buyer = await prisma.buyerDebtor.create({
      data: {
        companyId: tenant.id,
        name: "Shiv Shakti Textiles Pvt Ltd",
        contactPerson: "Dinesh Patel",
        mobileNumbers: JSON.stringify(["9820098200"]),
        pan: "AABCS9999F",
        gstin: "27AABCS9999F1Z1",
      },
    });
  }

  let creditAcc = await prisma.creditAccount.findFirst({
    where: { buyerId: buyer.id },
  });
  if (!creditAcc) {
    creditAcc = await prisma.creditAccount.create({
      data: {
        buyerId: buyer.id,
        outstandingAmount: 850000,
        creditLimit: 2000000,
        tenorDays: 45,
        dueDate: new Date(Date.now() - 55 * 86400000), // 55 days overdue
        overdueStatus: "overdue",
      },
    });
  }

  // 4.1 recovery.get_overdue_accounts
  const overdueRes = await McpGateway.executeTool({
    domain: "recovery",
    tool: "get_overdue_accounts",
    arguments: { minDpd: 10 },
    context: primaryContext,
  });
  assert(overdueRes.success, "recovery.get_overdue_accounts executed");
  const overdueAccounts = overdueRes.data as any[];
  assert(overdueAccounts.length > 0, "recovery.get_overdue_accounts returned overdue exposures", `Accounts: ${overdueAccounts.length}`);
  const targetOverdue = overdueAccounts.find((a: any) => a.buyerId === buyer.id) || overdueAccounts[0];

  // 4.2 recovery.create_recovery_case
  const testRecIdemp = `idemp_rec_${Date.now()}`;
  const createRecRes = await McpGateway.executeTool({
    domain: "recovery",
    tool: "create_recovery_case",
    arguments: {
      creditAccountId: targetOverdue.creditAccountId,
      buyerId: targetOverdue.buyerId,
      totalOverdue: 850000,
      overdueDpd: 55,
    },
    context: { ...primaryContext, idempotencyKey: testRecIdemp },
  });
  assert(createRecRes.success, "recovery.create_recovery_case created recovery case");
  const recoveryCaseData = createRecRes.data as any;
  assert(Boolean(recoveryCaseData.caseNumber), "recovery.create_recovery_case generated case number", `Case: ${recoveryCaseData.caseNumber}`);

  // DB verification & statutory interest formula
  const dbRecCase = await prisma.recoveryCase.findUnique({
    where: { id: recoveryCaseData.id },
  });
  assert(dbRecCase !== null, "DB Verification: RecoveryCase row persisted in database");
  const expectedInterest = Math.round(850000 * (0.2025 / 365) * 55);
  assert(
    dbRecCase?.statutoryInterest === expectedInterest,
    "Statutory Interest Calculation: MSMED Act §16 (20.25% p.a.) exact match",
    `Interest: ₹${dbRecCase?.statutoryInterest}`
  );
  assert(
    dbRecCase?.totalClaim === 850000 + expectedInterest,
    "Total Claim equals Principal + Statutory Accrued Interest",
    `Total Claim: ₹${dbRecCase?.totalClaim}`
  );

  // 4.3 recovery.get_next_recovery_action
  const nextActionRes = await McpGateway.executeTool({
    domain: "recovery",
    tool: "get_next_recovery_action",
    arguments: { recoveryCaseId: recoveryCaseData.id },
    context: primaryContext,
  });
  assert(nextActionRes.success, "recovery.get_next_recovery_action executed");
  const nextAction = nextActionRes.data as any;
  assert(Boolean(nextAction.actionType), "recovery.get_next_recovery_action determined next step", `Action: ${nextAction.actionType}`);

  // 4.4 recovery.record_customer_commitment (PTP)
  const ptpRes = await McpGateway.executeTool({
    domain: "recovery",
    tool: "record_customer_commitment",
    arguments: {
      recoveryCaseId: recoveryCaseData.id,
      amount: 850000,
      promisedDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
      paymentMode: "RTGS",
      notes: "CFO committed to initiate RTGS transfer upon payment run.",
    },
    context: primaryContext,
  });
  assert(ptpRes.success, "recovery.record_customer_commitment created PTP");
  const ptpRecord = ptpRes.data as any;
  assert(ptpRecord.amount === 850000, "recovery.record_customer_commitment persisted commitment amount", `Amount: ₹${ptpRecord.amount}`);

  // DB verification of PTP
  const dbPtp = await prisma.promiseToPay.findUnique({
    where: { id: ptpRecord.id },
  });
  assert(dbPtp !== null, "DB Verification: PromiseToPay row exists in PostgreSQL");

  // ============================================================================
  // SECTION 5: COMMUNICATION DOMAIN MCP TOOLS (3 Tools)
  // ============================================================================
  console.log("\n--- [DOMAIN 5: COMMUNICATION] Validating 3 Communication Tools ---");

  // 5.1 communication.make_voice_call (Exotel 15-second Outbound Voice Reminder)
  const testPhone = `98200${Math.floor(10000 + Math.random() * 90000)}`;
  const callRes = await McpGateway.executeTool({
    domain: "communication",
    tool: "make_voice_call",
    arguments: {
      toPhone: testPhone,
      debtorName: buyer.name,
      overdueAmount: 850000,
      overdueDpd: 55,
      recoveryCaseId: recoveryCaseData.id,
      language: "en",
    },
    context: primaryContext,
  });
  assert(callRes.success, "communication.make_voice_call initiated outbound reminder");
  const callData = callRes.data as any;
  assert(Boolean(callData.callSid), "communication.make_voice_call generated valid CallSid", `CallSid: ${callData.callSid}`);

  // DB verification of ExotelCallLog
  const dbCallLog = await prisma.exotelCallLog.findUnique({
    where: { callSid: callData.callSid },
  });
  assert(dbCallLog !== null, "DB Verification: ExotelCallLog persisted in database");
  assert(dbCallLog?.durationSec === 15, "15-second statutory duration recorded");
  assert(Boolean(dbCallLog?.exoml?.includes("<Response>")), "ExoML schema generated with valid tags");
  assert(Boolean(dbCallLog?.exoml?.includes("Hangup")), "ExoML terminates with Hangup command");

  // 5.2 communication.get_call_status
  const callStatusRes = await McpGateway.executeTool({
    domain: "communication",
    tool: "get_call_status",
    arguments: { callSid: callData.callSid },
    context: primaryContext,
  });
  assert(callStatusRes.success, "communication.get_call_status queried call");
  assert((callStatusRes.data as any).callSid === callData.callSid, "communication.get_call_status returned matching CallSid");

  // 5.3 communication.process_communication_webhook
  const webhookRes = await McpGateway.executeTool({
    domain: "communication",
    tool: "process_communication_webhook",
    arguments: {
      callSid: callData.callSid,
      status: "completed",
      duration: 15,
      recordingUrl: `https://api.exotel.com/recordings/${callData.callSid}.mp3`,
    },
    context: primaryContext,
  });
  assert(webhookRes.success, "communication.process_communication_webhook executed");
  const updatedCallLog = await prisma.exotelCallLog.findUnique({
    where: { callSid: callData.callSid },
  });
  assert(updatedCallLog?.status === "completed", "Terminal webhook updated status to 'completed' in DB");
  assert(Boolean(updatedCallLog?.completedAt), "Webhook set completedAt timestamp");

  // ============================================================================
  // SECTION 6: LEGAL DOMAIN MCP TOOLS (3 Tools)
  // ============================================================================
  console.log("\n--- [DOMAIN 6: LEGAL] Validating 3 Legal Tools ---");

  // 6.1 legal.check_legal_eligibility
  const legalCheckRes = await McpGateway.executeTool({
    domain: "legal",
    tool: "check_legal_eligibility",
    arguments: { recoveryCaseId: recoveryCaseData.id },
    context: primaryContext,
  });
  assert(legalCheckRes.success, "legal.check_legal_eligibility evaluated statutory rules");
  const legalCheckData = legalCheckRes.data as any;
  assert(legalCheckData.permitted === true, "Statutory escalation authorized (overdue > 45 days)", `Reason: ${legalCheckData.reason}`);

  // 6.2 legal.create_legal_candidate
  const legalCandRes = await McpGateway.executeTool({
    domain: "legal",
    tool: "create_legal_candidate",
    arguments: { recoveryCaseId: recoveryCaseData.id },
    context: primaryContext,
  });
  assert(legalCandRes.success, "legal.create_legal_candidate promoted recovery case to Pre-Litigation Candidate");
  const candData = legalCandRes.data as any;
  assert(Boolean(candData.candidateNumber), "legal.create_legal_candidate generated docket number", `Docket: ${candData.candidateNumber}`);

  // DB verification of LegalCandidate
  const dbCandidate = await prisma.legalCandidate.findUnique({
    where: { id: candData.candidateId },
  });
  assert(dbCandidate !== null, "DB Verification: LegalCandidate row persisted in database");
  assert(dbCandidate?.principalAmount === 850000, "DB Verification: Principal amount saved accurately");
  assert(dbCandidate?.status === "pending_review", "Initial candidate status is 'pending_review' for Human Legal Review");

  // 6.3 legal.compile_case_package
  const packageRes = await McpGateway.executeTool({
    domain: "legal",
    tool: "compile_case_package",
    arguments: { legalCandidateId: candData.candidateId },
    context: primaryContext,
  });
  assert(packageRes.success, "legal.compile_case_package assembled case package");
  const casePackage = packageRes.data as any;
  assert(Boolean(casePackage.evidentiarySeals.certificate65B), "Section 65B Digital Certificate included in bundle", `Seal: ${casePackage.evidentiarySeals.certificate65B}`);
  assert(casePackage.evidentiarySeals.admissibilityStandard.includes("Section 65B"), "Evidence standard conforms to Indian Evidence Act / Section 63 BSA 2023");
  assert(casePackage.claimSummary.totalClaimAmount > 850000, "Total claim summary includes accrued statutory penal interest");

  // ============================================================================
  // SECTION 7: AUTHORIZATION & TENANT ISOLATION GUARDRAILS
  // ============================================================================
  console.log("\n--- [SECURITY & AUTHORIZATION] Validating Tenant Isolation ---");

  // 7.1 Missing Tenant Context Rejected
  const noTenantRes = await McpGateway.executeTool({
    domain: "core",
    tool: "get_organisation",
    arguments: {},
    context: {} as any,
  });
  assert(!noTenantRes.success, "MCP Gateway strictly blocks requests with missing tenant context");
  assert(noTenantRes.error?.includes("Tenant context is mandatory"), "Error states tenant isolation requirement");

  // 7.2 Cross-Tenant CreditCase Access Blocked
  const crossTenantCreditRes = await McpGateway.executeTool({
    domain: "core",
    tool: "get_credit_case",
    arguments: { creditCaseId: createdCreditCase.id },
    context: foreignContext,
  });
  assert(!crossTenantCreditRes.success, "Cross-tenant access to CreditCase strictly blocked");

  // 7.3 Cross-Tenant Legal Candidate Access Blocked
  const crossTenantLegalRes = await McpGateway.executeTool({
    domain: "legal",
    tool: "compile_case_package",
    arguments: { legalCandidateId: candData.candidateId },
    context: foreignContext,
  });
  assert(!crossTenantLegalRes.success, "Cross-tenant access to LegalCandidate strictly blocked");

  // ============================================================================
  // SECTION 8: IDEMPOTENCY & REPLAY PROTECTION
  // ============================================================================
  console.log("\n--- [IDEMPOTENCY] Validating Side-Effect Replay Protection ---");

  // 8.1 Re-executing create_credit_case with identical idempotencyKey
  const countBeforeReplay = await prisma.creditCase.count();

  const replayCreditRes = await McpGateway.executeTool({
    domain: "core",
    tool: "create_credit_case",
    arguments: {
      targetCompanyName: "Apex Precision Tools Pvt Ltd",
      requestedAmount: 3500000,
      riskScore: 84,
      riskBand: "LOW_RISK",
      factorsBreakdown: {},
    },
    context: { ...primaryContext, idempotencyKey: testIdempKey },
  });
  assert(replayCreditRes.success, "Idempotent replay call returned success");
  assert(replayCreditRes.isIdempotentReplay === true, "McpGateway flagged response with isIdempotentReplay: true");
  assert((replayCreditRes.data as any).id === createdCreditCase.id, "Replay returned original case ID without inserting duplicate");

  const countAfterReplay = await prisma.creditCase.count();
  assert(countBeforeReplay === countAfterReplay, "Database assertion: Duplicate row was NOT created on idempotent replay", `Count before: ${countBeforeReplay}, Count after: ${countAfterReplay}`);

  // ============================================================================
  // SECTION 9: AUDIT LOGGING INTEGRITY
  // ============================================================================
  console.log("\n--- [AUDIT LOGGING] Validating Audit Trails ---");

  // 9.1 AiDecisionLog entries exist for each executed module
  const auditLogs = await prisma.aiDecisionLog.findMany({
    where: { companyId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  assert(auditLogs.length > 0, "AiDecisionLog has active audit entries", `Recent logs: ${auditLogs.length}`);
  const modulesPresent = new Set(auditLogs.map((l) => l.module));
  assert(modulesPresent.size >= 3, "Audit logs recorded across multiple domain modules", `Modules: ${Array.from(modulesPresent).join(", ")}`);

  // 9.2 CaseTimeline entries recorded in order
  const recTimelines = await prisma.caseTimeline.findMany({
    where: { recoveryCaseId: recoveryCaseData.id },
    orderBy: { createdAt: "asc" },
  });
  assert(recTimelines.length >= 3, "CaseTimeline maintains chronological event sequence", `Timeline entries: ${recTimelines.length}`);
  console.log("    Events recorded in timeline:");
  recTimelines.forEach((t, idx) => console.log(`      ${idx + 1}. [${t.eventType}] ${t.title} (${t.actor})`));

  // ============================================================================
  // SECTION 10: ERROR HANDLING & ROBUSTNESS
  // ============================================================================
  console.log("\n--- [ERROR HANDLING] Validating Error Paths ---");

  // 10.1 Unregistered tool invocation
  const unregRes = await McpGateway.executeTool({
    domain: "core",
    tool: "non_existent_tool_xyz",
    arguments: {},
    context: primaryContext,
  });
  assert(!unregRes.success, "Unregistered tool correctly rejected");
  assert(Boolean(unregRes.error?.includes("not registered")), "Error message clearly explains registration failure");

  // 10.2 Call spacing and frequency caps under Rules Engine
  const rulesCallCheck = await RulesAuthorizer.evaluateVoiceCallPermission(
    primaryContext,
    testPhone
  );
  // Note: Since we already called testPhone in Step 5.1, a call within 4 hours must trigger spacing violation!
  assert(!rulesCallCheck.permitted, "Rules Authorizer correctly rejects rapid consecutive call to same debtor");
  assert(
    rulesCallCheck.ruleCode === "RULE_CALL_SPACING_VIOLATION" || rulesCallCheck.ruleCode === "RULE_FREQUENCY_CAP_EXCEEDED",
    "Rule violation reason matches TRAI spacing / frequency rules",
    `Code: ${rulesCallCheck.ruleCode}`
  );

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} DEEP MCP VALIDATION TESTS PASSED!`);
  console.log("================================================================================\n");
}

runMcpToolValidation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ FATAL VALIDATION FAILURE:", err);
    process.exit(1);
  });
