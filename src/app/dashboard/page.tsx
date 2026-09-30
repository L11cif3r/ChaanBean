"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Search,
  ShieldCheck,
  PhoneCall,
  Scale,
  Landmark,
  Coins,
  Wallet,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Cpu,
  Layers,
  Link2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  FileText,
  UserCheck,
} from "lucide-react";
import { AskChaanBeanModal } from "@/components/ai/AskChaanBeanModal";
import clsx from "clsx";

interface PortfolioRow {
  id: string;
  customer: string;
  creditLimit: number;
  outstanding: number;
  dueDate: string;
  daysToDue: number;
  daysOverdue: number;
  risk: "Low Risk" | "Medium Risk" | "High Attention" | "Critical";
  collectionStatus: "Current / Protected" | "Due Soon" | "Overdue / In Recovery" | "In Legal Escalation";
  nextAction: string;
  actionRoute: string;
}

const DEFAULT_PORTFOLIO: PortfolioRow[] = [
  {
    id: "p_1",
    customer: "Acme Traders Pvt Ltd",
    creditLimit: 3000000,
    outstanding: 1845000,
    dueDate: "2026-09-18",
    daysToDue: 0,
    daysOverdue: 11,
    risk: "High Attention",
    collectionStatus: "Overdue / In Recovery",
    nextAction: "Automate Voice AI Collection",
    actionRoute: "/payment-recovery",
  },
  {
    id: "p_2",
    customer: "Tata Motors Limited (Vendor Desk)",
    creditLimit: 25000000,
    outstanding: 12500000,
    dueDate: "2026-10-05",
    daysToDue: 6,
    daysOverdue: 0,
    risk: "Low Risk",
    collectionStatus: "Due Soon",
    nextAction: "Send Proactive Payment Link",
    actionRoute: "/payment-recovery",
  },
  {
    id: "p_3",
    customer: "Khedut Agro Tech Pvt Ltd",
    creditLimit: 5000000,
    outstanding: 4600000,
    dueDate: "2026-09-02",
    daysToDue: 0,
    daysOverdue: 27,
    risk: "Critical",
    collectionStatus: "In Legal Escalation",
    nextAction: "File MSMED §18 Dispute Docket",
    actionRoute: "/arbitration",
  },
  {
    id: "p_4",
    customer: "Sunrise Engineering Works",
    creditLimit: 2000000,
    outstanding: 850000,
    dueDate: "2026-10-24",
    daysToDue: 25,
    daysOverdue: 0,
    risk: "Low Risk",
    collectionStatus: "Current / Protected",
    nextAction: "Continuous Protection Active",
    actionRoute: "/monitoring",
  },
];

