import { prisma } from "@/lib/db";
import { Users2, ShieldCheck, AlertTriangle, Activity, Calendar, Wallet, CheckCircle2 } from "lucide-react";
import { SummaryCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
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

    // Explainable health score
    let healthScore: "Healthy" | "At-Risk" | "Churned" = "Healthy";
    const healthReasons: string[] = [];

    if (daysSinceActive > 45) {
      healthScore = "Churned";
      healthReasons.push(`Inactive for ${daysSinceActive} days`);
    } else if (daysSinceActive > 20 || c.walletBalance < 15000 || (daysSinceSignup > 14 && totalReportsPulled === 0)) {
      healthScore = "At-Risk";
      if (daysSinceActive > 20) healthReasons.push(`No login in ${daysSinceActive}d`);
      if (c.walletBalance < 15000) healthReasons.push(`Low balance (₹${c.walletBalance.toLocaleString("en-IN")})`);
      if (totalReportsPulled === 0) healthReasons.push("Zero verification reports pulled");
    } else {
      healthScore = "Healthy";
      healthReasons.push("Active report pulls & healthy wallet");
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
      signupDate: c.signupDate,
      lastActiveAt: c.lastActiveAt,
    };
  });

  const healthyCount = customerRows.filter((c) => c.healthScore === "Healthy").length;
  const atRiskCount = customerRows.filter((c) => c.healthScore === "At-Risk").length;
  const churnedCount = customerRows.filter((c) => c.healthScore === "Churned").length;

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
    { module: "Verification Gateway & Risk Flags", adoptedCount: companiesUsingVerification, rate: Math.round((companiesUsingVerification / totalCompaniesCount) * 100) },
    { module: "Payment Recovery & Outbound Voice", adoptedCount: companiesUsingRecovery, rate: Math.round((companiesUsingRecovery / totalCompaniesCount) * 100) },
    { module: "Trust Hub & Community Defaults", adoptedCount: companiesUsingTrustHub, rate: Math.round((companiesUsingTrustHub / totalCompaniesCount) * 100) },
    { module: "Vendor Registration & Bulk KYC", adoptedCount: companiesUsingVendors, rate: Math.round((companiesUsingVendors / totalCompaniesCount) * 100) },
    { module: "Arbitration Dispute Resolution", adoptedCount: companiesUsingArbitration, rate: Math.round((companiesUsingArbitration / totalCompaniesCount) * 100) },
  ];

  // Real Verification Report Consumption from database
  const ledgerGroups = await prisma.walletUsageLedger.groupBy({
    by: ["reportType"],
    _sum: { timesUsed: true },
  });

  const reportUsageBreakdown = ledgerGroups
    .map((g) => ({
      reportType: g.reportType,
      totalPulls: g._sum.timesUsed || 0,
    }))
    .sort((a, b) => b.totalPulls - a.totalPulls);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="text-amber-400" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Customer Engagement Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Activation velocity, feature adoption, explainable customer health scores, and cohort retention.
          </p>
        </div>
      </div>

      {/* Top Health Counters */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono text-emerald-400 font-bold">Healthy Accounts</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold font-mono text-white">{healthyCount}</p>
          <p className="mt-1 text-xs text-slate-400">Consistent verification & wallet consumption</p>
        </div>

        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono text-amber-400 font-bold">At-Risk Accounts</span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-bold font-mono text-white">{atRiskCount}</p>
          <p className="mt-1 text-xs text-slate-400">Low wallet balance or activity decline &gt; 20 days</p>
        </div>

        <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono text-rose-400 font-bold">Churned Accounts</span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          </div>
          <p className="mt-2 text-3xl font-bold font-mono text-white">{churnedCount}</p>
          <p className="mt-1 text-xs text-slate-400">Zero activity &gt; 45 days</p>
        </div>
      </div>

      {/* Customer Engagement & Health Score Table */}
      <section className="rounded-xl border border-slate-800 bg-[#0B0F17] p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Active Customer Companies & Health Scoring</h2>
          <span className="text-xs font-mono text-slate-400">{companies.length} Total Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Company Name</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Wallet Balance</th>
                <th className="px-4 py-3 text-left">Verification Pulls</th>
                <th className="px-4 py-3 text-left">Monitored Debtors</th>
                <th className="px-4 py-3 text-left">Health Score</th>
                <th className="px-4 py-3 text-left">Health Rationale</th>
                <th className="px-4 py-3 text-left">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customerRows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-semibold text-slate-200">{c.name}</td>
                  <td className="px-4 py-3 font-mono uppercase text-sky-400">{c.plan}</td>
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    ₹{c.walletBalance.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{c.totalReportsPulled}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{c.totalDebtors}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2.5 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                        c.healthScore === "Healthy"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : c.healthScore === "At-Risk"
                            ? "bg-amber-950 text-amber-400 border-amber-800"
                            : "bg-rose-950 text-rose-400 border-rose-800"
                      }`}
                    >
                      {c.healthScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px] max-w-xs truncate">
                    {c.healthReasons.join(" · ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {c.daysSinceActive === 0 ? "Today" : `${c.daysSinceActive}d ago`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grid: Module Adoption & Cohort Retention */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Module Adoption */}
        <section className="rounded-xl border border-slate-800 bg-[#0B0F17] p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Feature Adoption Breakdown</h2>
            <span className="text-xs font-mono text-slate-400">Core Modules</span>
          </div>

          <div className="space-y-3">
            {featureAdoption.map((f, i) => (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium text-slate-300">
                  <span>{f.module}</span>
                  <span className="font-mono text-amber-400">{f.rate}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${f.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Verification Report Consumption Ledger */}
        <section className="rounded-xl border border-slate-800 bg-[#0B0F17] p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Verification Reports Consumed</h2>
            <span className="text-xs font-mono text-emerald-400">
              {reportUsageBreakdown.reduce((sum, r) => sum + r.totalPulls, 0)} Total Pulls Executed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs font-mono">
              <thead className="bg-slate-900/80 uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Report Type</th>
                  <th className="px-3 py-2 text-right">Pulls Executed</th>
                  <th className="px-3 py-2 text-right">Consumption Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {reportUsageBreakdown.map((r, i) => {
                  const total = reportUsageBreakdown.reduce((s, x) => s + x.totalPulls, 0) || 1;
                  const pct = Math.round((r.totalPulls / total) * 100);
                  return (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-bold text-slate-200">{r.reportType}</td>
                      <td className="px-3 py-2 text-right text-emerald-400 font-bold">{r.totalPulls}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
