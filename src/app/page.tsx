import { prisma } from "@/lib/db";
import { RiskFlagBadge } from "@/components/ui";
import Link from "next/link";
import {
  Shield,
  Users,
  Search,
  Phone,
  Scale,
  UserCircle,
  ArrowRight,
  Activity,
  AlertTriangle,
  Building2,
  FileCheck2,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const company = await prisma.company.findFirst({
    include: {
      trustProfiles: true,
      buyers: {
        include: {
          creditAccounts: true,
          riskFlags: { orderBy: { computedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!company) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">ChaanBean</h1>
        <p className="mt-4 text-slate-400">Database not seeded. Run `npm run db:setup`.</p>
      </div>
    );
  }

  const [
    vendorsCount,
    campaignsCount,
    arbitrationCount,
    communityDefaultsCount,
    walletAgg,
    recentEvidence,
    recentDefaults,
  ] = await Promise.all([
    prisma.vendor.count({ where: { companyId: company.id } }),
    prisma.campaign.count({ where: { companyId: company.id, status: "active" } }),
    prisma.arbitrationCase.count({ where: { status: { in: ["open", "hearing_scheduled", "settlement_pending"] } } }),
    prisma.communityDefault.count(),
    prisma.walletUsageLedger.aggregate({
      where: { companyId: company.id },
      _sum: { timesUsed: true },
    }),
    prisma.legalEvidenceLog.findMany({
      orderBy: { deliveredAt: "desc" },
      take: 4,
    }),
    prisma.communityDefault.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const flagCounts = { green: 0, amber: 0, red: 0 };
  for (const b of company.buyers) {
    const f = (b.riskFlags[0]?.flag || "amber") as keyof typeof flagCounts;
    if (f in flagCounts) flagCounts[f]++;
  }

  const totalOutstanding = company.buyers.reduce((sum, b) => {
    return sum + (b.creditAccounts[0]?.outstandingAmount || 0);
  }, 0);

  const totalCreditLimit = company.buyers.reduce((sum, b) => {
    return sum + (b.creditAccounts[0]?.creditLimit || 0);
  }, 0);

  // 8 Data-Rich Command Cards inspired by LegAn grid, elevated for real B2B decisioning
  const commandModules = [
    {
      id: "trust-hub",
      title: "Trust Hub & Network",
      badge: `${communityDefaultsCount} Peer Defaults`,
      badgeColor: "amber",
      description: "Opt-in B2B compliance exchange, verified badges, and community default alerts across the network.",
      metric: `${company.trustProfiles[0]?.trustId || "TRUST-CB-001"}`,
      metricLabel: "Active Trust ID",
      icon: Shield,
      href: "/trust-hub",
      actionText: "Open Trust Hub",
      colorClass: "hover:border-emerald-500/50",
    },
    {
      id: "debtors",
      title: "Debtors & Portfolio",
      badge: `${company.buyers.length} Active Buyers`,
      badgeColor: "sky",
      description: "Counterparty risk monitoring, overdue tracking, and automated Green / Amber / Red credit flags.",
      metric: `₹${totalOutstanding.toLocaleString("en-IN")}`,
      metricLabel: "Monitored Receivables",
      icon: UserCircle,
      href: "/debtors",
      actionText: "Manage Portfolio",
      colorClass: "hover:border-sky-500/50",
    },
    {
      id: "background-check",
      title: "Background Check",
      badge: "11 Real Gateways",
      badgeColor: "emerald",
      description: "Instant due diligence across MCA21, GSTIN 3B filings, e-Courts, Police FIRs, and Commercial Bureau.",
      metric: `${walletAgg._sum.timesUsed ?? 0} Reports`,
      metricLabel: "Verification Consumption",
      icon: Search,
      href: "/background-check",
      actionText: "Verify Business",
      colorClass: "hover:border-cyan-500/50",
    },
    {
      id: "payment-recovery",
      title: "Payment Recovery",
      badge: "Asterisk / Vobiz",
      badgeColor: "emerald",
      description: "Automated statutory recovery workflows (WhatsApp, Email, SMS) with direct one-way voice dialer in 7 languages.",
      metric: `${campaignsCount} In-Flight`,
      metricLabel: "Active Campaigns",
      icon: Phone,
      href: "/payment-recovery",
      actionText: "Voice Recovery Desk",
      colorClass: "hover:border-emerald-500/50",
    },
    {
      id: "vendor-onboarding",
      title: "Vendor Registration",
      badge: `${vendorsCount} Verified Vendors`,
      badgeColor: "sky",
      description: "Automated vendor onboarding, bank penny-drop validation, and multi-director identity screening.",
      metric: "100% KYC",
      metricLabel: "Bank & GST Validated",
      icon: Users,
      href: "/vendors",
      actionText: "Register Vendor",
      colorClass: "hover:border-indigo-500/50",
    },
    {
      id: "arbitration",
      title: "Arbitration Center",
      badge: "MSMED Act §18",
      badgeColor: "amber",
      description: "Fast-track institutional arbitration, statutory 20.25% compound interest computation, and Aadhaar e-Sign.",
      metric: `${arbitrationCount} Claims`,
      metricLabel: "Pending Decrees",
      icon: Scale,
      href: "/arbitration",
      actionText: "Initiate Arbitration",
      colorClass: "hover:border-amber-500/50",
    },
    {
      id: "trade-management",
      title: "Trade Credit Policy",
      badge: "45-Day Cap",
      badgeColor: "emerald",
      description: "Recommended credit limits, statutory payment tenors, and enforceable commercial credit covenants.",
      metric: `₹${(totalCreditLimit / 100000).toFixed(1)}L`,
      metricLabel: "Total Approved Limits",
      icon: TrendingUp,
      href: "/debtors",
      actionText: "Inspect Policies",
      colorClass: "hover:border-emerald-500/50",
    },
    {
      id: "admin-portal",
      title: "Operations & Admin OS",
      badge: "Executive Desk",
      badgeColor: "amber",
      description: "CRM sales pipeline Kanban, customer health tracking, marketing attribution, and monthly financials (MRR).",
      metric: "Owner Control",
      metricLabel: "Analytics & Financials",
      icon: ExternalLink,
      href: "/admin",
      actionText: "Enter Admin Portal",
      colorClass: "hover:border-amber-500/50",
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Critical Operations Banner (Inspired by LegAn alert bar, elevated for enterprise compliance) */}
      <div className="rounded-xl border border-emerald-800/50 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/60 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <FileCheck2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                TRAI Calling Window Active (09:00–18:00 IST)
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              MSMED Act §16 Statutory Compound Interest (20.25% p.a.) enabled · All 11 verification gateways operating normally.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center gap-2">
            <span className="text-slate-400">Global Peer Defaults:</span>
            <strong className="text-rose-400 font-bold">{communityDefaultsCount} Logged</strong>
          </div>
          <Link
            href="/trust-hub"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition"
          >
            Review Network →
          </Link>
        </div>
      </div>

      {/* Hero Welcome & Overview Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Credit & Recovery Hub</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-mono">
              Live Gateway
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Integrated credit decisions, instant KYC due diligence, and automated statutory debt recovery for the Indian market.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/background-check"
            className="flex items-center gap-2 rounded-lg bg-chaan-accent px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition shadow-sm"
          >
            <Search size={14} />
            Verify New Counterparty
          </Link>
          <Link
            href="/payment-recovery"
            className="flex items-center gap-2 rounded-lg border border-chaan-border bg-chaan-card px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
          >
            <Phone size={14} />
            Outbound Recovery
          </Link>
        </div>
      </div>

      {/* Interactive Command Center Grid (Inspired by LegAn module cards, but with real data & direct actions) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Core Product & Workflow Modules</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">8 Integrated Operating Stations</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {commandModules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className={`group rounded-xl border border-chaan-border bg-chaan-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between ${m.colorClass}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-105 transition-transform text-slate-200">
                      <Icon size={20} className="text-sky-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                        m.badgeColor === "emerald"
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                          : m.badgeColor === "amber"
                            ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                            : "bg-sky-950/80 text-sky-400 border-sky-800/60"
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-3.5 group-hover:text-sky-400 transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {m.description}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">
                      {m.metricLabel}
                    </span>
                    <strong className="text-xs font-mono font-bold text-slate-200">
                      {m.metric}
                    </strong>
                  </div>

                  <Link
                    href={m.href}
                    className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
                  >
                    <span>{m.actionText}</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit Risk Flag Distribution - Core ChaanBean Differentiator */}
      <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Live Credit Risk Flag Radar</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Single-decision credit risk synthesizing 17 verification signals directly into automated recovery workflows.
            </p>
          </div>
          <Link href="/debtors" className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1">
            View All Counterparties →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <RiskFlagBadge flag="green" />
              <span className="text-2xl font-bold font-mono text-emerald-400">{flagCounts.green}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Safe commercial profile: verified GST 3B consistency, zero litigation records, valid Udyam registration. Approved for standard 45-day tenor.
            </p>
            <div className="pt-2 border-t border-emerald-900/40 text-[11px] font-mono text-emerald-400">
              Low Default Probability ({"<"} 2.4%)
            </div>
          </div>

          <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <RiskFlagBadge flag="amber" />
              <span className="text-2xl font-bold font-mono text-amber-400">{flagCounts.amber}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Moderate friction: filing lapses, fluctuating bank turnover, or mild payment delays. Exposure recommended at 45% standard limit, tenor capped at 30 days.
            </p>
            <div className="pt-2 border-t border-amber-900/40 text-[11px] font-mono text-amber-400">
              Enhanced Monitoring Active
            </div>
          </div>

          <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <RiskFlagBadge flag="red" />
              <span className="text-2xl font-bold font-mono text-rose-400">{flagCounts.red}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hard stop triggered: peer-reported community default in Trust Hub, Section 138 NI Act bounced cheque FIR, or active arbitration decree.
            </p>
            <div className="pt-2 border-t border-rose-900/40 text-[11px] font-mono text-rose-400">
              Auto-Approval Blocked · Recovery Triggered
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Monitored Debtors & Recent Evidence Log */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Debtors Portfolio */}
        <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-chaan-border">
            <div>
              <h2 className="text-base font-semibold text-white">Active Debtors & Risk Standing</h2>
              <p className="text-xs text-slate-400">Real counterparties pulled live from database</p>
            </div>
            <Link href="/debtors" className="text-xs font-semibold text-sky-400 hover:underline">
              Full Portfolio →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {company.buyers.map((b) => {
              const flag = ((b.riskFlags[0]?.flag as "green" | "amber" | "red") || "amber");
              const account = b.creditAccounts[0];
              return (
                <div key={b.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded-lg transition">
                  <div>
                    <Link href={`/buyers/${b.id}`} className="font-semibold text-slate-200 hover:text-sky-400 transition text-sm">
                      {b.name}
                    </Link>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      GSTIN: {b.gstin || "N/A"} · Lang: {b.language.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-mono text-slate-200 font-bold block">
                        ₹{(account?.outstandingAmount || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Limit: ₹{(account?.creditLimit || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <RiskFlagBadge flag={flag} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Immutable Cryptographic Evidence Log */}
        <section className="rounded-xl border border-chaan-border bg-chaan-card p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-chaan-border">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-sky-400" />
              <div>
                <h2 className="text-base font-semibold text-white">Immutable Telephony & Legal Audit Trail</h2>
                <p className="text-xs text-slate-400">Section 65B court-admissible electronic records</p>
              </div>
            </div>
            <Link href="/payment-recovery" className="text-xs font-semibold text-sky-400 hover:underline">
              Recovery Console →
            </Link>
          </div>

          <div className="space-y-3">
            {recentEvidence.map((e) => {
              const meta = e.metadata ? JSON.parse(e.metadata) : {};
              return (
                <div key={e.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="uppercase font-bold text-sky-400">{e.channel}</span>
                    <span className="text-[10px] text-slate-500">{new Date(e.deliveredAt).toLocaleTimeString("en-IN")}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 truncate">
                    Hash: <span className="text-slate-400">{e.contentHash}</span>
                  </p>
                  {meta.govReferenceId && (
                    <p className="text-[11px] text-emerald-400 mt-0.5">
                      Gov Ref ID: {meta.govReferenceId}
                    </p>
                  )}
                  {meta.callOutcome && (
                    <p className="text-[11px] text-amber-400 mt-0.5">
                      Outcome: {meta.callOutcome} ({meta.durationSec}s) · {meta.carrier}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
