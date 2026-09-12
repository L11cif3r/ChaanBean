"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { RiskFlagBadge } from "@/components/ui";
import Link from "next/link";

interface RiskRadarExpandableProps {
  flagCounts: { green: number; amber: number; red: number };
  defaultExpanded?: boolean;
}

export function RiskRadarExpandable({
  flagCounts,
  defaultExpanded = false,
}: RiskRadarExpandableProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden shadow-sm">
      {/* Header bar that triggers toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-50 dark:bg-[#FC8019]/15 border border-orange-200 dark:border-[#FC8019]/30 flex items-center justify-center text-[#FC8019] shrink-0 shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                Deterministic Credit Risk Flag Radar
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-50 dark:bg-[#FC8019]/15 border border-orange-200 dark:border-[#FC8019]/30 text-[#FC8019] font-bold">
                17 Signals
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Definitions &amp; instruction rules — how Green, Amber, and Red flags are differentiated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Portfolio quick status chips when collapsed */}
          {!isExpanded && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg">
                {flagCounts.green} Safe
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-lg">
                {flagCounts.amber} Caution
              </span>
              <span className="text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded-lg">
                {flagCounts.red} Alert
              </span>
            </div>
          )}

          {/* Expand/Collapse Icon Button */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-[#FC8019]/40 hover:bg-orange-50/50 dark:hover:bg-[#FC8019]/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FC8019] transition shadow-sm"
          >
            <span>{isExpanded ? "Collapse" : "Expand Definitions"}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Instruction Body */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Synthesizes 17 statutory verification signals into instant, explainable credit recommendations with zero black-box scoring. Review the differentiating criteria and mandatory credit policies below:
            </p>
            <Link
              href="/debtors"
              className="text-xs font-semibold text-[#FC8019] hover:underline flex items-center gap-1"
            >
              Inspect Full Portfolio →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* GREEN CARD */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-gradient-to-b dark:from-emerald-950/30 dark:to-slate-900/60 p-5 space-y-3.5 transition-all hover:border-emerald-500/50 shadow-sm">
              <div className="flex items-center justify-between">
                <RiskFlagBadge flag="green" />
                <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">{flagCounts.green}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase font-mono tracking-wider block">
                  Low Default Risk ({"<"} 2.4% Probability)
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Clean profile: 100% GSTR-3B filing regularity over 12 months, zero adverse litigation records in e-Courts, valid Udyam MSME certificate, active GSTIN without cancellation.
                </p>
              </div>
              <div className="pt-2.5 border-t border-emerald-200 dark:border-emerald-900/50 text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                ✓ <strong>Policy:</strong> Standard 45-day commercial credit approved up to sanctioned exposure limit under MSMED Act §15.
              </div>
            </div>

            {/* AMBER CARD */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-gradient-to-b dark:from-amber-950/30 dark:to-slate-900/60 p-5 space-y-3.5 transition-all hover:border-amber-500/50 shadow-sm">
              <div className="flex items-center justify-between">
                <RiskFlagBadge flag="amber" />
                <span className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400">{flagCounts.amber}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase font-mono tracking-wider block">
                  Moderate Friction / Enhanced Monitoring
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Filing inconsistencies detected: occasional GSTR-3B filing lapses, fluctuating bank revenue, or payment delays beyond 30 days.
                </p>
              </div>
              <div className="pt-2.5 border-t border-amber-200 dark:border-amber-900/50 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                ⚠ <strong>Policy:</strong> Capped at 30-day tenor and 45% standard limit with proactive automated payment reminders.
              </div>
            </div>

            {/* RED CARD */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-gradient-to-b dark:from-rose-950/30 dark:to-slate-900/60 p-5 space-y-3.5 transition-all hover:border-rose-500/50 shadow-sm">
              <div className="flex items-center justify-between">
                <RiskFlagBadge flag="red" />
                <span className="text-2xl font-black font-mono text-rose-700 dark:text-rose-400">{flagCounts.red}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase font-mono tracking-wider block">
                  Hard Stop / Credit Blocked Immediately
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Critical triggers: peer-reported commercial default in Community Default Registry, Section 138 NI Act cheque bounce FIR, or active NCLT litigation.
                </p>
              </div>
              <div className="pt-2.5 border-t border-rose-200 dark:border-rose-900/50 text-[11px] font-mono text-rose-800 dark:text-rose-300">
                ⛔ <strong>Policy:</strong> Credit blocked (₹0 limit). Enforce 100% advance payment or trigger statutory MSMED recovery.
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
