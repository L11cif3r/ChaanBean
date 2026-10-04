"use client";

import React, { useState } from "react";
import type { LoanApplication } from "@/lib/loans/types";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Phone,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface MyApplicationsTrackerProps {
  applications: LoanApplication[];
  onRefresh: () => void;
}

export function MyApplicationsTracker({
  applications,
  onRefresh,
}: MyApplicationsTrackerProps) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [contactAdvisorToast, setContactAdvisorToast] = useState<string | null>(null);

  const formatINR = (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`;

  const getStatusBadge = (status: LoanApplication["status"]) => {
    switch (status) {
      case "sanctioned":
        return {
          label: "Sanctioned & Disbursal Ready",
          className: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        };
      case "lender_matched":
        return {
          label: "Lender Matched · Term Sheet Ready",
          className: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800",
        };
      case "credit_assessment":
        return {
          label: "In Credit Committee Assessment",
          className: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        };
      case "under_review":
      default:
        return {
          label: "Under Verification Review",
          className: "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800",
        };
    }
  };

  const handleContactAdvisor = (app: LoanApplication) => {
    setContactAdvisorToast(`Dedicated Capital Access Credit Manager assigned for ${app.applicationRef}. Contacting you shortly at ${app.phone}.`);
    setTimeout(() => setContactAdvisorToast(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {contactAdvisorToast && (
        <div className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{contactAdvisorToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setContactAdvisorToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              My Active Credit &amp; Loan Applications ({applications.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track real-time underwriting milestones, legal technical clearances, and term sheet offers from partner banks.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:border-[#FC8019] transition"
        >
          <RotateCcw size={13} />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
          <FileText size={36} className="mx-auto text-slate-400" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No loan applications yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose from the 20 institutional loan products above and submit an application to receive competitive lender quotes within 24 hours.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const badge = getStatusBadge(app.status);
            const isExpanded = selectedAppId === app.id;

            return (
              <div
                key={app.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xs overflow-hidden transition-all"
              >
                {/* Main Summary Bar */}
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#FC8019] bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 rounded-lg">
                        {app.applicationRef}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Applied: {new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        {app.productName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {app.entityName ? `${app.entityName} (${app.applicantName})` : app.applicantName} • {app.city}, {app.state || "India"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                    <div className="text-left md:text-right font-mono">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Facility Amount</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {formatINR(app.requestedAmount)}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {app.tenureYears} Years ({app.annualRate}% p.a.)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAppId(isExpanded ? null : app.id)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[#FC8019] text-slate-700 dark:text-slate-300 transition"
                      >
                        {isExpanded ? "Hide Details" : "View Dossier"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleContactAdvisor(app)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition flex items-center gap-1 shadow-sm"
                      >
                        <Phone size={13} />
                        <span>Advisor Call</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 sm:p-6 space-y-4">
                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Applicant Phone</span>
                        <span className="font-bold text-slate-900 dark:text-white">{app.phone}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Corporate PAN</span>
                        <span className="font-bold text-slate-900 dark:text-white">{app.pan || "Under Verification"}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Business GSTIN</span>
                        <span className="font-bold text-slate-900 dark:text-white">{app.gstin || "N/A (Individual)"}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Collateral Security</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block">{app.collateralType}</span>
                      </div>
                    </div>

                    {/* Matched Lenders Allocation */}
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-bold uppercase text-slate-500">
                        Institutional Lenders Matched ({app.matchedLenders.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {app.matchedLenders.map((lender) => (
                          <div
                            key={lender.id}
                            className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{lender.name}</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">{lender.indicativeRate}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{lender.featureHighlight}</p>
                            <div className="text-[10px] font-mono text-slate-400">
                              Estimated Sanction: ~{lender.maxDisbursalDays} Business Days
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
