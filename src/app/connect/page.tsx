"use client";

import React, { useState } from "react";
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Building2,
  Database,
  ArrowRight,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

interface ConnectorItem {
  id: string;
  name: string;
  category: "ERP / Accounting" | "CRM & Pipeline" | "HRMS & Payroll" | "Custom API";
  status: "Connected" | "Needs Attention" | "Not Connected";
  lastSync: string;
  permissions: string;
  syncHealth: "Success" | "Warning" | "Failed";
  badge: string;
  description: string;
}

const CONNECTORS: ConnectorItem[] = [
  {
    id: "tally",
    name: "TallyPrime / Tally ERP 9",
    category: "ERP / Accounting",
    status: "Connected",
    lastSync: "12 minutes ago (Real-time TCP Agent)",
    permissions: "Debtor Ledgers, Outstanding Vouchers, GST Invoices",
    syncHealth: "Success",
    badge: "Official TDL Connector",
    description: "Bi-directional ledger sync for automated MSME 45-day overdue tracking and payment reconciliation.",
  },
  {
    id: "zoho",
    name: "Zoho Books",
    category: "ERP / Accounting",
    status: "Not Connected",
    lastSync: "Never",
    permissions: "Sales Invoices, Customer Balances, Bank Feeds",
    syncHealth: "Failed",
    badge: "OAuth 2.0 Direct API",
    description: "Sync invoices and customer credit limits directly from Zoho Books via authorized secure token.",
  },
  {
    id: "sap",
    name: "SAP S/4HANA / Business One",
    category: "ERP / Accounting",
    status: "Needs Attention",
    lastSync: "3 days ago (Certificate Expired)",
    permissions: "Accounts Receivable, Customer Master, Open Items",
    syncHealth: "Warning",
    badge: "Enterprise Connector",
    description: "Enterprise OData sync for large-scale corporate exposure monitoring and hypothecation checks.",
  },
  {
    id: "busy",
    name: "Busy Accounting",
    category: "ERP / Accounting",
    status: "Not Connected",
    lastSync: "Never",
    permissions: "Debtor Balances, Sales Register",
    syncHealth: "Failed",
    badge: "Direct DB Bridge",
    description: "On-premise MS SQL bridge for trading and wholesale businesses using Busy.",
  },
  {
    id: "crm",
    name: "HubSpot / Salesforce CRM",
    category: "CRM & Pipeline",
    status: "Not Connected",
    lastSync: "Never",
    permissions: "Lead Stages, Customer Contacts, Deal Closures",
    syncHealth: "Failed",
    badge: "Webhook Gateway",
    description: "Automatically trigger AI Credit Due Diligence when a sales deal enters 'Contract Sent' stage.",
  },
  {
    id: "custom_api",
    name: "ChaanBean Unified Gateway API",
    category: "Custom API",
    status: "Connected",
    lastSync: "Active (2,410 requests today)",
    permissions: "Full Gateway Access (MCA21, e-Courts, GST, Recovery)",
    syncHealth: "Success",
    badge: "Production REST v2",
    description: "Programmatic verification and collection triggers via high-availability REST endpoints.",
  },
];

export default function ChaanBeanConnectPage() {
  const [connectors, setConnectors] = useState<ConnectorItem[]>(CONNECTORS);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleTriggerSync = (id: string, name: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "Connected",
                lastSync: "Just now",
                syncHealth: "Success",
              }
            : c
        )
      );
      setSuccessToast(`✓ Fresh ledger synchronization completed for ${name}`);
      setTimeout(() => setSuccessToast(null), 4000);
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Section 17
            </span>
            <span className="text-xs text-slate-400 font-mono">Real-time Data Freshness & ERP Bridge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2.5">
            <Link2 className="text-[#FC8019]" size={28} />
            <span>ChaanBean Connect</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Connect Tally, ERP, CRM, and accounting systems to automate debtor ledger freshness and continuous risk underwriting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>2 Connectors Active</span>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Connectors Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {connectors.map((c) => {
          const isConnected = c.status === "Connected";
          const isWarning = c.status === "Needs Attention";
          const isSyncing = syncingId === c.id;

          return (
            <div
              key={c.id}
              className="bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      {c.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {c.name}
                    </h3>
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                      isConnected
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : isWarning
                        ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {c.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {c.description}
                </p>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Last Sync:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{c.lastSync}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Sync Health:</span>
                    <span
                      className={clsx(
                        "font-bold",
                        c.syncHealth === "Success"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : c.syncHealth === "Warning"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400"
                      )}
                    >
                      {c.syncHealth}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500">
                    <span className="font-bold text-slate-400">Permissions: </span>
                    <span>{c.permissions}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-bold">{c.badge}</span>
                <button
                  type="button"
                  onClick={() => handleTriggerSync(c.id, c.name)}
                  disabled={isSyncing}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs",
                    isConnected
                      ? "bg-slate-100 dark:bg-slate-800 hover:bg-[#FC8019] hover:text-white text-slate-700 dark:text-slate-300"
                      : "bg-[#FC8019] hover:bg-[#e06900] text-white"
                  )}
                >
                  <RefreshCw size={12} className={clsx(isSyncing && "animate-spin")} />
                  <span>{isSyncing ? "Syncing..." : isConnected ? "Refresh Sync" : "Connect Integration"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
