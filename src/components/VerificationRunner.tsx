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
import { AdapterCard } from "./verification/AdapterCard";
import { ReportResultView } from "./verification/ReportResultView";
import {
  Search,
  Zap,
  ShieldCheck,
  Building2,
  FileText,
  CreditCard,
  Scale,
  Award,
  Phone,
  Layers,
  Sparkles,
  CheckCircle2,
  Filter,
} from "lucide-react";

interface VerificationRunnerProps {
  companyId: string;
  ledgerMap: Record<string, { timesUsed: number; available: number; cost: number }>;
  sampleEntities?: Array<{ name: string; id: string; type: "debtor" | "vendor" }>;
}

type TabKey =
  | "all"
  | "tax"
  | "bureau"
  | "judicial"
  | "corporate"
  | "identity"
  | "recovery"
  | "subscription"
  | "bundle";

const CATEGORY_ADAPTERS: Record<Exclude<TabKey, "all" | "bundle">, ReportType[]> = {
  tax: [
    "gst_exact_turnover",
    "gst_slab_check",
    "gst_monthly_filings",
    "gst_supreme_report",
    "pan_to_gst",
  ],
  bureau: ["bureau_report", "payment_behaviour"],
  judicial: ["court_case_history", "fir_check"],
  corporate: [
    "director_details",
    "msme_report",
    "trust_hub_verification",
    "education_marksheet_check",
    "import_export_report",
    "company_supreme_report",
  ],
  identity: [
    "mobile_to_pan",
    "mobile_identity",
    "find_someone",
    "mobile_to_address",
    "pan_to_mobile_email",
    "address_enrichment",
  ],
  recovery: [
    "voice_call_cadence",
    "legal_notice_suite",
    "delayed_payment_followup",
  ],
  subscription: [
    "subscription_seats",
    "additional_company_addon",
  ],
};

const ALL_REPORT_TYPES: ReportType[] = [
  // 1. Director Details
  "director_details",
  // 2. MSME Report
  "msme_report",
  // 3. GST Slab
  "gst_slab_check",
  // 4. GST Exact Turnover Filed
  "gst_exact_turnover",
  // 5. GST Filing on Month Basis
  "gst_monthly_filings",
  // 6. GST Supreme Report PAN Number for all Purchase and Sales
  "gst_supreme_report",
  // 7. Trust Hub and Trust ID
  "trust_hub_verification",
  // 8. Mobile to PAN
  "mobile_to_pan",
  // 9. Mobile Identity (All Alternate Numbers)
  "mobile_identity",
  // 10. Court Case History & FIR Report
  "court_case_history",
  "fir_check",
  // 11. Import Export Report
  "import_export_report",
  // 12. 10th and 12th Marksheets
  "education_marksheet_check",
  // 13. PAN to GST Number Directory
  "pan_to_gst",
  // 14. Default Payments Voice Calls Cadence (1m/2m/5m/30m/1h)
  "voice_call_cadence",
  // 15. Legal Notices - GST, MSME, Income Tax & Demand
  "legal_notice_suite",
  // 16. Delayed Payments Follow Up
  "delayed_payment_followup",
  // 17. User Access 5 per Subscription
  "subscription_seats",
  // 18. Add Additional Company Name for ₹1,500
  "additional_company_addon",
  // Underlying Supporting Gateways
  "find_someone",
  "bureau_report",
  "payment_behaviour",
  "company_supreme_report",
  "mobile_to_address",
  "pan_to_mobile_email",
  "address_enrichment",
];

