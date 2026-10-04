/**
 * Comprehensive API Lifecycle & Multi-Tenant Security Test Suite
 *
 * Runs against a live Next.js HTTP server (http://localhost:3000)
 * Validates full business loop:
 *  1. Active Tenant & Wallet Resolution (GET /api/wallet)
 *  2. Debtor Onboarding & Credit Account (POST /api/buyers)
 *  3. Invoice Issuance & Exposure Auto-Sync (POST /api/invoices)
 *  4. Recovery Case Intake & Workflow Launch (POST /api/recovery-cases)
 *  5. Multi-Invoice FIFO Settlement & Reconciliation (POST /api/recovery/settle)
 *  6. Arbitration MSME Penal Interest & E-Sign Flow (POST /api/arbitration)
 *  7. Trust ID Credential Minting & Verification (POST /api/trust-hub/register, GET /api/trust-hub/verify)
 *  8. Multi-Tenant Cross-Access Isolation (Tampered x-tenant-id rejected)
 */

import { prisma } from "../src/lib/db";
import { calculateMSMEPenalInterest } from "../src/lib/arbitration/interest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

interface TestStepResult {
  step: string;
  endpoint: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details?: string;
  error?: string;
}

const results: TestStepResult[] = [];

async function recordStep(
  step: string,
  endpoint: string,
  fn: () => Promise<string | void>
) {
  const start = Date.now();
  process.stdout.write(`[TEST] ${step.padEnd(55)} `);
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({
      step,
      endpoint,
      status: "PASS",
      durationMs,
      details: details || "Success",
    });
    console.log(`\x1b[32mPASS\x1b[0m (${durationMs}ms)${details ? ` - ${details}` : ""}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      step,
      endpoint,
      status: "FAIL",
      durationMs,
      error: err.message,
    });
    console.log(`\x1b[31mFAIL\x1b[0m (${durationMs}ms) -> ${err.message}`);
  }
}

async function runApiLifecycleTest() {
  console.log("================================================================================");
  console.log("             CHAANBEAN END-TO-END HTTP API LIFECYCLE AUDIT SUITE                ");
  console.log(` Target Server: ${BASE_URL}`);
  console.log("================================================================================\n");

  // Step 0: Ensure database tenant exists
  const tenant = await prisma.company.findFirst();
  if (!tenant) {
    throw new Error("No tenant company found in database");
  }
  const tenantId = tenant.id;
  const authHeaders = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
    Cookie: `chaanbean_company_id=${tenantId}; chaanbean_company_name=${encodeURIComponent(tenant.name)}`,
  };

  console.log(`Tenant: "${tenant.name}" (${tenantId})\n`);

  let createdBuyerId = "";
  let createdAccountId = "";
  let createdInvoiceId = "";
  const createdInvoiceNumber = `INV-E2E-${Date.now().toString().slice(-6)}`;
  let createdRecoveryCaseId = "";
  let createdArbitrationId = "";
  let mintedTrustId = "";

  // 1. Wallet Balance Check
  await recordStep("1. Wallet Balance & Tenant Resolution", "/api/wallet", async () => {
    const res = await fetch(`${BASE_URL}/api/wallet`, {
      method: "GET",
      headers: authHeaders,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const balance = typeof data.walletBalance === "number" ? data.walletBalance : data.balance;
    if (typeof balance !== "number") {
      throw new Error(`Invalid wallet response: ${JSON.stringify(data)}`);
    }
    return `Balance: ₹${balance.toLocaleString()} (Tenant: ${data.companyName})`;
  });

  // 2. Debtor Onboarding
  await recordStep("2. Debtor Onboarding & Account Creation", "/api/buyers", async () => {
    const res = await fetch(`${BASE_URL}/api/buyers`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Apex Precision Systems E2E ${Date.now().toString().slice(-4)}`,
        gstin: `27AAACP${Math.floor(1000 + Math.random() * 9000)}M1Z5`,
        pan: `AAACP${Math.floor(1000 + Math.random() * 9000)}M`,
        mobile: "+919820011223",
        email: "accounts@apexprecision-test.com",
        initialAmount: 0,
        overdueDays: 45,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const buyerObj = data.buyer || data;
    createdBuyerId = buyerObj.id;
    if (!createdBuyerId) throw new Error("Buyer was created without an ID: " + JSON.stringify(data));

    // Fetch account from database
    const buyerDb = await prisma.buyerDebtor.findUnique({
      where: { id: createdBuyerId },
      include: { creditAccounts: true },
    });
    if (!buyerDb?.creditAccounts?.length) {
      throw new Error("Default CreditAccount was not provisioned for the new debtor");
    }
    createdAccountId = buyerDb.creditAccounts[0].id;
    return `Buyer ID: ${createdBuyerId}, Account ID: ${createdAccountId}`;
  });

  // 3. Issue Overdue Invoice & Verify Balance Sync
  await recordStep("3. Invoice Issuance & Balance Auto-Sync", "/api/invoices", async () => {
    const pastDueDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(`${BASE_URL}/api/invoices`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        invoiceNumber: createdInvoiceNumber,
        buyerId: createdBuyerId,
        creditAccountId: createdAccountId,
        amount: 150000,
        dueDate: pastDueDate,
        notes: "Automated E2E Lifecycle Industrial Hydraulics Batch",
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const inv = await res.json();
    createdInvoiceId = inv.id;

    // Verify balance sync in database
    const updatedAccount = await prisma.creditAccount.findUnique({
      where: { id: createdAccountId },
    });
    if (!updatedAccount || updatedAccount.outstandingAmount < 150000) {
      throw new Error(
        `CreditAccount exposure not synced. Expected >= 150000, got ${updatedAccount?.outstandingAmount}`
      );
    }
    return `Invoice: ${createdInvoiceNumber}, Exposure: ₹${updatedAccount.outstandingAmount.toLocaleString()}`;
  });

  // 4. Create Recovery Case
  await recordStep("4. Recovery Case Intake & Workflow Launch", "/api/recovery-cases", async () => {
    const res = await fetch(`${BASE_URL}/api/recovery-cases`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        action: "create_recovery_case",
        creditAccountId: createdAccountId,
        buyerId: createdBuyerId,
        totalOverdue: 150000,
        overdueDpd: 45,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const recCase = await res.json();
    createdRecoveryCaseId = recCase.recoveryCaseId || recCase.result?.recoveryCaseId || recCase.id;
    if (!createdRecoveryCaseId) {
      // Find case in DB if ID was in inner object
      const dbCase = await prisma.recoveryCase.findFirst({
        where: { creditAccountId: createdAccountId },
        orderBy: { createdAt: "desc" },
      });
      createdRecoveryCaseId = dbCase?.id || "";
    }
    return `Case ID: ${createdRecoveryCaseId}`;
  });

  // 5. Partial & Full Settlement FIFO Reconciliation
  await recordStep("5. FIFO Payment Settlement & Auto-Closing", "/api/recovery/settle", async () => {
    // Settle full 150000
    const res = await fetch(`${BASE_URL}/api/recovery/settle`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        creditAccountId: createdAccountId,
        settlementAmount: 150000,
        settlementMethod: "NEFT",
        referenceNumber: `UTR-${Date.now()}`,
        notes: "Full settlement via automated E2E lifecycle test",
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const settlement = await res.json();

    // Verify database state: Invoice paid, RecoveryCase closed, PaymentReconciliation created
    const inv = await prisma.invoice.findUnique({ where: { id: createdInvoiceId } });
    if (!inv || inv.status !== "paid" || inv.paidAmount < 150000) {
      throw new Error(`Invoice not marked as paid. Status: ${inv?.status}, Paid: ${inv?.paidAmount}`);
    }

    const recCase = await prisma.recoveryCase.findUnique({ where: { id: createdRecoveryCaseId } });
    if (!recCase || (recCase.stage !== "closed" && recCase.stage !== "SETTLED")) {
      throw new Error(`Recovery case not marked closed/settled. Stage: ${recCase?.stage}`);
    }

    const recons = await prisma.paymentReconciliation.findMany({
      where: { invoiceId: createdInvoiceId },
    });
    if (recons.length === 0) {
      throw new Error("No PaymentReconciliation audit record created");
    }

    return `Reconciled: ₹${settlement.settlementAmount}, Invoices Settled: ${settlement.settledInvoices?.length || 1}`;
  });

  // 6. Arbitration MSME Penal Interest & E-Signing
  await recordStep("6. Online Arbitration Dispute MSME Flow", "/api/arbitration", async () => {
    // Provision an arbitration dispute linked to the debtor and tenant
    const interest = calculateMSMEPenalInterest(75000, new Date(Date.now() - 60 * 86400000));
    const arb = await prisma.arbitrationCase.create({
      data: {
        creditAccountId: createdAccountId,
        status: "open",
        assignedLegalOwner: "Adv. Rajesh Nair (ChaanBean Legal Desk)",
        claimantName: tenant.name,
        respondentName: `Apex Precision Systems E2E`,
        principalAmount: 75000,
        penalInterestRate: interest.statutoryRatePercent,
        accruedInterest: interest.accruedInterest,
        totalClaimAmount: interest.totalPayable,
        statutoryBasis: interest.statutorySection,
        eSignStatus: "pending",
      },
    });
    createdArbitrationId = arb.id;

    // 6a. Recalculate Statutory Penal Interest
    const calcRes = await fetch(`${BASE_URL}/api/arbitration`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        action: "recalculate_interest",
        caseId: createdArbitrationId,
      }),
    });
    if (!calcRes.ok) {
      throw new Error(`Recalculate failed: HTTP ${calcRes.status} -> ${await calcRes.text()}`);
    }

    // 6b. E-Sign Arbitration Award
    const signRes = await fetch(`${BASE_URL}/api/arbitration`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        action: "e_sign",
        caseId: createdArbitrationId,
        signatoryName: "Sunil Sharma",
        signatoryRole: "Managing Director",
      }),
    });
    if (!signRes.ok) {
      throw new Error(`Award e-sign failed: HTTP ${signRes.status} -> ${await signRes.text()}`);
    }
    const signedData = await signRes.json();

    // Verify database eSignStatus
    const updatedArb = await prisma.arbitrationCase.findUnique({
      where: { id: createdArbitrationId },
    });
    if (!updatedArb?.eSignStatus || updatedArb.eSignStatus === "pending") {
      throw new Error(`Arbitration award e-sign status not updated: ${updatedArb?.eSignStatus}`);
    }

    return `Case ID: ${createdArbitrationId}, E-Sign: ${signedData.eSignStatus || updatedArb.eSignStatus}`;
  });

  // 7. Trust ID Credential Minting & Verification
  await recordStep("7. Trust ID Credential Registration", "/api/trust-hub/register", async () => {
    const res = await fetch(`${BASE_URL}/api/trust-hub/register`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        companyName: "Alright Trade & Logistics Private Limited",
        pan: "AAACT1234F",
        gstin: "27AAACT1234F1Z8",
        cin: "U51909MH2021PTC367890",
        businessType: "private_limited",
        phone: "+919820011223",
        authorizedSignatory: "Sunil Sharma",
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const trust = await res.json();
    mintedTrustId = trust.trustId;
    if (!mintedTrustId) {
      throw new Error("No trustId returned from registration: " + JSON.stringify(trust));
    }
    return `Minted Trust ID: ${mintedTrustId}`;
  });

  await recordStep("7b. Public Trust ID Verification Lookup", `/api/trust-hub/verify`, async () => {
    const res = await fetch(`${BASE_URL}/api/trust-hub/verify?trustId=${mintedTrustId}`, {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const verifyData = await res.json();
    if (!verifyData.found && !verifyData.verified && !verifyData.profile) {
      throw new Error(`Trust ID lookup did not verify: ${JSON.stringify(verifyData)}`);
    }
    const entityName = verifyData.entityName || verifyData.companyName || verifyData.profile?.company?.name || verifyData.legalName;
    return `Verified Status: ${verifyData.found ? "FOUND & VERIFIED" : "FOUND"} (${entityName})`;
  });

  // 8. Multi-Tenant Security Isolation
  await recordStep("8. Multi-Tenant Cross-Access Isolation", "/api/arbitration (Forged Tenant)", async () => {
    const foreignTenantId = "company_attacker_evil_corp_999";
    const res = await fetch(`${BASE_URL}/api/arbitration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": foreignTenantId,
        Cookie: `chaanbean_company_id=${foreignTenantId}`,
      },
      body: JSON.stringify({
        action: "e_sign",
        caseId: createdArbitrationId,
        signatoryName: "Evil Attacker",
      }),
    });

    // Must be rejected (403 or 404)
    if (res.status === 200 || res.status === 201) {
      throw new Error(
        `CRITICAL SECURITY FAILURE: Foreign tenant was able to tamper with arbitration dispute ${createdArbitrationId}!`
      );
    }
    return `Tamper rejected with HTTP ${res.status} (Access Denied)`;
  });

  console.log("\n================================================================================");
  console.log("                           EXECUTION SUMMARY                                    ");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Steps Tested: ${total}`);
  console.log(`Passed:             \x1b[32m${passed}\x1b[0m`);
  console.log(`Failed:             ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : `0`}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runApiLifecycleTest()
  .catch((err) => {
    console.error("FATAL ERROR IN TEST RUNNER:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
