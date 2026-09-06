// E2E Verification Script for ChaanBean
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Starting ChaanBean End-to-End Verification ===\n");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Health Check
  await test("GET /api/health", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== "healthy") throw new Error(`Expected healthy, got ${data.status}`);
  });

  // 2. Verification Adapter Status (11 providers)
  await test("GET /api/verification/status (11 Adapters)", async () => {
    const res = await fetch(`${BASE_URL}/api/verification/status`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.adapters.length < 11) throw new Error(`Expected >= 11 adapters, got ${data.adapters.length}`);
    const gsp = data.adapters.find(a => a.id === "gst_supreme");
    if (!gsp) throw new Error("GST Supreme adapter missing");
  });

  // 3. Create Buyer Debtor with instant risk compute
  let createdBuyerId = null;
  await test("POST /api/buyers (Create Debtor & Auto-compute Risk Flag)", async () => {
    const payload = {
      name: "Coimbatore Precision Forgings Ltd",
      pan: "AAACP4489J",
      gstin: "33AAACP4489J1ZZ",
      mobile: "+919876543210",
      email: "accounts@coimbatoreforgings.com",
      address: "Industrial Estate, Coimbatore, Tamil Nadu 641001",
      initialAmount: 850000,
      overdueDays: 62,
      language: "ta"
    };

    const res = await fetch(`${BASE_URL}/api/buyers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.buyer?.id) throw new Error("Missing buyer id");
    if (!data.riskFlag?.flag) throw new Error("Missing computed risk flag");
    createdBuyerId = data.buyer.id;
    console.log(`       Created Buyer: ${data.buyer.name} | Risk Flag: ${data.riskFlag.flag.toUpperCase()} (Score: ${data.riskFlag.compositeScore})`);
  });

  // 4. View Buyer Deep Dossier HTML Render
  await test("GET /buyers/[id] HTML render", async () => {
    if (!createdBuyerId) throw new Error("No buyer ID from previous step");
    const res = await fetch(`${BASE_URL}/buyers/${createdBuyerId}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes("Coimbatore Precision Forgings")) throw new Error("Buyer name not found in rendered HTML");
  });

  // 5. Run Recovery Tick (09:00 - 18:00 TRAI window & Voice Call simulation)
  let activeCreditAccountId = null;
  await test("POST /api/recovery (Run Recovery Tick & Evidence Log)", async () => {
    const buyersRes = await fetch(`${BASE_URL}/api/buyers`);
    const { buyers } = await buyersRes.json();
    const buyerWithAcc = buyers.find(b => b.creditAccounts && b.creditAccounts.length > 0);
    if (!buyerWithAcc) throw new Error("No buyer with credit account found");
    activeCreditAccountId = buyerWithAcc.creditAccounts[0].id;

    const res = await fetch(`${BASE_URL}/api/recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditAccountId: activeCreditAccountId,
        action: "tick"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    console.log(`       Recovery Tick: ${data.message}`);
  });

  // 6. Issue Formal Demand Notice with gov_reference_id
  await test("POST /api/recovery (Issue Legal Demand Notice with gov_reference_id)", async () => {
    if (!activeCreditAccountId) throw new Error("No active credit account ID");
    const res = await fetch(`${BASE_URL}/api/recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditAccountId: activeCreditAccountId,
        action: "legal_notice"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.govReferenceId) throw new Error("Missing govReferenceId on legal notice response");
    console.log(`       Legal Notice Issued: Gov Ref: ${data.govReferenceId} | SHA-256 Hash: ${data.contentHash?.slice(0, 16)}...`);
  });

  // 7. Arbitration Center: Recalculate MSME §16 interest & Aadhaar e-Sign
  await test("POST /api/arbitration (MSME Statutory Interest & Aadhaar e-Sign)", async () => {
    const casesRes = await fetch(`${BASE_URL}/api/arbitration`);
    if (!casesRes.ok) throw new Error(`GET /api/arbitration failed: ${casesRes.status}`);
    const { cases } = await casesRes.json();
    if (!cases || cases.length === 0) throw new Error("No arbitration cases available");
    const testCase = cases[0];

    // 7a. Recalculate MSME penal interest
    const calcRes = await fetch(`${BASE_URL}/api/arbitration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: testCase.id,
        action: "recalculate_interest"
      })
    });
    if (!calcRes.ok) {
      const err = await calcRes.text();
      throw new Error(`Interest recalculate failed: ${err}`);
    }
    const calcData = await calcRes.json();
    console.log(`       MSME Penal Interest Rate: ${calcData.calculation.statutoryRatePercent}% (3x RBI Rate) | Accrued: ₹${calcData.calculation.accruedInterest.toLocaleString("en-IN")}`);

    // 7b. Execute Aadhaar e-Sign
    const signRes = await fetch(`${BASE_URL}/api/arbitration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: testCase.id,
        action: "e_sign",
        signatoryName: "Siddharth Verma",
        signatoryRole: "Claimant Authorized Officer"
      })
    });
    if (!signRes.ok) {
      const err = await signRes.text();
      throw new Error(`e-Sign failed: ${err}`);
    }
    const signData = await signRes.json();
    console.log(`       Aadhaar e-Sign Recorded: Status: ${signData.eSignStatus} | Message: ${signData.message}`);
  });

  // 8. Trust Hub Community Default Reporting (Trips hard Red flag)
  await test("POST /api/trust-hub/defaults (Community Default Reporting)", async () => {
    const res = await fetch(`${BASE_URL}/api/trust-hub/defaults`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debtorName: "Coimbatore Precision Forgings Ltd",
        debtorGstin: "33AAACP4489J1ZZ",
        debtorPan: "AAACP4489J",
        amountDefaulted: 850000,
        notes: "Goods delivered via Delhivery LR #992384; 3 dishonored cheques under NI Act §138"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.defaultId) throw new Error("Missing defaultId");
    console.log(`       Community Default Logged: Report #${data.defaultId} | Automatic Red Flag recalculation triggered`);
  });

  // 9. Vendor Registration & Automated KYC Check
  await test("POST /api/vendors (Vendor Registration & KYC)", async () => {
    const res = await fetch(`${BASE_URL}/api/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Apex Logistics & Fleet Solutions",
        category: "logistics",
        contactPerson: "Rajesh Kumar",
        phone: "+919443210987",
        email: "ops@apexlogistics.in",
        pan: "ABCDE1234F",
        gstin: "27ABCDE1234F1Z5",
        bankAccountNumber: "001201099882",
        bankIfsc: "HDFC0000012",
        annualTurnover: 45000000,
        preferredLanguage: "hi"
      })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.vendor?.id) throw new Error("Missing vendor id");
    console.log(`       Vendor Registered: ${data.vendor.name} (KYC Status: ${data.vendor.kycStatus})`);
  });

  // 10. Admin CRM Pipeline: Fetch Deals & Stages
  let firstDealId = null;
  let wonStageId = null;
  await test("GET /api/admin/pipeline (CRM Pipeline Kanban)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/pipeline`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.stages || data.stages.length === 0) throw new Error("No pipeline stages returned");
    const wonStage = data.stages.find(s => s.name === "Won");
    if (!wonStage) throw new Error("Won stage missing");
    wonStageId = wonStage.id;
    const allDeals = data.stages.flatMap(s => s.deals);
    if (allDeals.length > 0) {
      firstDealId = allDeals[0].id;
    }
    console.log(`       Pipeline: ${data.stages.length} stages, ${allDeals.length} active deals, ₹${data.metrics.totalPipelineValue.toLocaleString("en-IN")} total value`);
  });

  // 11. Admin CRM Pipeline: Move Deal & Convert to Live Customer Company
  await test("POST /api/admin/pipeline (Stage Move & Convert to Customer Company)", async () => {
    if (!firstDealId || !wonStageId) throw new Error("Missing deal or wonStageId");
    
    // Move to Won stage
    const moveRes = await fetch(`${BASE_URL}/api/admin/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "move_stage",
        dealId: firstDealId,
        newStageId: wonStageId,
        winLossReason: "Approved 10,000 monthly verification enterprise tier"
      })
    });
    if (!moveRes.ok) {
      const err = await moveRes.text();
      throw new Error(`Move deal status ${moveRes.status}: ${err}`);
    }

    // Convert to customer company
    const convertRes = await fetch(`${BASE_URL}/api/admin/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "convert_to_company",
        dealId: firstDealId,
        companyName: "Kalyan Textiles Ltd",
        plan: "enterprise"
      })
    });
    if (!convertRes.ok) {
      const err = await convertRes.text();
      throw new Error(`Convert status ${convertRes.status}: ${err}`);
    }
    const convertData = await convertRes.json();
    if (!convertData.company?.id) throw new Error("Missing converted company id");
    console.log(`       Deal converted to Live Customer Company: ${convertData.company.name} (Plan: ${convertData.company.plan})`);
  });

  // 12. Admin Customer Engagement & Health Scores
  await test("GET /api/admin/customers", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/customers`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.customers || data.customers.length === 0) throw new Error("No customers returned");
    console.log(`       Customers: ${data.customers.length} total, Health: ${data.summary.healthyCount} Healthy / ${data.summary.atRiskCount} At-Risk`);
  });

  // 13. Admin Marketing Analytics (CPL/CAC & Trust Hub viral referrals)
  await test("GET /api/admin/marketing", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/marketing`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.channels || data.channels.length === 0) throw new Error("No marketing channels returned");
    console.log(`       Marketing: ${data.channels.length} channels tracked, ${data.referrals?.length || 0} Trust Hub viral referrals`);
  });

  // 14. Admin Financials (Owner-Only Access Gate)
  await test("GET /api/admin/financials?role=team_member (403 Forbidden Gate)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/financials?role=team_member`);
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await test("GET /api/admin/financials?role=owner (200 OK MRR Waterfall & 12M Summary)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/financials?role=owner`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.kpis?.currentMRR) throw new Error("Missing currentMRR");
    if (!data.summaryTable || data.summaryTable.length === 0) throw new Error("Missing summaryTable");
    console.log(`       Financials: Current MRR ₹${data.kpis.currentMRR.toLocaleString("en-IN")} | Forecast Next Month: ₹${data.kpis.forecastNextMonthMRR.toLocaleString("en-IN")}`);
  });

  console.log(`\n=== Verification Complete: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
