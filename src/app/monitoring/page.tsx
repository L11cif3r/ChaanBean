"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  TrendingUp,
  Download,
  Building,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function MonitoringPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMonitoring = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/monitoring");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
  }, []);

  const handleToggleHold = async (creditAccountId: string, isCurrentlyHold: boolean) => {
    try {
      setActionLoading(creditAccountId);
      const action = isCurrentlyHold ? "revoke_hold" : "hold";
      const reason = isCurrentlyHold
        ? undefined
        : "Manual credit hold enforced due to risk monitoring threshold breach.";

      await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, creditAccountId, reason }),
      });
      await fetchMonitoring();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateAlert = async (alertId: string, status: "acknowledged" | "resolved") => {
    try {
      setActionLoading(alertId);
      await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_alert", alertId, status, actorName: "Risk Desk" }),
      });
      await fetchMonitoring();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-[#FC8019]" />
          <span>Loading Post-Credit Monitoring Stream...</span>
        </div>
      </div>
    );
  }

  const {
    accounts = [],
    alerts = [],
    totalExposure = 0,
    totalOverdue = 0,
    overallUtilizationPct = 0,
    accountsOnHoldCount = 0,
  } = data || {};

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              PHASE 3: CONTINUOUS RADAR
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
            Post-Credit Security & Monitoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time exposure tracking, early default warnings, and automated credit limit holds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMonitoring}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <a
            href="/api/reports/management?format=csv"
            download
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#FC8019] text-white hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20"
          >
            <Download size={14} />
            Export Audit (CSV)
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Credit Exposure</span>
            <TrendingUp size={16} className="text-[#FC8019]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            ₹{totalExposure.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all approved debtors</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Overdue Dues</span>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
            ₹{totalOverdue.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalExposure > 0 ? `${Math.round((totalOverdue / totalExposure) * 100)}% of total exposure` : "0%"}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Portfolio Utilization</span>
            <div className="text-xs font-bold text-amber-500">{overallUtilizationPct}%</div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {overallUtilizationPct}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallUtilizationPct > 80 ? "bg-red-500" : overallUtilizationPct > 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(overallUtilizationPct, 100)}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Accounts on Credit Hold</span>
            <Lock size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {accountsOnHoldCount}
          </div>
          <div className="text-[11px] text-rose-500 mt-1">Further billing blocked</div>
        </div>
      </div>

      {/* Active Alerts Center */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="text-[#FC8019]" size={20} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Risk & Monitoring Alerts</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
              {alerts.length}
            </span>
          </div>
          <span className="text-xs text-slate-500">Automated signal rules</span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2 opacity-80" />
            No active alerts. All debtor portfolios operating within parameters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {alerts.map((alert: any) => {
              const isCrit = alert.severity === "critical";
              const isHigh = alert.severity === "high";
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isCrit
                      ? "border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20"
                      : isHigh
                      ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          isCrit
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            : isHigh
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{alert.title}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{alert.description}</p>
                    <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                      <Building size={12} />
                      <span>{alert.buyer?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    {alert.status === "active" ? (
                      <button
                        disabled={actionLoading === alert.id}
                        onClick={() => handleUpdateAlert(alert.id, "acknowledged")}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Acknowledged
                      </span>
                    )}
                    <button
                      disabled={actionLoading === alert.id}
                      onClick={() => handleUpdateAlert(alert.id, "resolved")}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline ml-auto disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accounts Monitoring & Credit Holds */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Debtor Credit Exposure Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control exposure limits and enforce immediate holds.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="px-5 py-3.5">Debtor Name</th>
                <th className="px-5 py-3.5">Outstanding Exposure</th>
                <th className="px-5 py-3.5">Approved Limit</th>
                <th className="px-5 py-3.5">Utilization</th>
                <th className="px-5 py-3.5">Overdue Status</th>
                <th className="px-5 py-3.5">Credit Hold</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {accounts.map((acc: any) => (
                <tr key={acc.creditAccountId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                    {acc.buyerName}
                  </td>
                  <td className="px-5 py-4 font-mono font-medium">
                    ₹{acc.totalOutstanding.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    ₹{acc.creditLimit.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            acc.utilizationPct > 100
                              ? "bg-red-500"
                              : acc.utilizationPct > 75
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(acc.utilizationPct, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px]">{acc.utilizationPct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        acc.overdueStatus === "defaulted"
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                          : acc.overdueStatus === "overdue"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      }`}
                    >
                      {acc.overdueStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {acc.creditHoldActive ? (
                      <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold">
                        <Lock size={13} />
                        ON HOLD
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                        <Unlock size={13} />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      disabled={actionLoading === acc.creditAccountId}
                      onClick={() => handleToggleHold(acc.creditAccountId, acc.creditHoldActive)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50 ${
                        acc.creditHoldActive
                          ? "border-emerald-300 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          : "border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      }`}
                    >
                      {acc.creditHoldActive ? "Unlock Account" : "Enforce Hold"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
