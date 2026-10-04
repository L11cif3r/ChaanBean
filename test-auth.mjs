// test-auth.mjs
// Automated verification suite for ChaanBean Client & Admin Auth Portal

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Testing ChaanBean Auth Portal (Client & Admin) ===\n");
  let passed = 0;
  let failed = 0;

  // 1. Test Client Login (Acme Traders)
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login_client",
        email: "trade.ops@acmetraders.in",
        companyName: "Acme Traders Pvt Ltd",
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.type === "client" && data.user) {
      console.log(`[PASS] Client Login: ${data.user.name} (Plan: ${data.user.plan}, Wallet: ₹${data.user.walletBalance.toLocaleString("en-IN")})`);
      passed++;
    } else {
      console.error(`[FAIL] Client Login failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Client Login error:`, err);
    failed++;
  }

  // 2. Test Client Registration (New Enterprise)
  try {
    const testCompany = `Apex Steel & Engineering Ltd ${Date.now().toString(36).toUpperCase()}`;
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_client",
        fullName: "Karan Johar",
        companyName: testCompany,
        email: `ops@apexsteel-${Date.now().toString(36)}.in`,
        phone: "+91 98111 22334",
        pan: "AABCA9988G",
        gstin: "27AABCA9988G1Z5",
        plan: "growth",
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.type === "client" && data.user?.id) {
      console.log(`[PASS] Client Registration: Created ${testCompany}`);
      console.log(`       Wallet: ₹${data.user.walletBalance.toLocaleString("en-IN")} | Trust ID: ${data.user.trustId}`);
      passed++;
    } else {
      console.error(`[FAIL] Client Registration failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Client Registration error:`, err);
    failed++;
  }

  // 3. Test Admin Login (Owner)
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login_admin",
        email: "owner@chaanbean.in",
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.type === "admin" && data.user?.role === "owner") {
      console.log(`[PASS] Admin Login: ${data.user.name} (${data.user.email}, Role: ${data.user.role})`);
      passed++;
    } else {
      console.error(`[FAIL] Admin Login failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Admin Login error:`, err);
    failed++;
  }

  // 4. Test Admin Registration with valid master key
  try {
    const testEmail = `director-${Date.now().toString(36)}@chaanbean.in`;
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_admin",
        name: "Arjun Rampal",
        email: testEmail,
        securityKey: "CHAANBEAN-ROOT-2026",
        role: "owner",
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.type === "admin" && data.user?.email === testEmail) {
      console.log(`[PASS] Admin Registration: Registered ${data.user.name} (${data.user.email}, Role: ${data.user.role})`);
      passed++;
    } else {
      console.error(`[FAIL] Admin Registration failed:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Admin Registration error:`, err);
    failed++;
  }

  // 5. Test Admin Registration with INVALID security key (must reject with 403)
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_admin",
        name: "Malicious Actor",
        email: "hacker@bad.com",
        securityKey: "WRONG_KEY_123",
        role: "owner",
      }),
    });
    const data = await res.json();
    if (res.status === 403 && data.error && data.error.includes("Invalid Admin Master Security Key")) {
      console.log(`[PASS] Security Gate: Invalid security key blocked with 403 Forbidden`);
      passed++;
    } else {
      console.error(`[FAIL] Security Gate should block invalid key:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`[FAIL] Security Gate error:`, err);
    failed++;
  }

  console.log(`\n=== Auth Verification Finished: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
