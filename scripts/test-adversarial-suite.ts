/**
 * CHAANBEAN ADVERSARIAL PRODUCTION HARDENING & EXPLOIT ATTEMPT TEST SUITE
 *
 * Systematically attempts to break the system:
 * 1. Cross-Tenant IDOR & Access Isolation (Data leakage & cross-tenant settlement)
 * 2. Concurrent Double-Settlement Race Condition (Prevent double-spending/over-allocation)
 * 3. Boundary & Negative Amount Attacks (Negative invoice/settlement debt wipeout)
 * 4. SQL / Special Character Injection in IDs and Names
 * 5. State Transition Violations (Re-settling paid invoices, duplicate e-signing)
 * 6. Webhook Replay Attacks (Exotel callback duplicate timeline spam)
 * 7. MCP Schema & Type Validation (Missing required params, type mismatches)
 * 8. Forged / Non-Existent Tenant Identifiers
 */

import { prisma } from "../src/lib/db";
import { McpGateway } from "../src/lib/mcp/gateway";
import { calculateMSMEPenalInterest } from "../src/lib/arbitration/interest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

interface AdversarialTestResult {
  category: string;
  name: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  expectedBehavior: string;
  actualBehavior: string;
  vulnerabilityFound?: string;
}

const results: AdversarialTestResult[] = [];

async function runAdversarialTest(
  category: string,
  name: string,
  expectedBehavior: string,
  testFn: () => Promise<{ passed: boolean; actual: string; vulnerability?: string }>
) {
  const start = Date.now();
  process.stdout.write(`[ADVERSARIAL] [${category}] ${name.padEnd(45)} `);
  try {
    const res = await testFn();
    const durationMs = Date.now() - start;
    if (res.passed) {
      results.push({
        category,
        name,
        status: "PASS",
        durationMs,
        expectedBehavior,
        actualBehavior: res.actual,
      });
      console.log(`\x1b[32mDEFENDED\x1b[0m (${durationMs}ms) - ${res.actual}`);
    } else {
      results.push({
        category,
        name,
        status: "FAIL",
        durationMs,
        expectedBehavior,
        actualBehavior: res.actual,
        vulnerabilityFound: res.vulnerability,
      });
      console.log(`\x1b[31mEXPLOITABLE\x1b[0m (${durationMs}ms) -> ${res.vulnerability || res.actual}`);
    }
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      category,
      name,
      status: "FAIL",
      durationMs,
      expectedBehavior,
      actualBehavior: err.message,
      vulnerabilityFound: `Unhandled exception: ${err.message}`,
    });
    console.log(`\x1b[31mCRASH/ERROR\x1b[0m (${durationMs}ms) -> ${err.message}`);
  }
}

