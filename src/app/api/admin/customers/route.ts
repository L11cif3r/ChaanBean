import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const companies = await prisma.company.findMany({
    include: {
      buyers: {
        include: {
          creditAccounts: true,
          riskFlags: { orderBy: { computedAt: "desc" }, take: 1 },
        },
      },
      vendors: true,
      campaigns: true,
      walletLedger: true,
      trustProfiles: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();

  const customerRows = companies.map((c) => {
    const totalReportsPulled = c.walletLedger.reduce((sum, w) => sum + w.timesUsed, 0);
    const totalDebtors = c.buyers.length;
    const totalVendors = c.vendors.length;
    const activeCampaigns = c.campaigns.filter((cmp) => cmp.status === "active").length;
    const daysSinceSignup = Math.max(1, Math.floor((now - c.signupDate.getTime()) / 86400000));
    const daysSinceActive = Math.max(0, Math.floor((now - c.lastActiveAt.getTime()) / 86400000));

    // Deterministic Explainable Customer Health Score
    let healthScore: "Healthy" | "At-Risk" | "Churned" = "Healthy";
    const healthReasons: string[] = [];

    if (daysSinceActive > 45) {
      healthScore = "Churned";
      healthReasons.push(`Inactive for ${daysSinceActive} days`);
    } else if (daysSinceActive > 20 || c.walletBalance < 15000 || (daysSinceSignup > 14 && totalReportsPulled === 0)) {
      healthScore = "At-Risk";
      if (daysSinceActive > 20) healthReasons.push(`No activity in ${daysSinceActive} days`);
      if (c.walletBalance < 15000) healthReasons.push(`Low wallet balance (₹${c.walletBalance.toLocaleString("en-IN")})`);
      if (totalReportsPulled === 0) healthReasons.push("Zero verification reports pulled since onboarding");
    } else {
      healthScore = "Healthy";
      healthReasons.push("Active verification consumption and healthy credit balance");
    }

    return {
      id: c.id,
      name: c.name,
      plan: c.plan,
      walletBalance: c.walletBalance,
      healthScore,
      healthReasons,
      daysSinceSignup,
      daysSinceActive,
      totalReportsPulled,
      totalDebtors,
      totalVendors,
      activeCampaigns,
      hasTrustProfile: c.trustProfiles.length > 0,
      signupDate: c.signupDate.toISOString(),
      lastActiveAt: c.lastActiveAt.toISOString(),
    };
  });

  // Feature adoption breakdown across modules
  const totalCompaniesCount = companies.length || 1;
  const companiesUsingVerification = companies.filter((c) => c.walletLedger.some((w) => w.timesUsed > 0)).length;
  const companiesUsingRecovery = companies.filter((c) => c.campaigns.length > 0).length;
  const companiesUsingTrustHub = companies.filter((c) => c.trustProfiles.length > 0).length;
  const companiesUsingVendors = companies.filter((c) => c.vendors.length > 0).length;

  const arbitrationCases = await prisma.arbitrationCase.findMany({
    include: { creditAccount: { include: { buyer: true } } },
  });
  const companiesUsingArbitration = new Set(
    arbitrationCases.map((c) => c.creditAccount?.buyer?.companyId).filter(Boolean)
  ).size;

  const featureAdoption = [
    { module: "Verification Gateway & Risk Engine", adoptedCount: companiesUsingVerification, adoptionRatePct: Math.round((companiesUsingVerification / totalCompaniesCount) * 100) },
    { module: "Payment Recovery & Voice Dialing", adoptedCount: companiesUsingRecovery, adoptionRatePct: Math.round((companiesUsingRecovery / totalCompaniesCount) * 100) },
    { module: "Trust Hub & Community Defaults", adoptedCount: companiesUsingTrustHub, adoptionRatePct: Math.round((companiesUsingTrustHub / totalCompaniesCount) * 100) },
    { module: "Vendor Registration & Bulk KYC", adoptedCount: companiesUsingVendors, adoptionRatePct: Math.round((companiesUsingVendors / totalCompaniesCount) * 100) },
    { module: "Arbitration Center", adoptedCount: companiesUsingArbitration, adoptionRatePct: Math.round((companiesUsingArbitration / totalCompaniesCount) * 100) },
  ];

  // Wallet usage breakdown by report type directly from database
  const ledgerGroups = await prisma.walletUsageLedger.groupBy({
    by: ["reportType"],
    _sum: { timesUsed: true },
  });

  const reportUsageBreakdown = ledgerGroups.map((g) => ({
    reportType: g.reportType,
    totalPulls: g._sum.timesUsed || 0,
  })).sort((a, b) => b.totalPulls - a.totalPulls);

  // Real historical financials trend from database
  const historicalFinancials = await prisma.monthlyFinancial.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const customerRetentionHistory = historicalFinancials.map((f) => ({
    period: `${f.year}-${String(f.month).padStart(2, "0")}`,
    activeCustomers: f.activeCustomers,
    reportsPulled: f.reportsPulled,
    dealsWon: f.dealsWon,
  }));

  return NextResponse.json({
    customers: customerRows,
    summary: {
      totalCustomers: companies.length,
      healthyCount: customerRows.filter((c) => c.healthScore === "Healthy").length,
      atRiskCount: customerRows.filter((c) => c.healthScore === "At-Risk").length,
      churnedCount: customerRows.filter((c) => c.healthScore === "Churned").length,
    },
    featureAdoption,
    reportUsageBreakdown,
    customerRetentionHistory,
  });
}
