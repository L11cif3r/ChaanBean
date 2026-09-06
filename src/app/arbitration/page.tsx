import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArbitrationActions } from "@/components/ArbitrationActions";
import { Scale, FileText, CheckCircle2, ShieldAlert, Clock, Gavel, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ArbitrationPage() {
  const cases = await prisma.arbitrationCase.findMany({
    include: {
      creditAccount: { include: { buyer: true, legalNotices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="text-chaan-accent" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Arbitration & Dispute Resolution Center</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            In-house statutory recovery desk · MSMED Act 2006 Section 16 penal-interest compounding · Aadhaar e-Sign settlements
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-800/60">
          <Gavel size={14} />
          <span>Arbitration & Conciliation Act 1996</span>
        </div>
      </div>

      {/* Case Dossiers */}
      <div className="space-y-6">
        {cases.length === 0 && (
          <div className="rounded-xl border border-chaan-border bg-chaan-card p-8 text-center text-slate-400 text-xs">
            No active arbitration claims. Cases automatically route here upon L3 legal notice expiry.
          </div>
        )}

        {cases.map((c) => {
          const signatures = c.eSignSignatures ? JSON.parse(c.eSignSignatures) : [];
          const hearings = c.hearings ? JSON.parse(c.hearings) : [];

          return (
            <div key={c.id} className="rounded-xl border border-chaan-border bg-chaan-card p-6 space-y-6">
              {/* Case Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-chaan-border pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/60">
                      {c.caseNumber || "ARB-CB-2024-001"}
                    </span>
                    <h2 className="text-lg font-bold text-white">
                      <Link href={`/buyers/${c.creditAccount.buyerId}`} className="hover:text-chaan-accent transition">
                        {c.creditAccount.buyer.name}
                      </Link>
                    </h2>
                    <span
                      className={`rounded px-2.5 py-0.5 text-xs font-mono uppercase font-bold border ${
                        c.status === "award_passed"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : c.status === "settlement_pending"
                            ? "bg-sky-950 text-sky-400 border-sky-800"
                            : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}
                    >
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-400 font-mono">
                    Claimant: <strong className="text-slate-200">{c.claimantName || "Acme Traders Pvt Ltd"}</strong> · Respondent:{" "}
                    <strong className="text-slate-200">{c.respondentName || c.creditAccount.buyer.name}</strong> · Legal Desk:{" "}
                    <span className="text-slate-300">{c.assignedLegalOwner || "Adv. Rajesh Nair"}</span>
                  </p>
                </div>

                <ArbitrationActions caseId={c.id} creditAccountId={c.creditAccountId} eSignStatus={c.eSignStatus} />
              </div>

              {/* Statutory MSME Penal Interest Breakdown */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Principal Debt</span>
                  <p className="mt-1 text-xl font-bold font-mono text-white">
                    ₹{c.principalAmount.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Statutory Penal Rate</span>
                  <p className="mt-1 text-xl font-bold font-mono text-amber-400">
                    {c.penalInterestRate}% p.a.
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">3x RBI Bank Rate (Compounded Monthly)</span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Accrued Compound Interest</span>
                  <p className="mt-1 text-xl font-bold font-mono text-rose-400">
                    ₹{c.accruedInterest.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-mono">Total Legal Claim</span>
                  <p className="mt-1 text-2xl font-bold font-mono text-emerald-400">
                    ₹{c.totalClaimAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Statutory Legal Rationale & Terms */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <Award size={14} className="text-amber-400" />
                  <span>Statutory Ground of Claim:</span>
                </div>
                <p className="font-mono text-slate-400 text-[11px]">
                  {c.statutoryBasis}
                </p>
                {c.settlementTerms && (
                  <div className="pt-2 border-t border-slate-800 text-slate-300">
                    <span className="font-semibold text-sky-400">Drafted Settlement Terms: </span>
                    <span>{c.settlementTerms}</span>
                  </div>
                )}
              </div>

              {/* Aadhaar e-Sign Signatures & Hearings Grid */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                {/* e-Sign Audit Trail */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-2">
                  <span className="font-semibold text-slate-200">Aadhaar e-Sign Execution Status</span>
                  {signatures.length === 0 ? (
                    <p className="text-slate-500 text-[11px]">Awaiting signatures on out-of-court settlement terms.</p>
                  ) : (
                    <div className="space-y-2">
                      {signatures.map((s: any, idx: number) => (
                        <div key={idx} className="rounded bg-slate-950 p-2 border border-slate-800 font-mono text-[11px]">
                          <div className="text-emerald-400 font-bold">{s.name} ({s.role})</div>
                          <div className="text-slate-400">{s.authMode} · {new Date(s.signedAt).toLocaleDateString("en-IN")}</div>
                          <div className="text-slate-500 text-[10px] truncate">Hash: {s.docHash}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Virtual Hearings Schedule */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-2">
                  <span className="font-semibold text-slate-200">Arbitration Hearing Schedule</span>
                  {hearings.length === 0 ? (
                    <p className="text-slate-500 text-[11px]">No formal hearing scheduled yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {hearings.map((h: any, idx: number) => (
                        <div key={idx} className="rounded bg-slate-950 p-2 border border-slate-800 font-mono text-[11px]">
                          <div className="text-sky-400 font-bold">{h.arbitrator}</div>
                          <div className="text-slate-300">Date: {new Date(h.hearingDate).toLocaleString("en-IN")}</div>
                          <div className="text-slate-500">{h.venue}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
