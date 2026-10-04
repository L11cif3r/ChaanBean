import { computeRiskScore } from "./src/lib/risk-scoring/engine";
import { getFeaturePrice, updateFeaturePrice, resetFeaturePrice } from "./src/lib/pricing/pricing-engine";
import type { NormalizedReport } from "./src/lib/verification-gateway/types";

async function main() {
  console.log("Testing Risk Scoring Signal Sanitization...");
  const mockReports: any[] = [
    {
      reportType: "gst_exact_turnover",
      status: "completed",
      data: { turnoverTrend: "growing" },
      provider: "GSTN",
      fetchedAt: new Date().toISOString()
    },
    {
      reportType: "gst_monthly_filings",
      status: "completed",
      data: { filedOnTimeRatio: 0.95 },
      provider: "GSTN",
      fetchedAt: new Date().toISOString()
    },
    {
      reportType: "crif_commercial_report",
      status: "completed",
      data: { score: 750 },
      provider: "CRIF",
      fetchedAt: new Date().toISOString()
    },
    {
      reportType: "court_case_history",
      status: "completed",
      data: { caseCount: 0, insolvencyCount: 0 },
      provider: "e-Courts",
      fetchedAt: new Date().toISOString()
    },
    {
      reportType: "director_details",
      status: "completed",
      data: { verified: true },
      provider: "MCA21",
      fetchedAt: new Date().toISOString()
    },
    {
      reportType: "msme_report",
      status: "completed",
      data: { incorporatedYears: 6 },
      provider: "Udyam",
      fetchedAt: new Date().toISOString()
    }
  ];

  const riskResult = computeRiskScore(mockReports);

  console.log("Overall Score:", riskResult.compositeScore, "Flag:", riskResult.flag);
  let totalWeight = 0;
  for (const sig of riskResult.signals) {
    console.log("Signal:", sig.signal, "| Source:", sig.source, "| Weight:", sig.weight);
    totalWeight += sig.weight;
    if (sig.signal.toLowerCase().includes("trust hub") || sig.source.toLowerCase().includes("trust hub")) {
      throw new Error("VIOLATION: Trust Hub detected in signals!");
    }
    if (sig.signal.toLowerCase().includes("gst supreme") || sig.source.toLowerCase().includes("gst supreme")) {
      throw new Error("VIOLATION: GST Supreme Report detected in signals!");
    }
  }
  console.log("Total Weight Sum:", totalWeight);
  if (totalWeight !== 100) {
    throw new Error("Signal weights must sum to 100!");
  }
  console.log("[PASS] Risk Engine contains NO Trust Hub and NO GST Supreme Report!");

  console.log("\nTesting Dynamic Pricing Engine...");
  const initialAddon = getFeaturePrice("additional_company");
  console.log("Initial additional_company price: " + initialAddon);
  
  updateFeaturePrice("additional_company", 2500);
  const updatedAddon = getFeaturePrice("additional_company");
  console.log("Updated additional_company price: " + updatedAddon);
  if (updatedAddon !== 2500) {
    throw new Error("Failed to update price dynamically!");
  }

  resetFeaturePrice("additional_company");
  const synced = getFeaturePrice("additional_company");
  console.log("Reset additional_company price: " + synced);
  if (synced !== 1500) {
    throw new Error("Failed to reset price to default 1500!");
  }
  console.log("[PASS] Dynamic Pricing Engine verified successfully!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
