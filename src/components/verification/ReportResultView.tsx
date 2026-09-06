"use client";

import React, { useState } from "react";
import type { NormalizedReport } from "@/lib/verification-gateway/types";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  Scale,
  BadgePercent,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";

interface ReportResultViewProps {
  report: NormalizedReport;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ReportResultView({ report, onRefresh, refreshing }: ReportResultViewProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const { reportType, data, provider, fetchedAt, expiresAt, status } = report;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatINR = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "—";
    const num = Number(val);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const renderContent = () => {
    switch (reportType) {
      // -------------------------------------------------------------
      // 1. GST EXACT TURNOVER
      // -------------------------------------------------------------
      case "gst_exact_turnover": {
        const trend = (data.turnoverTrend as string) || "stable";
        const filings = (data.annualTurnover as Array<{ year: string; amount: number; grossMarginPct: number }>) || [];
        const filingStatus = (data.filingStatus as string) || "Verified";
        const source = (data.source as string) || "GSTN Portal";

        const trendBadgeColor =
          trend === "growing"
            ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/60"
            : trend === "declining"
            ? "text-rose-400 bg-rose-950/60 border-rose-800/60"
            : "text-amber-400 bg-amber-950/60 border-amber-800/60";

        const maxAmount = Math.max(...filings.map((f) => f.amount), 1);

        return (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Turnover Velocity</span>
                <div className="mt-1.5 flex items-center gap-2">
                  {trend === "growing" ? (
                    <TrendingUp className="text-emerald-400" size={20} />
                  ) : (
                    <TrendingDown className="text-rose-400" size={20} />
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${trendBadgeColor}`}>
                    {trend}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">YoY multi-period trajectory</p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Latest FY Reported</span>
                <div className="mt-1.5 font-bold font-mono text-base text-white">
                  {filings.length > 0 ? formatINR(filings[filings.length - 1].amount) : "—"}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Avg Margin: {filings.length > 0 ? filings[filings.length - 1].grossMarginPct : 0}%
                </p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">GSTR Reconciliation</span>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">{filingStatus}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 font-mono truncate">{source}</p>
              </div>
            </div>

            {/* Annual Breakdown Bars */}
            <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                <BadgePercent size={14} className="text-chaan-brand" />
                Annual GSTR-3B Taxable Turnover History
              </h4>
              <div className="space-y-2.5">
                {filings.map((f, i) => {
                  const pct = Math.round((f.amount / maxAmount) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-200">{f.year}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-slate-400">
                            Margin: <strong className="text-slate-200">{f.grossMarginPct}%</strong>
                          </span>
                          <span className="font-mono font-bold text-white">{formatINR(f.amount)}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-chaan-brand transition-all duration-500"
                          style={{ width: `${Math.max(pct, 12)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 2. GST SLAB CHECK
      // -------------------------------------------------------------
      case "gst_slab_check": {
        const slab = (data.indicativeSlab as string) || "₹1.5Cr–5Cr (Small)";
        const gstin = (data.gstin as string) || report.subjectId;
        const jurisdiction = (data.jurisdiction as string) || "State Tax Ward";
        const taxpayerType = (data.taxpayerType as string) || "Regular";
        const regDate = (data.registrationDate as string) || "2018-07-01";
        const source = (data.source as string) || "GSTN Public Gateway";

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-brand/40 bg-gradient-to-br from-rose-950/40 to-slate-900/80 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-rose-300 uppercase font-mono tracking-wider">
                  Verified Turnover Slab Range
                </span>
                <div className="mt-1 text-2xl font-black text-white font-mono">{slab}</div>
                <p className="mt-1 text-xs text-slate-300">
                  Computed from public aggregate GST returns and tax bucket brackets.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-950/70 border border-emerald-800/60 px-3 py-1.5 text-xs text-emerald-300 font-medium">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Active Taxpayer Status
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Target GSTIN</span>
                <div className="mt-1 font-mono font-bold text-slate-100 truncate">{gstin}</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Taxpayer Type</span>
                <div className="mt-1 font-semibold text-slate-200">{taxpayerType}</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Registration Date</span>
                <div className="mt-1 font-mono text-slate-200">{regDate}</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Jurisdiction Ward</span>
                <div className="mt-1 font-medium text-slate-200 truncate">{jurisdiction}</div>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 3. GST SUPREME REPORT
      // -------------------------------------------------------------
      case "gst_supreme_report": {
        const consistency = (data.filingConsistency as string) || "consistent";
        const last12 = Number(data.last12Filings ?? 12);
        const counterpartyCount = Number(data.counterpartyPanCount ?? 20);
        const pans = (data.counterpartyPans as string[]) || [];
        const mismatches = Boolean(data.mismatches);
        const totalITC = Number(data.totalITCClaimed ?? 0);

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Filing Regularity</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                      consistency === "consistent"
                        ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/60"
                        : "text-rose-400 bg-rose-950/60 border-rose-800/60"
                    }`}
                  >
                    {consistency === "consistent" ? "Consistent" : "Lapses Detected"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 font-mono">
                  {last12} of 12 periods filed on-time
                </p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Total ITC Claimed</span>
                <div className="mt-1.5 font-bold font-mono text-base text-white">
                  {formatINR(totalITC)}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">GSTR-2B reconciled value</p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Reconciliation Mismatch</span>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {!mismatches ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-300">0 Mismatches</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} className="text-amber-400" />
                      <span className="text-xs font-semibold text-amber-300">Variance Detected</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">GSTR-1 vs 3B invoice audit</p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Counterparty Network</span>
                <div className="mt-1.5 font-bold font-mono text-base text-white">
                  {counterpartyCount} Entities
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Trading partners mapped</p>
              </div>
            </div>

            {/* Counterparty PANs */}
            {pans.length > 0 && (
              <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                  <Layers size={14} className="text-chaan-brand" />
                  Verified Counterparty Trade Network (PANs)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {pans.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 font-mono text-xs text-slate-200 font-medium"
                    >
                      {p}
                    </span>
                  ))}
                  {counterpartyCount > pans.length && (
                    <span className="px-2.5 py-1 rounded-lg border border-slate-700/60 bg-slate-800/40 font-mono text-xs text-slate-400">
                      +{counterpartyCount - pans.length} more counterparties
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      // -------------------------------------------------------------
      // 4. BUREAU REPORT
      // -------------------------------------------------------------
      case "bureau_report": {
        const score = Number(data.bureauScore ?? 750);
        const bureauProvider = (data.provider as string) || "CIBIL";
        const band = (data.band as string) || "good";
        const delinquent = Number(data.delinquentAccounts ?? 0);
        const tradeLines = Number(data.totalTradeLines ?? 10);
        const utilization = Number(data.utilizationRatePct ?? 35);
        const fallbackChain = (data.fallbackChainUsed as string[]) || [bureauProvider];

        const scoreColor =
          score >= 750
            ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/40"
            : score >= 650
            ? "text-amber-400 border-amber-500/50 bg-amber-950/40"
            : "text-rose-400 border-rose-500/50 bg-rose-950/40";

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-5 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 font-mono ${scoreColor}`}
                >
                  <span className="text-3xl font-black">{score}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">/ 900</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white uppercase">{bureauProvider} Commercial Score</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${scoreColor}`}>
                      {band}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Calculated across all sanctioned working capital, term loans, and trade credit lines.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span>Circuit-Breaker Chain:</span>
                    {fallbackChain.map((fc, i) => (
                      <span key={i} className="text-slate-300">
                        {fc} {i < fallbackChain.length - 1 ? "→" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Delinquent Acc</span>
                  <div className={`mt-1 font-mono font-bold text-base ${delinquent > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {delinquent}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Active Tradelines</span>
                  <div className="mt-1 font-mono font-bold text-base text-white">{tradeLines}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Credit Utilization</span>
                  <div className="mt-1 font-mono font-bold text-base text-slate-200">{utilization}%</div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 5. PAYMENT BEHAVIOUR
      // -------------------------------------------------------------
      case "payment_behaviour": {
        const avgDelay = Number(data.averagePaymentDelayDays ?? 0);
        const defaults = Number(data.defaultHistory ?? 0);
        const onTimePct = Number(data.onTimePaymentPct ?? 95);
        const inquiries = Number(data.inquiriesLast3Months ?? 0);

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">On-Time Payment Index</span>
                <div className="mt-1.5 font-bold font-mono text-xl text-emerald-400">{onTimePct}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Invoices cleared on/before due date</p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Avg Payment Delay</span>
                <div className={`mt-1.5 font-bold font-mono text-xl ${avgDelay > 30 ? "text-rose-400" : avgDelay > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  {avgDelay} Days
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Beyond standard payment terms</p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Default Incidents</span>
                <div className={`mt-1.5 font-bold font-mono text-xl ${defaults > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {defaults} Defaults
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Community exchange records</p>
              </div>

              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Recent Credit Inquiries</span>
                <div className="mt-1.5 font-bold font-mono text-xl text-slate-200">{inquiries} Inquiries</div>
                <p className="mt-1 text-[11px] text-slate-400">In the last 90-day window</p>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 6. COURT CASE HISTORY
      // -------------------------------------------------------------
      case "court_case_history": {
        const active = Number(data.activeCases ?? 0);
        const resolved = Number(data.resolvedCases ?? 0);
        const cases = (data.cases as Array<{
          cnrNumber: string;
          court: string;
          caseType: string;
          status: string;
          filingYear: number;
          claimAmount?: number;
        }>) || [];

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-chaan-border bg-slate-900/60 p-4">
              <div className="flex items-center gap-3">
                <Scale className="text-chaan-brand" size={24} />
                <div>
                  <h4 className="font-bold text-white text-sm">e-Courts Judicial Database Adjudication</h4>
                  <p className="text-xs text-slate-400">Civil suits, arbitration awards, and summary recovery proceedings.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={`px-2.5 py-1 rounded-lg border ${active > 0 ? "border-rose-800/60 bg-rose-950/60 text-rose-300" : "border-emerald-800/60 bg-emerald-950/60 text-emerald-300"}`}>
                  {active} Active Litigation{active === 1 ? "" : "s"}
                </span>
                <span className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300">
                  {resolved} Resolved
                </span>
              </div>
            </div>

            {cases.length > 0 ? (
              <div className="space-y-2.5">
                {cases.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-100">{c.cnrNumber}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[11px] font-mono">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-slate-300 font-medium">{c.court}</div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400 font-mono text-[11px]">
                      <span>Type: {c.caseType}</span>
                      <span>Filing Year: {c.filingYear}</span>
                      {c.claimAmount && <span className="text-rose-400 font-bold">Claim: {formatINR(c.claimAmount)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 text-center text-xs space-y-1">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                <div className="font-bold text-white">Clean Judicial Record</div>
                <p className="text-slate-400">No adverse commercial suits or cheque bounce cases registered across e-Courts.</p>
              </div>
            )}
          </div>
        );
      }

      // -------------------------------------------------------------
      // 7. FIR CHECK
      // -------------------------------------------------------------
      case "fir_check": {
        const firRegistered = Boolean(data.firRegistered);
        const firDetails = data.firDetails as
          | {
              firNumber: string;
              policeStation: string;
              sections: string[];
              status: string;
              year: number;
            }
          | undefined;

        return (
          <div className="space-y-4">
            {!firRegistered ? (
              <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 text-center text-xs space-y-2">
                <ShieldCheck size={28} className="text-emerald-400 mx-auto" />
                <div className="font-bold text-white text-sm">Police Crime Record Check: Clean</div>
                <p className="text-slate-300 max-w-md mx-auto">
                  No active First Information Reports (FIR) or criminal non-bailable warrants registered under CCTNS police records.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-5 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <ShieldAlert size={20} className="text-rose-400" />
                  <span>Adverse Police FIR Record Flagged</span>
                </div>
                {firDetails && (
                  <div className="rounded-lg border border-rose-900/60 bg-slate-950/70 p-4 space-y-2 font-mono">
                    <div className="flex justify-between text-slate-200">
                      <span>FIR No: <strong>{firDetails.firNumber}</strong></span>
                      <span>Year: {firDetails.year}</span>
                    </div>
                    <div className="text-slate-300">Station: {firDetails.policeStation}</div>
                    <div className="text-amber-300">
                      Applicable Sections: {firDetails.sections.join(", ")}
                    </div>
                    <div className="text-rose-400 font-semibold">Status: {firDetails.status}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // -------------------------------------------------------------
      // 8. COMPANY SUPREME REPORT
      // -------------------------------------------------------------
      case "company_supreme_report": {
        const cin = (data.cin as string) || "U74999MH2018PTC312345";
        const compStatus = (data.status as string) || "Active";
        const paidUp = Number(data.paidUpCapital ?? 0);
        const authorized = Number(data.authorizedCapital ?? 0);
        const netWorth = Number(data.netWorth ?? 0);
        const ebitda = Number(data.ebitdaMarginPct ?? 0);
        const debtToEquity = Number(data.debtToEquityRatio ?? 0);

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-chaan-border bg-slate-900/60 p-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Corporate Identification Number (CIN)</span>
                <div className="font-mono font-bold text-white text-base">{cin}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
                {compStatus} (MCA21)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Paid-Up Capital</span>
                <div className="mt-1 font-mono font-bold text-white">{formatINR(paidUp)}</div>
                <span className="text-[10px] text-slate-400">Auth: {formatINR(authorized)}</span>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Audited Net Worth</span>
                <div className="mt-1 font-mono font-bold text-emerald-400">{formatINR(netWorth)}</div>
                <span className="text-[10px] text-slate-400">Balance sheet verified</span>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">EBITDA Margin</span>
                <div className="mt-1 font-mono font-bold text-slate-200">{ebitda}%</div>
                <span className="text-[10px] text-slate-400">Operating profitability</span>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Debt-to-Equity</span>
                <div className={`mt-1 font-mono font-bold ${debtToEquity > 2 ? "text-rose-400" : "text-slate-200"}`}>
                  {debtToEquity}x
                </div>
                <span className="text-[10px] text-slate-400">Leverage ratio</span>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 9. DIRECTOR DETAILS
      // -------------------------------------------------------------
      case "director_details": {
        const directors = (data.directors as Array<{
          din: string;
          name: string;
          designation?: string;
          status: string;
        }>) || [];

        return (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
              <UserCheck size={14} className="text-chaan-brand" />
              MCA21 Verified Board of Directors & DIN Roster
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {directors.map((d, i) => {
                const isActive = d.status.toLowerCase() === "active";
                return (
                  <div key={i} className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{d.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          isActive
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                            : "bg-rose-950/80 text-rose-400 border border-rose-800/60"
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>DIN: {d.din}</span>
                      <span>{d.designation || "Director"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 10. MSME / UDYAM REPORT
      // -------------------------------------------------------------
      case "msme_report": {
        const udyam = (data.udyamNumber as string) || "UDYAM-MH-03-0048291";
        const entName = (data.enterpriseName as string) || "Enterprise";
        const category = (data.category as string) || "Small Enterprise";
        const valid = Boolean(data.valid);
        const activity = (data.majorActivity as string) || "Manufacturing";
        const nic = (data.nic2Digit as string) || "28 - Machinery";

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-chaan-border bg-slate-900/60 p-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Udyam Registration Number</span>
                <div className="font-mono font-bold text-white text-base">{udyam}</div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">{entName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-950/70 border border-rose-800/60 text-rose-300">
                  {category}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${valid ? "bg-emerald-950/80 border border-emerald-800/60 text-emerald-400" : "bg-rose-950/80 border border-rose-800/60 text-rose-400"}`}>
                  {valid ? "Valid & Active" : "Invalid"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Primary Operational Activity</span>
                <div className="mt-1 font-medium text-slate-200">{activity}</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">NIC 2-Digit Industrial Classification</span>
                <div className="mt-1 font-mono text-slate-200">{nic}</div>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 11. IMPORT EXPORT REPORT
      // -------------------------------------------------------------
      case "import_export_report": {
        const iec = (data.iecCode as string) || "—";
        const shipments = Number(data.activeShipments ?? 0);
        const exportUSD = Number(data.totalExportValueUSD ?? 0);
        const importUSD = Number(data.totalImportValueUSD ?? 0);
        const compliance = (data.complianceStatus as string) || "Clear";

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-chaan-border bg-slate-900/60 p-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">DGFT Importer-Exporter Code (IEC)</span>
                <div className="font-mono font-bold text-white text-base">{iec}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${compliance.includes("Clear") ? "bg-emerald-950/80 border border-emerald-800/60 text-emerald-400" : "bg-rose-950/80 border border-rose-800/60 text-rose-400"}`}>
                {compliance}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Active Shipments</span>
                <div className="mt-1 font-mono font-bold text-white text-base">{shipments}</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Export Value (USD)</span>
                <div className="mt-1 font-mono font-bold text-emerald-400 text-base">
                  ${exportUSD.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Import Value (USD)</span>
                <div className="mt-1 font-mono font-bold text-sky-400 text-base">
                  ${importUSD.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 12. IDENTITY & ADDRESS ADAPTERS
      // -------------------------------------------------------------
      case "mobile_to_pan": {
        const pan = (data.pan as string) || "—";
        const name = (data.panHolderName as string) || "—";
        const panStatus = (data.panStatus as string) || "ACTIVE";
        const seeded = Boolean(data.seededWithAadhaar);

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-4 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">NSDL Resolved PAN Record</span>
              <div className="flex items-center justify-between">
                <div className="font-mono font-bold text-xl text-white">{pan}</div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-mono">
                  {panStatus}
                </span>
              </div>
              <div className="text-xs text-slate-200 font-semibold">{name}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1">
                <CheckCircle2 size={14} />
                <span>{seeded ? "Aadhaar Seeding Verified & Active" : "Aadhaar Not Seeded"}</span>
              </div>
            </div>
          </div>
        );
      }

      case "mobile_identity":
      case "mobile_to_address": {
        const subName = (data.subscriberName as string) || "Subscriber";
        const days = Number(data.simActiveDays ?? 1000);
        const circle = (data.circle as string) || "Circle";
        const address = (data.registeredAddress as string) || "Address";
        const conf = Number(data.addressConfidence ?? 0.9);

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Verified Subscriber</span>
                <div className="mt-1 font-bold text-slate-100">{subName}</div>
                <span className="text-[10px] text-emerald-400">Telecom KYC Validated</span>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">SIM Tenure & Circle</span>
                <div className="mt-1 font-mono font-bold text-slate-200">{days} Days</div>
                <span className="text-[10px] text-slate-400">{circle}</span>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Confidence Concordance</span>
                <div className="mt-1 font-mono font-bold text-emerald-400">{Math.round(conf * 100)}%</div>
                <span className="text-[10px] text-slate-400">Geocode match score</span>
              </div>
            </div>

            <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-3.5 text-xs flex items-start gap-2.5">
              <MapPin className="text-chaan-brand shrink-0 mt-0.5" size={16} />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Registered Billing Address</span>
                <p className="text-slate-200 mt-0.5">{address}</p>
              </div>
            </div>
          </div>
        );
      }

      case "address_enrichment": {
        const conf = Number(data.addressConfidence ?? 0.95);
        const sources = (data.deliveryGraphSources as string[]) || ["Amazon", "Swiggy"];
        const cluster = (data.matchedCluster as string) || "Address";

        return (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-chaan-border bg-slate-900/60 p-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Delivery Graph Cluster Confidence</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">{Math.round(conf * 100)}%</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-3.5 flex items-start gap-2.5">
              <MapPin className="text-chaan-brand shrink-0 mt-0.5" size={16} />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Validated Hyperlocal Physical Address</span>
                <p className="text-slate-200 mt-0.5">{cluster}</p>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 13. FIND SOMEONE / SKIP TRACING
      // -------------------------------------------------------------
      case "find_someone": {
        const subject = (data.subject as string) || "Subject";
        const mobiles = (data.alternateMobiles as string[]) || [];
        const emails = (data.associatedEmails as string[]) || [];
        const locations = (data.activeGeoLocations as string[]) || [];
        const entities = (data.linkedEntities as string[]) || [];

        return (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-chaan-brand/40 bg-gradient-to-r from-rose-950/40 to-slate-900/70 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-300 uppercase font-mono">Skip Tracing Dossier Resolved</span>
                <div className="text-base font-bold text-white">{subject}</div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-mono font-semibold">
                High Traceability
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3 space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                  <Phone size={12} className="text-chaan-brand" /> Alternate Phone Numbers
                </span>
                <div className="space-y-1 font-mono text-slate-200">
                  {mobiles.map((m, idx) => (
                    <div key={idx}>{m}</div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3 space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                  <Mail size={12} className="text-chaan-brand" /> Linked Email Addresses
                </span>
                <div className="space-y-1 font-mono text-slate-200 truncate">
                  {emails.map((e, idx) => (
                    <div key={idx}>{e}</div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3 space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                  <MapPin size={12} className="text-chaan-brand" /> Active Geographic Clusters
                </span>
                <div className="space-y-1 text-slate-200">
                  {locations.map((loc, idx) => (
                    <div key={idx}>{loc}</div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3 space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                  <Building2 size={12} className="text-chaan-brand" /> Connected Corporate Entities
                </span>
                <div className="space-y-1 text-slate-200">
                  {entities.map((ent, idx) => (
                    <div key={idx}>{ent}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      default: {
        return (
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.entries(data).map(([key, val]) => (
                <div key={key} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{key}</span>
                  <div className="mt-1 font-mono font-medium text-slate-200 truncate">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-chaan-border bg-chaan-card/80 overflow-hidden">
      {/* Report Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chaan-border bg-slate-900/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="font-semibold text-white">Verified Intelligence Dossier</span>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-slate-400">{provider}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Fetched: {new Date(fetchedAt).toLocaleDateString()}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="text-chaan-brand hover:underline disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Re-query"}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition"
            title="Copy Report JSON"
          >
            <Copy size={12} />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition"
          >
            {showRawJson ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{showRawJson ? "Formatted View" : "Raw JSON"}</span>
          </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="p-4">
        {showRawJson ? (
          <div className="rounded-lg bg-slate-950 p-4 font-mono text-xs border border-slate-800 overflow-x-auto">
            <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}
