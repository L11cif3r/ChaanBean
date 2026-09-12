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
  GraduationCap,
  PhoneForwarded,
  Smartphone,
  Landmark,
  Award,
  Activity,
  KeyRound,
  Users,
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
      // GST MONTHLY FILINGS (12-MONTH CALENDAR)
      // -------------------------------------------------------------
      case "gst_monthly_filings": {
        const gstin = (data.gstin as string) || report.subjectId;
        const fy = (data.financialYear as string) || "FY 2024-25";
        const regularity = Number(data.filingRegularityPct ?? 100);
        const onTime = Number(data.onTimeCount ?? 12);
        const delayed = Number(data.delayedCount ?? 0);
        const missing = Number(data.missingCount ?? 0);
        const months = (data.months as Array<{
          month: string;
          gstr1Status: string;
          gstr1Date: string;
          gstr1Arn: string;
          gstr3bStatus: string;
          gstr3bDate: string;
          gstr3bArn: string;
          taxableTurnover: number;
          taxPaid: number;
        }>) || [];

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Filing Regularity</span>
                <div className="mt-1 text-xl font-bold font-mono text-emerald-400">{regularity}%</div>
                <p className="mt-1 text-[11px] text-slate-400">{onTime} of 12 on time</p>
              </div>
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Delayed Filings</span>
                <div className="mt-1 text-xl font-bold font-mono text-amber-400">{delayed}</div>
                <p className="mt-1 text-[11px] text-slate-400">Late fee applicable</p>
              </div>
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Non-Filed Months</span>
                <div className="mt-1 text-xl font-bold font-mono text-rose-400">{missing}</div>
                <p className="mt-1 text-[11px] text-slate-400">High delinquency flag</p>
              </div>
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Period / GSTIN</span>
                <div className="mt-1 text-sm font-bold font-mono text-white truncate">{fy}</div>
                <p className="mt-1 text-[11px] font-mono text-slate-400 truncate">{gstin}</p>
              </div>
            </div>

            {/* 12-Month Calendar Grid */}
            <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-chaan-brand" />
                  12-Month GSTR-1 &amp; GSTR-3B Return Compliance Ledger
                </span>
                <span className="text-[11px] text-slate-400 font-mono">All 12 Months Audited</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {months.map((m, idx) => {
                  const isLate = m.gstr3bStatus.includes("Delayed");
                  const isMissing = m.gstr3bStatus.includes("Not Filed");
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-2.5 space-y-1.5 transition ${
                        isMissing
                          ? "border-rose-800/60 bg-rose-950/20"
                          : isLate
                          ? "border-amber-800/60 bg-amber-950/20"
                          : "border-slate-800 bg-slate-950/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-white">{m.month}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            isMissing
                              ? "bg-rose-900/60 text-rose-300 border border-rose-700/50"
                              : isLate
                              ? "bg-amber-900/60 text-amber-300 border border-amber-700/50"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                          }`}
                        >
                          {m.gstr3bStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-400">
                        <div>
                          <span className="text-[10px] text-slate-500">GSTR-1:</span> {m.gstr1Date}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500">GSTR-3B:</span> {m.gstr3bDate}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] font-mono">
                        <span className="text-slate-400">Turnover: <strong className="text-slate-200">{formatINR(m.taxableTurnover)}</strong></span>
                        <span className="text-slate-400">Tax: <strong className="text-emerald-400">{formatINR(m.taxPaid)}</strong></span>
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
      // PAN TO GST NUMBER DIRECTORY
      // -------------------------------------------------------------
      case "pan_to_gst": {
        const pan = (data.pan as string) || "AAECG1234H";
        const legalName = (data.legalName as string) || "Corporate Legal Entity";
        const total = Number(data.totalRegistrations ?? 1);
        const gstins = (data.gstins as Array<{
          gstin: string;
          state: string;
          tradeName: string;
          status: string;
          address: string;
          registrationDate: string;
        }>) || [];

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Target Corporate PAN</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{pan}</div>
                <p className="text-xs text-slate-300 font-medium">{legalName}</p>
              </div>
              <div className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 border border-slate-700">
                Total Multi-State GSTINs: <strong className="text-emerald-400">{total} Active</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gstins.map((g, idx) => (
                <div key={idx} className="rounded-xl border border-chaan-border bg-slate-900/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white">{g.gstin}</span>
                    <span className="rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono font-bold">
                      {g.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200">{g.state}</div>
                  <p className="text-[11px] text-slate-400 truncate">{g.tradeName}</p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-800">
                    Registered: {g.registrationDate} · {g.address}
                  </div>
                </div>
              ))}
            </div>
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
      // 13. FIND SOMEONE / SKIP TRACING (OMNITRACE 360™)
      // -------------------------------------------------------------
      case "find_someone": {
        const subject = (data.subject as string) || "Subject";
        const trace = (data.traceabilityScore as string) || "94%";
        const addresses = (data.address as any) || {};
        const bank = (data.bankPaymentDetails as any) || {};
        const appMobiles = (data.ecommerceAndAppMobiles as any) || {};
        const altSources = (data.alternateNumbersFromSources as any) || {};
        const financials = (data.companyFinancialsAndBureaus as any) || {};

        return (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-chaan-brand/40 bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-slate-900/80 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-rose-300 uppercase font-mono tracking-wider flex items-center gap-1.5 font-bold">
                  <Sparkles size={13} className="text-chaan-brand" />
                  OmniTrace 360™ Skip Tracing &amp; Financial Dossier Resolved
                </span>
                <div className="text-lg font-bold text-white mt-0.5">{subject}</div>
                <p className="text-xs text-slate-300 font-mono">
                  Trace Confidence: <strong className="text-emerald-400">{trace}</strong> · Multi-Network Sync Active
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Dossier Verified
              </span>
            </div>

            {/* 1. Address & Physical Operational Verification */}
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                <MapPin size={14} className="text-chaan-brand" />
                Physical Address &amp; Delivery Cluster
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Registered Office Address</span>
                  <div className="text-slate-200">{addresses.registered || "MIDC Industrial Area, Andheri East, Mumbai 400093"}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-mono">Operational Delivery Address (Hyperlocal)</span>
                  <div className="text-slate-200">{addresses.operational || "Unit 402, Trade Link Tower, Lower Parel, Mumbai 400013"}</div>
                </div>
              </div>
            </div>

            {/* 2. Bank Payment Origins */}
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                <Landmark size={14} className="text-chaan-brand" />
                From Which Bank He Has Made Payment (Payment Origins &amp; Historical Accounts)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Primary Remitting Bank</span>
                  <div className="font-bold text-white text-sm">{bank.primaryBank || "HDFC Bank Ltd"}</div>
                  <div className="text-[11px] font-mono text-slate-400">A/C: <strong className="text-slate-200">{bank.accountNumberMasked || "••••••••4891"}</strong></div>
                  <div className="text-[11px] font-mono text-slate-500">IFSC: {bank.ifscCode || "HDFC0000240"}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Secondary / Vendor A/C</span>
                  <div className="font-bold text-white text-sm">{bank.secondaryBank || "State Bank of India (SBI)"}</div>
                  <div className="text-[11px] font-mono text-slate-400">A/C: <strong className="text-slate-200">••••••••9012</strong></div>
                  <div className="text-[11px] font-mono text-slate-500">IFSC: SBIN0001421</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Recent UTR Transaction Origin</span>
                  <div className="font-bold text-emerald-400 text-xs font-mono">{bank.lastPaymentUtr || "HDFCR52026090184920"}</div>
                  <div className="text-[11px] font-mono text-slate-400">Mode: <strong className="text-slate-200">{bank.paymentMode || "RTGS / Net Banking"}</strong></div>
                  <div className="text-[11px] text-slate-500">Verified against settlement receipts</div>
                </div>
              </div>
            </div>

            {/* 3. Mobiles Used Across Delivery & Consumer Apps */}
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Smartphone size={14} className="text-chaan-brand" />
                  Mobile Numbers Used Across Consumer &amp; Delivery Apps
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Live Delivery Graph Mapped</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { name: "Amazon", phone: appMobiles.amazon || "+91 9876543210", tag: "Primary E-Com" },
                  { name: "Swiggy", phone: appMobiles.swiggy || "+91 9876543210", tag: "Food & Instamart" },
                  { name: "Meesho", phone: appMobiles.meesho || "+91 97110 43210", tag: "Wholesale & Resale" },
                  { name: "Zomato", phone: appMobiles.zomato || "+91 9876543210", tag: "Daily Food Orders" },
                  { name: "Blinkit", phone: appMobiles.blinkit || "+91 9876543210", tag: "Quick Commerce" },
                  { name: "Paytm", phone: appMobiles.paytm || "+91 98201 43210", tag: "Merchant UPI / Wallet" },
                  { name: "Zepto", phone: appMobiles.zepto || "+91 9876543210", tag: "10-Min Delivery" },
                  { name: "WhatsApp", phone: appMobiles.whatsapp || "+91 9876543210", tag: "Active Instant Chat" },
                ].map((app, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{app.name}</span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">{app.tag}</span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-emerald-400">{app.phone}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Alternate Numbers from GST Portal & Bureaus */}
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                <Phone size={14} className="text-chaan-brand" />
                All Alternate Numbers from GST Portal, CIBIL, Experian, CRIF &amp; Other Apps
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">GST Portal Profile</span>
                  <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">{altSources.gstPortal || "+91 98201 43210"}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">CIBIL Registered</span>
                  <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">{altSources.cibil || "+91 97110 43210"}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Experian Active</span>
                  <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">{altSources.experian || "+91 98672 43210"}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">CRIF High Mark</span>
                  <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">{altSources.crif || "+91 98765 43210"}</div>
                </div>
              </div>
              {Array.isArray(altSources.otherApps) && altSources.otherApps.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-[11px] text-slate-500">Other Application Linked Numbers:</span>
                  {altSources.otherApps.map((num: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {num}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Company Financials & Tri-Bureau Commercial Reports (CIBIL, Experian, CRIF) */}
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Scale size={14} className="text-chaan-brand" />
                  Company Financials &amp; Tri-Bureau Commercial Intelligence (CIBIL · Experian · CRIF)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Multi-Bureau Commercial Exchange</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* CIBIL Commercial */}
                <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">CIBIL Commercial</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-800">
                      {financials.cibil?.band || "Good"}
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {financials.cibil?.score || 715}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                    <div>Trade Lines: <strong className="text-slate-200">{financials.cibil?.activeTradeLines || 12} Active</strong></div>
                    <div>Credit Utilization: <strong className="text-slate-200">{financials.cibil?.utilizationPct || 44}%</strong></div>
                  </div>
                </div>

                {/* Experian Commercial */}
                <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Experian Commercial</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-800">
                      {financials.experian?.band || "Good"}
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {financials.experian?.score || 730}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                    <div>Trade Lines: <strong className="text-slate-200">{financials.experian?.activeTradeLines || 14} Active</strong></div>
                    <div>Credit Utilization: <strong className="text-slate-200">{financials.experian?.utilizationPct || 38.5}%</strong></div>
                  </div>
                </div>

                {/* CRIF High Mark Commercial */}
                <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">CRIF High Mark</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-800">
                      {financials.crif?.band || "Good"}
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {financials.crif?.score || 722}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                    <div>Repayment Index: <strong className="text-emerald-400">{financials.crif?.repaymentIndex || "94%"}</strong></div>
                    <div>Active Trade Lines: <strong className="text-slate-200">{financials.crif?.activeTradeLines || 11}</strong></div>
                  </div>
                </div>
              </div>

              {/* Corporate Turnover & Net Worth Summary */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Estimated Annual Turnover</span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {formatINR(financials.annualTurnoverEst || 36500000)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Audited Net Worth</span>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {formatINR(financials.netWorth || 38500000)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // TRUST HUB & TRUST ID VERIFICATION
      // -------------------------------------------------------------
      case "trust_hub_verification": {
        const trustId = (data.trustId as string) || "TRUST-CB-001";
        const score = Number(data.trustScore ?? 90);
        const credibilityBand = (data.credibilityBand as string) || "Tier 1 - Verified Enterprise";
        const badges = (data.complianceBadges as string[]) || [];
        const peer = (data.peerDefaultCheck as { hasActiveDefault: boolean; registryStatus: string; reportedDefaultsCount: number }) || {
          hasActiveDefault: false,
          registryStatus: "Clear",
          reportedDefaultsCount: 0,
        };
        const seal = (data.cryptographicSeal as string) || "864aa8d2558641ab";

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-brand/40 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/80 p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={20} />
                  <span className="text-xs font-mono uppercase text-emerald-400 font-bold">ChaanBean Trust Network Seal</span>
                </div>
                <div className="text-xl font-black text-white font-mono">{trustId}</div>
                <p className="text-xs text-slate-300 font-medium">{credibilityBand}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Trust Score</div>
                  <div className={`text-3xl font-black font-mono ${score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                    {score}/100
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                  <Award size={14} className="text-chaan-brand" />
                  Verified Compliance Badges
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((b, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 text-xs text-emerald-300 font-medium">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border p-4 space-y-2 ${peer.hasActiveDefault ? "border-rose-800/60 bg-rose-950/20" : "border-chaan-border bg-slate-900/50"}`}>
                <h4 className="text-xs font-semibold uppercase font-mono flex items-center gap-2 text-slate-200">
                  <Scale size={14} className={peer.hasActiveDefault ? "text-rose-400" : "text-emerald-400"} />
                  Peer Default Community Registry
                </h4>
                <div className="text-xs text-slate-200 font-medium">{peer.registryStatus}</div>
                <div className="text-[11px] font-mono text-slate-400">Reported defaults: {peer.reportedDefaultsCount}</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                SHA-256 Cryptographic Seal:
              </span>
              <span className="text-slate-300 font-semibold">{seal}</span>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // 10TH AND 12TH MARKSHEETS VERIFICATION
      // -------------------------------------------------------------
      case "education_marksheet_check": {
        const candidate = (data.verifiedCandidate as string) || "Director";
        const din = (data.directorDin as string) || "08492018";
        const c10 = (data.class10 as any) || {};
        const c12 = (data.class12 as any) || {};
        const overall = (data.overallEducationalCheck as string) || "Verified Authentic";

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-brand/40 bg-gradient-to-r from-sky-950/40 via-slate-900/80 to-slate-900/80 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-sky-400 font-bold">National Academic Depository (NAD) &amp; CBSE</span>
                <div className="text-lg font-bold text-white mt-0.5">{candidate}</div>
                <p className="text-xs text-slate-300 font-mono">DIN: {din}</p>
              </div>
              <span className="rounded-lg bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                {overall}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class 10 Card */}
              <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-white uppercase font-mono flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-sky-400" />
                    Class 10th Secondary School Certificate
                  </span>
                  <span className="rounded bg-sky-950 text-sky-300 text-[10px] font-mono px-2 py-0.5 border border-sky-800/60 font-bold">
                    {c10.passingYear || 2008}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">Board</span><div className="font-medium text-slate-200">{c10.board}</div></div>
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">Roll Number</span><div className="font-mono font-bold text-white">{c10.rollNumber}</div></div>
                  <div className="col-span-2"><span className="text-[10px] text-slate-400 uppercase font-mono">School</span><div className="text-slate-300 truncate">{c10.schoolName}</div></div>
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">Result &amp; Score</span><div className="font-bold text-emerald-400">{c10.score}</div></div>
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">NAD Hash</span><div className="font-mono text-slate-300 text-[11px] truncate">{c10.verificationHash}</div></div>
                </div>
              </div>

              {/* Class 12 Card */}
              <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-white uppercase font-mono flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-sky-400" />
                    Class 12th Senior Secondary Certificate
                  </span>
                  <span className="rounded bg-sky-950 text-sky-300 text-[10px] font-mono px-2 py-0.5 border border-sky-800/60 font-bold">
                    {c12.passingYear || 2010}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">Board &amp; Stream</span><div className="font-medium text-slate-200">{c12.stream}</div></div>
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">Roll Number</span><div className="font-mono font-bold text-white">{c12.rollNumber}</div></div>
                  <div className="col-span-2"><span className="text-[10px] text-slate-400 uppercase font-mono">School</span><div className="text-slate-300 truncate">{c12.schoolName}</div></div>
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">Result &amp; Score</span><div className="font-bold text-emerald-400">{c12.score}</div></div>
                  <div><span className="text-[10px] text-slate-400 uppercase font-mono">NAD Hash</span><div className="font-mono text-slate-300 text-[11px] truncate">{c12.verificationHash}</div></div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // VOICE CALL CADENCE (1m / 2m / 5m / 30m / 1h)
      // -------------------------------------------------------------
      case "voice_call_cadence": {
        const debtor = (data.targetDebtor as string) || "Target Debtor";
        const phone = (data.targetPhone as string) || "+91 9876543210";
        const activeCadence = (data.activeCadence as string) || "Every 30 Mins";
        const cadences = (data.availableCadences as string[]) || [];
        const carrier = (data.telephonyCarrier as string) || "Asterisk 20 LTS / Vobiz SIP";
        const calls = Number(data.totalCallsDispatched ?? 8);
        const lastOutcome = (data.lastCallOutcome as string) || "Answered";

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900/80 to-slate-900/80 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold">Asterisk / Vobiz Automated Outbound Desk</span>
                <div className="text-lg font-bold text-white mt-0.5">{debtor}</div>
                <p className="text-xs text-slate-300 font-mono">Target Phone: {phone}</p>
              </div>
              <div className="rounded-lg bg-amber-950/80 border border-amber-800/60 px-3 py-1.5 text-xs text-amber-300 font-mono font-bold">
                Active: {activeCadence}
              </div>
            </div>

            <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-2.5">
              <span className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-1.5">
                <Clock size={14} className="text-amber-400" />
                Configured Cadence Intervals (1m / 2m / 5m / 30m / 1h)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {cadences.map((c, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-2 text-xs font-mono transition border ${
                      c.includes("30 Mins") || c === activeCadence
                        ? "bg-amber-950/60 border-amber-500/50 text-amber-200 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Calls Dispatched</span>
                <div className="mt-1 font-mono font-bold text-white text-base">{calls} Attempts</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Dialing Window</span>
                <div className="mt-1 text-slate-200 font-medium">CALL ALL TIME (24/7)</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Telephony Trunk</span>
                <div className="mt-1 font-mono text-slate-200 truncate">{carrier}</div>
              </div>
              <div className="rounded-lg border border-chaan-border bg-slate-900/60 p-3">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Last Call Outcome</span>
                <div className="mt-1 text-emerald-400 font-medium truncate">{lastOutcome}</div>
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // LEGAL NOTICES SUITE (GST, MSME, INCOME TAX & DEMAND)
      // -------------------------------------------------------------
      case "legal_notice_suite": {
        const debtor = (data.targetDebtor as string) || "Debtor";
        const debt = Number(data.outstandingDebt ?? 890000);
        const notices = (data.notices as Array<{
          noticeType: string;
          statutorySection: string;
          govReferenceId: string;
          authorityReported: string;
          consequence: string;
          status: string;
        }>) || [];
        const govSummary = (data.governmentReportingSummary as any) || {};

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-slate-900/80 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-rose-400 font-bold">Statutory 4-Notice Regulatory Suite</span>
                <div className="text-lg font-bold text-white mt-0.5">{debtor}</div>
                <p className="text-xs text-slate-300">Total Statutory Claim: <strong className="text-rose-400 font-mono">{formatINR(debt)}</strong></p>
              </div>
              <div className="rounded-lg bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Officially Reported to IT &amp; GST Depts
              </div>
            </div>

            {/* 4 Notices Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notices.map((n, idx) => (
                <div key={idx} className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{n.noticeType}</span>
                    <span className="rounded bg-rose-950 text-rose-300 border border-rose-800/60 px-2 py-0.5 text-[10px] font-mono font-bold">
                      {n.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{n.statutorySection}</div>
                  <div className="rounded bg-slate-950 p-2 border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="text-slate-400">Gov Ref ID:</span>
                    <span className="text-emerald-400 font-bold">{n.govReferenceId}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-300">Authority:</strong> {n.authorityReported}
                  </div>
                  <div className="text-[11px] text-rose-300 bg-rose-950/30 p-2 rounded border border-rose-900/40">
                    <strong>Statutory Consequence:</strong> {n.consequence}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <span>Income Tax Ack: <strong className="text-emerald-400">{govSummary.incomeTaxAckRef || "ITD-DISPUTE-ACK-84920"}</strong></span>
              <span>GST Portal Ack: <strong className="text-emerald-400">{govSummary.gstPortalAckRef || "GSTN-DRC-01A-94821"}</strong></span>
              <span>Legal Admissibility: <strong className="text-slate-200">BSA 2023 §63</strong></span>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // DELAYED PAYMENTS FOLLOW-UP
      // -------------------------------------------------------------
      case "delayed_payment_followup": {
        const debtor = (data.debtorName as string) || "Debtor";
        const amount = Number(data.outstandingAmount ?? 890000);
        const days = Number(data.daysOverdue ?? 30);
        const bucket = (data.agingBucket as string) || "31-45 Days";
        const promiseDate = (data.promisedPaymentDate as string) || "2026-09-22";
        const collector = (data.collectorAssigned as string) || "Collections Lead";
        const timeline = (data.escalationTimeline as Array<{ day: string; channel: string; status: string; detail: string }>) || [];

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Overdue Balance</span>
                <div className="mt-1 text-lg font-bold font-mono text-white">{formatINR(amount)}</div>
                <p className="mt-1 text-[11px] text-slate-400">{debtor}</p>
              </div>
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Aging Bucket</span>
                <div className="mt-1 text-sm font-bold font-mono text-amber-400">{days} Days Overdue</div>
                <p className="mt-1 text-[11px] text-slate-400">{bucket}</p>
              </div>
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Promise to Pay</span>
                <div className="mt-1 text-sm font-bold font-mono text-emerald-400">{promiseDate}</div>
                <p className="mt-1 text-[11px] text-slate-400">Verbally recorded</p>
              </div>
              <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-3.5">
                <span className="text-[11px] text-slate-400 uppercase font-mono">Officer Assigned</span>
                <div className="mt-1 text-xs font-bold text-white truncate">{collector}</div>
                <p className="mt-1 text-[11px] text-slate-400">Senior Recovery Lead</p>
              </div>
            </div>

            <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                <Activity size={14} className="text-chaan-brand" />
                Multi-Channel Escalation Touchpoint History
              </h4>
              <div className="space-y-2">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-chaan-brand text-[11px]">{item.day}</span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">{item.channel}</span>
                      <span className="text-slate-200 text-xs">{item.detail}</span>
                    </div>
                    <span className="rounded bg-emerald-950 text-emerald-400 px-2 py-0.5 text-[10px] font-mono border border-emerald-800/60 font-semibold">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // USER ACCESS 5 SEATS PER SUBSCRIPTION
      // -------------------------------------------------------------
      case "subscription_seats": {
        const plan = (data.planName as string) || "Growth Enterprise Subscription";
        const included = Number(data.totalIncludedSeats ?? 5);
        const active = Number(data.activeSeatsCount ?? 4);
        const available = Number(data.availableSeatsCount ?? 1);
        const seats = (data.seats as Array<{ name: string; email: string; role: string; status: string; permissions: string }>) || [];

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-border bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Included Subscription Benefit</span>
                <div className="text-lg font-bold text-white mt-0.5">{plan}</div>
                <p className="text-xs text-emerald-400 font-semibold">5 Organization Seats Included at ₹0 Additional Cost</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 border border-slate-700">
                  {active} of {included} Seats Active ({available} Invite Left)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {seats.map((s, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-chaan-border bg-slate-900/40 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{s.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-medium text-slate-200 text-xs">{s.role}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.permissions}</div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${s.status === "Active" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-sky-950 text-sky-400 border border-sky-800"}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // -------------------------------------------------------------
      // ADD ADDITIONAL COMPANY NAME (₹1,500)
      // -------------------------------------------------------------
      case "additional_company_addon": {
        const title = (data.featureTitle as string) || "Add Additional Company Name";
        const fee = Number(data.addOnFeeINR ?? 1500);
        const primary = (data.primaryRegisteredCompany as string) || "Primary Company";
        const activeCompanies = (data.activeAddOnCompanies as Array<{
          companyName: string;
          gstin: string;
          cin: string;
          state: string;
          addedAt: string;
          feeBilled: string;
          monitoringStatus: string;
        }>) || [];

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-chaan-brand/40 bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-slate-900/80 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono text-rose-300 font-bold">Multi-Entity Corporate Desk</span>
                <div className="text-xl font-bold text-white mt-0.5">{title}</div>
                <p className="text-xs text-slate-300">Primary Monitored Entity: <strong className="text-white">{primary}</strong></p>
              </div>
              <div className="rounded-xl bg-slate-950/90 border border-slate-700 p-3 text-right">
                <div className="text-[10px] uppercase font-mono text-slate-400">Add-On Pricing</div>
                <div className="text-2xl font-black text-rose-400 font-mono">₹{fee.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-slate-400">One-Time Setup Fee</div>
              </div>
            </div>

            <div className="rounded-xl border border-chaan-border bg-slate-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
                  <Building2 size={14} className="text-chaan-brand" />
                  Active Monitored Sister Concerns &amp; Add-On Companies
                </span>
                <span className="text-xs font-mono text-emerald-400">{activeCompanies.length} Enrolled</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCompanies.map((c, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{c.companyName}</span>
                      <span className="rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono">
                        {c.monitoringStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-400">
                      <div>GSTIN: <span className="text-slate-200">{c.gstin}</span></div>
                      <div>State: <span className="text-slate-200">{c.state}</span></div>
                      <div>CIN: <span className="text-slate-200">{c.cin}</span></div>
                      <div>Fee: <span className="text-emerald-400">{c.feeBilled}</span></div>
                    </div>
                  </div>
                ))}
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
