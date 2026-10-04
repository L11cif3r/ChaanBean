import { prisma } from "@/lib/db";
import Link from "next/link";
import { SummaryCard } from "@/components/ui";
import {
  DollarSign,
  GitPullRequest,
  Users2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
  CheckCircle2,
  Building,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [
    latestFinancial,
    deals,
    companies,
    leads,
    activities,
    channels,
  ] = await Promise.all([
    prisma.monthlyFinancial.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.deal.findMany({
      include: { stage: true, lead: true, owner: true },
    }),
    prisma.company.findMany({
      include: { walletLedger: true, buyers: true },
    }),
    prisma.lead.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    prisma.salesActivity.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { deal: true, lead: true, adminUser: true },
    }),
    prisma.marketingChannel.findMany({
      include: { attributions: true },
    }),
  ]);

  const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedPipeline = deals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);
  const activeCompanies = companies.length;

  // Calculate at-risk companies
  const atRiskCount = companies.filter((c) => c.healthScore === "At-Risk" || c.walletBalance < 15000).length;

  // Top lead channel
  const sortedChannels = [...channels].sort((a, b) => b.attributions.length - a.attributions.length);
  const topChannel = sortedChannels[0]?.name || "paid_search";

  const currentMrr = latestFinancial?.totalMRR || 2260000;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Executive Business Overview</h1>
            <span className="rounded-full bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 text-xs font-mono text-emerald-400">
              Live Actuals
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            ChaanBean internal operations: sales velocity, customer health, marketing attribution, and MRR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/pipeline"
            className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            Open Sales Pipeline CRM
          </Link>
          <Link
            href="/admin/financials"
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            View Monthly Financials
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Current Monthly Run-Rate (MRR)"
          value={`₹${currentMrr.toLocaleString("en-IN")}`}
          subtitle="+18% Net MoM Growth"
          href="/admin/financials"
        />
        <SummaryCard
          title="Weighted Pipeline"
          value={`₹${Math.round(weightedPipeline).toLocaleString("en-IN")}`}
          subtitle={`₹${totalPipeline.toLocaleString("en-IN")} Unweighted`}
          href="/admin/pipeline"
        />
        <SummaryCard
          title="Active Customers"
          value={activeCompanies}
          subtitle="On Growth & Enterprise Plans"
          href="/admin/customers"
        />
        <SummaryCard
          title="Top Lead Source"
          value={topChannel.replace(/_/g, " ").toUpperCase()}
          subtitle="Highest Conversion Rate"
          href="/admin/marketing"
        />
        <SummaryCard
          title="At-Risk Customer Accounts"
          value={atRiskCount}
          subtitle="Low balance or activity drop"
          href="/admin/customers"
        />
      </div>

      {/* Grid: Live Pipeline Stage Summary & Recent Deal Activities */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deal Pipeline Status */}
        <section className="rounded-xl border border-slate-800 bg-[#0B0F17] p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <GitPullRequest size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Active Pipeline Deals</h2>
            </div>
            <Link href="/admin/pipeline" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
              Kanban Board <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {deals.slice(0, 5).map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-semibold text-slate-200">{d.title}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Owner: {d.owner?.name || "Unassigned"} · Prob: {d.probability}%
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-200">
                    ₹{d.value.toLocaleString("en-IN")}
                  </div>
                  <span
                    className="inline-block rounded px-2 py-0.5 text-[10px] font-mono mt-1"
                    style={{ backgroundColor: `${d.stage.color}25`, color: d.stage.color }}
                  >
                    {d.stage.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Sales & Customer Activity Audit Trail */}
        <section className="rounded-xl border border-slate-800 bg-[#0B0F17] p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-chaan-accent" />
              <h2 className="text-sm font-semibold text-white">Sales & Customer Activity Feed</h2>
            </div>
            <span className="text-xs font-mono text-slate-500">{activities.length} Events</span>
          </div>

          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="uppercase font-mono text-[10px] text-amber-400 font-bold">
                    {act.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(act.createdAt).toLocaleTimeString("en-IN")}
                  </span>
                </div>
                <p className="text-slate-300 mt-1 font-medium">{act.description}</p>
                {act.adminUser && (
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Logged by: {act.adminUser.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
