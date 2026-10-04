"use client";

import React, { useState } from "react";
import {
  Cpu,
  Bot,
  Sparkles,
  PhoneCall,
  Scale,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

interface AutomationWorkflow {
  id: string;
  title: string;
  category: "Finance & Accounting" | "Voice & Contact Centre" | "Legal & Risk" | "Underwriting";
  status: "Active" | "Configurable" | "Recommended";
  hoursSavedWeekly: number;
  description: string;
  capabilities: string[];
  ctaLabel: string;
  route: string;
}

const WORKFLOWS: AutomationWorkflow[] = [
  {
    id: "ai_collections_agent",
    title: "Autonomous AI Collections Agent",
    category: "Voice & Contact Centre",
    status: "Active",
    hoursSavedWeekly: 24,
    description: "Multilingual voice AI agent that calls overdue debtors at optimal calling windows, secures promises to pay, and dispatches instant UPI payment links.",
    capabilities: ["7 Regional Indian Languages", "Real-time Call Sentiment Analysis", "Auto-Promise to Pay Ledger Entry"],
    ctaLabel: "Configure Voice Agent →",
    route: "/payment-recovery",
  },
  {
    id: "smart_spend_engine",
    title: "Smart Spend Credit Underwriting",
    category: "Underwriting",
    status: "Active",
    hoursSavedWeekly: 18,
    description: "Evaluates intended credit exposure and automatically recommends the minimum useful statutory checks, saving up to 55% in wallet credit fees.",
    capabilities: ["Exposure-to-Depth Matching", "Essential vs. Recommended Sorting", "Instant ₹ Savings Calculator"],
    ctaLabel: "Run Credit Due Diligence →",
    route: "/background-check",
  },
  {
    id: "msme_statutory_docket",
    title: "Automated MSMED §18 Dispute Docket",
    category: "Legal & Risk",
    status: "Active",
    hoursSavedWeekly: 14,
    description: "Auto-generates section 18 arbitration evidence bundles with complete call logs, delivery receipts, and statutory 3x RBI compound interest calculations.",
    capabilities: ["Pre-formatted Facilitation Council Dockets", "Certified Evidence Timestamps", "Panel Advocate Handoff"],
    ctaLabel: "Open Legal Infrastructure →",
    route: "/arbitration",
  },
  {
    id: "tally_auto_reconciliation",
    title: "Autonomous Tally & Bank Reconciliation",
    category: "Finance & Accounting",
    status: "Configurable",
    hoursSavedWeekly: 20,
    description: "Matches incoming bank transfer references with outstanding GST debtor vouchers in Tally without manual spreadsheet auditing.",
    capabilities: ["Bank UTR Matching", "Short-Payment Detection", "Automatic Credit Hold Release"],
    ctaLabel: "Connect ERP & Banking →",
    route: "/connect",
  },
];

export default function AiTransformationPage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              Sections 3 & 19
            </span>
            <span className="text-xs text-slate-400 font-mono">Agentic Workflow Automation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2.5">
            <Cpu className="text-[#FC8019]" size={28} />
            <span>AI Transformation</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Identify, configure, and orchestrate autonomous AI agents across credit underwriting, contact center recovery, and legal dispute escalation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-bold font-mono">
            76 Hours Saved / Week
          </div>
        </div>
      </div>

      {/* Grid of Automation Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {WORKFLOWS.map((w) => (
          <div
            key={w.id}
            className="bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {w.category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {w.title}
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {w.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {w.description}
              </p>

              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Core Capabilities:
                </span>
                <div className="space-y-1">
                  {w.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                ⚡ Saves ~{w.hoursSavedWeekly} hrs/wk
              </span>
              <Link
                href={w.route}
                className="px-4 py-2 rounded-xl bg-[#FC8019] hover:bg-[#e06900] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>{w.ctaLabel}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
