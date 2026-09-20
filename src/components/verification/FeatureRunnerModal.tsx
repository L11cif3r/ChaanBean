"use client";

import React, { useState, useEffect } from "react";
import type { ReportType, NormalizedReport } from "@/lib/verification-gateway/types";
import { REPORT_CACHE_TTL_HOURS } from "@/lib/verification-gateway/types";
import { ReportResultView } from "./ReportResultView";
import {
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  Download,
  Printer,
  ShieldCheck,
  Building2,
  FileText,
  KeyRound,
} from "lucide-react";

export interface FeatureRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: {
    key: string;
    num: number;
    label: string;
    reportTypes: ReportType[];
    category: string;
    statute?: string;
    purpose: string;
    useCase?: string;
    cost: number;
    primaryInputLabel?: string;
    primaryPlaceholder?: string;
    defaultId?: string;
    secondaryInputLabel?: string;
    secondaryPlaceholder?: string;
    defaultSecondary?: string;
    subjectType?: "business" | "individual";
  };
  companyId: string;
  ledger?: { timesUsed: number; available: number; cost: number };
  sampleEntities?: Array<{ name: string; id: string; type: "debtor" | "vendor" }>;
  cachedReport?: NormalizedReport | null;
  onReportGenerated?: (report: NormalizedReport) => void;
}

export function FeatureRunnerModal({
  isOpen,
  onClose,
  feature,
  companyId,
  ledger,
  sampleEntities = [],
  cachedReport,
  onReportGenerated,
}: FeatureRunnerModalProps) {
  const primaryReportType = feature.reportTypes[0];
  const cost = ledger?.cost ?? feature.cost;
  const ttl = REPORT_CACHE_TTL_HOURS[primaryReportType] ?? 720;

  const [primaryInput, setPrimaryInput] = useState(feature.defaultId || "27AAECG1234H1Z5");
  const [secondaryInput, setSecondaryInput] = useState(feature.defaultSecondary || "");
  const [subjectType, setSubjectType] = useState<"business" | "individual">(feature.subjectType || "business");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<NormalizedReport | null>(cachedReport || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP State specifically for gst_supreme_report
  const isOtpReport = primaryReportType === "gst_supreme_report";
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("482910");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  useEffect(() => {
    if (cachedReport) {
      setReport(cachedReport);
    }
  }, [cachedReport]);

  useEffect(() => {
    if (feature.defaultId) {
      setPrimaryInput(feature.defaultId);
    }
  }, [feature.defaultId]);

  if (!isOpen) return null;

  const handleRunVerification = async () => {
    if (!primaryInput.trim()) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType,
          subjectId: primaryInput.trim(),
          reportTypes: feature.reportTypes,
          companyId,
          forceRefresh: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to generate report");
      } else if (data.reports?.length) {
        const rep = data.reports[0];
        setReport(rep);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chaanbean:wallet-updated"));
        }
        if (onReportGenerated) onReportGenerated(rep);
      }
    } catch {
      setErrorMessage("Network error connecting to verification gateway");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpNotice(null);
    try {
      const res = await fetch("/api/verification/otp-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstin: primaryInput.trim(),
          mobile: secondaryInput.trim() || "9876543210",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSessionId(data.sessionId);
        setOtpNotice(data.message || "OTP dispatched to authorized mobile");
      } else {
        setOtpNotice(data.error || "Could not dispatch OTP");
      }
    } catch {
      setOtpNotice("Network error dispatching OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpSessionId) return;
    setOtpLoading(true);
    setOtpNotice(null);
    try {
      const res = await fetch("/api/verification/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: otpSessionId,
          otp: otpCode.trim(),
          companyId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reports?.length) {
        const rep = data.reports[0];
        setReport(rep);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chaanbean:wallet-updated"));
        }
        if (onReportGenerated) onReportGenerated(rep);
      } else {
        setOtpNotice(data.error || "OTP verification failed");
      }
    } catch {
      setOtpNotice("Network error verifying OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-orange-50 dark:bg-orange-500/10 text-[#FC8019] border border-orange-200 dark:border-orange-500/30">
                Feature #{feature.num < 10 ? `0${feature.num}` : feature.num} · {feature.category}
              </span>
              {feature.statute && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {feature.statute}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              {feature.label}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {feature.purpose}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Execution Configuration Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-chaan-brand" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                  Verification Execution Parameters
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-500">
                  Fee: <strong className="text-[#FC8019]">₹{cost}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-500">
                  Cache: <strong className="text-slate-700 dark:text-slate-300">{ttl}h</strong>
                </span>
                {report && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 size={12} />
                      Saved in Library (₹0)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Form Inputs */}
            <div className="grid gap-4 sm:grid-cols-12 items-end">
              <div className="sm:col-span-8 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {feature.primaryInputLabel || "Target Identifier (GSTIN / PAN / DIN / Mobile)"}
                </label>
                <input
                  type="text"
                  value={primaryInput}
                  onChange={(e) => setPrimaryInput(e.target.value)}
                  placeholder={feature.primaryPlaceholder || "Enter target identifier..."}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white uppercase tracking-wider outline-none focus:border-chaan-brand shadow-sm"
                />
              </div>

              {feature.secondaryInputLabel && (
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {feature.secondaryInputLabel}
                  </label>
                  <input
                    type="text"
                    value={secondaryInput}
                    onChange={(e) => setSecondaryInput(e.target.value)}
                    placeholder={feature.secondaryPlaceholder || "Enter parameter..."}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-chaan-brand shadow-sm"
                  />
                </div>
              )}

              <div className={feature.secondaryInputLabel ? "sm:col-span-12" : "sm:col-span-4"}>
                {!isOtpReport ? (
                  <button
                    type="button"
                    onClick={handleRunVerification}
                    disabled={loading || !primaryInput.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-chaan-brand px-4 py-2 text-xs font-bold text-white hover:bg-chaan-brandDark transition disabled:opacity-50 shadow-md shadow-orange-500/20"
                  >
                    <Zap size={14} />
                    {loading ? "Querying Gateway..." : `Run Verification (₹${cost})`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpLoading || !primaryInput.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    <KeyRound size={14} />
                    {otpLoading ? "Sending OTP..." : "Request Authorized Signatory OTP"}
                  </button>
                )}
              </div>
            </div>

            {/* OTP Verification sub-form for GST Supreme */}
            {isOtpReport && otpSessionId && (
              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 flex items-center gap-3">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP (e.g. 482910)"
                  className="rounded-lg border border-amber-300 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white w-48 outline-none"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || !otpCode.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {otpLoading ? "Verifying..." : "Verify & Unlock Supreme Audit"}
                </button>
                {otpNotice && <span className="text-xs text-amber-700 dark:text-amber-300">{otpNotice}</span>}
              </div>
            )}

            {/* Quick Autofill Chips from live database */}
            {sampleEntities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Quick Autofill:</span>
                {sampleEntities.slice(0, 4).map((ent) => (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => setPrimaryInput(ent.id)}
                    className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-300 hover:text-[#FC8019] transition font-mono"
                  >
                    {ent.name} <span className="opacity-60 text-[10px]">({ent.id})</span>
                  </button>
                ))}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Dossier Display */}
          {report ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                    Statutory Verification Dossier
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Permanent access stored in your library
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <ReportResultView report={report} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
              <Sparkles size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Ready to execute statutory verification. Click &quot;Run Verification&quot; above to query the live gateway.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Report will be permanently saved to your Library at no re-fetch charge.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Bank-grade statutory verification audit trail</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Close
            </button>
            {report && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
              >
                <Printer size={13} />
                <span>Print Dossier</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
