"use client";

import React from "react";
import Link from "next/link";
import {
  Lock,
  Search,
  Building2,
  Phone,
  Scale,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Unlock,
} from "lucide-react";

interface DashboardGatedViewProps {
  interactionCount: number;
  threshold?: number;
  companyName?: string;
}

export function DashboardGatedView({
  interactionCount,
  threshold = 3,
  companyName = "Acme Traders Pvt Ltd",
}: DashboardGatedViewProps) {
  const current = Math.min(interactionCount, threshold);
  const percent = Math.min(100, Math.round((current / threshold) * 100));

  const actionCards = [
    {
      step: 1,
      title: "AI Credit Check",
      subtitle: "Verify Counterparty Legitimacy",
      description:
        "Perform instant statutory verification across 18 adapters: MCA21, GSTIN, e-Courts litigation, CCTNS FIR, and Udyam MSME status.",
      icon: Search,
      href: "/background-check",
      actionText: "Run AI Credit Check",
      badge: "Step 01",
      color: "border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
    },
    {
      step: 2,
      title: "AI Business Security",
      subtitle: "Run Risk & Credit Underwriting",
      description:
        "Audit financial statements, identify balance sheet anomalies, and compute recommended credit exposure under MSMED norms.",
      icon: Building2,
      href: "/business-check",
      actionText: "Run AI Risk Check",
      badge: "Step 02",
      color: "border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 text-[#FC8019]",
    },
    {
      step: 3,
      title: "Payment Automation",
      subtitle: "Activate Recovery Workflows",
      description:
        "Set up debtor accounts, automated outbound voice dialer cadences, or statutory Income Tax §43B(h) payment notices.",
      icon: Phone,
      href: "/payment-recovery",
      actionText: "Setup Payment Recovery",
      badge: "Step 03",
      color: "border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
    },
    {
      step: 4,
      title: "Legal Infrastructure",
      subtitle: "MSMED §18 Dispute Docket",
      description:
        "Fast-track institutional arbitration claims with 20.25% compound interest computation and tamper-evident evidence packages.",
      icon: Scale,
      href: "/arbitration",
      actionText: "Explore Legal Docket",
      badge: "Step 04",
      color: "border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              Enterprise Console · {companyName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
              <Lock size={10} />
              Gated Mode
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Portfolio Intelligence Activation
          </h1>
        </div>

        {/* Instant Unlock Button for review/testing */}
        <Link
          href="/dashboard?unlocked=true"
          className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#FC8019] hover:text-[#FC8019] transition shadow-sm"
        >
          <Unlock size={14} className="text-[#FC8019]" />
          <span>Instant Preview Unlock</span>
        </Link>
      </div>

      {/* Main Lock Card & Progress */}
      <div className="rounded-3xl border-2 border-orange-500/20 bg-gradient-to-b from-orange-50/40 to-transparent dark:from-orange-950/10 p-8 sm:p-10 shadow-lg text-center space-y-6 max-w-3xl mx-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/80 border border-orange-200 dark:border-orange-800 text-[#FC8019] shadow-md shadow-orange-500/10">
          <Lock size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Executive Dashboard Unlocks at {threshold} Company Interactions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            The Executive Portfolio Dashboard synthesizes trade receivables, statutory credit limits,
            and deterministic Green/Amber/Red risk flag analytics across your counterparties.
            To generate meaningful portfolio intelligence, interact with or extend credit to at least{" "}
            <strong>{threshold} companies</strong>.
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2 max-w-md mx-auto pt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Interactions Completed
            </span>
            <span className="font-bold text-[#FC8019]">
              {current} of {threshold} Companies
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FC8019] to-amber-500 transition-all duration-500"
              style={{ width: `${Math.max(5, percent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
            <span>0 Companies</span>
            <span>{threshold} Companies Needed</span>
          </div>
        </div>
      </div>

      {/* Action Cards: The 4 Core Operating Stations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
            Choose a Module to Begin Interacting
          </h3>
          <span className="text-xs text-slate-400 font-mono">Any interaction increments your count</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.step}
                className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-[#FC8019]/40 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl border p-2.5 ${card.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {card.title}
                    </h4>
                    <p className="text-xs font-semibold text-[#FC8019]">
                      {card.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={card.href}
                    className="flex items-center justify-between w-full rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-[#FC8019] dark:hover:bg-[#FC8019] text-white px-4 py-2.5 text-xs font-bold transition group"
                  >
                    <span>{card.actionText}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
