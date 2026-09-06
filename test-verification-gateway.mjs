const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Testing Verification Gateway API & Adapters ===");
  let passed = 0;
  let failed = 0;

  // 1. Test single report query for GST Exact Turnover
  try {
    const res = await fetch(`${BASE_URL}/api/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectType: "business",
        subjectId: "27AAECG1234H1Z5",
        reportTypes: ["gst_exact_turnover"],
      }),
    });
    const data = await res.json();
    if (res.ok && data.reports?.length > 0 && data.reports[0].data?.annualTurnover) {
      console.log(`[PASS] GST Exact Turnover returned ${data.reports[0].data.annualTurnover.length} years of turnover data.`);
      passed++;
    } else {
      console.error(`[FAIL] GST Exact Turnover query failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] GST Exact Turnover error:`, err);
    failed++;
  }

  // 2. Test Commercial Bureau Report with multi-tier band
  try {
    const res = await fetch(`${BASE_URL}/api/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectType: "business",
        subjectId: "AAECG1234H",
        reportTypes: ["bureau_report"],
      }),
    });
    const data = await res.json();
    if (res.ok && data.reports?.length > 0 && typeof data.reports[0].data?.bureauScore === "number") {
      console.log(`[PASS] Bureau Report returned Score: ${data.reports[0].data.bureauScore}/900 (${data.reports[0].data.band}).`);
      passed++;
    } else {
      console.error(`[FAIL] Bureau query failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Bureau error:`, err);
    failed++;
  }

  // 3. Test e-Courts Case History query
  try {
    const res = await fetch(`${BASE_URL}/api/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectType: "business",
        subjectId: "27AAECG1234H1Z5",
        reportTypes: ["court_case_history"],
      }),
    });
    const data = await res.json();
    if (res.ok && data.reports?.length > 0 && Array.isArray(data.reports[0].data?.cases)) {
      console.log(`[PASS] Court Case History returned ${data.reports[0].data.cases.length} litigation records.`);
      passed++;
    } else {
      console.error(`[FAIL] Court Case History failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Court Case History error:`, err);
    failed++;
  }

  // 4. Test GST Supreme OTP initiate & verify flow
  try {
    const initRes = await fetch(`${BASE_URL}/api/verification/otp-initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gstin: "27AAECG1234H1Z5", mobile: "9876543210" }),
    });
    const initData = await initRes.json();
    if (initRes.ok && initData.sessionId) {
      console.log(`[PASS] GST Supreme OTP initiated with Session: ${initData.sessionId}`);
      passed++;

      const verifyRes = await fetch(`${BASE_URL}/api/verification/otp-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: initData.sessionId,
          otp: "482910",
          subjectId: "27AAECG1234H1Z5",
          subjectType: "business",
        }),
      });
      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.data?.counterpartyPans) {
        console.log(`[PASS] GST Supreme OTP verified, unlocked ${verifyData.data.counterpartyPans.length} counterparty PANs.`);
        passed++;
      } else {
        console.error(`[FAIL] GST Supreme OTP verify failed:`, verifyData);
        failed++;
      }
    } else {
      console.error(`[FAIL] GST Supreme OTP initiate failed:`, initData);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] GST Supreme flow error:`, err);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
