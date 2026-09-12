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
  Calendar,
  GraduationCap,
  Globe,
  UserCheck,
  Users,
  PlusCircle,
  PhoneCall,
  PhoneForwarded,
  FileWarning,
  Building,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Gavel,
  Check,
} from "lucide-react";

interface VerificationRunnerProps {
  companyId: string;
  ledgerMap: Record<string, { timesUsed: number; available: number; cost: number }>;
  sampleEntities?: Array<{ name: string; id: string; type: "debtor" | "vendor" }>;
}

export type FeatureTabKey =
  | "all"
  | "director_details"          // 1
  | "msme_report"               // 2
  | "gst_slab_check"            // 3
  | "gst_exact_turnover"        // 4
  | "gst_monthly_filings"       // 5
  | "gst_supreme_report"        // 6
  | "trust_hub_verification"    // 7
  | "mobile_to_pan"             // 8
  | "mobile_identity"           // 9
  | "court_case_history"        // 10
  | "import_export_report"      // 11
  | "education_marksheet_check" // 12
  | "pan_to_gst"                // 13
  | "voice_call_cadence"        // 14
  | "legal_notice_suite"        // 15
  | "delayed_payment_followup"  // 16
  | "subscription_seats"        // 17
  | "additional_company_addon"  // 18
  | "bundle";