async function runAllAdversarialTests() {
  console.log("================================================================================");
  console.log("             CHAANBEAN ADVERSARIAL PRODUCTION VULNERABILITY AUDIT               ");
  console.log(` Target Server: ${BASE_URL}`);
  console.log("================================================================================\n");

  McpGateway.initialize();

  // Setup: 2 distinct isolated tenants in DB
  let tenantA = await prisma.company.findFirst({ where: { name: "Alright Trade" } });
  if (!tenantA) {
    tenantA = await prisma.company.create({
      data: {
        name: "Alright Trade",
        plan: "growth",
        walletBalance: 250000,
        kycStatus: "verified",
      },
    });
  }

  let tenantB = await prisma.company.findFirst({ where: { name: "Rival Zenith Logistics" } });
  if (!tenantB) {
    tenantB = await prisma.company.create({
      data: {
        name: "Rival Zenith Logistics",
        plan: "enterprise",
        walletBalance: 500000,
        kycStatus: "verified",
      },
    });
  }

  const tenantAHeaders = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantA.id,
    Cookie: `chaanbean_company_id=${tenantA.id}; chaanbean_company_name=${encodeURIComponent(tenantA.name)}`,
  };

  const tenantBHeaders = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantB.id,
    Cookie: `chaanbean_company_id=${tenantB.id}; chaanbean_company_name=${encodeURIComponent(tenantB.name)}`,
  };

  console.log(`Tenant A (Victim): "${tenantA.name}" (${tenantA.id})`);
  console.log(`Tenant B (Attacker): "${tenantB.name}" (${tenantB.id})\n`);

  // Provision distinct resources for Tenant A
  const buyerA = await prisma.buyerDebtor.create({
    data: {
      companyId: tenantA.id,
      name: "Tenant A Sensitive Buyer Pvt Ltd",
      pan: "AAACT9999Z",
      gstin: "27AAACT9999Z1Z1",
      mobileNumbers: JSON.stringify(["+919811122233"]),
    },
  });

  const accountA = await prisma.creditAccount.create({
    data: {
      buyerId: buyerA.id,
      outstandingAmount: 200000,
      creditLimit: 500000,
      dueDate: new Date(Date.now() - 30 * 86400000),
      overdueStatus: "overdue",
    },
  });

  const invoiceA = await prisma.invoice.create({
    data: {
      creditAccountId: accountA.id,
      buyerId: buyerA.id,
      invoiceNumber: `INV-SENSITIVE-${Date.now().toString().slice(-4)}`,
      amount: 200000,
      paidAmount: 0,
      invoiceDate: new Date(Date.now() - 60 * 86400000),
      dueDate: new Date(Date.now() - 30 * 86400000),
      status: "overdue",
      ageingBucket: "1-30",
    },
  });

  // Provision distinct resources for Tenant B
  const buyerB = await prisma.buyerDebtor.create({
    data: {
      companyId: tenantB.id,
      name: "Tenant B Counterparty Pvt Ltd",
      pan: "BBBCT8888Y",
      gstin: "27BBBCT8888Y1Z2",
      mobileNumbers: JSON.stringify(["+919844455566"]),
    },
  });

  const accountB = await prisma.creditAccount.create({
    data: {
      buyerId: buyerB.id,
      outstandingAmount: 100000,
      creditLimit: 300000,
      dueDate: new Date(Date.now() - 15 * 86400000),
      overdueStatus: "overdue",
    },
  });

  // ============================================================================
  // TEST SUITE 1: CROSS-TENANT IDOR & DATA ISOLATION
  // ============================================================================

  await runAdversarialTest(
    "Cross-Tenant IDOR",
    "Attacker attempts to settle Victim's account",
    "Should reject with 403 Forbidden without modifying Victim's account",
    async () => {
      // Attacker (Tenant B) sends settlement request for Victim (Tenant A)'s account
      const res = await fetch(`${BASE_URL}/api/recovery/settle`, {
        method: "POST",
        headers: tenantBHeaders,
        body: JSON.stringify({
          creditAccountId: accountA.id,
          settlementAmount: 50000,
        }),
      });

      const data = await res.json();
      const accountCheck = await prisma.creditAccount.findUnique({ where: { id: accountA.id } });

      if (res.status === 200 && accountCheck?.outstandingAmount !== 200000) {
        return {
          passed: false,
          actual: `Settlement succeeded with HTTP 200, balance reduced to ${accountCheck?.outstandingAmount}`,
          vulnerability: "CRITICAL IDOR: Cross-tenant unauthorized settlement allowed!",
        };
      }

      if (res.status === 403 || res.status === 404) {
        return { passed: true, actual: `Rejected with HTTP ${res.status}: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Expected 403/404 Forbidden on cross-tenant settle",
      };
    }
  );

  await runAdversarialTest(
    "Cross-Tenant IDOR",
    "Attacker issues invoice linked to Victim's debtor",
    "Should reject with 403 Forbidden without modifying exposure",
    async () => {
      // Attacker (Tenant B) tries to issue an invoice with Victim (Tenant A)'s buyerId
      const res = await fetch(`${BASE_URL}/api/invoices`, {
        method: "POST",
        headers: tenantBHeaders,
        body: JSON.stringify({
          invoiceNumber: `INV-FORGED-${Date.now()}`,
          buyerId: buyerA.id,
          creditAccountId: accountA.id,
          amount: 50000,
          dueDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (res.status === 403 || res.status === 404) {
        return { passed: true, actual: `Rejected with HTTP ${res.status}: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Cross-tenant invoice injection permitted!",
      };
    }
  );

  await runAdversarialTest(
    "Cross-Tenant IDOR",
    "Attacker passes Victim's creditAccountId with Attacker's buyerId",
    "Should reject mismatch with 400/403 without incrementing Victim's exposure",
    async () => {
      // Attacker (Tenant B) passes their own buyerId (buyerB.id), but points to Victim's account (accountA.id)
      const res = await fetch(`${BASE_URL}/api/invoices`, {
        method: "POST",
        headers: tenantBHeaders,
        body: JSON.stringify({
          invoiceNumber: `INV-MISMATCH-${Date.now()}`,
          buyerId: buyerB.id,
          creditAccountId: accountA.id, // Mismatch!
          amount: 75000,
          dueDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      const accountACheck = await prisma.creditAccount.findUnique({ where: { id: accountA.id } });

      if (accountACheck?.outstandingAmount !== 200000) {
        return {
          passed: false,
          actual: `Victim exposure corrupted! New balance: ${accountACheck?.outstandingAmount}`,
          vulnerability: "CRITICAL IDOR: Cross-account exposure poisoning via mismatched creditAccountId!",
        };
      }

      if (res.status === 400 || res.status === 403 || res.status === 404) {
        return { passed: true, actual: `Rejected with HTTP ${res.status}: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Mismatched debtor/creditAccount accepted!",
      };
    }
  );

  await runAdversarialTest(
    "Cross-Tenant IDOR",
    "Attacker attempts to read Victim's wallet ledger",
    "Should reject with 403 Forbidden without leaking financial ledger",
    async () => {
      const res = await fetch(`${BASE_URL}/api/wallet?companyId=${tenantA.id}`, {
        method: "GET",
        headers: tenantBHeaders,
      });

      const data = await res.json();
      if (res.status === 403) {
        return { passed: true, actual: `Rejected with HTTP 403: ${data.error}` };
      }

      if (res.ok && data.companyId === tenantA.id) {
        return {
          passed: false,
          actual: `Victim ledger exposed! Balance: ₹${data.walletBalance}`,
          vulnerability: "CRITICAL IDOR: Cross-tenant wallet data leakage!",
        };
      }

      return { passed: true, actual: `Handled safely: HTTP ${res.status}` };
    }
  );

  await runAdversarialTest(
    "Cross-Tenant IDOR",
    "Attacker attempts to drain Victim's wallet balance",
    "Should reject with 403 Forbidden without deducting Victim funds",
    async () => {
      const victimBefore = await prisma.company.findUnique({ where: { id: tenantA.id } });
      const res = await fetch(`${BASE_URL}/api/wallet`, {
        method: "POST",
        headers: tenantBHeaders,
        body: JSON.stringify({
          action: "deduct",
          companyId: tenantA.id, // Explicit victim override!
          amount: 50000,
          featureKey: "gst_supreme_report",
        }),
      });

      const data = await res.json();
      const victimAfter = await prisma.company.findUnique({ where: { id: tenantA.id } });

      if (res.status === 403) {
        return { passed: true, actual: `Rejected with HTTP 403: ${data.error}` };
      }

      if (victimAfter && victimBefore && victimAfter.walletBalance < victimBefore.walletBalance) {
        return {
          passed: false,
          actual: `Victim wallet drained from ₹${victimBefore.walletBalance} to ₹${victimAfter.walletBalance}`,
          vulnerability: "CRITICAL IDOR: Cross-tenant wallet balance depletion allowed!",
        };
      }

      return { passed: true, actual: `Rejected/Handled with HTTP ${res.status}` };
    }
  );

  await runAdversarialTest(
    "Cross-Tenant IDOR",
    "Attacker attempts to generate legal evidence pack for Victim's debtor",
    "Should reject with 403 Forbidden",
    async () => {
      const res = await fetch(`${BASE_URL}/api/legal/evidence-pack`, {
        method: "POST",
        headers: tenantBHeaders,
        body: JSON.stringify({
          creditAccountId: accountA.id,
          title: "Malicious Evidence Pack Request",
        }),
      });

      const data = await res.json();
      if (res.status === 403) {
        return { passed: true, actual: `Rejected with HTTP 403: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "CRITICAL IDOR: Unauthorized cross-tenant legal evidence pack generation!",
      };
    }
  );

  // ============================================================================
  // TEST SUITE 2: NEGATIVE & BOUNDARY TAMPERING
  // ============================================================================

  await runAdversarialTest(
    "Boundary Attacks",
    "Negative invoice amount (attempted debt reduction)",
    "Should reject with 400 Bad Request",
    async () => {
      const res = await fetch(`${BASE_URL}/api/invoices`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          invoiceNumber: `INV-NEG-${Date.now()}`,
          buyerId: buyerA.id,
          creditAccountId: accountA.id,
          amount: -50000, // Negative!
          dueDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        return { passed: true, actual: `Rejected with HTTP 400: ${data.error}` };
      }

      const accountCheck = await prisma.creditAccount.findUnique({ where: { id: accountA.id } });
      return {
        passed: false,
        actual: `HTTP ${res.status}, balance: ${accountCheck?.outstandingAmount}`,
        vulnerability: "Negative amount allowed! Exposure manipulation vulnerability.",
      };
    }
  );

  await runAdversarialTest(
    "Boundary Attacks",
    "Zero or negative settlement amount (attempted free wipeout)",
    "Should reject with 400 Bad Request",
    async () => {
      const res = await fetch(`${BASE_URL}/api/recovery/settle`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          creditAccountId: accountA.id,
          paymentAmount: -10000, // Negative!
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        return { passed: true, actual: `Rejected with HTTP 400: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Negative settlement allowed or wiped balance!",
      };
    }
  );

  await runAdversarialTest(
    "Boundary Attacks",
    "SQL Injection & Special characters in debtor name",
    "Should handle safely without SQL syntax error or data leakage",
    async () => {
      const injectionName = "Test Corp'; DROP TABLE \"Invoice\"; --";
      const res = await fetch(`${BASE_URL}/api/buyers`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          name: injectionName,
          pan: "ABCDE1234F",
          mobile: "+919988776655",
        }),
      });

      const data = await res.json();
      // Verify invoices table is still intact!
      const invoiceCount = await prisma.invoice.count();

      if (res.ok && typeof invoiceCount === "number") {
        return {
          passed: true,
          actual: `Sanitized safely. Invoices table intact (${invoiceCount} rows). Buyer created: ${data.buyer?.name}`,
        };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "SQL injection error or table affected",
      };
    }
  );

  await runAdversarialTest(
    "Boundary Attacks",
    "Negative wallet deduction amount",
    "Should reject with 400 Bad Request",
    async () => {
      const res = await fetch(`${BASE_URL}/api/wallet`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          action: "deduct",
          amount: -5000,
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        return { passed: true, actual: `Rejected with HTTP 400: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Negative wallet deduction allowed!",
      };
    }
  );

  await runAdversarialTest(
    "Boundary Attacks",
    "Negative wallet recharge amount",
    "Should reject with 400 Bad Request",
    async () => {
      const res = await fetch(`${BASE_URL}/api/wallet`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          action: "recharge",
          amount: -10000,
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        return { passed: true, actual: `Rejected with HTTP 400: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Negative wallet recharge allowed!",
      };
    }
  );

  await runAdversarialTest(
    "Boundary Attacks",
    "Negative community default amount in Trust Hub",
    "Should reject with 400 Bad Request",
    async () => {
      const res = await fetch(`${BASE_URL}/api/trust-hub/defaults`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          debtorName: "Hostile Overdue Debtor Pvt Ltd",
          amountDefaulted: -100000,
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        return { passed: true, actual: `Rejected with HTTP 400: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Negative default amount permitted in Trust Hub!",
      };
    }
  );

  // ============================================================================
  // TEST SUITE 3: CONCURRENCY & DOUBLE SETTLEMENT
  // ============================================================================

  await runAdversarialTest(
    "Concurrency & Race Conditions",
    "Concurrent parallel settlements on single invoice",
    "Total settled should never exceed invoice amount (Atomic reconciliation)",
    async () => {
      // Create dedicated single invoice for ₹100,000
      const concBuyer = await prisma.buyerDebtor.create({
        data: {
          companyId: tenantA.id,
          name: "Concurrent Test Industries",
          mobileNumbers: JSON.stringify(["+919877788899"]),
        },
      });

      const concAccount = await prisma.creditAccount.create({
        data: {
          buyerId: concBuyer.id,
          outstandingAmount: 100000,
          creditLimit: 200000,
          dueDate: new Date(Date.now() - 10 * 86400000),
          overdueStatus: "overdue",
        },
      });

      const concInvoice = await prisma.invoice.create({
        data: {
          creditAccountId: concAccount.id,
          buyerId: concBuyer.id,
          invoiceNumber: `INV-CONC-${Date.now()}`,
          amount: 100000,
          paidAmount: 0,
          invoiceDate: new Date(Date.now() - 30 * 86400000),
          dueDate: new Date(Date.now() - 10 * 86400000),
          status: "overdue",
          ageingBucket: "1-30",
        },
      });

      // Fire 2 concurrent settlement requests for ₹100,000 EACH at the exact same millisecond
      const [res1, res2] = await Promise.all([
        fetch(`${BASE_URL}/api/recovery/settle`, {
          method: "POST",
          headers: tenantAHeaders,
          body: JSON.stringify({
            creditAccountId: concAccount.id,
            paymentAmount: 100000,
            referenceNumber: `UTR-RACE-1-${Date.now()}`,
          }),
        }),
        fetch(`${BASE_URL}/api/recovery/settle`, {
          method: "POST",
          headers: tenantAHeaders,
          body: JSON.stringify({
            creditAccountId: concAccount.id,
            paymentAmount: 100000,
            referenceNumber: `UTR-RACE-2-${Date.now()}`,
          }),
        }),
      ]);

      const updatedInvoice = await prisma.invoice.findUnique({ where: { id: concInvoice.id } });
      const updatedAcc = await prisma.creditAccount.findUnique({ where: { id: concAccount.id } });

      // Invoice paid amount must NOT exceed 100000
      if (updatedInvoice && updatedInvoice.paidAmount > 100000) {
        return {
          passed: false,
          actual: `Invoice overpaid! Paid amount: ₹${updatedInvoice.paidAmount} on ₹100,000 invoice`,
          vulnerability: "RACE CONDITION: Double-spending allowed! Invoice paidAmount exceeded total.",
        };
      }

      // Account outstanding must not be negative
      if (updatedAcc && updatedAcc.outstandingAmount < 0) {
        return {
          passed: false,
          actual: `Account balance went negative: ₹${updatedAcc.outstandingAmount}`,
          vulnerability: "RACE CONDITION: Balance underflow below 0.",
        };
      }

      return {
        passed: true,
        actual: `Handled safely. Invoice paid: ₹${updatedInvoice?.paidAmount}, Account: ₹${updatedAcc?.outstandingAmount}`,
      };
    }
  );

  // ============================================================================
  // TEST SUITE 4: STATE TRANSITION INTEGRITY
  // ============================================================================

  await runAdversarialTest(
    "State Transitions",
    "Duplicate e-signing of already completed arbitration award",
    "Should reject re-signing an already fully signed award",
    async () => {
      // Create an arbitration case and fully sign it
      const arb = await prisma.arbitrationCase.create({
        data: {
          creditAccountId: accountA.id,
          status: "award_passed",
          assignedLegalOwner: "Adv. Rajesh Nair",
          claimantName: tenantA.name,
          respondentName: buyerA.name,
          principalAmount: 50000,
          penalInterestRate: 20.25,
          accruedInterest: 2000,
          totalClaimAmount: 52000,
          statutoryBasis: "MSMED Act 2006 §16",
          eSignStatus: "fully_signed", // Already completed!
          eSignSignatures: JSON.stringify([
            { name: "Signer 1", role: "Claimant", signedAt: new Date().toISOString() },
            { name: "Signer 2", role: "Respondent", signedAt: new Date().toISOString() },
          ]),
        },
      });

      // Attempt to sign again
      const res = await fetch(`${BASE_URL}/api/arbitration`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          action: "e_sign",
          caseId: arb.id,
          signatoryName: "Intruder Signer",
          signatoryRole: "Claimant",
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        return { passed: true, actual: `Rejected with HTTP 400: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Completed arbitration award allowed mutation/re-signing!",
      };
    }
  );

  await runAdversarialTest(
    "State Transitions",
    "Settlement on already zero-balance account",
    "Should reject with 400 Bad Request",
    async () => {
      // Create an already settled account
      const zeroAcc = await prisma.creditAccount.create({
        data: {
          buyerId: buyerA.id,
          outstandingAmount: 0,
          creditLimit: 100000,
          overdueStatus: "settled",
          dueDate: new Date(),
        },
      });

      const res = await fetch(`${BASE_URL}/api/recovery/settle`, {
        method: "POST",
        headers: tenantAHeaders,
        body: JSON.stringify({
          creditAccountId: zeroAcc.id,
          paymentAmount: 50000,
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        return { passed: true, actual: `Rejected with HTTP 400: ${data.error}` };
      }

      return {
        passed: false,
        actual: `HTTP ${res.status}: ${JSON.stringify(data)}`,
        vulnerability: "Settlement allowed on already zero-balance account!",
      };
    }
  );

  // ============================================================================
  // TEST SUITE 5: WEBHOOK REPLAY ATTACK
  // ============================================================================

  await runAdversarialTest(
    "Webhook Replay",
    "Replayed Exotel terminal callback should be idempotent",
    "Should not create duplicate CaseTimeline entries",
    async () => {
      // Create a test call log
      const testSid = `exo_test_replay_${Date.now()}`;
      const recCase = await prisma.recoveryCase.create({
        data: {
          companyId: tenantA.id,
          creditAccountId: accountA.id,
          buyerId: buyerA.id,
          caseNumber: `REC-REPLAY-${Date.now().toString().slice(-4)}`,
          status: "active",
          stage: "L1_REMINDER",
          totalOverdue: 200000,
          totalClaim: 200000,
        },
      });

      const callLog = await prisma.exotelCallLog.create({
        data: {
          companyId: tenantA.id,
          recoveryCaseId: recCase.id,
          callSid: testSid,
          fromPhone: "08047190000",
          toPhone: "+919811122233",
          status: "in-progress",
        },
      });

      // Send callback 1
      const res1 = await fetch(`${BASE_URL}/api/webhooks/exotel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          CallSid: testSid,
          Status: "completed",
          Duration: 18,
        }),
      });

      const initialTimelineCount = await prisma.caseTimeline.count({
        where: { recoveryCaseId: recCase.id, eventType: "EXOTEL_CALL_COMPLETED" },
      });

      // Send identical replay callback 2
      const res2 = await fetch(`${BASE_URL}/api/webhooks/exotel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          CallSid: testSid,
          Status: "completed",
          Duration: 18,
        }),
      });

      const finalTimelineCount = await prisma.caseTimeline.count({
        where: { recoveryCaseId: recCase.id, eventType: "EXOTEL_CALL_COMPLETED" },
      });

      if (finalTimelineCount > initialTimelineCount) {
        return {
          passed: false,
          actual: `Timeline events duplicated: ${initialTimelineCount} -> ${finalTimelineCount}`,
          vulnerability: "WEBHOOK REPLAY: Duplicate business events created on webhook replay.",
        };
      }

      return {
        passed: true,
        actual: `Idempotent: Timeline count stayed at ${finalTimelineCount}. Duplicate ignored.`,
      };
    }
  );

  // ============================================================================
  // TEST SUITE 6: MCP GATEWAY SCHEMA & IDEMPOTENCY
  // ============================================================================

  await runAdversarialTest(
    "MCP Gateway",
    "Tool execution with missing required parameter",
    "Should reject with validation error before handler invocation",
    async () => {
      // Call create_recovery_case without creditAccountId
      const resp = await McpGateway.executeTool({
        domain: "recovery",
        tool: "create_recovery_case",
        arguments: { buyerId: buyerA.id }, // Missing creditAccountId!
        context: { tenantId: tenantA.id },
      });

      if (!resp.success && resp.error?.includes("Missing required parameter")) {
        return { passed: true, actual: `Rejected gracefully: ${resp.error}` };
      }

      return {
        passed: false,
        actual: JSON.stringify(resp),
        vulnerability: "MCP gateway executed handler without validating required parameters!",
      };
    }
  );

  await runAdversarialTest(
    "MCP Gateway",
    "Tool execution with invalid parameter type (string for number)",
    "Should reject with type mismatch error",
    async () => {
      // Call calculate_credit_risk with string for requestedExposure
      const resp = await McpGateway.executeTool({
        domain: "credit",
        tool: "calculate_credit_risk",
        arguments: {
          companyName: "Tata Motors Limited",
          requestedExposure: "INVALID_STRING_AMOUNT", // Invalid type!
        },
        context: { tenantId: tenantA.id },
      });

      if (!resp.success && resp.error?.toLowerCase().includes("invalid type")) {
        return { passed: true, actual: `Rejected gracefully: ${resp.error}` };
      }

      return {
        passed: false,
        actual: JSON.stringify(resp),
        vulnerability: "MCP gateway allowed invalid parameter type into domain logic!",
      };
    }
  );

  await runAdversarialTest(
    "MCP Gateway",
    "Forged non-existent tenant ID in MCP context",
    "Should reject with tenant not found error before execution or audit write",
    async () => {
      const resp = await McpGateway.executeTool({
        domain: "core",
        tool: "get_organisation",
        arguments: {},
        context: { tenantId: "company_non_existent_fake_id_9999" },
      });

      if (!resp.success && (resp.error?.includes("Invalid or non-existent tenant") || resp.error?.includes("Tenant"))) {
        return { passed: true, actual: `Rejected: ${resp.error}` };
      }

      return {
        passed: false,
        actual: JSON.stringify(resp),
        vulnerability: "Forged tenant ID accepted or caused foreign key database crash!",
      };
    }
  );

  console.log("\n================================================================================");
  console.log("                      ADVERSARIAL AUDIT SUMMARY                                ");
  console.log("================================================================================");
  const total = results.length;
  const defended = results.filter((r) => r.status === "PASS").length;
  const exploitable = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Attacks Simulated: ${total}`);
  console.log(`Defended:                 \x1b[32m${defended}\x1b[0m`);
  console.log(`Exploitable / Vulnerable: ${exploitable > 0 ? `\x1b[31m${exploitable}\x1b[0m` : `0`}`);
  console.log("================================================================================\n");

  if (exploitable > 0) {
    console.log("VULNERABILITIES DETECTED TO REMEDIATE:");
    results.filter((r) => r.status === "FAIL").forEach((r, idx) => {
      console.log(`${idx + 1}. [${r.category}] ${r.name}`);
      console.log(`   Expected:      ${r.expectedBehavior}`);
      console.log(`   Actual:        ${r.actualBehavior}`);
      console.log(`   Vulnerability: ${r.vulnerabilityFound}\n`);
    });
  }
}

runAllAdversarialTests()
  .catch((err) => {
    console.error("FATAL ERROR IN ADVERSARIAL RUNNER:", err);
  })
  .finally(async () => {
    try {
      const c = await prisma.company.findFirst({ where: { name: "Rival Zenith Logistics" } });
      if (c) {
        const buyers = await prisma.buyerDebtor.findMany({ where: { companyId: c.id }, select: { id: true } });
        const buyerIds = buyers.map((b) => b.id);
        const accounts = await prisma.creditAccount.findMany({ where: { buyerId: { in: buyerIds } }, select: { id: true } });
        const accountIds = accounts.map((a) => a.id);
        const recCases = await prisma.recoveryCase.findMany({ where: { companyId: c.id }, select: { id: true } });
        const recCaseIds = recCases.map((r) => r.id);
        if (recCaseIds.length > 0) {
          await prisma.legalCandidate.deleteMany({ where: { recoveryCaseId: { in: recCaseIds } } });
          await prisma.exotelCallLog.deleteMany({ where: { recoveryCaseId: { in: recCaseIds } } });
          await prisma.caseTimeline.deleteMany({ where: { recoveryCaseId: { in: recCaseIds } } });
          await prisma.recoveryCase.deleteMany({ where: { id: { in: recCaseIds } } });
        }
        if (accountIds.length > 0) {
          await prisma.invoice.deleteMany({ where: { creditAccountId: { in: accountIds } } });
          await prisma.promiseToPay.deleteMany({ where: { creditAccountId: { in: accountIds } } });
          await prisma.creditAccount.deleteMany({ where: { id: { in: accountIds } } });
        }
        if (buyerIds.length > 0) {
          await prisma.riskFlag.deleteMany({ where: { buyerId: { in: buyerIds } } });
          await prisma.buyerDebtor.deleteMany({ where: { id: { in: buyerIds } } });
        }
        await prisma.trustProfile.deleteMany({ where: { companyId: c.id } });
        await prisma.communityDefault.deleteMany({ where: { reportingCompanyId: c.id } });
        await prisma.company.delete({ where: { id: c.id } });
      }
      const sensitiveBuyer = await prisma.buyerDebtor.findFirst({ where: { name: "Tenant A Sensitive Buyer Pvt Ltd" } });
      if (sensitiveBuyer) {
        const accounts = await prisma.creditAccount.findMany({ where: { buyerId: sensitiveBuyer.id }, select: { id: true } });
        const accIds = accounts.map((a) => a.id);
        if (accIds.length > 0) {
          await prisma.invoice.deleteMany({ where: { creditAccountId: { in: accIds } } });
          await prisma.creditAccount.deleteMany({ where: { id: { in: accIds } } });
        }
        await prisma.buyerDebtor.delete({ where: { id: sensitiveBuyer.id } });
      }
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
    await prisma.$disconnect();
  });
