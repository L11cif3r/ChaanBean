import { prisma } from "@/lib/db";
import Link from "next/link";
import { VerificationRunner } from "@/components/VerificationRunner";
import { Search, ShieldAlert, Cpu } from "lucide-react";
import { getAllKnowledgeEntities } from "@/lib/knowledge-source";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function BackgroundCheckPage() {
  const cookieStore = await cookies();
  const companyIdCookie = cookieStore.get("chaanbean_company_id")?.value;

  let company = null;
  if (companyIdCookie) {
    company = await prisma.company.findUnique({
      where: { id: companyIdCookie },
    });
  }
  if (!company) {
    company = await prisma.company.findFirst({
      where: { name: { contains: "Acme Traders" } },
    });
    if (!company) {
      company = await prisma.company.findFirst();
    }
  }

  const ledger = company
    ? await prisma.walletUsageLedger.findMany({ where: { companyId: company.id } })
    : [];

  const ledgerMap = Object.fromEntries(
    ledger.map((l) => [
      l.reportType,
      { timesUsed: l.timesUsed, available: l.available, cost: l.cost },
    ])
  );

  // Fetch actual buyers and vendors from database
  const buyers = await prisma.buyerDebtor.findMany({
    where: { companyId: company?.id },
    select: { name: true, pan: true, gstin: true },
    take: 6,
  });
  const vendors = await prisma.vendor.findMany({
    where: { companyId: company?.id },
    select: { name: true, pan: true, gstin: true },
    take: 4,
  });

  const isCleanAcme = company?.name?.includes("Acme Traders") || (buyers.length === 0 && vendors.length === 0);

  const entities = isCleanAcme
    ? []
    : [
        ...buyers.map((b) => ({ name: b.name, id: b.gstin || b.pan || b.name, type: "debtor" as const })),
        ...vendors.map((v) => ({ name: v.name, id: v.gstin || v.pan || v.name, type: "vendor" as const })),
      ];

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Search className="text-chaan-brand" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Credit Check</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Unified adapter gateway · 30-day cache-first lookup · Parallel fan-out · Statutory credit risk underwriting
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/60">
          <Cpu size={14} />
          <span>14 Statutory Background Adapters</span>
        </div>
      </div>

      {/* À La Carte Call-Only Restriction Notice */}
      {company?.plan?.startsWith("alacarte") && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <ShieldAlert size={20} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold font-mono uppercase tracking-wider block">
                À La Carte Plan Active (Dedicated Call Recovery Service)
              </span>
              <span className="text-amber-700/90 dark:text-amber-400/90">
                Your subscription provides automated Asterisk voice recovery. To access statutory credit underwriting adapters, upgrade to Growth or Enterprise.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/payment-recovery"
              className="px-3.5 py-1.5 rounded-lg bg-[#FC8019] text-white font-bold text-xs hover:bg-[#E26D0A] transition shadow-xs"
            >
              Go to Payment Automation
            </Link>
            <Link
              href="/subscription"
              className="px-3.5 py-1.5 rounded-lg border border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 font-semibold text-xs hover:border-[#FC8019] transition"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      )}

      {/* Main Interactive Verification Hub */}
      <VerificationRunner companyId={company?.id || ""} ledgerMap={ledgerMap} sampleEntities={entities} />
    </div>
  );
}