export default function HomeCommandCentrePage() {
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number>(100000);
  const [daysRemaining, setDaysRemaining] = useState<number>(90);
  const [planName, setPlanName] = useState<string>("Enterprise Plan (Annual)");
  const [companyName, setCompanyName] = useState<string>("Alright Trade");
  const [isAskAiOpen, setIsAskAiOpen] = useState<boolean>(false);
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>(DEFAULT_PORTFOLIO);

  // Sync wallet balance & portfolio from localStorage if present
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch("/api/wallet");
        const data = await res.json();
        if (typeof data.walletBalance === "number") setWalletBalance(data.walletBalance);
        if (typeof data.daysRemaining === "number") setDaysRemaining(data.daysRemaining);
        if (data.companyName && data.companyName !== "Rival Zenith Logistics") setCompanyName(data.companyName);
      } catch {}
    };
    fetchWallet();

    fetch("/api/buyers")
      .then((res) => res.json())
      .then((data) => {
        if (data.buyers && Array.isArray(data.buyers) && data.buyers.length > 0) {
          const liveItems: PortfolioRow[] = data.buyers.map((b: any) => {
            const acc = b.creditAccounts?.[0];
            const outstanding = acc?.outstandingAmount || 0;
            const creditLimit = acc?.creditLimit || 500000;
            const dueDate = acc?.dueDate ? new Date(acc.dueDate).toISOString().split("T")[0] : "2026-10-15";
            const diffDays = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
            const daysOverdue = Math.max(0, diffDays);
            const daysToDue = Math.max(0, -diffDays);

            let risk: PortfolioRow["risk"] = "Low Risk";
            const flag = b.riskFlags?.[0]?.flag;
            if (flag === "red" || daysOverdue > 30) risk = "Critical";
            else if (flag === "amber" || daysOverdue > 0) risk = "High Attention";

            let collectionStatus: PortfolioRow["collectionStatus"] = "Current / Protected";
            let nextAction = "Continuous Protection Active";
            let actionRoute = "/monitoring";

            if (daysOverdue > 45) {
              collectionStatus = "In Legal Escalation";
              nextAction = "File MSMED §18 Dispute Docket";
              actionRoute = "/arbitration";
            } else if (daysOverdue > 0) {
              collectionStatus = "Overdue / In Recovery";
              nextAction = "Automate Voice AI Collection";
              actionRoute = "/payment-recovery";
            } else if (daysToDue <= 7) {
              collectionStatus = "Due Soon";
              nextAction = "Send Proactive Payment Link";
              actionRoute = "/payment-recovery";
            }

            return {
              id: b.id,
              customer: b.name,
              creditLimit,
              outstanding,
              dueDate,
              daysToDue,
              daysOverdue,
              risk,
              collectionStatus,
              nextAction,
              actionRoute,
            };
          });

          setPortfolio((prev) => [
            ...liveItems,
            ...prev.filter((p) => !liveItems.some((l) => l.customer.toLowerCase() === p.customer.toLowerCase())),
          ]);
        }
      })
      .catch(() => {});

    try {
      const stored = localStorage.getItem("chaanbean_credit_portfolio");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with default portfolio
          setPortfolio((prev) => [...parsed, ...prev.filter((p) => !parsed.some((x) => x.customer === p.customer))]);
        }
      }
    } catch {}
  }, []);

  // Compute Portfolio Dashboard Metrics (Section 13)
  const totalExposure = portfolio.reduce((acc, p) => acc + p.outstanding, 0);
  const dueSoonAmt = portfolio.filter((p) => p.daysToDue > 0 && p.daysToDue <= 7).reduce((acc, p) => acc + p.outstanding, 0);
  const overdueAmt = portfolio.filter((p) => p.daysOverdue > 0).reduce((acc, p) => acc + p.outstanding, 0);
  const highAttentionCount = portfolio.filter((p) => p.risk === "High Attention" || p.risk === "Critical").length;
  const inCollectionCount = portfolio.filter((p) => p.collectionStatus.includes("Recovery")).length;
  const inLegalCount = portfolio.filter((p) => p.collectionStatus.includes("Legal")).length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* 1. Welcome Banner + Subscription Status + Wallet Balance (Section 5) */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-900/60 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck size={12} />
              Subscription Active · {daysRemaining} Days Remaining
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Workspace: <strong className="text-slate-800 dark:text-slate-200">{companyName}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Command Centre
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Welcome to your post-subscription workspace. ChaanBean connects credit due diligence, portfolio protection, payment recovery, and legal infrastructure into one intelligent flow.
          </p>
        </div>

        {/* Wallet Balance Display (Global UX Rule: keep wallet balance visible) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0D1322] border-2 border-orange-400/80 dark:border-orange-500/60 shadow-md shadow-orange-500/10 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-[#FC8019] text-white flex items-center justify-center shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Available Wallet Balance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                ₹{walletBalance.toLocaleString("en-IN")}
              </span>
              <span className="text-xs font-mono font-bold text-[#FC8019]">Credits</span>
            </div>
            <Link
              href="/wallet"
              className="text-[11px] font-bold text-[#FC8019] hover:underline flex items-center gap-0.5 mt-0.5"
            >
              <span>Manage & Recharge</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* 1.5 16-Step Production Demo Journey Feature Card */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-900/60 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Enterprise Production Pipeline
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            16-Step Production Demo Journey (Live Cockpit)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Execute the complete end-to-end statutory credit & recovery journey across Neon PostgreSQL, 26 MCP Domain Tools, Rules Engine, and Exotel 15-second voice telephony.
          </p>
        </div>
        <Link
          href="/demo"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition hover:scale-105"
        >
          <span>Launch 16-Step Journey</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* 2. Ask ChaanBean Orchestration Entrypoint (Section 5 & 6) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FC8019] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Ask ChaanBean Copilot</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
                Fastest Route
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
              “Tell me what you are trying to accomplish. I can guide you to the right check, estimate the wallet cost, and take you through the workflow.”
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAskAiOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#e06900] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center gap-2 shrink-0"
        >
          <Sparkles size={14} />
          <span>Launch AI Navigator</span>
        </button>
      </div>

      {/* 3. Primary Intents ("What would you like to do today?") (Section 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            What would you like to do today?
          </h2>
          <span className="text-xs font-mono text-slate-400 font-bold">4 Primary Operating Intents</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Intent 1: Check a Company */}
          <Link
            href="/background-check"
            className="group p-5 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 hover:border-[#FC8019] hover:shadow-md hover:shadow-orange-500/10 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-[#FC8019] border border-orange-200 dark:border-orange-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Search size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#FC8019] transition-colors">
                Check a Company
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Investigate statutory filings, directors, e-Courts litigation & financial health before granting credit.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-[#FC8019]">
              <span>Credit Due Diligence</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Intent 2: Protect Credit */}
          <Link
            href="/monitoring"
            className="group p-5 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                Protect Credit
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Monitor existing debtor exposure, track maturity countdowns, and receive automated risk alerts.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Continuous Protection</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Intent 3: Collect Payments */}
          <Link
            href="/payment-recovery"
            className="group p-5 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PhoneCall size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                Collect Payments
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automate multilingual voice calls, WhatsApp reminders, and payment links before MSMED 45 days.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Smart Collections</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Intent 4: Explore AI Automation */}
          <Link
            href="/ai-transformation"
            className="group p-5 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:shadow-md hover:shadow-purple-500/10 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cpu size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                Explore AI Automation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Deploy autonomous finance bots, auto-reconciliation, and custom statutory workflows.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>AI Transformation</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* 4. Secondary Actions Strip (Section 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/loans"
          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-2.5">
            <Landmark size={18} className="text-[#FC8019]" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Capital Access</span>
              <span className="text-[11px] text-slate-400">Invoice discounting & term loans</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/connect"
          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-2.5">
            <Link2 size={18} className="text-blue-500" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Connect Systems</span>
              <span className="text-[11px] text-slate-400">Tally, Zoho & ERP integrations</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/intelligence"
          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between transition group"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-purple-500" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">ChaanBean Intelligence</span>
              <span className="text-[11px] text-slate-400">Cross-business actionable signals</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 5. Continuous Credit Protection Portfolio Dashboard (Section 13) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Continuous Credit Protection Portfolio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live exposure tracking, due date countdowns, and automated collection triggers.
            </p>
          </div>
          <Link
            href="/monitoring"
            className="text-xs font-bold text-[#FC8019] hover:underline flex items-center gap-1 font-mono"
          >
            <span>View Full Portfolio</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* KPI Strip: Total Exposure | Due Soon | Overdue | High Attention | Collection | Legal (Section 13) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Total Exposure</span>
            <p className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              ₹{(totalExposure / 100000).toFixed(1)}L
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block font-mono">Due Soon (≤7d)</span>
            <p className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              ₹{(dueSoonAmt / 100000).toFixed(1)}L
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block font-mono">Overdue</span>
            <p className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
              ₹{(overdueAmt / 100000).toFixed(1)}L
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">High Attention</span>
            <p className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {highAttentionCount} Accounts
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block font-mono">In Collection</span>
            <p className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {inCollectionCount} Workflows
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block font-mono">In Legal</span>
            <p className="text-base sm:text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5">
              {inLegalCount} Cases
            </p>
          </div>
        </div>

        {/* Portfolio Table: Customer | Credit Limit | Outstanding | Due Date | Days to Due | Days Overdue | Risk | Collection Status | Next Action */}
        <div className="bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3.5 pl-5">Customer</th>
                  <th className="p-3.5">Credit Limit</th>
                  <th className="p-3.5">Outstanding</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Days to Due</th>
                  <th className="p-3.5">Days Overdue</th>
                  <th className="p-3.5">Risk Status</th>
                  <th className="p-3.5">Collection Status</th>
                  <th className="p-3.5 pr-5 text-right">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {portfolio.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5 pl-5 font-bold text-slate-900 dark:text-white">
                      {row.customer}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                      ₹{row.creditLimit.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      ₹{row.outstanding.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {row.dueDate}
                    </td>
                    <td className="p-3.5 font-mono font-bold">
                      {row.daysToDue > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{row.daysToDue}d remaining</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold">
                      {row.daysOverdue > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-black">+{row.daysOverdue}d overdue</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">0d</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-md font-bold text-[10px] font-mono border",
                          row.risk === "Low Risk" && "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                          row.risk === "Medium Risk" && "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                          (row.risk === "High Attention" || row.risk === "Critical") && "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                        )}
                      >
                        {row.risk}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-600 dark:text-slate-300">
                      {row.collectionStatus}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <Link
                        href={row.actionRoute}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#FC8019] hover:text-white text-slate-700 dark:text-slate-300 font-bold transition shadow-xs"
                      >
                        <span>{row.nextAction}</span>
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ask ChaanBean Modal */}
      <AskChaanBeanModal isOpen={isAskAiOpen} onClose={() => setIsAskAiOpen(false)} />
    </div>
  );
}
