// test-business-check.mjs
// Automated verification suite for ChaanBean Financial Intelligence & Verification

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Testing ChaanBean Financial Intelligence & Verification APIs ===\n");
  let passed = 0;
  let failed = 0;

  let testBusinessId = null;

  // 1. Test GET /api/businesses (Listing seeded businesses)
  try {
    const res = await fetch(`${BASE_URL}/api/businesses`);
    const data = await res.json();
    if (res.ok && Array.isArray(data.businesses) && data.businesses.length >= 5) {
      console.log(`[PASS] GET /api/businesses returned ${data.businesses.length} businesses.`);
      const abc = data.businesses.find(b => b.companyName === "ABC Engineering Pvt Ltd");
      const southline = data.businesses.find(b => b.companyName === "Southline Distributors");
      if (abc && abc.riskFlag?.flag === "GREEN" && southline && southline.riskFlag?.flag === "RED") {
        console.log(`       Verified flags: ABC Engineering is GREEN (${abc.riskFlag.compositeScore}/100), Southline is RED (${southline.riskFlag.compositeScore}/100)`);
        testBusinessId = abc.id;
        passed++;
      } else {
        console.error(`[FAIL] Flag verification failed on seeded businesses:`, { abc, southline });
        failed++;
      }
    } else {
      console.error(`[FAIL] GET /api/businesses failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] GET /api/businesses error:`, err);
    failed++;
  }

  // 2. Test GET /api/businesses/:id (Detailed 12-section profile)
  if (testBusinessId) {
    try {
      const res = await fetch(`${BASE_URL}/api/businesses/${testBusinessId}`);
      const data = await res.json();
      const b = data.business;
      if (
        res.ok &&
        b &&
        b.companyName === "ABC Engineering Pvt Ltd" &&
        b.yearSummaries?.length === 4 &&
        b.riskSignals?.length === 12 &&
        b.creditRec?.creditLimit > 0
      ) {
        console.log(`[PASS] GET /api/businesses/:id returned full 12-section entity.`);
        console.log(`       Years: ${b.yearSummaries.length} | Signals: ${b.riskSignals.length} | Limit: ₹${(b.creditRec.creditLimit/100000).toFixed(1)}L`);
        passed++;
      } else {
        console.error(`[FAIL] Full profile structure missing expected properties:`, data);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] GET /api/businesses/:id error:`, err);
      failed++;
    }
  }

  // 3. Test Search API
  try {
    const res = await fetch(`${BASE_URL}/api/businesses/search?q=Malabar`);
    const data = await res.json();
    if (res.ok && Array.isArray(data.businesses) && data.businesses.some(b => b.companyName.includes("Malabar"))) {
      console.log(`[PASS] GET /api/businesses/search found target business by keyword.`);
      passed++;
    } else {
      console.error(`[FAIL] Search API failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Search API error:`, err);
    failed++;
  }

  // 4. Test Comparison API (POST /api/businesses/compare)
  try {
    const listRes = await fetch(`${BASE_URL}/api/businesses`);
    const listData = await listRes.json();
    const ids = (listData.businesses || []).slice(0, 3).map(b => b.id);
    if (ids.length >= 2) {
      const compRes = await fetch(`${BASE_URL}/api/businesses/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessIds: ids }),
      });
      const compData = await compRes.json();
      if (compRes.ok && Array.isArray(compData.businesses) && compData.businesses.length === ids.length) {
        console.log(`[PASS] POST /api/businesses/compare returned matrix for ${compData.businesses.length} businesses.`);
        passed++;
      } else {
        console.error(`[FAIL] Compare API response invalid:`, compData);
        failed++;
      }
    }
  } catch (err) {
    console.error(`[FAIL] Compare API error:`, err);
    failed++;
  }

  // 5. Test Creation of a New Business (POST /api/businesses)
  let createdNewId = null;
  try {
    const newBizName = `Test Industrial Ltd ${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/businesses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: newBizName,
        gstin: "27AABCT9999P1Z3",
        cin: "U74999MH2022PTC998877",
        pan: "AABCT9999P",
        phone: "+91 98200 11223"
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.business?.id) {
      createdNewId = data.business.id;
      console.log(`[PASS] POST /api/businesses successfully created new profile: ${createdNewId}`);
      passed++;
    } else {
      console.error(`[FAIL] Business creation failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Business creation error:`, err);
    failed++;
  }

  // 6. Test Manual Verification Submission (POST /api/businesses/:id/manual-verify)
  if (createdNewId) {
    try {
      const res = await fetch(`${BASE_URL}/api/businesses/${createdNewId}/manual-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MCA",
          payload: {
            cin: "U74999MH2022PTC998877",
            companyName: "Test Industrial Ltd",
            status: "Active",
            directors: [{ din: "08912345", name: "Ramesh Sharma", designation: "Director" }]
          }
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        console.log(`[PASS] POST /api/businesses/:id/manual-verify recorded MCA entry.`);
        passed++;
      } else {
        console.error(`[FAIL] Manual verify failed:`, data);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] Manual verify error:`, err);
      failed++;
    }
  }

  // 7. Test Hard Red Flag Overrides Check on Southline Distributors
  try {
    const res = await fetch(`${BASE_URL}/api/businesses`);
    const data = await res.json();
    const southline = (data.businesses || []).find(b => b.companyName === "Southline Distributors");
    if (southline) {
      const detailRes = await fetch(`${BASE_URL}/api/businesses/${southline.id}`);
      const detailData = await detailRes.json();
      const flag = detailData.business?.riskFlag;
      const credit = detailData.business?.creditRec;
      if (flag?.flag === "RED" && credit?.isBlocked === true && credit?.creditLimit === 0) {
        console.log(`[PASS] Hard Red Flag properly enforced: Credit BLOCKED for Southline Distributors.`);
        passed++;
      } else {
        console.error(`[FAIL] Expected Southline Distributors to have BLOCKED credit:`, { flag, credit });
        failed++;
      }
    }
  } catch (err) {
    console.error(`[FAIL] Hard Red Flag test error:`, err);
    failed++;
  }

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
