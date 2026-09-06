import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { RiskFlagBadge, SignalBreakdownTable } from "@/components/ui";
import { RefreshRiskButton } from "@/components/RefreshRiskButton";
import { ReportResultView } from "@/components/verification/ReportResultView";
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

      {/* Credit Account Terms - Self-Explained Metrics */}
      {account && (
        <section className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
            <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">Outstanding Balance</p>
            <p className="text-2xl font-bold font-mono text-white">
              ₹{account.outstandingAmount.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400">Current unpaid trade invoices</p>
          </div>
          <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
            <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">Approved Credit Limit</p>
            <p className="text-2xl font-bold font-mono text-emerald-400">
              ₹{account.creditLimit.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400">Risk-adjusted exposure ceiling</p>
          </div>
          <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
            <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">Invoice Due Date</p>
            <p className="text-2xl font-bold font-mono text-slate-200">
              {new Date(account.dueDate).toLocaleDateString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400">Contractual settlement due date</p>
          </div>
          <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-1">
            <p className="text-[11px] uppercase text-slate-400 font-mono font-semibold">Statutory Overdue Status</p>
            <p className={`text-2xl font-bold font-mono uppercase ${account.overdueStatus === "defaulted" ? "text-rose-400" : account.overdueStatus === "overdue" ? "text-amber-400" : "text-emerald-400"}`}>
              {account.overdueStatus}
            </p>
            <p className="text-[10px] text-slate-400">MSMED §16 interest accrual status</p>
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
            <h2 className="text-base font-semibold text-white">Underlying Statutory Verification Dossiers</h2>
            <p className="text-xs text-slate-400">
              Formatted regulatory artifacts with provider attribution and 30-day cache validity.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{reports.length} Reports Cached</span>
        </div>

        <div className="space-y-4">
          {reports.map((r) => {
            let dataObj: any = {};
            try {
              dataObj = JSON.parse(r.normalizedPayload)?.data || {};
            } catch {
              // ignore
            }

            const normalizedReport = {
              reportType: r.reportType as any,
              subjectType: r.subjectType as any,
              subjectId: r.subjectId,
              provider: r.provider,
              status: r.status as any,
              fetchedAt: r.createdAt.toISOString(),
              expiresAt: r.cachedUntil.toISOString(),
              data: dataObj,
            };

            return (
              <div key={r.id} className="space-y-1">
                <ReportResultView report={normalizedReport} />
              </div>
            );
          })}
          {reports.length === 0 && (
            <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 text-center text-xs text-slate-400">
              No cached verification reports for this counterparty yet. Run the Verification Gateway to pull live dossiers.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