export function VerificationRunner({
  companyId,
  ledgerMap,
  sampleEntities = [],
}: VerificationRunnerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [reportsMap, setReportsMap] = useState<Partial<Record<ReportType, NormalizedReport>>>({});

  // Bundle Fan-Out Tab State
  const [bundleSubjectId, setBundleSubjectId] = useState("27AAECG1234H1Z5");
  const [bundleSubjectType, setBundleSubjectType] = useState<SubjectType>("business");
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleProgress, setBundleProgress] = useState<string | null>(null);

  const handleReportGenerated = (report: NormalizedReport) => {
    setReportsMap((prev) => ({
      ...prev,
      [report.reportType]: report,
    }));
  };

  // Run full parallel bundle
  const handleRunBundle = async () => {
    if (!bundleSubjectId.trim()) return;
    setBundleLoading(true);
    setBundleProgress("Dispatching parallel queries across 18 statutory gateways...");
    try {
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType: bundleSubjectType,
          subjectId: bundleSubjectId.trim(),
          reportTypes: BUNDLE_REPORT_TYPES,
          companyId,
          forceRefresh: true,
        }),
      });
      const data = await res.json();
      if (data.reports?.length) {
        const nextMap: Partial<Record<ReportType, NormalizedReport>> = { ...reportsMap };
        for (const rep of data.reports) {
          nextMap[rep.reportType as ReportType] = rep;
        }
        setReportsMap(nextMap);
        setBundleProgress(`Completed! ${data.reports.length} reports compiled into dossier.`);
      } else {
        setBundleProgress(data.error || "Bundle execution failed");
      }
    } catch {
      setBundleProgress("Network error running bundle");
    } finally {
      setBundleLoading(false);
    }
  };

  // Filter adapters by active tab and search query
  const getVisibleAdapters = (): ReportType[] => {
    let list: ReportType[];
    if (activeTab === "all") {
      list = ALL_REPORT_TYPES;
    } else if (activeTab === "bundle") {
      return [];
    } else {
      list = CATEGORY_ADAPTERS[activeTab] || [];
    }

    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter((rt) => {
      const label = (REPORT_LABELS[rt] || "").toLowerCase();
      const code = rt.toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  };

  const visibleAdapters = getVisibleAdapters();
  const generatedCount = Object.keys(reportsMap).length;

  return (
    <div className="space-y-6">
      {/* Category Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-3">
        <div className="flex flex-wrap gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-lg transition ${
              activeTab === "all"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            All 18 Verification Features
          </button>
          <button
            onClick={() => setActiveTab("tax")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "tax"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <FileText size={14} />
            Tax & GST (5)
          </button>
          <button
            onClick={() => setActiveTab("corporate")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "corporate"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Building2 size={14} />
            Corporate & MSME (6)
          </button>
          <button
            onClick={() => setActiveTab("judicial")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "judicial"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Scale size={14} />
            Judicial & Police (2)
          </button>
          <button
            onClick={() => setActiveTab("identity")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "identity"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Phone size={14} />
            Identity & Delivery (6)
          </button>
          <button
            onClick={() => setActiveTab("recovery")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "recovery"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Phone size={14} />
            Recovery & Voice (3)
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "subscription"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Award size={14} />
            Seats & Add-on (2)
          </button>
          <button
            onClick={() => setActiveTab("bundle")}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 border border-chaan-brand/50 ${
              activeTab === "bundle"
                ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30"
                : "text-chaan-brand hover:bg-chaan-brand/10"
            }`}
          >
            <Zap size={14} />
            360° Bundle Dossier
          </button>
        </div>

        {/* Search filter input */}
        {activeTab !== "bundle" && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search adapter..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-chaan-brand"
            />
          </div>
        )}
      </div>

      {/* Overview Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span>Displaying <strong>{visibleAdapters.length}</strong> active statutory adapter blocks</span>
          {generatedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
              <CheckCircle2 size={12} />
              {generatedCount} Report{generatedCount === 1 ? "" : "s"} In Active Cache
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Click any block to expand its dedicated parameters & formatted dossier
        </span>
      </div>

      {/* TAB: Multi-Adapter Fan-Out Bundle */}
      {activeTab === "bundle" ? (
        <div className="rounded-xl border border-chaan-border bg-chaan-card p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="text-chaan-brand" size={22} />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Parallel Multi-Adapter Fan-Out Execution
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-400 max-w-2xl">
                Executes all 11 foundational verification adapters (GST turnover, Supreme filing audit, Commercial Bureau score, e-Courts litigation history, MSME Udyam, MCA21 directorships, Telecom KYC, and address delivery graphs) in parallel under a single unified call.
              </p>
            </div>

            <span className="px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 font-mono text-xs font-bold shrink-0">
              11 Simultaneous Queries
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-12 items-end">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono">
                  Subject Type
                </label>
                <div className="grid grid-cols-2 rounded-lg border border-slate-700 bg-slate-950 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBundleSubjectType("business");
                      setBundleSubjectId("27AAECG1234H1Z5");
                    }}
                    className={`rounded py-1 text-xs font-semibold transition ${
                      bundleSubjectType === "business"
                        ? "bg-chaan-brand text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Business
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBundleSubjectType("individual");
                      setBundleSubjectId("AAECB1000H");
                    }}
                    className={`rounded py-1 text-xs font-semibold transition ${
                      bundleSubjectType === "individual"
                        ? "bg-chaan-brand text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase font-mono">
                  Target Identifier (GSTIN / PAN / CIN)
                </label>
                <input
                  type="text"
                  value={bundleSubjectId}
                  onChange={(e) => setBundleSubjectId(e.target.value)}
                  placeholder="Enter GSTIN e.g. 27AAECG1234H1Z5"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-mono text-slate-100 uppercase tracking-wider outline-none focus:border-chaan-brand"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={handleRunBundle}
                  disabled={bundleLoading || !bundleSubjectId.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-chaan-brand px-4 py-2 text-xs font-bold text-white hover:bg-chaan-brandDark transition disabled:opacity-50 shadow-md shadow-chaan-brand/20"
                >
                  <Zap size={15} />
                  {bundleLoading ? "Fan-Out Executing..." : "Execute 11x Parallel Bundle"}
                </button>
              </div>
            </div>

            {/* Quick Autofill Chips */}
            {sampleEntities.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Autofill from Live Database:</span>
                {sampleEntities.map((ent) => (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => {
                      setBundleSubjectId(ent.id);
                      setBundleSubjectType("business");
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-mono ${
                      bundleSubjectId === ent.id
                        ? "bg-chaan-brand/20 text-chaan-brand border-chaan-brand/50 font-bold"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="font-sans font-medium">{ent.name}</span>{" "}
                    <span className="opacity-70 text-[10px]">({ent.id})</span>
                  </button>
                ))}
              </div>
            )}

            {bundleProgress && (
              <div className="rounded-lg bg-slate-950 p-3 text-xs font-mono border border-slate-800 text-rose-300 flex items-center gap-2">
                <Sparkles size={14} className="text-chaan-brand" />
                <span>{bundleProgress}</span>
              </div>
            )}
          </div>

          {/* Compiled Bundle Reports Preview */}
          {generatedCount > 0 && (
            <div className="space-y-4 pt-4 border-t border-chaan-border">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" size={16} />
                Compiled Parallel Dossier Reports ({generatedCount} Available)
              </h3>
              <div className="grid gap-4">
                {Object.values(reportsMap)
                  .filter((r): r is NormalizedReport => Boolean(r))
                  .map((rep) => (
                    <div key={rep.reportType} className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-300 uppercase font-mono pl-1">
                        {REPORT_LABELS[rep.reportType]}
                      </h4>
                      <ReportResultView report={rep} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ADAPTERS GRID: Each adapter in its own specific area of respectiveness */
        <div className="grid gap-4 sm:grid-cols-1">
          {visibleAdapters.map((rt) => {
            const entry = ledgerMap[rt];
            const cached = reportsMap[rt] || null;

            return (
              <AdapterCard
                key={rt}
                reportType={rt}
                companyId={companyId}
                ledger={entry}
                sampleEntities={sampleEntities}
                cachedReport={cached}
                onReportGenerated={handleReportGenerated}
                isExpandedDefault={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
