import { prisma } from "@/lib/db";
import Link from "next/link";
import { RiskFlagBadge } from "@/components/ui";
import { CreateBuyerModal } from "@/components/CreateBuyerModal";
import { UserCircle, Shield, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DebtorsPage() {
  const buyers = await prisma.buyerDebtor.findMany({
    include: {
      creditAccounts: true,
      riskFlags: { orderBy: { computedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <UserCircle className="text-chaan-accent" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Debtors & Counterparty Portfolio</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time monitored buyers with deterministic Green / Amber / Red credit risk flags and exposure limits.
          </p>
        </div>

        <CreateBuyerModal />
      </div>

      {/* Debtors Table */}
      <div className="overflow-x-auto rounded-xl border border-chaan-border bg-chaan-card">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider border-b border-chaan-border">
            <tr>
              <th className="px-4 py-3 text-left">Buyer / Counterparty</th>
              <th className="px-4 py-3 text-left">GSTIN / PAN</th>
              <th className="px-4 py-3 text-left">Preferred Language</th>
              <th className="px-4 py-3 text-left">Risk Flag & Score</th>
              <th className="px-4 py-3 text-left">Outstanding</th>
              <th className="px-4 py-3 text-left">Credit Limit</th>
              <th className="px-4 py-3 text-left">Recommended Tenor</th>
              <th className="px-4 py-3 text-left">Overdue Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {buyers.map((b) => {
              const account = b.creditAccounts[0];
              const flag = b.riskFlags[0];
              const flagColor = (flag?.flag || "amber") as "green" | "amber" | "red";

              return (
                <tr key={b.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <Link
                      href={`/buyers/${b.id}`}
                      className="font-semibold text-slate-200 hover:text-chaan-accent transition text-sm"
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    <div>{b.gstin || "—"}</div>
                    <div className="text-[10px] text-slate-500">{b.pan || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300 uppercase border border-slate-700">
                      {b.language}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RiskFlagBadge flag={flagColor} size="sm" />
                      {flag && (
                        <span className="font-mono text-xs text-slate-400">
                          {flag.compositeScore.toFixed(0)}/100
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-200">
                    {account ? `₹${account.outstandingAmount.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {account ? `₹${account.creditLimit.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {flag?.recommendedTenor ? `${flag.recommendedTenor} Days` : "30 Days"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                        account?.overdueStatus === "defaulted"
                          ? "bg-rose-950/80 text-rose-400 border-rose-800"
                          : account?.overdueStatus === "overdue"
                            ? "bg-amber-950/80 text-amber-400 border-amber-800"
                            : "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                      }`}
                    >
                      {account?.overdueStatus || "current"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/buyers/${b.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-chaan-accent hover:underline"
                    >
                      Dossier <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
