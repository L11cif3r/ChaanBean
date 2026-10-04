import { ALL_ADAPTERS } from "./src/lib/verification-gateway/adapters";
import type { ReportType } from "./src/lib/verification-gateway/types";

const ALL_18_FEATURES: { type: ReportType; subjectId: string; subjectType: "individual" | "business" }[] = [
  { type: "director_details", subjectId: "U72900KA2020PTC123456", subjectType: "business" },
  { type: "msme_report", subjectId: "UDYAM-MH-01-0012345", subjectType: "business" },
  { type: "gst_slab_check", subjectId: "27AAECG1234H1Z5", subjectType: "business" },
  { type: "gst_exact_turnover", subjectId: "27AAECG1234H1Z5", subjectType: "business" },
  { type: "gst_monthly_filings", subjectId: "27AAECG1234H1Z5", subjectType: "business" },
  { type: "gst_supreme_report", subjectId: "AAECG1234H", subjectType: "business" },
  { type: "trust_hub_verification", subjectId: "27AAECG1234H1Z5", subjectType: "business" },
  { type: "mobile_to_pan", subjectId: "9876543210", subjectType: "individual" },
  { type: "mobile_identity", subjectId: "9876543210", subjectType: "individual" },
  { type: "court_case_history", subjectId: "AAECG1234H", subjectType: "business" },
  { type: "import_export_report", subjectId: "0305012345", subjectType: "business" },
  { type: "education_marksheet_check", subjectId: "ROLL-2018-CBSE-8842", subjectType: "individual" },
  { type: "pan_to_gst", subjectId: "AAECG1234H", subjectType: "business" },
  { type: "voice_call_cadence", subjectId: "ACC-RECOVERY-001", subjectType: "business" },
  { type: "legal_notice_suite", subjectId: "ACC-RECOVERY-001", subjectType: "business" },
  { type: "delayed_payment_followup", subjectId: "ACC-RECOVERY-001", subjectType: "business" },
  { type: "subscription_seats", subjectId: "ORG-CHAAN-001", subjectType: "business" },
  { type: "additional_company_addon", subjectId: "NEW-COMPANY-ADDON", subjectType: "business" },
];

async function runAllAdapterTests() {
  console.log("=================================================================");
  console.log("    VERIFYING ALL 18 BUSINESS BACKGROUND CHECK ADAPTERS          ");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  for (const feat of ALL_18_FEATURES) {
    const adapter = ALL_ADAPTERS.find((a) => a.supportedReports.includes(feat.type));
    if (!adapter) {
      console.error(`[FAIL] No adapter found registered for feature: ${feat.type}`);
      failed++;
      continue;
    }

    try {
      const result = await adapter.getReport(
        feat.subjectType,
        feat.subjectId,
        feat.type
      );

      if (result && result.reportType === feat.type && result.data) {
        console.log(`[PASS] ${feat.type.padEnd(28)} => Provider: ${(result.provider || "gateway").padEnd(18)} Status: ${result.status}`);
        passed++;
      } else {
        console.error(`[FAIL] ${feat.type} returned empty or malformed data.`);
        failed++;
      }
    } catch (err: any) {
      console.error(`[FAIL] ${feat.type} threw exception:`, err.message || err);
      failed++;
    }
  }

  // Also test OmniTrace 360 (find_someone) for Payment Recovery
  console.log("\n=================================================================");
  console.log("    VERIFYING OMNITRACE 360 (FIND SOMEONE) RECOVERY DATA        ");
  console.log("=================================================================\n");

  try {
    const kycAdapter = ALL_ADAPTERS.find((a) => a.supportedReports.includes("find_someone"));
    if (!kycAdapter) throw new Error("KYC adapter not found");

    const result = await kycAdapter.getReport(
      "individual",
      "9876543210",
      "find_someone"
    );

    const data = result.data as any;
    const hasAddress = !!data.address;
    const hasBank = !!data.bankPaymentSource?.primaryBank && !!data.bankPaymentSource?.maskedAccountNumber;
    const hasDeliveryNumbers =
      !!data.ecommerceAndAppMobiles?.amazon &&
      !!data.ecommerceAndAppMobiles?.swiggy &&
      !!data.ecommerceAndAppMobiles?.meesho &&
      !!data.ecommerceAndAppMobiles?.zomato &&
      !!data.ecommerceAndAppMobiles?.blinkit &&
      !!data.ecommerceAndAppMobiles?.paytm &&
      !!data.ecommerceAndAppMobiles?.zepto &&
      !!data.ecommerceAndAppMobiles?.whatsapp;
    const hasAlternateNumbers =
      !!data.alternateNumbersFromSources?.gstPortal &&
      !!data.alternateNumbersFromSources?.cibil &&
      !!data.alternateNumbersFromSources?.experian &&
      !!data.alternateNumbersFromSources?.crif;
    const hasCommercialScores =
      !!data.companyFinancialsAndBureaus?.cibil &&
      !!data.companyFinancialsAndBureaus?.experian &&
      !!data.companyFinancialsAndBureaus?.crif;

    if (hasAddress && hasBank && hasDeliveryNumbers && hasAlternateNumbers && hasCommercialScores) {
      console.log(`[PASS] find_someone (OmniTrace 360) validated:`);
      console.log(`       - Address: ${data.address}`);
      console.log(`       - Bank Payment: ${data.bankPaymentSource.primaryBank} (${data.bankPaymentSource.maskedAccountNumber}, IFSC: ${data.bankPaymentSource.ifsc}, UTR: ${data.bankPaymentSource.lastUtrNumber})`);
      console.log(`       - Delivery App Numbers:`);
      console.log(`           Amazon:   ${data.ecommerceAndAppMobiles.amazon}`);
      console.log(`           Swiggy:   ${data.ecommerceAndAppMobiles.swiggy}`);
      console.log(`           Meesho:   ${data.ecommerceAndAppMobiles.meesho}`);
      console.log(`           Zomato:   ${data.ecommerceAndAppMobiles.zomato}`);
      console.log(`           Blinkit:  ${data.ecommerceAndAppMobiles.blinkit}`);
      console.log(`           Paytm:    ${data.ecommerceAndAppMobiles.paytm}`);
      console.log(`           Zepto:    ${data.ecommerceAndAppMobiles.zepto}`);
      console.log(`           WhatsApp: ${data.ecommerceAndAppMobiles.whatsapp}`);
      console.log(`       - Alternate Sources: GST (${data.alternateNumbersFromSources.gstPortal}), CIBIL (${data.alternateNumbersFromSources.cibil}), Experian (${data.alternateNumbersFromSources.experian}), CRIF (${data.alternateNumbersFromSources.crif})`);
      console.log(`       - Tri-Bureau Financials: CIBIL Score ${data.companyFinancialsAndBureaus.cibil.score}, Experian ${data.companyFinancialsAndBureaus.experian.score}, CRIF ${data.companyFinancialsAndBureaus.crif.score}, Est. Turnover: ₹${data.companyFinancialsAndBureaus.annualTurnoverEst.toLocaleString("en-IN")}`);
      passed++;
    } else {
      console.error(`[FAIL] find_someone missing essential OmniTrace fields:`, data);
      failed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] find_someone threw exception:`, err.message || err);
    failed++;
  }

  console.log(`\n=================================================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed.`);
  console.log(`=================================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllAdapterTests();