export interface FeatureTabDef {
  key: FeatureTabKey;
  num: number;
  label: string;
  shortLabel: string;
  reportTypes: ReportType[];
  category: "Corporate & Identity" | "Tax & GST" | "Judicial & Legal" | "Recovery & Governance";
  description: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const ALL_18_FEATURE_TABS: FeatureTabDef[] = [
  {
    key: "director_details",
    num: 1,
    label: "Director Details",
    shortLabel: "Director Details",
    reportTypes: ["director_details"],
    category: "Corporate & Identity",
    description: "MCA21 DIN profile, active directorships, appointment dates, shareholding stakes, and Companies Act §164(2) disqualification vetting.",
    icon: UserCheck,
  },
  {
    key: "msme_report",
    num: 2,
    label: "MSME Report",
    shortLabel: "MSME Report",
    reportTypes: ["msme_report"],
    category: "Corporate & Identity",
    description: "Official Udyam registration certificate verification, enterprise classification (Micro/Small/Medium), NIC 5-digit codes, and registered operational units.",
    icon: Award,
  },
  {
    key: "gst_slab_check",
    num: 3,
    label: "GST Slab",
    shortLabel: "GST Slab",
    reportTypes: ["gst_slab_check"],
    category: "Tax & GST",
    description: "Turnover bracket, applicable tax liability slab, active return filing cadence, and regular vs. composition scheme classification.",
    icon: Scale,
  },
  {
    key: "gst_exact_turnover",
    num: 4,
    label: "GST Exact Turnover Filed",
    shortLabel: "GST Exact Turnover",
    reportTypes: ["gst_exact_turnover"],
    category: "Tax & GST",
    description: "Audited GSTR-3B and GSTR-9 multi-year exact aggregate & taxable turnover filed with YoY growth analysis.",
    icon: Coins,
  },
  {
    key: "gst_monthly_filings",
    num: 5,
    label: "GST Filing on Month Basis",
    shortLabel: "GST Monthly Filings",
    reportTypes: ["gst_monthly_filings"],
    category: "Tax & GST",
    description: "12-month compliance calendar with GSTR-1 and GSTR-3B ARN numbers, filing dates, turnover filed, and tax paid.",
    icon: Calendar,
  },
  {
    key: "gst_supreme_report",
    num: 6,
    label: "GST Supreme Report (Purchase & Sales)",
    shortLabel: "GST Supreme Report",
    reportTypes: ["gst_supreme_report"],
    category: "Tax & GST",
    description: "PAN-level all purchase and sales reconciliation, counterparty ITC mismatch detection, and top vendor risk vectors.",
    icon: Layers,
  },
  {
    key: "trust_hub_verification",
    num: 7,
    label: "Trust Hub and Trust ID",
    shortLabel: "Trust Hub & ID",
    reportTypes: ["trust_hub_verification"],
    category: "Corporate & Identity",
    description: "Digital Trust ID certificate (TRUST-CB-XXXX), credibility score (0–1000), compliance seals, and peer default registry check.",
    icon: ShieldCheck,
  },
  {
    key: "mobile_to_pan",
    num: 8,
    label: "Mobile to PAN",
    shortLabel: "Mobile to PAN",
    reportTypes: ["mobile_to_pan"],
    category: "Corporate & Identity",
    description: "Resolves 10-digit mobile number to verified PAN cardholder name and identity status via NSDL/Income Tax Department KYC registry.",
    icon: CreditCard,
  },
  {
    key: "mobile_identity",
    num: 9,
    label: "Mobile Identity For All Alternate Numbers",
    shortLabel: "Mobile Identity (Alternate #)",
    reportTypes: ["mobile_identity"],
    category: "Corporate & Identity",
    description: "Telecom KYC verification across all associated alternate numbers with carrier circle, SIM tenure, and linkages.",
    icon: PhoneCall,
  },
  {
    key: "court_case_history",
    num: 10,
    label: "Court Case History – FIR Report",
    shortLabel: "Court Case & FIR",
    reportTypes: ["court_case_history", "fir_check"],
    category: "Judicial & Legal",
    description: "e-Courts commercial litigation, Section 138 NI Act cheque dishonor cases, NCLT insolvency proceedings, and State CCTNS police FIR records.",
    icon: Gavel,
  },
  {
    key: "import_export_report",
    num: 11,
    label: "Import Export Report",
    shortLabel: "Import Export Report",
    reportTypes: ["import_export_report"],
    category: "Corporate & Identity",
    description: "DGFT Importer-Exporter Code (IEC), ICEGATE customs clearances, export EPCG authorizations, and major sea/air ports.",
    icon: Globe,
  },
  {
    key: "education_marksheet_check",
    num: 12,
    label: "10th and 12th Marksheets",
    shortLabel: "10th & 12th Marksheets",
    reportTypes: ["education_marksheet_check"],
    category: "Corporate & Identity",
    description: "National Academic Depository (NAD) & CBSE marksheet verification with roll number, passing year, marks, and SHA-256 hash.",
    icon: GraduationCap,
  },
  {
    key: "pan_to_gst",
    num: 13,
    label: "PAN to GST Number",
    shortLabel: "PAN to GST Directory",
    reportTypes: ["pan_to_gst"],
    category: "Tax & GST",
    description: "Comprehensive multi-state GSTIN directory linking all state branch registrations under a single parent PAN.",
    icon: Building,
  },
  {
    key: "voice_call_cadence",
    num: 14,
    label: "Default Payments Voice Calls (1m, 2m, 5m, 30m, 1h)",
    shortLabel: "Voice Calls Cadence",
    reportTypes: ["voice_call_cadence"],
    category: "Recovery & Governance",
    description: "Asterisk/Vobiz automated outbound telephony cadence scheduler (1 min, 2 mins, 5 mins, 30 mins, 1 hour) with emergency 24/7 override.",
    icon: PhoneForwarded,
  },
  {
    key: "legal_notice_suite",
    num: 15,
    label: "Legal Notices - GST, MSME, Income Tax & Demand",
    shortLabel: "Legal Notices Suite",
    reportTypes: ["legal_notice_suite"],
    category: "Judicial & Legal",
    description: "4 statutory notices with official Government Reference Numbers reported to the Income Tax Department (§43B(h)) and GST Department (§16(4) / DRC-01A).",
    icon: FileWarning,
  },
  {
    key: "delayed_payment_followup",
    num: 16,
    label: "Delayed Payments Follow UP",
    shortLabel: "Delayed Payments Follow UP",
    reportTypes: ["delayed_payment_followup"],
    category: "Recovery & Governance",
    description: "Temporal payment aging schedule (1–15, 16–30, 31–45, 45+ days), promise-to-pay tracker, and payment reconciliation timeline.",
    icon: Clock,
  },
  {
    key: "subscription_seats",
    num: 17,
    label: "User Access 5 per Subscription",
    shortLabel: "5 User Access Seats",
    reportTypes: ["subscription_seats"],
    category: "Recovery & Governance",
    description: "5 organization team access seats included per standard subscription at ₹0 additional charge with role-based governance.",
    icon: Users,
  },
  {
    key: "additional_company_addon",
    num: 18,
    label: "Add Additional Company Name for ₹1,500",
    shortLabel: "Add Company (₹1,500)",
    reportTypes: ["additional_company_addon"],
    category: "Recovery & Governance",
    description: "Multi-entity corporate profile addition at flat ₹1,500 add-on fee with consolidated multi-company risk view.",
    icon: PlusCircle,
  },
];

const ALL_REPORT_TYPES: ReportType[] = [
  "director_details",
  "msme_report",
  "gst_slab_check",
  "gst_exact_turnover",
  "gst_monthly_filings",
  "gst_supreme_report",
  "trust_hub_verification",
  "mobile_to_pan",
  "mobile_identity",
  "court_case_history",
  "fir_check",
  "import_export_report",
  "education_marksheet_check",
  "pan_to_gst",
  "voice_call_cadence",
  "legal_notice_suite",
  "delayed_payment_followup",
  "subscription_seats",
  "additional_company_addon",
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
  // Default to Tab 1: Director Details or "all"
  const [activeTab, setActiveTab] = useState<FeatureTabKey>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
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
    setBundleProgress("Dispatching parallel queries across all statutory gateways...");
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

  // Find currently active feature definition (if one of the 18 is selected)
  const currentFeatureTab = ALL_18_FEATURE_TABS.find((f) => f.key === activeTab);
  const currentFeatureIndex = currentFeatureTab ? ALL_18_FEATURE_TABS.indexOf(currentFeatureTab) : -1;
  const prevFeature = currentFeatureIndex > 0 ? ALL_18_FEATURE_TABS[currentFeatureIndex - 1] : null;
  const nextFeature =
    currentFeatureIndex >= 0 && currentFeatureIndex < ALL_18_FEATURE_TABS.length - 1
      ? ALL_18_FEATURE_TABS[currentFeatureIndex + 1]
      : null;

  // Filtered feature tabs based on category filter
  const displayedFeatureTabs = ALL_18_FEATURE_TABS.filter((tab) => {
    if (categoryFilter === "All") return true;
    return tab.category === categoryFilter;
  });

  // Filter adapters when in "all" overview
  const getVisibleAdaptersInAll = (): ReportType[] => {
    const list = ALL_REPORT_TYPES;
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter((rt) => {
      const label = (REPORT_LABELS[rt] || "").toLowerCase();
      const code = rt.toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  };

  const visibleAllAdapters = getVisibleAdaptersInAll();
  const generatedCount = Object.keys(reportsMap).length;

  return (
    <div className="space-y-6">
      {/* 18-FEATURE DEDICATED TAB CONTROLS */}
      <div className="rounded-2xl border border-chaan-border bg-chaan-card p-5 space-y-4 shadow-sm">
        {/* Top Header Strip: Quick Switcher & Modes */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chaan-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-chaan-brand" size={18} />
              <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                18 Dedicated Feature Tabs
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Select any feature tab below for an isolated parameter card, autofill chips, and formatted visual dossier.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View All Grid Button */}
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30 font-bold"
                  : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
              }`}
            >
              <Layers size={13} />
              <span>All 18 Overview Grid</span>
            </button>

            {/* 360 Bundle Dossier Button */}
            <button
              onClick={() => setActiveTab("bundle")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-chaan-brand/50 ${
                activeTab === "bundle"
                  ? "bg-chaan-brand text-white shadow-sm shadow-chaan-brand/30 font-bold"
                  : "text-chaan-brand hover:bg-chaan-brand/10 bg-slate-900"
              }`}
            >
              <Zap size={13} />
              <span>360° Parallel Bundle</span>
            </button>
          </div>
        </div>

        {/* Category Pill Filters to easily navigate the 18 tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={12} /> Filter Tabs:
          </span>
          {["All", "Tax & GST", "Corporate & Identity", "Judicial & Legal", "Recovery & Governance"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                categoryFilter === cat
                  ? "bg-slate-800 text-white font-bold border border-slate-600"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* The 18 Dedicated Tabs Rail */}
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex flex-nowrap sm:flex-wrap gap-2 min-w-max sm:min-w-0">
            {displayedFeatureTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const hasCachedReport = tab.reportTypes.some((rt) => !!reportsMap[rt]);

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition border text-left shrink-0 ${
                    isActive
                      ? "bg-chaan-brand text-white border-chaan-brand shadow-md shadow-chaan-brand/25 font-bold"
                      : "bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isActive
                        ? "bg-black/30 text-white"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {tab.num < 10 ? `0${tab.num}` : tab.num}
                  </span>
                  <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                  <span className="whitespace-nowrap tracking-tight">{tab.shortLabel}</span>

                  {hasCachedReport && (
                    <span
                      title="Report generated and available in dossier"
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isActive ? "bg-white" : "bg-emerald-400 animate-pulse"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DEDICATED TAB VIEW: Single feature selected from the 18 */}
      {currentFeatureTab && activeTab !== "all" && activeTab !== "bundle" && (
        <div className="space-y-6">
          {/* Feature Focus Banner */}
          <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-chaan-brand/20 text-chaan-brand border border-chaan-brand/40 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                    Feature #{currentFeatureTab.num} of 18 · {currentFeatureTab.category}
                  </span>
                  {currentFeatureTab.reportTypes.some((rt) => !!reportsMap[rt]) && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      <CheckCircle2 size={11} />
                      Report Cached &amp; Ready
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5 pt-1">
                  <currentFeatureTab.icon size={20} className="text-chaan-brand" />
                  <span>
                    {currentFeatureTab.num}. {currentFeatureTab.label}
                  </span>
                </h2>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  {currentFeatureTab.description}
                </p>
              </div>

              {/* Prev / Next Feature Quick Navigation Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {prevFeature && (
                  <button
                    onClick={() => setActiveTab(prevFeature.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition"
                  >
                    <ChevronLeft size={14} />
                    <span>#{prevFeature.num} Prev</span>
                  </button>
                )}
                {nextFeature && (
                  <button
                    onClick={() => setActiveTab(nextFeature.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-chaan-brand/40 bg-chaan-brand/10 text-xs text-chaan-brand hover:bg-chaan-brand/20 transition font-medium"
                  >
                    <span>Next #{nextFeature.num}</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Render the Dedicated Adapter Card(s) for this Feature Tab */}
          <div className="space-y-4">
            {currentFeatureTab.reportTypes.map((rt) => {
              const entry = ledgerMap[rt];
              const cached = reportsMap[rt] || null;

              return (
                <AdapterCard
                  key={`${rt}-${activeTab}`}
                  reportType={rt}
                  companyId={companyId}
                  ledger={entry}
                  sampleEntities={sampleEntities}
                  cachedReport={cached}
                  onReportGenerated={handleReportGenerated}
                  isExpandedDefault={true}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ALL 18 FEATURES OVERVIEW GRID */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">
                Displaying <strong>{visibleAllAdapters.length}</strong> statutory adapter blocks across all 18 features
              </span>
              {generatedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
                  <CheckCircle2 size={12} />
                  {generatedCount} Available in Dossier Cache
                </span>
              )}
            </div>

            {/* Search Filter */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search feature by name, statute or code..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-chaan-brand"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            {visibleAllAdapters.map((rt) => {
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
        </div>
      )}

      {/* TAB: Multi-Adapter Fan-Out Bundle */}
      {activeTab === "bundle" && (
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
                Executes all foundational verification adapters (GST turnover, Supreme filing audit, Commercial Bureau score, e-Courts litigation history, MSME Udyam, MCA21 directorships, Telecom KYC, and address delivery graphs) in parallel under a single unified call.
              </p>
            </div>

            <span className="px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 font-mono text-xs font-bold shrink-0">
              18 Gateways Fan-Out
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
                  {bundleLoading ? "Fan-Out Executing..." : "Execute 18x Parallel Bundle"}
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
      )}
    </div>
  );
}
