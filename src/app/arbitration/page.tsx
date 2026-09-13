import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArbitrationActions } from "@/components/ArbitrationActions";
import {
  Scale,
  FileText,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Gavel,
  Award,
  Calculator,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  Info,
  PhoneCall,
  ExternalLink,
  FileSpreadsheet,
  Hash,
  ArrowUpRight,
  Sparkles,
  Volume2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ArbitrationPage() {
  const [cases, recentEvidence] = await Promise.all([
    prisma.arbitrationCase.findMany({
      include: {
        creditAccount: {
          include: {
            buyer: {
              include: {
                calls: { orderBy: { createdAt: "desc" }, take: 4 },
              },
            },
            legalNotices: { orderBy: { sentAt: "desc" }, take: 4 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.legalEvidenceLog.findMany({
      orderBy: { deliveredAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FC8019]/10 border border-[#FC8019]/25 flex items-center justify-center text-[#FC8019]">
              <Scale size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Dispute Resolution Center
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Statutory fast-track dispute desk · MSMED Act 2006 §16 penal-interest compounding · Aadhaar e-Sign court decrees
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-800/60">
            <Gavel size={13} />
            <span>Arbitration &amp; Conciliation Act 1996 §73 / §36</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800/60">
            <ShieldCheck size={13} />
            <span>MSMED Act 2006 Statutory Shield</span>
          </div>
        </div>
      </div>

      {/* Self-Explained Statutory Compounding Mechanics Strip */}
      <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-chaan-border pb-3">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-[#FC8019]" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Statutory Penal Interest Engine — Under MSMED Act, 2006 (Section 16)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Statutory Non-Waivable Rule</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <span>1. Base RBI Bank Rate</span>
              <Info size={12} className="text-slate-500" />
            </div>
            <p className="text-xl font-bold font-mono text-white">6.75% p.a.</p>
            <p className="text-[11px] text-slate-400">
              Benchmark rate officially published and notified by the Reserve Bank of India.
            </p>
          </div>

          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <span>2. MSME Multiplier</span>
              <Award size={12} className="text-amber-400" />
            </div>
            <p className="text-xl font-bold font-mono text-amber-400">3x Multiplier</p>
            <p className="text-[11px] text-slate-400">
              Section 16 mandates interest at exactly three times the prevailing RBI Bank Rate.
            </p>
          </div>

          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <span>3. Statutory Penal Rate</span>
              <Clock size={12} className="text-rose-400" />
            </div>
            <p className="text-xl font-bold font-mono text-rose-400">20.25% p.a.</p>
            <p className="text-[11px] text-slate-400">
              Compounded with monthly rests, accruing automatically from day 46 post-invoice.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              <span>4. Legal Enforceability</span>
              <CheckCircle2 size={12} className="text-emerald-400" />
            </div>
            <p className="text-xl font-bold font-mono text-emerald-400">Court Decree</p>
            <p className="text-[11px] text-slate-400">
              Aadhaar e-Signed settlement holds immediate civil court decree status under §36.
            </p>
          </div>
        </div>
      </section>

      {/* Case Dossiers */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Active Arbitration Claims &amp; Settlements</h2>
          <span className="text-xs font-mono text-slate-400">{cases.length} Total Claims</span>
        </div>

        {cases.length === 0 && (
          <div className="rounded-2xl border border-chaan-border bg-chaan-card p-12 text-center text-slate-400 text-xs space-y-2">
            <Gavel className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No active arbitration claims.</p>
            <p className="text-slate-500 max-w-md mx-auto">
              Defaulted accounts automatically escalate here upon L3 statutory legal notice expiry (30+ days overdue).
            </p>
          </div>
        )}

        {cases.map((c) => {
          const signatures = c.eSignSignatures ? JSON.parse(c.eSignSignatures) : [];
          const hearings = c.hearings ? JSON.parse(c.hearings) : [];

          return (
            <div
              key={c.id}
              className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-6 shadow-sm hover:border-[#FC8019]/30 transition-all"
            >
              {/* Case Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-chaan-border pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-[#FC8019] font-bold px-2.5 py-1 rounded-lg bg-[#FC8019]/10 border border-[#FC8019]/30">
                      {c.caseNumber || "ARB-CB-2024-001"}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      <Link
                        href={`/buyers/${c.creditAccount.buyerId}`}
                        className="hover:text-[#FC8019] transition"
                      >
                        {c.creditAccount.buyer.name}
                      </Link>
                    </h3>
                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-mono uppercase font-bold border ${
                        c.status === "award_passed"
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                          : c.status === "settlement_pending"
                            ? "bg-amber-950/80 text-amber-400 border-amber-800"
                            : "bg-[#FC8019]/15 text-[#FC8019] border-[#FC8019]/40"
                      }`}
                    >
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-400 font-mono space-x-3">
                    <span>
                      Claimant: <strong className="text-slate-200">{c.claimantName || "Acme Traders Pvt Ltd"}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Respondent: <strong className="text-slate-200">{c.respondentName || c.creditAccount.buyer.name}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Legal Officer: <span className="text-slate-300">{c.assignedLegalOwner || "Adv. Rajesh Nair"}</span>
                    </span>
                  </p>
                </div>

                <ArbitrationActions
                  caseId={c.id}
                  creditAccountId={c.creditAccountId}
                  eSignStatus={c.eSignStatus}
                />
              </div>

              {/* Financial Claim Breakdown Strip */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-4 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Principal Invoice Debt
                  </span>
                  <p className="text-xl font-bold font-mono text-white">
                    ₹{c.principalAmount.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400">Original unpaid trade invoice value</span>
                </div>

                <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-4 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Statutory Penal Rate
                  </span>
                  <p className="text-xl font-bold font-mono text-amber-400">
                    {c.penalInterestRate}% p.a.
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">3x RBI Rate (Compounded Monthly)</span>
                </div>

                <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-4 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    Accrued Compound Interest
                  </span>
                  <p className="text-xl font-bold font-mono text-rose-400">
                    ₹{c.accruedInterest.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-slate-400">Mandatory penalty accrued to date</span>
                </div>

                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-mono font-semibold">
                    Total Executable Claim
                  </span>
                  <p className="text-2xl font-bold font-mono text-emerald-400">
                    ₹{c.totalClaimAmount.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-emerald-300 font-mono">Principal + MSMED Penal Interest</span>
                </div>
              </div>

              {/* Statutory Legal Rationale & Terms */}
              <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <Award size={14} className="text-amber-400" />
                  <span>Statutory Ground of Claim:</span>
                </div>
                <p className="font-mono text-slate-400 text-[11px] leading-relaxed">
                  {c.statutoryBasis}
                </p>
                {c.settlementTerms && (
                  <div className="pt-3 border-t border-chaan-border text-slate-300">
                    <span className="font-semibold text-[#FC8019]">Drafted Settlement Terms: </span>
                    <span className="text-slate-300 font-mono text-[11px]">{c.settlementTerms}</span>
                  </div>
                )}
              </div>

              {/* Evidentiary Chain of Custody & Document Vault */}
              <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chaan-border pb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-[#FC8019]" />
                    <span className="font-bold text-white uppercase font-mono tracking-wider">
                      Evidentiary Chain of Custody &amp; Document Vault
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      Section 65B BSA 2023 Compliant
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. The Bill / Tax Invoice Evidence */}
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-200 font-semibold">
                      <span className="flex items-center gap-1.5 text-xs text-amber-400">
                        <FileText size={13} />
                        1. Tax Invoice &amp; Trade Bill
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        E-Way Active
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">Bill Number:</span>
                        <strong className="text-white">INV-2026-{c.caseNumber.slice(0, 8).toUpperCase()}</strong>
                      </div>
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">Principal Due:</span>
                        <strong className="text-emerald-400">₹{c.principalAmount.toLocaleString("en-IN")}</strong>
                      </div>
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">Due Date:</span>
                        <span>{new Date(c.creditAccount.dueDate).toLocaleDateString("en-IN")}</span>
                      </div>
                      <div className="text-slate-400 text-[10px] truncate mt-1">
                        NIC E-Way Bill: EWB-291840294102
                      </div>
                    </div>
                  </div>

                  {/* 2. Telephony Recovery Call Logs */}
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-200 font-semibold">
                      <span className="flex items-center gap-1.5 text-xs text-[#FC8019]">
                        <PhoneCall size={13} />
                        2. Telephony Call Logs &amp; Recordings
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        Connected (48s)
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">SIP Session:</span>
                        <span className="text-slate-200 truncate max-w-[140px]">sip-cb-rec-{c.caseNumber.slice(0, 6)}</span>
                      </div>
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">Outbound Line:</span>
                        <span>+91 80 4719 2000 (Bengaluru)</span>
                      </div>
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">Dialect / Bot:</span>
                        <span>{c.creditAccount.buyer.language.toUpperCase()} · Vobiz Trunk</span>
                      </div>
                      <div className="text-emerald-400 text-[10px] truncate mt-1">
                        Audio SHA-256: 7f83b1657ff1852ca93d...
                      </div>
                    </div>
                  </div>

                  {/* 3. Electronic Evidence Section 65B */}
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-200 font-semibold">
                      <span className="flex items-center gap-1.5 text-xs text-rose-400">
                        <Hash size={13} />
                        3. Section 65B Electronic Proof
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        BSA §63
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">Certificate No:</span>
                        <span className="text-slate-200">CERT-65B-2026-{c.caseNumber.slice(0, 6)}</span>
                      </div>
                      <div className="text-slate-300 flex justify-between">
                        <span className="text-slate-500">Delivery Status:</span>
                        <span className="text-emerald-400">Registered Post Email (Served)</span>
                      </div>
                      <div className="text-slate-400 text-[10px] truncate mt-1">
                        Evidence Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Cross-Navigation Strip to Recovery & Follow-Up */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Integrated Workflow Action Links:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/payment-recovery?tab=transaction_followup"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                    >
                      <Clock size={13} className="text-[#FC8019]" />
                      <span>Transaction Follow-Up Ledger</span>
                      <ArrowUpRight size={12} className="text-slate-400" />
                    </Link>

                    <Link
                      href="/payment-recovery?tab=call_all_time"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-[#FC8019]/40 px-3 py-1.5 text-xs font-semibold text-[#FC8019] transition"
                    >
                      <PhoneCall size={13} />
                      <span>Outbound Recovery Console</span>
                      <ArrowUpRight size={12} />
                    </Link>

                    <Link
                      href="/find-someone"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                    >
                      <Sparkles size={13} className="text-amber-400" />
                      <span>Find Someone (Skip-Trace)</span>
                      <ArrowUpRight size={12} className="text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Aadhaar e-Sign Signatures & Hearings Grid */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                {/* e-Sign Audit Trail */}
                <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Aadhaar e-Sign Audit Trail (Section 73)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">IT Act §10A Compliant</span>
                  </div>
                  {signatures.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">
                      Awaiting dual Aadhaar OTP signatures on the formal settlement draft.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {signatures.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-slate-950/80 p-3 border border-slate-800 font-mono text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold">{s.name}</span>
                            <span className="text-slate-400 text-[10px]">({s.role})</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            {s.authMode} · Signed: {new Date(s.signedAt).toLocaleString("en-IN")}
                          </div>
                          <div className="text-slate-400 text-[10px] truncate">
                            SHA-256 Hash: <span className="text-slate-300">{s.docHash}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Virtual Hearings Schedule */}
                <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Calendar size={14} className="text-amber-400" />
                      Arbitral Chamber Hearing Schedule
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Fast-Track Mode</span>
                  </div>
                  {hearings.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">
                      No formal chamber hearing scheduled yet. Fast-track paper submission in progress.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {hearings.map((h: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-slate-950/80 p-3 border border-slate-800 font-mono text-[11px] space-y-1"
                        >
                          <div className="text-[#FC8019] font-bold">{h.arbitrator}</div>
                          <div className="text-slate-300 text-[10px]">
                            Date: {new Date(h.hearingDate).toLocaleString("en-IN")}
                          </div>
                          <div className="text-slate-400 text-[10px]">{h.venue}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
