"use client";

import React, { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Scale,
  PhoneCall,
  Search,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface IntelligenceAlert {
  id: string;
  category: "Overdue" | "Due Soon" | "Litigation Alert" | "Credit Exposure";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  impactAmount?: string;
  recommendedAction: string;
  actionRoute: string;
  actionLabel: string;
}

const LIVE_ALERTS: IntelligenceAlert[] = [
  {
    id: "alt_1",
    category: "Overdue",
    severity: "high",
    title: "3 Debtor Accounts Exceeded 45-Day Payment Limit",
    detail: "Aggregate outstanding amount of ₹18,45,000 is now overdue across Acme Traders and 2 secondary wholesale accounts. Immediate automated calling recommended.",
    impactAmount: "₹18,45,000",
    recommendedAction: "Launch Voice AI Calling & WhatsApp payment reminders",
    actionRoute: "/payment-recovery",
    actionLabel: "Automate Recovery →",
  },
  {
    id: "alt_2",
    category: "Due Soon",
    severity: "medium",
    title: "₹12,50,000 Due Within Next 7 Days",
    detail: "4 debtor invoices are maturing this week. Send polite proactive payment links before maturity date to preserve cashflow rhythm.",
    impactAmount: "₹12,50,000",
    recommendedAction: "Send proactive payment links with 2% early settlement discount",
    actionRoute: "/monitoring?filter=due_soon",
    actionLabel: "View Maturing Accounts →",
  },
  {
    id: "alt_3",
    category: "Litigation Alert",
    severity: "high",
    title: "New e-Courts Filing Detected Against Supplier",
    detail: "Civil commercial dispute registered under Section 138 NI Act at Mumbai City Civil Court. Credit hold advised until hearing status clarifies.",
    recommendedAction: "Place temporary credit hold and inspect judicial dossier",
    actionRoute: "/background-check?feature=court_record",
    actionLabel: "Investigate Litigation →",
  },
  {
    id: "alt_4",
    category: "Credit Exposure",
    severity: "low",
    title: "Exposure Utilization Reached 92% for Khedut Agro",
    detail: "Current outstanding is ₹23,00,000 against sanctioned limit of ₹25,00,000. Underwriting review required before next dispatch.",
    impactAmount: "₹23,00,000",
    recommendedAction: "Review financial turnover filings or request bank guarantee",
    actionRoute: "/background-check?targetCompany=Khedut%20Agro%20Tech",
    actionLabel: "Review Underwriting →",
  },
];

export default function ChaanBeanIntelligencePage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Section 18
            </span>
            <span className="text-xs text-slate-400 font-mono">Cross-Business AI Risk & Action Briefing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2.5">
            <Sparkles className="text-[#FC8019]" size={28} />
            <span>ChaanBean Intelligence</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Synthesizes statutory filings, ERP debtor ledgers, judicial registries, and voice recovery outcomes into proactive daily decisions.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
          Last Intelligence Sweep: <span className="font-bold text-[#FC8019]">4 mins ago</span>
        </div>
      </div>

      {/* Daily Executive Question Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold text-[#FC8019] uppercase tracking-wider">
            Daily Executive Briefing
          </span>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            “What needs my attention today?”
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            3 customers are overdue, ₹12.5L is due this week, one credit exposure has increased and two accounts require immediate review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/payment-recovery"
            className="px-4 py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#e06900] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition flex items-center gap-1.5"
          >
            <span>Execute Recommended Actions</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
          Active Actionable Intelligence Signals ({LIVE_ALERTS.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LIVE_ALERTS.map((alert) => {
            const isHigh = alert.severity === "high";
            return (
              <div
                key={alert.id}
                className="bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={clsx(
                        "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border",
                        isHigh
                          ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                      )}
                    >
                      {alert.category} · {alert.severity.toUpperCase()} PRIORITY
                    </span>
                    {alert.impactAmount && (
                      <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                        {alert.impactAmount}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {alert.detail}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Recommended AI Copilot Action:
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {alert.recommendedAction}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <Link
                    href={alert.actionRoute}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#FC8019] hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{alert.actionLabel}</span>
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
