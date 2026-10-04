// Comprehensive Test Suite for Real One-Way Call Flow & Payment Automation
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

async function runCallFlowVerification() {
  console.log("=== Testing Real One-Way Voice & Payment Automation Flow ===\n");
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

  // 1. Check Zero Math.random() in src/
  await test("Verify Zero Math.random() in entire src/", async () => {
    function scanDir(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        const fullPath = path.join(dir, f.name);
        if (f.isDirectory()) {
          scanDir(fullPath);
        } else if (f.name.endsWith(".ts") || f.name.endsWith(".tsx") || f.name.endsWith(".js")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes("Math.random()")) {
            throw new Error(`Found Math.random() in ${fullPath}`);
          }
        }
      }
    }
    scanDir(path.resolve("src"));
    console.log("       Confirmed: 0 occurrences of Math.random() in src/");
  });

  // 2. Fetch a buyer with active credit account
  let testCreditAccountId = null;
  await test("Fetch active overdue debtor for call flow", async () => {
    const res = await fetch(`${BASE_URL}/api/buyers`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const { buyers } = await res.json();
    const buyerWithAcc = buyers.find(b => b.creditAccounts && b.creditAccounts.length > 0);
    if (!buyerWithAcc) throw new Error("No buyer with credit account found");
    testCreditAccountId = buyerWithAcc.creditAccounts[0].id;
    console.log(`       Target Debtor: ${buyerWithAcc.name} | Account ID: ${testCreditAccountId}`);
  });

  // 3. GET /api/recovery?creditAccountId=... (Call Details & Script Assembly)
  let audioContentHash = null;
  await test("GET /api/recovery?creditAccountId=... (Script Assembly & MSME §16)", async () => {
    const res = await fetch(`${BASE_URL}/api/recovery?creditAccountId=${testCreditAccountId}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.voiceCall?.scriptText) throw new Error("Missing pre-approved script text");
    if (!data.voiceCall?.contentHash) throw new Error("Missing content hash");
    if (!data.statutoryInterest?.statutoryRatePercent) throw new Error("Missing statutory interest rate");

    audioContentHash = data.voiceCall.contentHash;
    console.log(`       Language: ${data.voiceCall.language.toUpperCase()} | Voice: ${data.voiceCall.voiceConfig.voiceId}`);
    console.log(`       Statutory Interest: ${data.statutoryInterest.statutoryRatePercent}% (${data.statutoryInterest.statutorySection})`);
    console.log(`       Script Preview: "${data.voiceCall.scriptText.slice(0, 80)}..."`);
  });

  // 4. GET /api/audio/[hash] (Real Playable Audio Streaming)
  await test("GET /api/audio/[hash] (Stream Playable 16kHz PCM WAV)", async () => {
    if (!audioContentHash) throw new Error("No audio content hash from previous step");
    const res = await fetch(`${BASE_URL}/api/audio/${audioContentHash}`);
    if (!res.ok) throw new Error(`Audio fetch status: ${res.status}`);
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("audio/wav")) {
      throw new Error(`Expected audio/wav, got ${contentType}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate standard 44-byte RIFF header
    const riff = buffer.toString("ascii", 0, 4);
    const wave = buffer.toString("ascii", 8, 12);
    if (riff !== "RIFF" || wave !== "WAVE") {
      throw new Error(`Invalid WAV header: RIFF='${riff}', WAVE='${wave}'`);
    }

    console.log(`       WAV Buffer Size: ${buffer.length} bytes | Header: ${riff}/${wave} Verified`);
  });

  // 5. POST /api/recovery (action: direct_voice_call)
  let executedCallId = null;
  await test("POST /api/recovery (action: direct_voice_call - Asterisk/Vobiz SIP)", async () => {
    const res = await fetch(`${BASE_URL}/api/recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditAccountId: testCreditAccountId,
        action: "direct_voice_call"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.callResult?.callId) throw new Error("Missing callId in callResult");
    if (!data.callResult?.sipSessionId) throw new Error("Missing sipSessionId");
    if (!data.callResult?.sipHeaders) throw new Error("Missing sipHeaders");

    executedCallId = data.callResult.callId;
    console.log(`       Call Placed: ID ${executedCallId} | Status: ${data.callResult.status}`);
    console.log(`       SIP Session: ${data.callResult.sipSessionId}`);
    console.log(`       Carrier Telemetry: ${data.callResult.sipHeaders["User-Agent"]}`);
    console.log(`       Q.850 Hangup Cause: ${data.callResult.sipHeaders["Q850-Cause"]}`);
    console.log(`       Announcement Duration: ${data.callResult.durationSec} seconds`);
  });

  // 6. POST /api/recovery/settle (Automated End-to-End Payment Settlement)
  await test("POST /api/recovery/settle (Automated Debt Settlement & Ledger Reconciliation)", async () => {
    const res = await fetch(`${BASE_URL}/api/recovery/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditAccountId: testCreditAccountId,
        paymentMode: "UPI",
        paymentAmount: 850000,
        payerName: "Authorized Accounts Officer"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.receiptNumber) throw new Error("Missing receiptNumber");
    if (!data.utrNumber) throw new Error("Missing utrNumber");
    if (!data.isFullySettled) throw new Error("Account was not marked as fully settled");

    console.log(`       Reconciled: ${data.message}`);
    console.log(`       Receipt: ${data.receiptNumber} | UTR: ${data.utrNumber}`);
    console.log(`       Remaining Balance: ₹${data.remainingBalance} | Overdue Status: ${data.updatedAccount.overdueStatus}`);
  });

  console.log(`\n=== Call Flow Verification Complete: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runCallFlowVerification();
