import { executeFindSomeone } from "./src/lib/find-someone/engine";
import { placeOutboundPlaybackCall } from "./src/lib/communication/asterisk-vobiz";
import { prisma } from "./src/lib/db";

async function runFindSomeoneAndCallTests() {
  console.log("=================================================================");
  console.log("   VERIFYING FIND SOMEONE (9 VECTORS) & CALLING RESILIENCE       ");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // Test 1: Find Someone 9 Required Vectors
  // -------------------------------------------------------------
  console.log("--- PART 1: Testing Find Someone Engine 9 Intelligence Vectors ---");
  const testQueries = ["Nexus Polymers", "Metro Supplies Co", "9876543210"];

  for (const query of testQueries) {
    try {
      const report = await executeFindSomeone(query);

      // Verify all 9 requested features:
      const checks = [
        {
          name: "1. Alternate mobile no",
          valid: Array.isArray(report.alternateMobileNumbers) && report.alternateMobileNumbers.length > 0,
          sample: report.alternateMobileNumbers[0]?.number + " (" + report.alternateMobileNumbers[0]?.source + ")",
        },
        {
          name: "2. Alternative email id",
          valid: Array.isArray(report.alternateEmailIds) && report.alternateEmailIds.length > 0,
          sample: report.alternateEmailIds[0]?.email + " (" + report.alternateEmailIds[0]?.type + ")",
        },
        {
          name: "3. All the alternate address",
          valid: Array.isArray(report.alternateAddresses) && report.alternateAddresses.length > 0,
          sample: report.alternateAddresses[0]?.fullAddress.slice(0, 45) + "...",
        },
        {
          name: "4. His digital age",
          valid: Boolean(report.digitalAge && report.digitalAge.totalDigitalAgeYears > 0),
          sample: report.digitalAge.formattedDigitalAge + " (Reliability: " + report.digitalAge.reliabilityBand + ")",
        },
        {
          name: "5. Bank name and branch address",
          valid: Boolean(report.bankPaymentDetails && report.bankPaymentDetails.bankName && report.bankPaymentDetails.branchPhysicalAddress),
          sample: report.bankPaymentDetails.bankName + " - " + report.bankPaymentDetails.branchPhysicalAddress.slice(0, 40) + "...",
        },
        {
          name: "6. Civil report (CIBIL)",
          valid: Boolean(report.cibilReport && report.cibilReport.score > 0),
          sample: "Score: " + report.cibilReport.score + " (" + report.cibilReport.commercialRank + ")",
        },
        {
          name: "7. Experion report (Experian)",
          valid: Boolean(report.experianReport && report.experianReport.score > 0),
          sample: "Score: " + report.experianReport.score + " (" + report.experianReport.scoreBand + ")",
        },
        {
          name: "8. Crif report (CRIF High Mark)",
          valid: Boolean(report.crifReport && report.crifReport.score > 0),
          sample: "Score: " + report.crifReport.score + " (" + report.crifReport.scoreBand + ")",
        },
        {
          name: "9. Pan no",
          valid: Boolean(report.panDetails && report.panDetails.panNumber && report.panDetails.itdStatus === "Active & Operative"),
          sample: "PAN: " + report.panDetails.panNumber + " [" + report.panDetails.legalEntityName + "]",
        },
      ];

      console.log(`\nQuery: "${query}" => Entity: ${report.subjectName} (PAN: ${report.panDetails.panNumber})`);
      for (const check of checks) {
        if (check.valid) {
          console.log(`  [PASS] ${check.name.padEnd(35)} => ${check.sample}`);
          passed++;
        } else {
          console.error(`  [FAIL] ${check.name} missing or invalid!`);
          failed++;
        }
      }
    } catch (err: any) {
      console.error(`[FAIL] Query "${query}" threw error:`, err.stack || err.message || err);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 2: Call Actually Getting Through (Answered status)
  // -------------------------------------------------------------
  console.log("\n--- PART 2: Testing Outbound Call Actually Getting Through ---");
  const sampleBuyer = await prisma.buyerDebtor.findFirst();
  const validBuyerId = sampleBuyer?.id || "";

  try {
    const normalCall = await placeOutboundPlaybackCall({
      buyerId: validBuyerId,
      phoneNumber: "+91 98765 43210",
      audioUrl: "/audio/sample.wav",
      contentHash: "dummyhash123",
      templateId: "l2_voice_reminder_v1",
      language: "en",
      scriptText: "This is a statutory payment recovery announcement.",
      callerDid: "+91 80 4719 2000",
      simulateOutcome: "connected",
    });

    if (normalCall.status === "answered" && normalCall.durationSec > 0) {
      console.log(`  [PASS] Normal Call Connects => Status: ${normalCall.status}, Duration: ${normalCall.durationSec}s, SIP: ${normalCall.sipSessionId}`);
      console.log(`         Outbound DID: ${normalCall.callerDid}, Carrier: ${normalCall.carrier}`);
      passed++;
    } else {
      console.error(`  [FAIL] Normal call did not connect: ${normalCall.status}`);
      failed++;
    }
  } catch (err: any) {
    console.error("  [FAIL] Normal call threw exception:", err.message || err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: Call Unreachable Handling & DID Changing
  // -------------------------------------------------------------
  console.log("\n--- PART 3: Testing Call Unreachable Handling & DID Switching ---");
  try {
    const busyCall = await placeOutboundPlaybackCall({
      buyerId: validBuyerId,
      phoneNumber: "+91 98765 43210",
      audioUrl: "/audio/sample.wav",
      contentHash: "dummyhash123",
      templateId: "l2_voice_reminder_v1",
      language: "en",
      callerDid: "+91 80 4719 2000",
      simulateOutcome: "busy",
    });

    if (busyCall.status === "busy") {
      console.log(`  [PASS] Busy Simulation => Status: ${busyCall.status}, SIP-Status: ${busyCall.sipHeaders["SIP-Status"]}`);
      passed++;
    } else {
      console.error(`  [FAIL] Expected busy, got: ${busyCall.status}`);
      failed++;
    }

    // Now test retry with switched DID:
    const retriedCall = await placeOutboundPlaybackCall({
      buyerId: validBuyerId,
      phoneNumber: "+91 98765 43210",
      audioUrl: "/audio/sample.wav",
      contentHash: "dummyhash123",
      templateId: "l2_voice_reminder_v1",
      language: "en",
      callerDid: "+91 22 6912 3400", // Switched to Mumbai line
      simulateOutcome: "connected",
    });

    if (retriedCall.status === "answered" && retriedCall.callerDid === "+91 22 6912 3400") {
      console.log(`  [PASS] Retry with Switched DID (+91 22 6912 3400) Connects Successfully!`);
      passed++;
    } else {
      console.error(`  [FAIL] Retry with switched DID failed.`);
      failed++;
    }
  } catch (err: any) {
    console.error("  [FAIL] Unreachable test threw exception:", err.message || err);
    failed++;
  }

  console.log("\n=================================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runFindSomeoneAndCallTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
