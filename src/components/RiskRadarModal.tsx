"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
  Scale,
  FileCheck2,
  HelpCircle,
} from "lucide-react";
import { RiskFlagBadge } from "@/components/ui";

interface RiskRadarModalProps {
  flagCounts?: { green: number; amber: number; red: number };
  triggerVariant?: "button" | "badge" | "icon" | "floating";
  className?: string;
}

export function RiskRadarModal({
  flagCounts,
  triggerVariant = "button",
  className = "",
}: RiskRadarModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Trigger options based on triggerVariant */}
      {triggerVariant === "button" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-[#FC8019]/50 hover:text-[#FC8019] hover:bg-orange-50/50 dark:hover:bg-[#FC8019]/10 transition shadow-sm ${className}`}
          title="Click to view Green, Amber, and Red risk flag definitions & instructions"
        >
          <Sparkles size={13} className="text-[#FC8019]" />
          <span>Risk Flag Criteria &amp; Definitions</span>
          <HelpCircle size={12} className="text-slate-400" />
        </button>
      )}

      {triggerVariant === "badge" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 rounded-lg bg-orange-50 dark:bg-[#FC8019]/10 border border-orange-200 dark:border-[#FC8019]/30 px-2 py-0.5 text-[10px] font-mono text-[#FC8019] hover:bg-orange-100 dark:hover:bg-[#FC8019]/20 font-semibold transition ${className}`}
          title="Click to view Green, Amber, and Red risk flag definitions & instructions"
        >
          <Sparkles size={10} />
          <span>Criteria Guide</span>
        </button>
      )}

      {triggerVariant === "icon" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-[#FC8019] hover:border-[#FC8019]/40 transition shadow-sm ${className}`}
          title="Risk Flag Criteria & Definitions"
        >
          <Sparkles size={14} className="text-[#FC8019]" />
        </button>
      )}

      {triggerVariant === "floating" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-orange-200 dark:border-[#FC8019]/40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white shadow-xl shadow-orange-500/15 hover:bg-[#FC8019] hover:border-[#FC8019] hover:text-white transition-all group ${className}`}
          title="Click to inspect how Green, Amber, and Red credit risk flags are differentiated"
        >
          <Sparkles size={14} className="text-[#FC8019] group-hover:text-white transition-colors" />
          <span className="tracking-wide">Risk Flag Instructions</span>
        </button>
      )}

      {/* Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] text-slate-900 dark:text-white shadow-2xl p-6 sm:p-7 space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FC8019]/15 border border-[#FC8019]/30 flex items-center justify-center text-[#FC8019] shrink-0 shadow-sm shadow-[#FC8019]/20">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Deterministic Credit Risk Flag Radar
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Statutory definitions &amp; instruction rules — how Green, Amber, and Red flags are differentiated
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Context Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200">
                <Info size={13} className="text-[#FC8019]" />
                <span>Zero Black-Box Scoring Principle</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Every flag is 100% deterministically calculated from authentic government registries (MCA21, GSTN, e-Courts, MSME Udyam) and verified financial documents. No synthetic or randomized values.
              </p>
            </div>

            {/* 3 Detailed Instruction Cards */}
            <div className="space-y-4">
              {/* GREEN FLAG CARD */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-gradient-to-b dark:from-emerald-950/40 dark:to-slate-900/60 p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <RiskFlagBadge flag="green" size="md" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase font-mono tracking-wider">
                      Low Default Risk ({"<"} 2.4% Probability)
                    </span>
                  </div>
                  {flagCounts && (
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800">
                      {flagCounts.green} in Portfolio
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 block">Differentiating Criteria:</span>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Clean regulatory profile: 100% GSTR-3B filing regularity over the past 12 months, zero adverse litigation in e-Courts (Section 138 NI Act or IBC), valid Udyam MSME certification, active GSTIN without cancellation, and commercial bureau score $\ge 700$.
                  </p>
                </div>

                <div className="pt-2.5 border-t border-emerald-200 dark:border-emerald-900/60 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 space-y-0.5">
                  <p>✓ <strong>Statutory Credit Policy:</strong> Standard 45-day commercial trade credit approved up to sanctioned exposure limit.</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">Normal invoice payment terms apply under Section 15 of MSMED Act, 2006.</p>
                </div>
              </div>

              {/* AMBER FLAG CARD */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-gradient-to-b dark:from-amber-950/40 dark:to-slate-900/60 p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <RiskFlagBadge flag="amber" size="md" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase font-mono tracking-wider">
                      Moderate Friction / Enhanced Monitoring
                    </span>
                  </div>
                  {flagCounts && (
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950 border border-amber-300 dark:border-amber-800">
                      {flagCounts.amber} in Portfolio
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 block">Differentiating Criteria:</span>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Filing inconsistencies detected: occasional GSTR-3B filing lapses, delayed annual returns, fluctuating bank revenue, historical payment delays beyond 30 days, or a thin bureau trade credit file.
                  </p>
                </div>

                <div className="pt-2.5 border-t border-amber-200 dark:border-amber-900/60 text-[11px] font-mono text-amber-800 dark:text-amber-300 space-y-0.5">
                  <p>⚠ <strong>Statutory Credit Policy:</strong> Capped at 30-day tenor and 45% of standard credit limit. Proactive automated reminders enabled.</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">L1 WhatsApp and Email soft statements scheduled ahead of invoice due dates.</p>
                </div>
              </div>

              {/* RED FLAG CARD */}
              <div className="rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-gradient-to-b dark:from-rose-950/40 dark:to-slate-900/60 p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <RiskFlagBadge flag="red" size="md" />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase font-mono tracking-wider">
                      Hard Stop / Credit Blocked Immediately
                    </span>
                  </div>
                  {flagCounts && (
                    <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 px-2.5 py-0.5 rounded-full bg-rose-100/80 dark:bg-rose-950 border border-rose-300 dark:border-rose-800">
                      {flagCounts.red} in Portfolio
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 block">Differentiating Criteria:</span>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Critical hard red flags triggered: peer-reported commercial default in Community Default Registry, active Section 138 NI Act cheque dishonor summons, NCLT insolvency proceedings, or cancelled GSTIN status.
                  </p>
                </div>

                <div className="pt-2.5 border-t border-rose-200 dark:border-rose-900/60 text-[11px] font-mono text-rose-800 dark:text-rose-300 space-y-0.5">
                  <p>⛔ <strong>Statutory Credit Policy:</strong> Auto-credit approval blocked (₹0 sanctioned limit). Enforce 100% advance payment.</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">For existing overdue invoices, trigger immediate L3 statutory legal notice or MSMED §16 arbitration.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span>MSMED Act 2006 &amp; NI Act 1881 Policy Rules</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
