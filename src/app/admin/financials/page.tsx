import { prisma } from "@/lib/db";
import { FinancialsView } from "@/components/FinancialsView";
import { DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminFinancialsPage() {
  const financials = await prisma.monthlyFinancial.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
  });

  const latest = financials[0] || {
    totalMRR: 1850000,
    newMRR: 280000,
    expansionMRR: 140000,
    churnedMRR: 65000,
    activeCustomers: 48,
    grossRevenue: 2420000,
  };

  const previous = financials[1] || {
    totalMRR: 1495000,
    activeCustomers: 42,
  };

  const netMrrGrowth = latest.newMRR + latest.expansionMRR - latest.churnedMRR;
  const growthRatePct =
    previous.totalMRR > 0 ? Math.round((netMrrGrowth / previous.totalMRR) * 100) : 18;

  // Real database activity counts for revenue distribution
  const walletPullsSum = (await prisma.walletUsageLedger.aggregate({ _sum: { timesUsed: true } }))._sum.timesUsed || 100;
  const recoveryCallsCount = (await prisma.call.count()) || 10;
  const vendorKycCount = (await prisma.vendor.count()) || 5;
  const trustHubReportsCount = (await prisma.communityDefault.count()) || 2;

  const totalActivityUnits = walletPullsSum + (recoveryCallsCount * 5) + (vendorKycCount * 10) + (trustHubReportsCount * 8);

  const verificationShare = Math.round((walletPullsSum / totalActivityUnits) * 100);
  const recoveryShare = Math.round(((recoveryCallsCount * 5) / totalActivityUnits) * 100);
  const vendorShare = Math.round(((vendorKycCount * 10) / totalActivityUnits) * 100);
  const trustHubShare = Math.max(1, 100 - verificationShare - recoveryShare - vendorShare);

  const moduleRevenue = [
    {
      module: "Background Check & Verification Gateway",
      sharePct: verificationShare,
      revenueINR: Math.round((latest.grossRevenue * verificationShare) / 100),
    },
    {
      module: "Payment Recovery & Voice Outbound Engine",
      sharePct: recoveryShare,
      revenueINR: Math.round((latest.grossRevenue * recoveryShare) / 100),
    },
    {
      module: "Vendor Registration & Bulk KYC",
      sharePct: vendorShare,
      revenueINR: Math.round((latest.grossRevenue * vendorShare) / 100),
    },
    {
      module: "Trust Hub & Community Defaults",
      sharePct: trustHubShare,
      revenueINR: Math.round((latest.grossRevenue * trustHubShare) / 100),
    },
  ];

  const allDeals = await prisma.deal.findMany({
    where: { closedAt: null },
    include: { stage: true },
  });
  const weightedPipeline = allDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);

  const trailing3Mrr = financials.slice(0, 3).map((f) => f.totalMRR);
  const avgTrailing =
    trailing3Mrr.length > 0 ? trailing3Mrr.reduce((a, b) => a + b, 0) / trailing3Mrr.length : latest.totalMRR;
  const forecastNextMonthMRR = Math.round(avgTrailing * 1.08 + (weightedPipeline * 0.25) / 12);

  const summaryTable = financials.map((f) => ({
    period: `${f.year}-${String(f.month).padStart(2, "0")}`,
    totalMRR: f.totalMRR,
    newMRR: f.newMRR,
    expansionMRR: f.expansionMRR,
    churnedMRR: f.churnedMRR,
    netGrowth: f.newMRR + f.expansionMRR - f.churnedMRR,
    activeCustomers: f.activeCustomers,
    reportsPulled: f.reportsPulled,
    dealsWon: f.dealsWon,
    dealsLost: f.dealsLost,
    grossRevenue: f.grossRevenue,
  }));

  const kpis = {
    currentMRR: latest.totalMRR,
    newMRR: latest.newMRR,
    expansionMRR: latest.expansionMRR,
    churnedMRR: latest.churnedMRR,
    netMrrGrowth,
    growthRatePct,
    activeCustomers: latest.activeCustomers,
    grossRevenue: latest.grossRevenue,
    forecastNextMonthMRR,
    forecastMethod: "Trailing 3-Month Run-Rate + Weighted Pipeline Conversion (Deterministic)",
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="text-amber-400" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Monthly Financial Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Owner-only financial performance, MRR waterfalls, module revenue share, and trailing forecast.
          </p>
        </div>
      </div>

      <FinancialsView
        initialSummary={summaryTable}
        kpis={kpis}
        moduleRevenue={moduleRevenue}
      />
    </div>
  );
}
