import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { RiskFlagBadge, SignalBreakdownTable } from "@/components/ui";
import { RefreshRiskButton } from "@/components/RefreshRiskButton";
import Link from "next/link";
import type { SignalBreakdown } from "@/lib/risk-scoring/engine";
import { ArrowLeft, ShieldAlert, CheckCircle2, Clock, FileText, Database } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const buyer = await prisma.buyerDebtor.findUnique({
    where: { id },
    include: {
      creditAccounts: true,
      riskFlags: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });

  if (!buyer) notFound();

  const flag = buyer.riskFlags[0];
  const signals: SignalBreakdown[] = flag ? JSON.parse(flag.signalBreakdown) : [];
  const account = buyer.creditAccounts[0];
  const subjectId = buyer.gstin ?? buyer.pan ?? buyer.id;

  const reports = await prisma.verificationReport.findMany({
    where: { subjectId },
    orderBy: { createdAt: "desc" },
    distinct: ["reportType"],
  });

  return (
    <div className="p-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/debtors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={14} />
          Back to Debtors Portfolio
        </Link>
      </div>

      {/* Header Profile Dossier */}
      <header className="rounded-xl border border-chaan-border bg-chaan-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{buyer.name}</h1>
              <span className="rounded bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-300 uppercase border border-slate-700">
                Language: {buyer.language}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400 font-mono space-x-4">
              <span>GSTIN: <strong className="text-slate-200">{buyer.gstin ?? "—"}</strong></span>
              <span>PAN: <strong className="text-slate-200">{buyer.pan ?? "—"}</strong></span>
              <span>Address: <span className="text-slate-300">{buyer.address || "Industrial Area Phase 2"}</span></span>
            </p>
          </div>

          {flag && (
            <div className="text-right space-y-1">
              <div className="flex justify-end">
                <RiskFlagBadge flag={flag.flag as "green" | "amber" | "red"} size="lg" showLabel />
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Composite Score: <strong className="text-white text-sm">{flag.compositeScore.toFixed(1)}</strong>/100
              </p>
              <p className="text-xs text-slate-300 font-mono">
                Recommended Credit Limit:{" "}
                <strong className="text-emerald-400 font-bold">
                  ₹{flag.recommendedLimit.toLocaleString("en-IN")}
                </strong>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Recommended Tenor:{" "}
                <strong className="text-slate-200 font-bold">
                  {flag.recommendedTenor ? `${flag.recommendedTenor} Days` : "30 Days"}
                </strong>
                {flag.flag === "red" && " (Auto-credit blocked)"}
              </p>
              <div>
                <RefreshRiskButton buyerId={buyer.id} />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Credit Account Terms */}
      {account && (
        <section className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-chaan-border bg-chaan-card p-5">
            <p className="text-xs uppercase text-slate-400 font-mono">Outstanding Balance</p>
            <p className="mt-2 text-2xl font-bold font-mono text-white">
              ₹{account.outstandingAmount.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-chaan-border bg-chaan-card p-5">
            <p className="text-xs uppercase text-slate-400 font-mono">Approved Credit Limit</p>
            <p className="mt-2 text-2xl font-bold font-mono text-emerald-400">
              ₹{account.creditLimit.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-chaan-border bg-chaan-card p-5">
            <p className="text-xs uppercase text-slate-400 font-mono">Due Date</p>
            <p className="mt-2 text-xl font-bold font-mono text-slate-200">
              {new Date(account.dueDate).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-chaan-border bg-chaan-card p-5">
            <p className="text-xs uppercase text-slate-400 font-mono">Statutory Overdue Status</p>
            <p className="mt-2 text-xl font-bold font-mono uppercase text-amber-400">
              {account.overdueStatus}
            </p>
          </div>
        </section>
      )}

      {/* Signal Breakdown Table */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Deterministic Signal Breakdown</h2>
          <p className="text-xs text-slate-400">
            Explainable rules — every credit flag traces back to exact underlying reports, weights, and statutory rules.
          </p>
        </div>
        {signals.length > 0 && <SignalBreakdownTable signals={signals} />}
      </section>

      {/* Underlying Verification Reports */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Underlying Verification Reports</h2>
            <p className="text-xs text-slate-400">
              Cached verification artifacts with provider attribution and expiry dates.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{reports.length} Reports Cached</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            let dataObj: any = {};
            try {
              dataObj = JSON.parse(r.normalizedPayload)?.data || {};
            } catch {
              // ignore
            }

            return (
              <div
                key={r.id}
                className="rounded-xl border border-chaan-border bg-chaan-card p-4 text-xs space-y-2 hover:border-slate-600 transition"
              >
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-slate-200 capitalize">
                    {r.reportType.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                      r.status === "completed"
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                        : r.status === "pending"
                          ? "bg-amber-950/80 text-amber-400 border-amber-800"
                          : "bg-rose-950/80 text-rose-400 border-rose-800"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  <p>Provider: <span className="text-slate-300">{r.provider}</span></p>
                  <p>Cached Until: <span className="text-slate-300">{new Date(r.cachedUntil).toLocaleDateString("en-IN")}</span></p>
                </div>

                <div className="rounded bg-slate-900 p-2 text-[10px] font-mono text-slate-400 max-h-24 overflow-y-auto">
                  <pre>{JSON.stringify(dataObj, null, 2)}</pre>
                </div>
              </div>
            );
          })}
          {reports.length === 0 && (
            <p className="text-xs text-slate-500">
              No cached reports for this subject yet. Click "Re-compute Risk Flag" to run the bundle.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
