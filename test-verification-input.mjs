import fs from "fs";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Testing Real Verification Data Pulled from Input ===\n");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log("[PASS] " + name);
      passed++;
    } catch (err) {
      console.error("[FAIL] " + name + ":", err.message);
      failed++;
    }
  }

  // 1. Check Zero Math.random() in entire codebase
  await test("Verify 0 occurrences of Math.random() across entire repository", async () => {
    function scanDir(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        if (f.name === "node_modules" || f.name === ".next" || f.name === ".git") continue;
        const fullPath = dir + "/" + f.name;
        if (f.isDirectory()) {
          scanDir(fullPath);
        } else if (f.name.endsWith(".ts") || f.name.endsWith(".tsx") || f.name.endsWith(".js") || f.name.endsWith(".mjs")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes("Math.random()") && !line.trim().startsWith("//") && !line.includes('includes("Math.random()")')) {
              throw new Error("Found Math.random() in " + fullPath + ":" + (i + 1) + ": " + line.trim());
            }
          }
        }
      }
    }
    scanDir("src");
    scanDir("prisma");
    console.log("       Confirmed: 0 active calls to Math.random() across src/ and prisma/");
  });

  // 2. Real data pulled for Greenline Retail LLP (Clean Debtor in DB)
  await test("POST /api/verification (Greenline Retail LLP: 27AAECG1234H1Z5)", async () => {
    const res = await fetch(BASE_URL + "/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectType: "business",
        subjectId: "27AAECG1234H1Z5",
        reportTypes: ["bureau_report", "gst_slab_check", "court_case_history", "mobile_to_pan"],
        forceRefresh: true
      })
    });
    if (!res.ok) throw new Error("HTTP status " + res.status);
    const data = await res.json();
    if (!data.reports || data.reports.length !== 4) throw new Error("Expected 4 reports");

    const bureau = data.reports.find(r => r.reportType === "bureau_report");
    const gstSlab = data.reports.find(r => r.reportType === "gst_slab_check");
    const court = data.reports.find(r => r.reportType === "court_case_history");
    const kyc = data.reports.find(r => r.reportType === "mobile_to_pan");

    if (bureau.data.bureauScore < 750) {
      throw new Error("Expected clean score >= 750, got " + bureau.data.bureauScore);
    }
    if (bureau.data.delinquentAccounts !== 0) {
      throw new Error("Expected 0 delinquent accounts, got " + bureau.data.delinquentAccounts);
    }
    if (court.data.activeCases !== 0) {
      throw new Error("Expected 0 active court cases for clean entity, got " + court.data.activeCases);
    }
    if (!kyc.data.panHolderName.includes("Greenline")) {
      throw new Error("Expected Greenline identity pulled from DB, got " + kyc.data.panHolderName);
    }

    console.log("       Debtor Name: " + kyc.data.panHolderName + " | Score: " + bureau.data.bureauScore + " (" + bureau.data.band + ")");
    console.log("       Active Cases: " + court.data.activeCases + " | GST Slab: " + gstSlab.data.filingConsistency);
  });

  // 3. Real data pulled for Metro Supplies Co (Defaulter in DB)
  await test("POST /api/verification (Metro Supplies Co: GSTRED003 / AAECM9012K)", async () => {
    const res = await fetch(BASE_URL + "/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectType: "business",
        subjectId: "GSTRED003",
        reportTypes: ["bureau_report", "court_case_history", "fir_check", "payment_behaviour"],
        forceRefresh: true
      })
    });
    if (!res.ok) throw new Error("HTTP status " + res.status);
    const data = await res.json();

    const bureau = data.reports.find(r => r.reportType === "bureau_report");
    const court = data.reports.find(r => r.reportType === "court_case_history");
    const fir = data.reports.find(r => r.reportType === "fir_check");
    const payment = data.reports.find(r => r.reportType === "payment_behaviour");

    if (bureau.data.bureauScore > 600) {
      throw new Error("Expected poor bureau score <= 600 for defaulter, got " + bureau.data.bureauScore);
    }
    if (bureau.data.delinquentAccounts === 0) {
      throw new Error("Expected delinquent accounts for defaulter");
    }
    if (court.data.activeCases === 0) {
      throw new Error("Expected court case from community default record");
    }
    if (!fir.data.firRegistered) {
      throw new Error("Expected police FIR record from Sec 138 cheque bounce default in DB");
    }

    console.log("       Defaulter Bureau Score: " + bureau.data.bureauScore + " (" + bureau.data.band + ")");
    console.log("       Court Cases in DB: " + court.data.activeCases + " (" + court.data.cases[0]?.court + ")");
    console.log("       Police FIR: " + fir.data.firDetails?.firNumber + " | Station: " + fir.data.firDetails?.policeStation);
    console.log("       Payment Delay: " + payment.data.avgPaymentDelayDays + " days | Default History: " + payment.data.defaultHistory);
  });

  // 4. Verify CSS Light Mode Overrides File Integrity
  await test("Verify globals.css contains complete light mode visibility and theme overrides", async () => {
    const css = fs.readFileSync("src/app/globals.css", "utf-8");
    if (!css.includes("html.light")) throw new Error("Missing html.light definitions");
    if (!css.includes("html.light .bg-\\[#070A10\\]") && !css.includes("#070A10")) throw new Error("Missing #070A10 override");
    if (!css.includes("html.light .bg-slate-800")) throw new Error("Missing slate-800 light overrides");
    if (!css.includes("html.light .bg-emerald-950")) throw new Error("Missing emerald-950 badge light overrides");
    if (!css.includes("html.light .bg-rose-600")) throw new Error("Missing button text contrast preservation");
    console.log("       Verified: All canvas, surfaces, badges, and button contrast rules active");
  });

  // 5. Test Customer analytics endpoint has real dynamic data from DB
  await test("GET /api/admin/customers (Real customer stats and feature adoption from DB)", async () => {
    const res = await fetch(BASE_URL + "/api/admin/customers");
    if (!res.ok) throw new Error("HTTP status " + res.status);
    const data = await res.json();
    if (!data.summary || typeof data.summary.totalCustomers !== "number") throw new Error("Invalid summary");
    if (!data.featureAdoption || data.featureAdoption.length === 0) throw new Error("Missing featureAdoption");
    if (!data.customers || data.customers.length === 0) throw new Error("Missing customers");
    
    console.log("       Admin Customers: " + data.summary.totalCustomers + " total companies, " + data.summary.healthyCount + " healthy, " + data.summary.atRiskCount + " at-risk");
    console.log("       Feature Adoption: " + data.featureAdoption.map(f => f.module.split(" ")[0] + " (" + f.adoptionRatePct + "%)").join(", "));
  });

  // 6. Test Financials analytics endpoint has real dynamic module shares from DB
  await test("GET /api/admin/financials (Real revenue module breakdown from DB)", async () => {
    const res = await fetch(BASE_URL + "/api/admin/financials");
    if (!res.ok) throw new Error("HTTP status " + res.status);
    const data = await res.json();
    if (!data.moduleRevenue || data.moduleRevenue.length === 0) throw new Error("Missing moduleRevenue");
    const totalPercentage = data.moduleRevenue.reduce((acc, m) => acc + m.sharePct, 0);
    if (Math.round(totalPercentage) !== 100) {
      throw new Error("Module revenue percentage does not equal 100% (got " + totalPercentage + ")");
    }
    console.log("       Module Breakdown: " + data.moduleRevenue.map(m => m.module.split(" ")[0] + " (" + m.sharePct + "%)").join(", "));
  });

  console.log("\n=== All Verification Tests Finished: " + passed + " Passed, " + failed + " Failed ===");
  if (failed > 0) process.exit(1);
}

runTests();
