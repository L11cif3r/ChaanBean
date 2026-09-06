"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, Building2, Shield, CheckCircle, AlertTriangle, XCircle,
  Clock, ArrowRightLeft, Check
} from "lucide-react";

interface BusinessOption {
  id: string;
  companyName: string;
  gstin?: string | null;
  cin?: string | null;
  riskFlag?: { flag: string; compositeScore: number; recommendedLimit: number } | null;
}

interface DetailedBusiness {
  id: string;
  companyName: string;
  gstin?: string | null;
  cin?: string | null;
  pan?: string | null;
  udyamNo?: string | null;
  overallStatus: string;
  riskFlag?: {
    flag: string;
    compositeScore: number;
    recommendedLimit: number;
    recommendedTenor: number;
    hardRedFlags?: string | null;
  } | null;
  creditRec?: {
    creditLimit: number;
    tenor: number;
    flag: string;
    rationale: string;
    isBlocked: boolean;
  } | null;
  yearSummaries?: Array<{
    fiscalYear: string;
    revenue?: number | null;
    netProfit?: number | null;
    netMarginPct?: number | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;
  }>;
  riskSignals?: Array<{
    signalCode: string;
    label: string;
    color: string;
    score: number;
  }>;
  _count?: { financialDocuments: number; courtCases: number };
}

function fmt(val?: number | null): string {
  if (val == null) return "—";
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const FLAG_BADGE: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  GREEN: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800",
    text: "text-emerald-600",
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />
  },
  AMBER: {
    bg: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800",
    text: "text-amber-600",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />
  },
  RED: {
    bg: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800",
    text: "text-red-600",
    icon: <XCircle className="w-4 h-4 text-red-500" />
  },
};

