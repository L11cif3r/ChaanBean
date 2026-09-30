"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  PhoneCall,
  Scale,
  Calendar,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
  PlusCircle,
  FileText,
  Building2,
  ChevronRight,
  X,
} from "lucide-react";
import clsx from "clsx";
import { GiveCreditModal } from "@/components/verification/GiveCreditModal";

interface PortfolioItem {
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

const SEED_PORTFOLIO: PortfolioItem[] = [
  {
    id: "port_1",
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
    id: "port_2",
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
    id: "port_3",
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
    id: "port_4",
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
  {
    id: "port_5",
    customer: "Maharashtra Seamless Limited",
    creditLimit: 15000000,
    outstanding: 3200000,
    dueDate: "2026-11-10",
    daysToDue: 42,
    daysOverdue: 0,
    risk: "Low Risk",
    collectionStatus: "Current / Protected",
    nextAction: "Continuous Protection Active",
    actionRoute: "/monitoring",
  },
];

export default function ContinuousCreditProtectionPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(SEED_PORTFOLIO);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState<"all" | "due_soon" | "overdue" | "high_attention">("all");
  const [isGiveCreditOpen, setIsGiveCreditOpen] = useState(false);
  const [newCreditSuccess, setNewCreditSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/buyers")
      .then((res) => res.json())
      .then((data) => {
        if (data.buyers && Array.isArray(data.buyers) && data.buyers.length > 0) {
          const liveItems: PortfolioItem[] = data.buyers.map((b: any) => {
            const acc = b.creditAccounts?.[0];
            const outstanding = acc?.outstandingAmount || 0;
            const creditLimit = acc?.creditLimit || 500000;
            const dueDate = acc?.dueDate ? new Date(acc.dueDate).toISOString().split("T")[0] : "2026-10-15";
            const diffDays = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
            const daysOverdue = Math.max(0, diffDays);
            const daysToDue = Math.max(0, -diffDays);

            let risk: PortfolioItem["risk"] = "Low Risk";
            const flag = b.riskFlags?.[0]?.flag;
            if (flag === "red" || daysOverdue > 30) risk = "Critical";
            else if (flag === "amber" || daysOverdue > 0) risk = "High Attention";
            else if (outstanding > creditLimit * 0.8) risk = "Medium Risk";

            let collectionStatus: PortfolioItem["collectionStatus"] = "Current / Protected";
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
          setPortfolio((prev) => [
            ...parsed,
            ...prev.filter((p) => !parsed.some((x: any) => x.customer === p.customer)),
          ]);
        }
      }
    } catch {}
  }, []);

  // Filtered portfolio
  const filtered = portfolio.filter((item) => {
    const matchesSearch =
      item.customer.toLowerCase().includes(searchQ.toLowerCase()) ||
      item.collectionStatus.toLowerCase().includes(searchQ.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "due_soon") return item.daysToDue > 0 && item.daysToDue <= 7;
    if (filterType === "overdue") return item.daysOverdue > 0;
    if (filterType === "high_attention") return item.risk === "High Attention" || item.risk === "Critical";

    return true;
  });

  // KPIs
  const totalExposure = portfolio.reduce((acc, p) => acc + p.outstanding, 0);
  const dueSoonAmt = portfolio.filter((p) => p.daysToDue > 0 && p.daysToDue <= 7).reduce((acc, p) => acc + p.outstanding, 0);
  const overdueAmt = portfolio.filter((p) => p.daysOverdue > 0).reduce((acc, p) => acc + p.outstanding, 0);
  const highAttentionCount = portfolio.filter((p) => p.risk === "High Attention" || p.risk === "Critical").length;
  const inCollectionCount = portfolio.filter((p) => p.collectionStatus.includes("Recovery")).length;
  const inLegalCount = portfolio.filter((p) => p.collectionStatus.includes("Legal")).length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Section 13
            </span>
            <span className="text-xs text-slate-400 font-mono">Continuous Protection & Risk Radar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2.5">
            <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={28} />
            <span>Continuous Credit Protection</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time monitoring of commercial credit exposure after granting terms. Tracks countdowns to maturity, payment alerts, and automated collection escalations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsGiveCreditOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
        >
          <PlusCircle size={15} />
          <span>Record New Credit Exposure</span>
        </button>
      </div>

      {newCreditSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{newCreditSuccess}</span>
        </div>
      )}

      {/* KPI Cards: Total Exposure | Due Soon | Overdue | High Attention | Collection | Legal (Section 13) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Total Exposure</span>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            ₹{(totalExposure / 100000).toFixed(1)}L
          </p>
          <span className="text-[10px] text-slate-400 font-mono">{portfolio.length} active debtors</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 font-mono block">Due Soon (≤7d)</span>
          <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            ₹{(dueSoonAmt / 100000).toFixed(1)}L
          </p>
          <span className="text-[10px] text-amber-600/80 font-mono">Recommend links</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 font-mono block">Overdue</span>
          <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            ₹{(overdueAmt / 100000).toFixed(1)}L
          </p>
          <span className="text-[10px] text-rose-600/80 font-mono">Recommend collection</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">High Attention</span>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {highAttentionCount}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Risk signal alerts</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 font-mono block">In Collection</span>
          <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            {inCollectionCount}
          </p>
          <span className="text-[10px] text-blue-600/80 font-mono">Voice AI Active</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 font-mono block">In Legal</span>
          <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
            {inLegalCount}
          </p>
          <span className="text-[10px] text-purple-600/80 font-mono">MSMED §18 Dockets</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition",
              filterType === "all"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            All Accounts ({portfolio.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("due_soon")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition",
              filterType === "due_soon"
                ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-amber-600"
            )}
          >
            Due Soon (≤7d)
          </button>
          <button
            type="button"
            onClick={() => setFilterType("overdue")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition",
              filterType === "overdue"
                ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-rose-600"
            )}
          >
            Overdue
          </button>
          <button
            type="button"
            onClick={() => setFilterType("high_attention")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition",
              filterType === "high_attention"
                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
            )}
          >
            High Attention
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search debtor or status..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
          />
        </div>
      </div>

      {/* Portfolio Table (Section 13) */}
      <div className="bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-slate-500 font-bold uppercase text-[10px]">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Credit Limit</th>
                <th className="p-4">Outstanding</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Days to Due</th>
                <th className="p-4">Days Overdue</th>
                <th className="p-4">Risk</th>
                <th className="p-4">Collection Status</th>
                <th className="p-4 pr-6 text-right">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="p-4 pl-6">
                    <span className="font-bold text-slate-900 dark:text-white block text-sm">
                      {row.customer}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {row.id}</span>
                  </td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                    ₹{row.creditLimit.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                    ₹{row.outstanding.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                    {row.dueDate}
                  </td>
                  <td className="p-4 font-mono font-bold">
                    {row.daysToDue > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">{row.daysToDue}d remaining</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-4 font-mono font-bold">
                    {row.daysOverdue > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-black">+{row.daysOverdue}d overdue</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">0d</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={clsx(
                        "px-2.5 py-1 rounded-md font-bold text-[10px] font-mono border inline-block",
                        row.risk === "Low Risk" && "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                        row.risk === "Medium Risk" && "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                        (row.risk === "High Attention" || row.risk === "Critical") && "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      )}
                    >
                      {row.risk}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                    {row.collectionStatus}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <Link
                      href={row.actionRoute}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FC8019] hover:bg-[#e06900] text-white font-bold transition shadow-xs"
                    >
                      <span>{row.nextAction}</span>
                      <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Give Credit Modal */}
      <GiveCreditModal
        isOpen={isGiveCreditOpen}
        onClose={() => setIsGiveCreditOpen(false)}
        companyName="New Commercial Debtor"
        onSuccess={(data) => {
          setNewCreditSuccess(`✓ New credit exposure of ₹${data.amount.toLocaleString("en-IN")} recorded for ${data.companyName}!`);
          setTimeout(() => setNewCreditSuccess(null), 5000);
          setPortfolio((prev) => [
            {
              id: `port_${Date.now()}`,
              customer: data.companyName,
              creditLimit: data.amount * 1.25,
              outstanding: data.amount,
              dueDate: data.dueDate,
              daysToDue: data.termsDays,
              daysOverdue: 0,
              risk: "Low Risk",
              collectionStatus: "Current / Protected",
              nextAction: "Continuous Protection Active",
              actionRoute: "/monitoring",
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}
