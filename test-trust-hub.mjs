// test-trust-hub.mjs
// Automated verification suite for ChaanBean Trust Hub

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Testing ChaanBean Trust Hub Logic & APIs ===\n");
  let passed = 0;
  let failed = 0;

  // 1. Test Existing Trust Profile Lookup (TRUST-CB-ACME-001)
  try {
    const res = await fetch(`${BASE_URL}/api/trust-hub/verify?trustId=TRUST-CB-ACME-001`);
    const data = await res.json();
    if (res.ok && data.found && data.trustId === "TRUST-CB-ACME-001" && data.trustScore >= 80) {
      console.log(`[PASS] Verified TrustProfile lookup (TRUST-CB-ACME-001)`);
      console.log(`       Entity: ${data.entityName} | Score: ${data.trustScore} (${data.scoreTier})`);
      console.log(`       Checkpoints: ${data.checkpoints.length} verified | SHA-256 Seal: ${data.certificateHash.slice(0, 16)}...`);
      passed++;
    } else {
      console.error(`[FAIL] TrustProfile lookup failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] TrustProfile lookup error:`, err);
    failed++;
  }

  // 2. Test Vendor Trust ID Lookup (VTID-1000)
  try {
    const res = await fetch(`${BASE_URL}/api/trust-hub/verify?trustId=VTID-1000`);
    const data = await res.json();
    if (res.ok && data.found && data.trustId === "VTID-1000") {
      console.log(`[PASS] Verified Vendor Trust ID lookup (VTID-1000)`);
      console.log(`       Vendor: ${data.entityName} | GSTIN: ${data.gstin} | Score: ${data.trustScore}`);
      passed++;
    } else {
      console.error(`[FAIL] Vendor Trust ID lookup failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Vendor Trust ID lookup error:`, err);
    failed++;
  }

  // 3. Test Unknown Trust ID returns 404 with suggestions
  try {
    const res = await fetch(`${BASE_URL}/api/trust-hub/verify?trustId=UNKNOWN-9999`);
    const data = await res.json();
    if (res.status === 404 && !data.found && data.suggestedIds) {
      console.log(`[PASS] Unknown Trust ID returns structured 404 with test suggestions`);
      passed++;
    } else {
      console.error(`[FAIL] Unknown Trust ID should return 404:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Unknown Trust ID error:`, err);
    failed++;
  }

  // 4. Test Minting / Registering a New Trust ID
  let mintedId = null;
  try {
    const payload = {
      businessType: "company",
      companyName: "Zenith Industrial Automations Ltd",
      pan: "AABCZ9988F",
      gstin: "27AABCZ9988F1Z2",
      cin: "U29200MH2025PTC384721",
      phone: "+91 98200 11223",
      authorizedSignatory: "Vikram Malhotra",
    };

    const res = await fetch(`${BASE_URL}/api/trust-hub/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok && data.success && data.trustId) {
      mintedId = data.trustId;
      console.log(`[PASS] Minted new Trust ID via 3-step KYC verification`);
      console.log(`       Trust ID: ${mintedId} | Fee: ₹${data.profile.verificationFee} | Pan: ${data.profile.pan}`);
      console.log(`       Badges: ${data.profile.badges.join(", ")}`);
      passed++;
    } else {
      console.error(`[FAIL] Register Trust ID failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Register Trust ID error:`, err);
    failed++;
  }

  // 5. Test Newly Minted Trust ID Lookup
  if (mintedId) {
    try {
      const res = await fetch(`${BASE_URL}/api/trust-hub/verify?trustId=${mintedId}`);
      const data = await res.json();
      if (res.ok && data.found && data.trustId === mintedId) {
        console.log(`[PASS] Live query on newly minted Trust ID (${mintedId})`);
        console.log(`       Entity: ${data.entityName} | KYC Status: ${data.kycStatus}`);
        passed++;
      } else {
        console.error(`[FAIL] Verify newly minted Trust ID failed:`, data);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] Verify newly minted Trust ID error:`, err);
      failed++;
    }
  }

  // 6. Test Default Registry Guard: Entity with adverse default is blocked from Trust ID certification
  try {
    // Metro Supplies Co has GSTIN GSTRED003 and adverse default in DB
    const payload = {
      businessType: "company",
      companyName: "Metro Supplies Co",
      pan: "AAECM9012K",
      gstin: "GSTRED003",
      phone: "+91 99999 88888",
    };

    const res = await fetch(`${BASE_URL}/api/trust-hub/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.status === 409 && data.error && data.error.includes("active peer commercial default")) {
      console.log(`[PASS] Default Registry Gate: Entity with active peer default blocked with 409 Conflict`);
      console.log(`       Gate Message: "${data.error}"`);
      passed++;
    } else {
      console.error(`[FAIL] Default Registry Gate should block defaulter:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Default Registry Gate error:`, err);
    failed++;
  }

  console.log(`\n=== Trust Hub Verification Finished: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