export default function BusinessComparePage() {
  const [allBusinesses, setAllBusinesses] = useState<BusinessOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparedData, setComparedData] = useState<DetailedBusiness[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCompare, setLoadingCompare] = useState(false);

  useEffect(() => {
    fetch("/api/businesses")
      .then(res => res.json())
      .then(data => {
        const list = data.businesses || [];
        setAllBusinesses(list);
        if (list.length >= 2) {
          setSelectedIds([list[0].id, list[1].id]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (selectedIds.length < 2) {
      setComparedData([]);
      return;
    }
    setLoadingCompare(true);
    fetch("/api/businesses/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessIds: selectedIds }),
    })
      .then(res => res.json())
      .then(data => setComparedData(data.businesses || []))
      .catch(() => {})
      .finally(() => setLoadingCompare(false));
  }, [selectedIds]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter(x => x !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      } else {
        setSelectedIds([selectedIds[1], selectedIds[2], id]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--chaan-bg)] text-[var(--chaan-text)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/business-check" className="flex items-center gap-1.5 text-sm text-[var(--chaan-text-muted)] hover:text-[var(--chaan-brand)] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Business Check
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--chaan-brand)] flex items-center justify-center text-white">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--chaan-text)]">Side-by-Side Comparison</h1>
            <p className="text-sm text-[var(--chaan-text-muted)]">
              Compare up to 3 businesses across financial health, risk signals, and credit exposure
            </p>
          </div>
        </div>

        {/* Business Selector Pill Strip */}
        <div className="bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl p-4 mb-8">
          <div className="text-xs font-semibold text-[var(--chaan-text-muted)] uppercase tracking-wider mb-3">
            Select 2 or 3 Businesses to Compare ({selectedIds.length}/3 selected)
          </div>
          {loadingList ? (
            <div className="h-10 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {allBusinesses.map(b => {
                const isSelected = selectedIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleSelect(b.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? "bg-[var(--chaan-brand)]/10 border-[var(--chaan-brand)] text-[var(--chaan-brand)] font-bold shadow-sm"
                        : "bg-[var(--chaan-bg)] border-[var(--chaan-border)] text-[var(--chaan-text-muted)] hover:border-slate-400"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                      isSelected ? "border-[var(--chaan-brand)] bg-[var(--chaan-brand)] text-white" : "border-slate-400"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span>{b.companyName}</span>
                    {b.riskFlag && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        b.riskFlag.flag === "GREEN" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                        b.riskFlag.flag === "AMBER" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                        "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                      }`}>
                        {b.riskFlag.flag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Comparison Matrix */}
        {loadingCompare ? (
          <div className="p-16 text-center text-[var(--chaan-text-muted)]">
            <div className="w-8 h-8 border-2 border-[var(--chaan-brand)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>Loading comparison data…</p>
          </div>
        ) : comparedData.length < 2 ? (
          <div className="text-center py-16 text-[var(--chaan-text-muted)]">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select at least 2 businesses to compare</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparedData.map(biz => {
              const flag = biz.riskFlag?.flag || "PENDING";
              const badge = FLAG_BADGE[flag] || { bg: "bg-slate-100 text-slate-500", text: "text-slate-500", icon: <Clock className="w-4 h-4" /> };
              const latestSummary = biz.yearSummaries?.[biz.yearSummaries.length - 1];

              return (
                <div
                  key={biz.id}
                  className="bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl overflow-hidden shadow-sm flex flex-col"
                >
                  {/* Business Header */}
                  <div className="p-5 border-b border-[var(--chaan-border)] bg-[var(--chaan-bg)]/40">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base text-[var(--chaan-text)] leading-tight">{biz.companyName}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${badge.bg}`}>
                        {badge.icon}
                        {flag}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[var(--chaan-text-muted)] truncate">
                      {biz.gstin || biz.cin || biz.pan || "No ID"}
                    </div>
                  </div>

                  {/* Body Comparison Fields */}
                  <div className="p-5 space-y-4 flex-1">
                    
                    {/* Score & Limit */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--chaan-bg)] rounded-xl text-center">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-[var(--chaan-text-muted)]">Risk Score</div>
                        <div className="text-lg font-bold text-[var(--chaan-text)]">
                          {biz.riskFlag?.compositeScore != null ? `${biz.riskFlag.compositeScore}/100` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-[var(--chaan-text-muted)]">Credit Exposure</div>
                        <div className={`text-lg font-bold ${flag === "RED" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {flag === "RED" ? "BLOCKED" : fmt(biz.riskFlag?.recommendedLimit)}
                        </div>
                      </div>
                    </div>

                    {/* Financial Numbers */}
                    <div>
                      <div className="text-xs font-semibold text-[var(--chaan-text-muted)] uppercase tracking-wider mb-2">
                        Financial Profile ({latestSummary?.fiscalYear || "Latest"})
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-[var(--chaan-border)]/50">
                          <span className="text-[var(--chaan-text-muted)]">Annual Revenue</span>
                          <span className="font-semibold text-[var(--chaan-text)]">{fmt(latestSummary?.revenue)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[var(--chaan-border)]/50">
                          <span className="text-[var(--chaan-text-muted)]">Net Profit</span>
                          <span className={`font-semibold ${(latestSummary?.netProfit ?? 0) < 0 ? "text-red-500" : "text-[var(--chaan-text)]"}`}>
                            {fmt(latestSummary?.netProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[var(--chaan-border)]/50">
                          <span className="text-[var(--chaan-text-muted)]">Net Margin</span>
                          <span className="font-semibold text-[var(--chaan-text)]">
                            {latestSummary?.netMarginPct != null ? `${latestSummary.netMarginPct.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[var(--chaan-border)]/50">
                          <span className="text-[var(--chaan-text-muted)]">Current Ratio</span>
                          <span className="font-semibold text-[var(--chaan-text)]">
                            {latestSummary?.currentRatio != null ? latestSummary.currentRatio.toFixed(2) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[var(--chaan-border)]/50">
                          <span className="text-[var(--chaan-text-muted)]">Debt to Equity</span>
                          <span className="font-semibold text-[var(--chaan-text)]">
                            {latestSummary?.debtToEquity != null ? latestSummary.debtToEquity.toFixed(2) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Due Diligence & Records */}
                    <div>
                      <div className="text-xs font-semibold text-[var(--chaan-text-muted)] uppercase tracking-wider mb-2">
                        Verification & Diligence
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-[var(--chaan-border)]/50">
                          <span className="text-[var(--chaan-text-muted)]">Udyam Registration</span>
                          <span className="font-semibold text-[var(--chaan-text)]">{biz.udyamNo ? "Verified" : "None"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[var(--chaan-border)]/50">
                          <span className="text-[var(--chaan-text-muted)]">Court Cases</span>
                          <span className={`font-semibold ${(biz._count?.courtCases ?? 0) > 0 ? "text-red-500" : "text-[var(--chaan-text)]"}`}>
                            {biz._count?.courtCases ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-[var(--chaan-text-muted)]">Uploaded Documents</span>
                          <span className="font-semibold text-[var(--chaan-text)]">{biz._count?.financialDocuments ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Rationale */}
                    {biz.creditRec && (
                      <div className="p-3 bg-[var(--chaan-bg)] rounded-xl text-xs text-[var(--chaan-text-muted)]">
                        <div className="font-semibold text-[var(--chaan-text)] mb-1">Decision Summary:</div>
                        <p className="line-clamp-3">{biz.creditRec.rationale}</p>
                      </div>
                    )}
                  </div>

                  {/* Profile Link */}
                  <div className="p-4 border-t border-[var(--chaan-border)] bg-[var(--chaan-bg)]/20 text-center">
                    <Link
                      href={`/business-check/${biz.id}`}
                      className="text-xs font-semibold text-[var(--chaan-brand)] hover:underline inline-block"
                    >
                      View Full Profile &amp; Audit Trail →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
