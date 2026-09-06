"use client";

import React, { useState } from "react";
import {
  REPORT_LABELS,
  REPORT_CACHE_TTL_HOURS,
  BUNDLE_REPORT_TYPES,
  type ReportType,
  type SubjectType,
  type NormalizedReport,
} from "@/lib/verification-gateway/types";
import {
  Search,
  Zap,
  ShieldCheck,
  Clock,
  KeyRound,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Building,
} from "lucide-react";

export function VerificationRunner({
  companyId,
  ledgerMap,
  sampleEntities = [],
}: {
  companyId: string;
  ledgerMap: Record<string, { timesUsed: number; available: number; cost: number }>;
  sampleEntities?: Array<{ name: string; id: string; type: "debtor" | "vendor" }>;
}) {
  const [subjectType, setSubjectType] = useState<SubjectType>("business");
  const [subjectId, setSubjectId] = useState("27AAECG1234H1Z5");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "bundle" | "otp" | "skip_tracing">("catalog");
  const [reportsResult, setReportsResult] = useState<NormalizedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<NormalizedReport | null>(null);
  const [expandedReportType, setExpandedReportType] = useState<string | null>(null);

  // OTP State for GST Supreme Report
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("482910");
  const [otpStatusMsg, setOtpStatusMsg] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Run single report
  const handleRunSingle = async (reportType: ReportType) => {
    if (!subjectId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType,
          subjectId: subjectId.trim(),
          reportTypes: [reportType],
          companyId,
          forceRefresh: true,
        }),
      });
      const data = await res.json();
      if (data.reports?.length) {
        setReportsResult((prev) => {
          const filtered = prev.filter((r) => r.reportType !== reportType);
          return [data.reports[0], ...filtered];
        });
        setSelectedReport(data.reports[0]);
        setExpandedReportType(reportType);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Run full parallel bundle
  const handleRunBundle = async () => {
    if (!subjectId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType,
          subjectId: subjectId.trim(),
          reportTypes: BUNDLE_REPORT_TYPES,
          companyId,
          forceRefresh: true,
        }),
      });
      const data = await res.json();
      if (data.reports) {
        setReportsResult(data.reports);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Initiate OTP for GST Supreme Report
  const handleInitiateOtp = async () => {
    setOtpLoading(true);
    setOtpStatusMsg(null);
    try {
      const res = await fetch("/api/verification/otp-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: subjectId, mobile: "9876543210" }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSessionId(data.sessionId);
        setOtpStatusMsg(data.message);
      } else {
        setOtpStatusMsg(data.error || "Failed to initiate OTP session");
      }
    } catch {
      setOtpStatusMsg("Network error initiating OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP for GST Supreme Report
  const handleVerifyOtp = async () => {
    if (!otpSessionId) return;
    setOtpLoading(true);
    setOtpStatusMsg(null);
    try {
      const res = await fetch("/api/verification/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: otpSessionId,
          otp: otpInput,
          subjectId,
          subjectType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpStatusMsg("OTP Verified! GST Supreme Report unlocked with counterparty PANs.");
        handleRunSingle("gst_supreme_report");
      } else {
        setOtpStatusMsg(data.error || "Invalid OTP code");
      }
    } catch {
      setOtpStatusMsg("Network error verifying OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const reportCategories: Record<string, ReportType[]> = {
    "Tax & Financial Health": ["gst_exact_turnover", "gst_slab_check", "gst_supreme_report"],
    "Credit Bureau & Scoring": ["bureau_report", "payment_behaviour"],
    "Judicial, FIR & Compliance": ["court_case_history", "fir_check"],
    "Corporate Standing & MSME": ["company_supreme_report", "director_details", "msme_report", "import_export_report"],
    "Identity & Delivery Graph": ["mobile_to_pan", "mobile_identity", "mobile_to_address", "pan_to_mobile_email", "address_enrichment", "find_someone"],
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Subject Type, Subject ID Input, and Fast Actions */}
      <div className="rounded-xl border border-chaan-border bg-chaan-card p-5">
        <div className="grid gap-4 md:grid-cols-12 items-end">
          {/* Subject Type Toggle */}
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Subject Type</label>
            <div className="grid grid-cols-2 rounded-lg border border-slate-700 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => {
                  setSubjectType("business");
                  setSubjectId("27AAECG1234H1Z5");
                }}
                className={`rounded py-1 text-xs font-semibold transition ${
                  subjectType === "business"
                    ? "bg-chaan-accent text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Business
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubjectType("individual");
                  setSubjectId("AAECB1000H");
                }}
                className={`rounded py-1 text-xs font-semibold transition ${
                  subjectType === "individual"
                    ? "bg-chaan-accent text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Individual
              </button>
            </div>
          </div>

          {/* Subject ID input */}
          <div className="md:col-span-6">
            <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">
              {subjectType === "business" ? "GSTIN / PAN / CIN / Subject Identifier" : "PAN / Mobile (+91) / Subject ID"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                placeholder={subjectType === "business" ? "Enter GSTIN e.g. 27AAECG1234H1Z5" : "Enter PAN e.g. AAECB1000H"}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-100 uppercase tracking-wider outline-none focus:border-sky-500"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-500 uppercase font-mono">
                {subjectType}
              </span>
            </div>
          </div>

          {/* Parallel Fan-out Bundle Button */}
          <div className="md:col-span-3">
            <button
              onClick={handleRunBundle}
              disabled={loading || !subjectId.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <Zap size={14} />
              {loading ? "Fan-Out Executing..." : "Run Full Parallel Bundle"}
            </button>
          </div>

          {sampleEntities && sampleEntities.length > 0 && (
            <div className="md:col-span-12 pt-3 border-t border-chaan-border flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">Live Database Subjects:</span>
              {sampleEntities.map((ent) => (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => {
                    setSubjectId(ent.id);
                    setSubjectType("business");
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-mono ${
                    subjectId === ent.id
                      ? "bg-sky-500/20 text-sky-400 border-sky-500/50 font-bold"
                      : "bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/60 hover:text-white"
                  }`}
                >
                  <span className="font-sans font-medium">{ent.name}</span>{" "}
                  <span className="opacity-70 text-[10px]">({ent.id})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Catalog vs OTP Flow vs Skip Tracing */}
      <div className="flex border-b border-chaan-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 px-4 border-b-2 transition ${
            activeTab === "catalog"
              ? "border-chaan-accent text-chaan-accent"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          All 17 Verification Adapters
        </button>
        <button
          onClick={() => setActiveTab("otp")}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "otp"
              ? "border-chaan-accent text-chaan-accent"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <KeyRound size={14} />
          GST Supreme OTP Gateway
        </button>
        <button
          onClick={() => setActiveTab("skip_tracing")}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "skip_tracing"
              ? "border-chaan-accent text-chaan-accent"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MapPin size={14} />
          Find Someone / Skip Tracing
        </button>
      </div>

      {/* TAB 1: 17 Adapters Catalog */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {Object.entries(reportCategories).map(([catName, reports]) => (
            <div key={catName} className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-mono font-semibold">
                {catName}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((rt) => {
                  const entry = ledgerMap[rt];
                  const hasRun = reportsResult.find((r) => r.reportType === rt);
                  const isExpanded = expandedReportType === rt;

                  return (
                    <div
                      key={rt}
                      className="rounded-xl border border-chaan-border bg-chaan-card p-4 text-xs transition hover:border-slate-600 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-slate-200">{REPORT_LABELS[rt]}</h4>
                          {hasRun && (
                            <span className="rounded bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] text-emerald-400 font-mono">
                              Cached
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Used: {entry?.timesUsed ?? 0}</span>
                          <span>TTL: {REPORT_CACHE_TTL_HOURS[rt]}h</span>
                          <span className="text-amber-400">₹{entry?.cost ?? 50}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                        <button
                          onClick={() => handleRunSingle(rt)}
                          disabled={loading}
                          className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-center font-medium text-slate-200 transition disabled:opacity-50"
                        >
                          Pull Report
                        </button>
                        {hasRun && (
                          <button
                            onClick={() => setExpandedReportType(isExpanded ? null : rt)}
                            className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>

                      {/* Expandable Report Payload Viewer */}
                      {isExpanded && hasRun && (
                        <div className="mt-3 rounded-lg bg-slate-950 p-3 text-[11px] font-mono border border-slate-800 overflow-x-auto">
                          <div className="text-emerald-400 mb-1 font-semibold">
                            Provider: {hasRun.provider}
                          </div>
                          <pre className="text-slate-300 whitespace-pre-wrap">
                            {JSON.stringify(hasRun.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: GST Supreme OTP Gateway */}
      {activeTab === "otp" && (
        <div className="rounded-xl border border-chaan-border bg-chaan-card p-6 max-w-2xl space-y-4 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <KeyRound className="text-amber-400" size={18} />
            <span>GST Supreme Report — 2-Step OTP Authentication Flow</span>
          </div>
          <p className="text-slate-400">
            Per GSTN regulations, detailed filing history and counterparties' PAN numbers require authorized OTP consent from the registered mobile.
          </p>

          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
            <div>
              <label className="block text-slate-300 mb-1">Target GSTIN</label>
              <input
                type="text"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 font-mono uppercase"
              />
            </div>

            {!otpSessionId ? (
              <button
                onClick={handleInitiateOtp}
                disabled={otpLoading}
                className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950 hover:bg-amber-400 transition disabled:opacity-50"
              >
                {otpLoading ? "Initiating..." : "Step 1: Request OTP on Registered Mobile"}
              </button>
            ) : (
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Session Active: {otpSessionId}</span>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Enter 6-Digit GSTN OTP</label>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="w-48 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 font-mono tracking-widest text-center font-bold"
                  />
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading}
                  className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50"
                >
                  {otpLoading ? "Verifying..." : "Step 2: Submit OTP & Unlock Supreme Report"}
                </button>
              </div>
            )}

            {otpStatusMsg && (
              <div className="rounded bg-slate-800 p-2.5 text-slate-200 font-mono text-[11px]">
                {otpStatusMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Skip Tracing / Find Someone */}
      {activeTab === "skip_tracing" && (
        <div className="rounded-xl border border-chaan-border bg-chaan-card p-6 max-w-2xl space-y-4 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <MapPin className="text-chaan-accent" size={18} />
            <span>Skip Tracing / "Find Someone" Engine</span>
          </div>
          <p className="text-slate-400">
            Locate absconding debtors and untraceable directors using multi-source telecom KYC, delivery graph clusters, and MCA registered records.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              placeholder="Enter Mobile or PAN to trace"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-slate-200 outline-none"
            />
            <button
              onClick={() => handleRunSingle("find_someone")}
              disabled={loading}
              className="rounded-lg bg-chaan-accent px-4 py-2 font-semibold text-slate-950 hover:bg-sky-400 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search size={14} />
              Trace Now
            </button>
          </div>

          {reportsResult.find((r) => r.reportType === "find_someone") && (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3 font-mono">
              <div className="text-emerald-400 font-bold">Skip Tracing Dossier Resolved</div>
              <div className="text-slate-300">
                <p>Alternate Contacts: +91 98201 44521, +91 97690 12899</p>
                <p>Associated Emails: finance@acmetraders.in, director.accounts@gmail.com</p>
                <p>Active Locations: Lower Parel West, Mumbai · Whitefield, Bengaluru</p>
                <p>Linked Corporate Entities: Acme Logistics LLP, Apex Infra Solutions Pvt Ltd</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
