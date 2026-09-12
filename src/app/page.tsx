import { prisma } from "@/lib/db";
import { RiskFlagBadge } from "@/components/ui";
import { RiskRadarExpandable } from "@/components/RiskRadarExpandable";
import { RiskRadarModal } from "@/components/RiskRadarModal";
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
  Sparkles,
  CheckCircle2,
  Zap,
  UserSearch,
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

  // Command Modules: Minimalistic, futuristic, self-explained
  const commandModules = [
    {
      id: "find-someone",
      title: "Find Someone",
      badge: "Highlight Feature",
      badgeColor: "brand",
      description: "OmniTrace 360™ deep skip-tracing: alternate mobiles (Swiggy, Amazon, Zomato, etc.), alternate emails, addresses, digital age, bank branch address, CIBIL, Experian & CRIF.",
      metric: "9 Vectors",
      metricLabel: "Deep Identity Signals",
      metricContext: "Consumer & Bureau Skip-Trace",
      icon: UserSearch,
      href: "/find-someone",
      actionText: "Trace Debtor",
    },
    {
      id: "trust-hub",
      title: "Trust Hub & Network",
      badge: `${communityDefaultsCount} Peer Defaults`,
      badgeColor: "amber",
      description: "Opt-in peer compliance exchange, verified trust badges, and community default warning system.",
      metric: `${company.trustProfiles[0]?.trustId || "TRUST-CB-001"}`,
      metricLabel: "Active Trust ID",
      metricContext: "Verified Counterparty Status",
      icon: Shield,
      href: "/trust-hub",
      actionText: "Open Trust Hub",
    },
    {
      id: "debtors",
      title: "Debtors & Portfolio",
      badge: `${company.buyers.length} Monitored Buyers`,
      badgeColor: "brand",
      description: "Real-time counterparty exposure tracking, overdue days aging, and automated Green/Amber/Red risk signals.",
      metric: `₹${totalOutstanding.toLocaleString("en-IN")}`,
      metricLabel: "Monitored Receivables",
      metricContext: "Active B2B Credit Book",
      icon: UserCircle,
      href: "/debtors",
      actionText: "Manage Portfolio",
    },
    {
      id: "background-check",
      title: "Verification Gateway",
      badge: "17 Adapters Live",
      badgeColor: "emerald",
      description: "Instant regulatory due diligence across MCA21, GSTN GSTR-3B filings, e-Courts, and Commercial Bureau.",
      metric: `${walletAgg._sum.timesUsed ?? 0} Queries`,
      metricLabel: "Dossiers Generated",
      metricContext: "30-Day Cached Results",
      icon: Search,
      href: "/background-check",
      actionText: "Run Verification",
    },
    {
      id: "payment-recovery",
      title: "Payment Recovery",
      badge: "Multilingual AI",
      badgeColor: "brand",
      description: "Statutory multi-channel recovery notices (WhatsApp, Email, SMS) with compliant voice dialer in 7 Indian languages.",
      metric: `${campaignsCount} In-Flight`,
      metricLabel: "Active Campaigns",
      metricContext: "Automated Escalations",
      icon: Phone,
      href: "/payment-recovery",
      actionText: "Recovery Desk",
    },
    {
      id: "vendor-onboarding",
      title: "Vendor Network",
      badge: `${vendorsCount} Verified Vendors`,
      badgeColor: "brand",
      description: "Automated supply chain onboarding, bank account verification, and multi-director screening.",
      metric: "100% KYC",
      metricLabel: "Verified Roster",
      metricContext: "Tax & Bank Audited",
      icon: Users,
      href: "/vendors",
      actionText: "Register Vendor",
    },
    {
      id: "arbitration",
      title: "Arbitration Center",
      badge: "MSMED Act §18",
      badgeColor: "amber",
      description: "Fast-track institutional arbitration, statutory 20.25% compound interest computation, and Aadhaar e-Sign filing.",
      metric: `${arbitrationCount} Claims`,
      metricLabel: "Pending Decrees",
      metricContext: "Statutory Adjudication",
      icon: Scale,
      href: "/arbitration",
      actionText: "Initiate Claim",
    },
    {
      id: "trade-management",
      title: "Trade Credit Policy",
      badge: "45-Day Statutory",
      badgeColor: "emerald",
      description: "AI-recommended credit limits, payment tenors, and enforceable commercial credit covenants.",
      metric: `₹${(totalCreditLimit / 100000).toFixed(1)}L`,
      metricLabel: "Approved Limit Cap",
      metricContext: "Risk-Adjusted Capacity",
      icon: TrendingUp,
      href: "/debtors",
      actionText: "Review Policies",
    },
    {
      id: "admin-portal",
      title: "Operations & Admin OS",
      badge: "Executive Desk",
      badgeColor: "amber",
      description: "CRM sales pipeline Kanban, customer health tracking, marketing attribution, and financial KPIs (MRR).",
      metric: "Full Control",
      metricLabel: "Platform Analytics",
      metricContext: "System Administration",
      icon: ExternalLink,
      href: "/admin",
      actionText: "Admin Portal",
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Critical Operations Banner: Futuristic, Minimalist, Self-Explained */}
      <div className="rounded-2xl border border-orange-200 dark:border-rose-900/40 bg-gradient-to-r from-orange-50 via-white to-orange-50/50 dark:from-rose-950/30 dark:via-slate-900/80 dark:to-slate-900/60 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-[#FC8019]/15 border border-[#FC8019]/30 flex items-center justify-center text-[#FC8019] shrink-0 shadow-sm shadow-[#FC8019]/20">
            <FileCheck2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Statutory Compliance & Legal Protections Active
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              MSMED Act §16: Statutory compound interest (20.25% p.a.) auto-accrues on overdue invoices · TRAI Calling Window active (09:00–18:00 IST).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2 shadow-sm">
            <span className="text-slate-500 dark:text-slate-400">Peer Community Defaults:</span>
            <strong className="text-rose-600 dark:text-rose-400 font-bold">{communityDefaultsCount} Logged</strong>
          </div>
          <Link
            href="/trust-hub"
            className="rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] px-4 py-2 text-xs font-bold text-white transition shadow-sm shadow-[#FC8019]/25"
          >
            Review Network →
          </Link>
        </div>
      </div>

      {/* Hero Welcome & Overview Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Enterprise Credit & Recovery Hub</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-[#FC8019]/15 border border-orange-200 dark:border-[#FC8019]/30 text-[#FC8019] font-mono font-semibold">
              Live Gateway
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Simple, effective, explainable B2B credit decisions and statutory automated debt recovery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <RiskRadarModal triggerVariant="button" flagCounts={flagCounts} />
          <Link
            href="/background-check"
            className="flex items-center gap-2 rounded-xl bg-[#FC8019] px-4 py-2 text-xs font-bold text-white hover:bg-[#E26D0A] transition shadow-md shadow-[#FC8019]/20"
          >
            <Search size={14} />
            Verify New Counterparty
          </Link>
          <Link
            href="/payment-recovery"
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
          >
            <Phone size={14} />
            Outbound Recovery
          </Link>
        </div>
      </div>

      {/* Self-Explained Executive KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1.5 transition-all hover:border-[#FC8019]/40 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
            Total Monitored Receivables
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{totalOutstanding.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Active trade receivables monitored across all registered buyers
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1.5 transition-all hover:border-[#FC8019]/40 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
            Approved Credit Headroom
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{(totalCreditLimit / 100000).toFixed(1)} Lakh
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Recommended 45-day commercial exposure ceiling under MSMED norms
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1.5 transition-all hover:border-[#FC8019]/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
              Portfolio Health
            </span>
            <RiskRadarModal triggerVariant="badge" flagCounts={flagCounts} />
          </div>
          <div className="text-2xl font-black text-[#FC8019] font-mono">
            {flagCounts.green} Safe · {flagCounts.amber} Caution · {flagCounts.red} Alert
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-time deterministic Green, Amber, and Red credit risk flag counts
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1.5 transition-all hover:border-[#FC8019]/40 shadow-sm">
          <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
            Statutory Gateways Live
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            17 Adapters Active
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Public GST, MCA21, e-Courts, CCTNS FIR, and Udyam integrations
          </p>
        </div>
      </div>

      {/* Expandable Credit Risk Flag Radar - Definitions & Instructions */}
      <RiskRadarExpandable flagCounts={flagCounts} defaultExpanded={false} />

      {/* Interactive Command Center Grid: Futuristic, Minimalist, Simple */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#FC8019]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Core Operational Modules
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">8 Integrated Operating Stations</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {commandModules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#FC8019]/50 hover:shadow-xl hover:shadow-[#FC8019]/10 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-slate-800/80 border border-orange-200 dark:border-slate-700/60 group-hover:scale-105 transition-transform text-[#FC8019]">
                      <Icon size={20} />
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                        m.badgeColor === "emerald"
                          ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                          : m.badgeColor === "amber"
                          ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                          : "bg-orange-50 dark:bg-rose-950/80 text-[#FC8019] dark:text-rose-300 border-orange-200 dark:border-rose-800/60"
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3.5 group-hover:text-[#FC8019] transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {m.description}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-mono block">
                      {m.metricLabel}
                    </span>
                    <strong className="text-xs font-mono font-bold text-slate-900 dark:text-slate-200">
                      {m.metric}
                    </strong>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {m.metricContext}
                    </span>
                  </div>

                  <Link
                    href={m.href}
                    className="flex items-center gap-1 text-xs font-semibold text-[#FC8019] hover:text-[#FFA34D] transition"
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

      {/* Grid: Monitored Debtors & Recent Evidence Log */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Debtors Portfolio */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Active Debtors & Risk Standing</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live counterparty credit status pulled from database</p>
            </div>
            <Link href="/debtors" className="text-xs font-semibold text-[#FC8019] hover:underline">
              Full Portfolio →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {company.buyers.map((b) => {
              const flag = (b.riskFlags[0]?.flag as "green" | "amber" | "red") || "amber";
              const account = b.creditAccounts[0];
              return (
                <div
                  key={b.id}
                  className="py-3.5 flex items-center justify-between text-xs hover:bg-orange-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition"
                >
                  <div>
                    <Link
                      href={`/buyers/${b.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-200 hover:text-[#FC8019] transition text-sm"
                    >
                      {b.name}
                    </Link>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      GSTIN: {b.gstin || "N/A"} · Lang: {b.language.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-mono text-slate-900 dark:text-slate-200 font-bold block">
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
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#FC8019]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Immutable Telephony & Legal Audit Trail</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Section 65B Indian Evidence Act compliant court-admissible logs</p>
              </div>
            </div>
            <Link href="/payment-recovery" className="text-xs font-semibold text-[#FC8019] hover:underline">
              Recovery Console →
            </Link>
          </div>

          <div className="space-y-3">
            {recentEvidence.map((e) => {
              const meta = e.metadata ? JSON.parse(e.metadata) : {};
              return (
                <div key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="uppercase font-bold text-slate-900 dark:text-slate-200">{e.channel}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(e.deliveredAt).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 truncate">
                    Cryptographic SHA-256: <span className="text-slate-400">{e.contentHash}</span>
                  </p>
                  {meta.govReferenceId && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Gov Ref ID: {meta.govReferenceId}
                    </p>
                  )}
                  {meta.callOutcome && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Outcome: {meta.callOutcome} ({meta.durationSec}s) · {meta.carrier}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {/* Floating Corner Expandable Risk Flag Instruction Button */}
      <RiskRadarModal triggerVariant="floating" flagCounts={flagCounts} />
    </div>
  );
}
