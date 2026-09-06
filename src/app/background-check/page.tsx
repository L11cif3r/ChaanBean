import { prisma } from "@/lib/db";
import { VerificationRunner } from "@/components/VerificationRunner";
import { Search, ShieldAlert, Cpu } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BackgroundCheckPage() {
  const company = await prisma.company.findFirst();
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

  const entities = [
    ...buyers.map((b) => ({ name: b.name, id: b.gstin || b.pan || b.name, type: "debtor" as const })),
    ...vendors.map((v) => ({ name: v.name, id: v.gstin || v.pan || v.name, type: "vendor" as const })),
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Search className="text-chaan-accent" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Business Background Check & Verification Gateway</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Unified adapter gateway · 30-day cache-first lookup · Parallel fan-out · Dual business/individual support
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/60">
          <Cpu size={14} />
          <span>11 Active Sandbox Integrations</span>
        </div>
      </div>

      {/* Main Interactive Verification Hub */}
      <VerificationRunner companyId={company?.id || ""} ledgerMap={ledgerMap} sampleEntities={entities} />
    </div>
  );
}
