"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Layers,
} from "lucide-react";
import { SummaryCard } from "@/components/ui";

export interface MonthlyRecord {
  period: string;
  totalMRR: number;
  newMRR: number;
  expansionMRR: number;
  churnedMRR: number;
  netGrowth: number;
  activeCustomers: number;
  reportsPulled: number;
  dealsWon: number;
  dealsLost: number;
  grossRevenue: number;
}

export function FinancialsView({
  initialSummary,
  kpis,
  moduleRevenue,
}: {
  initialSummary: MonthlyRecord[];
  kpis: {
    currentMRR: number;
    newMRR: number;
    expansionMRR: number;
    churnedMRR: number;
    netMrrGrowth: number;
    growthRatePct: number;
    activeCustomers: number;
    grossRevenue: number;
    forecastNextMonthMRR: number;
    forecastMethod: string;
  };
  moduleRevenue: { module: string; sharePct: number; revenueINR: number }[];
}) {
  const [role, setRole] = useState<"owner" | "team_member">("owner");
  const [filterRange, setFilterRange] = useState<"12m" | "6m" | "3m">("12m");

  useEffect(() => {
    const saved = localStorage.getItem("chaanbean_admin_role") as "owner" | "team_member" | null;
    if (saved) setRole(saved);
  }, []);

  if (role !== "owner") {
    return (
      <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-8 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="h-12 w-12 rounded-full bg-rose-900/60 border border-rose-700 flex items-center justify-center mx-auto text-rose-400">
          <Lock size={24} />
        </div>
        <h2 className="text-lg font-bold text-white">Owner-Only Financial Analytics</h2>
        <p className="text-xs text-slate-400">
          Monthly financials and raw revenue metrics are strictly restricted to Owner roles (Siddharth Verma).
          Your current session is set to <strong>Team Member (Pooja Deshmukh)</strong>.
        </p>
        <button
          onClick={() => {
            localStorage.setItem("chaanbean_admin_role", "owner");
            window.location.reload();
          }}
          className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
        >
          Switch to Owner Role
        </button>
      </div>
    );
  }

  const filteredRecords =
    filterRange === "3m"
      ? initialSummary.slice(0, 3)
      : filterRange === "6m"
        ? initialSummary.slice(0, 6)
        : initialSummary;

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Period",
      "Total MRR (INR)",
      "New MRR",
      "Expansion MRR",
      "Churned MRR",
      "Net MRR Growth",
      "Active Customers",
      "Reports Pulled",
      "Deals Won",
      "Deals Lost",
      "Gross Revenue",
    ];

    const rows = filteredRecords.map((r) => [
      r.period,
      r.totalMRR,
      r.newMRR,
      r.expansionMRR,
      r.churnedMRR,
      r.netGrowth,
      r.activeCustomers,
      r.reportsPulled,
      r.dealsWon,
      r.dealsLost,
      r.grossRevenue,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chaanbean_financial_summary_${filterRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Date Filter & CSV Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0B0F17] p-1 text-xs">
          <button
            onClick={() => setFilterRange("12m")}
            className={`rounded px-3 py-1 font-medium transition ${
              filterRange === "12m" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            12 Months
          </button>
          <button
            onClick={() => setFilterRange("6m")}
            className={`rounded px-3 py-1 font-medium transition ${
              filterRange === "6m" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Last 6 Months
          </button>
          <button
            onClick={() => setFilterRange("3m")}
            className={`rounded px-3 py-1 font-medium transition ${
              filterRange === "3m" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Last Quarter (3M)
          </button>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
        >
          <Download size={14} />
          Export 12-Month Table to CSV
        </button>
      </div>

      {/* Top MRR Metrics Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono">
        <SummaryCard
          title="Current Monthly Run-Rate"
          value={`₹${kpis.currentMRR.toLocaleString("en-IN")}`}
          subtitle={`+${kpis.growthRatePct}% MoM net growth`}
        />
        <SummaryCard
          title="Net MRR Addition This Month"
          value={`₹${kpis.netMrrGrowth.toLocaleString("en-IN")}`}
          subtitle={`New ₹${kpis.newMRR.toLocaleString("en-IN")} · Churn -₹${kpis.churnedMRR.toLocaleString("en-IN")}`}
        />
        <SummaryCard
          title="Gross Monthly Revenue"
          value={`₹${kpis.grossRevenue.toLocaleString("en-IN")}`}
          subtitle="Subscription + usage fees"
        />
        <SummaryCard
          title="Deterministic MRR Forecast"
          value={`₹${kpis.forecastNextMonthMRR.toLocaleString("en-IN")}`}
          subtitle="Next month trailing projection"
        />
      </div>

      {/* Forecast Disclosure Notice */}
      <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3.5 text-xs text-amber-300 flex items-start gap-2">
        <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-900/60 px-2 py-0.5 rounded text-amber-400 border border-amber-700/60 shrink-0">
          Deterministic Projection
        </span>
        <p className="text-slate-300">
          Next month's MRR forecast of <strong>₹{kpis.forecastNextMonthMRR.toLocaleString("en-IN")}</strong> is computed via trailing 3-month run-rate plus 25% weighted pipeline realization. Clearly labeled as an estimate; never generated via speculative AI models.
        </p>
      </div>

      {/* 12-Month Financial Summary Table */}
      <section className="rounded-xl border border-slate-800 bg-[#0B0F17] p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">12-Month Financial & Unit Metric History</h2>
          <span className="text-xs font-mono text-slate-400">Values in INR</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs font-mono">
            <thead className="bg-slate-900/80 uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Total MRR</th>
                <th className="px-4 py-3 text-left">New MRR</th>
                <th className="px-4 py-3 text-left">Expansion</th>
                <th className="px-4 py-3 text-left">Churn</th>
                <th className="px-4 py-3 text-left">Net Growth</th>
                <th className="px-4 py-3 text-left">Customers</th>
                <th className="px-4 py-3 text-left">Reports Pulled</th>
                <th className="px-4 py-3 text-left">Deals Won</th>
                <th className="px-4 py-3 text-left">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRecords.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-bold text-white font-sans">{r.period}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400">
                    ₹{r.totalMRR.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-sky-400">+₹{r.newMRR.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-slate-300">+₹{r.expansionMRR.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-rose-400">-₹{r.churnedMRR.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 font-bold text-white">+₹{r.netGrowth.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-slate-200">{r.activeCustomers}</td>
                  <td className="px-4 py-3 text-slate-400">{r.reportsPulled.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{r.dealsWon}</td>
                  <td className="px-4 py-3 font-bold text-white font-sans">
                    ₹{r.grossRevenue.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Revenue Breakdown by Module */}
      <section className="rounded-xl border border-slate-800 bg-[#0B0F17] p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Revenue Distribution by Core Product Module</h2>
          <span className="text-xs font-mono text-slate-400">Current Month Distribution</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono">
          {moduleRevenue.map((m, idx) => (
            <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-sans block">{m.module}</span>
              <p className="text-xl font-bold text-white">₹{m.revenueINR.toLocaleString("en-IN")}</p>
              <div className="flex items-center justify-between text-xs text-amber-400 font-bold pt-1 border-t border-slate-800/80">
                <span>Revenue Share</span>
                <span>{m.sharePct}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
