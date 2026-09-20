"use client";

import React, { useState, useMemo } from "react";
import {
  REPORT_LABELS,
  REPORT_CACHE_TTL_HOURS,
  BUNDLE_REPORT_TYPES,
  type ReportType,
  type SubjectType,
  type NormalizedReport,
} from "@/lib/verification-gateway/types";
import { FeatureBlockCard } from "./verification/FeatureBlockCard";
import { FeatureRunnerModal } from "./verification/FeatureRunnerModal";
import { ReportResultView } from "./verification/ReportResultView";
import { ReportLibraryView } from "./ReportLibraryView";
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
  Clock,
  Coins,
  Gavel,
  X,
  Target,
  Filter,
} from "lucide-react";

interface VerificationRunnerProps {
  companyId: string;
  ledgerMap: Record<string, { timesUsed: number; available: number; cost: number }>;
  sampleEntities?: Array<{ name: string; id: string; type: "debtor" | "vendor" }>;
}

export type FeatureCategory =
  | "All"
  | "Corporate & Identity"
  | "Tax & GST"
  | "Judicial & Legal";

export interface FeatureItem {
  key: string;
  num: number;
  label: string;
  shortLabel: string;
  reportTypes: ReportType[];
  category: "Corporate & Identity" | "Tax & GST" | "Judicial & Legal";
  statute: string;
  description: string;
  purpose: string;
  useCase: string;
  capabilities: string[];
  cost: number;
  primaryInputLabel: string;
  primaryPlaceholder: string;
  defaultId: string;
  secondaryInputLabel?: string;
  secondaryPlaceholder?: string;
  defaultSecondary?: string;
  subjectType: "business" | "individual";
  keywords: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const ALL_18_FEATURES: FeatureItem[] = [
  {
    key: "director_details",
    num: 1,
    label: "Director Details & DIN Vetting",
    shortLabel: "Director Details",
    reportTypes: ["director_details"],
    category: "Corporate & Identity",
    statute: "MCA21 · Ministry of Corporate Affairs",
    description: "MCA21 DIN profile, active directorships, appointment dates, shareholding stakes, and Companies Act §164(2) disqualification vetting.",
    purpose: "Verifies Director Identification Number (DIN), active and historical directorships, equity stakes, and checks for disqualification under Section 164(2) of the Companies Act before extending trade credit.",
    useCase: "Detect shell corporations, serial disqualified directors, and undisclosed sister entities before extending high-value trade credit.",
    capabilities: ["MCA21 DIN Lookup", "Active Directorships", "Section 164(2) Disqualification", "Shareholding Profile"],
    cost: 200,
    primaryInputLabel: "Director DIN (8 Digits) or Corporate CIN",
    primaryPlaceholder: "e.g. 01234567 or U72900MH2020PTC123456",
    defaultId: "01234567",
    subjectType: "individual",
    keywords: ["director", "din", "mca", "mca21", "companies act", "disqualification", "section 164", "board", "promoter", "stakeholder", "shareholding", "shell company", "governance"],
    icon: UserCheck,
  },
  {
    key: "msme_report",
    num: 2,
    label: "MSME Registration & Udyam Report",
    shortLabel: "MSME Report",
    reportTypes: ["msme_report"],
    category: "Corporate & Identity",
    statute: "Ministry of MSME · Udyam Registration Portal",
    description: "Official Udyam registration certificate verification, enterprise classification (Micro/Small/Medium), NIC 5-digit codes, and registered operational units.",
    purpose: "Authenticates official Udyam Registration Certificate, micro/small/medium enterprise classification, major operational activities (Manufacturing vs Services), NIC 5-digit trade codes, and registered industrial units.",
    useCase: "Verify if a buyer or vendor qualifies under MSMED Act 2006 for statutory 45-day payment deadlines (§15) and Section 43B(h) income tax deduction disallowances.",
    capabilities: ["Udyam Certificate Auth", "Micro/Small/Medium Tier", "NIC 5-Digit Codes", "Section 43B(h) MSME Status"],
    cost: 200,
    primaryInputLabel: "Udyam Registration Number or Business GSTIN",
    primaryPlaceholder: "e.g. UDYAM-MH-12-0012345 or 27AAECG1234H1Z5",
    defaultId: "UDYAM-MH-12-0012345",
    subjectType: "business",
    keywords: ["msme", "udyam", "small business", "enterprise", "classification", "nic code", "manufacturing", "services", "section 43b(h)", "45 days payment", "msmed act", "micro enterprise"],
    icon: Award,
  },
  {
    key: "gst_slab_check",
    num: 3,
    label: "GST Slab & Tax Bracket Check",
    shortLabel: "GST Slab Check",
    reportTypes: ["gst_slab_check"],
    category: "Tax & GST",
    statute: "GSTN & CBIC Direct Gateway",
    description: "Turnover bracket, applicable tax liability slab, active return filing cadence, and regular vs. composition scheme classification.",
    purpose: "Retrieves official aggregate turnover bracket, applicable tax liability slab, active return filing cadence, and regular vs. composition scheme classification directly from the GST registry.",
    useCase: "Quickly assess the statutory scale and tax band of a customer or supplier without requesting confidential internal P&L statements.",
    capabilities: ["Turnover Bracket Slabs", "Regular vs Composition", "Jurisdiction Ward", "Registration Validation"],
    cost: 15,
    primaryInputLabel: "Target GSTIN or PAN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or AAECG1234H",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
    keywords: ["gst slab", "tax bracket", "turnover bracket", "composition scheme", "regular taxpayer", "tax liability", "gstin status", "business scale", "cbic", "tax ward"],
    icon: Scale,
  },
  {
    key: "gst_exact_turnover",
    num: 4,
    label: "GST Exact Turnover Filed (GSTR-3B / 9)",
    shortLabel: "GST Exact Turnover",
    reportTypes: ["gst_exact_turnover"],
    category: "Tax & GST",
    statute: "GSTN APIsetu Audited Returns (GSTR-3B & 9)",
    description: "Audited GSTR-3B and GSTR-9 multi-year exact aggregate & taxable turnover filed with YoY growth analysis.",
    purpose: "Extracts exact audited aggregate and taxable turnover figures as declared on monthly GSTR-3B and annual GSTR-9 returns with multi-year YoY revenue trend analysis.",
    useCase: "Underwrite trade credit limits, determine purchasing power, and detect revenue inflation or declining business trajectory before issuing credit.",
    capabilities: ["Exact Taxable Turnover", "GSTR-3B Multi-Year", "YoY Revenue Trend", "Gross Margin Analysis"],
    cost: 200,
    primaryInputLabel: "Target GSTIN (15 characters)",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Financial Year Bracket",
    secondaryPlaceholder: "FY 2023-24",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "FY 2023-24",
    subjectType: "business",
    keywords: ["turnover", "exact turnover", "revenue", "gstr-3b", "gstr-9", "sales turnover", "audited sales", "annual revenue", "growth trend", "credit limit underwriting", "financial capacity", "balance sheet"],
    icon: Coins,
  },
  {
    key: "gst_monthly_filings",
    num: 5,
    label: "GST Filing Regularity (12 Months)",
    shortLabel: "GST Monthly Filings",
    reportTypes: ["gst_monthly_filings"],
    category: "Tax & GST",
    statute: "Goods and Services Tax Network (GSTN)",
    description: "12-month compliance calendar with GSTR-1 and GSTR-3B ARN numbers, filing dates, turnover filed, and tax paid.",
    purpose: "Compiles a 12-month return filing regularity calendar with exact GSTR-1 and GSTR-3B ARN numbers, filing dates, turnover declared, and tax paid to spot delays, non-filing, or return gaps.",
    useCase: "Spot defaulting counterparties and cash-flow distress early before their GST registration gets suspended or cancelled by authorities.",
    capabilities: ["12-Month Calendar", "GSTR-1 & 3B ARNs", "Filing Punctuality Score", "Tax Paid Reconciliation"],
    cost: 0,
    primaryInputLabel: "Target GSTIN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Financial Year Bracket",
    secondaryPlaceholder: "FY 2024-25",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "FY 2024-25",
    subjectType: "business",
    keywords: ["monthly filings", "filing calendar", "gstr-1", "gstr-3b", "arn number", "filing regularity", "compliance calendar", "return delay", "non filing", "tax default", "suspended gstin"],
    icon: Calendar,
  },
  {
    key: "gst_supreme_report",
    num: 6,
    label: "GST Supreme Audit (Purchases & Sales)",
    shortLabel: "GST Supreme Audit",
    reportTypes: ["gst_supreme_report"],
    category: "Tax & GST",
    statute: "Authorized 2-Step OTP Portal Gateway",
    description: "PAN-level all purchase and sales reconciliation, counterparty ITC mismatch detection, and top vendor risk vectors.",
    purpose: "PAN-level reconciliation of all purchase and sales transactions, counterparty ITC (Input Tax Credit) mismatch detection, circular trading red flags, and top vendor risk exposures via authorized 2-step OTP.",
    useCase: "Protect your firm from GST Section 16(4) / DRC-01A ITC disallowances and heavy tax penalties caused by fraudulent or non-compliant suppliers.",
    capabilities: ["ITC Mismatch Detection", "Purchase vs Sales Reconciliation", "Counterparty Risk Vectors", "Circular Trading Red Flags"],
    cost: 299,
    primaryInputLabel: "Target GSTIN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Authorized Signatory Mobile (+91)",
    secondaryPlaceholder: "e.g. 9876543210",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "9876543210",
    subjectType: "business",
    keywords: ["supreme report", "itc mismatch", "input tax credit", "purchase reconciliation", "sales audit", "fake invoice", "circular trading", "section 16(4)", "drc-01a", "vendor risk", "tax penalty", "otp audit"],
    icon: Layers,
  },
  {
    key: "trust_hub_verification",
    num: 7,
    label: "Trust Network & Digital Trust ID",
    shortLabel: "Trust Network & ID",
    reportTypes: ["trust_hub_verification"],
    category: "Corporate & Identity",
    statute: "ChaanBean Trust Network & Default Registry",
    description: "Digital Trust ID certificate (TRUST-CB-XXXX), credibility score (0–1000), compliance seals, and peer default registry check.",
    purpose: "Generates a certified Digital Trust ID (TRUST-CB-XXXX), calculating a dynamic 0–1000 credibility score based on peer trade experiences, payment punctuality, and default registry queries.",
    useCase: "Benchmark counterparty credibility and commercial trustworthiness against hundreds of verified businesses in the ChaanBean ecosystem.",
    capabilities: ["Digital Trust ID", "0–1000 Credibility Score", "Peer Default Registry", "Compliance Badges"],
    cost: 99,
    primaryInputLabel: "Target GSTIN / Trust ID / PAN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or TRUST-CB-1029",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
    keywords: ["trust id", "trust score", "credibility score", "peer review", "default registry", "trade reference", "reputation", "trust badge", "supplier vetting"],
    icon: ShieldCheck,
  },
  {
    key: "mobile_to_pan",
    num: 8,
    label: "Mobile to PAN Identity Resolution",
    shortLabel: "Mobile to PAN",
    reportTypes: ["mobile_to_pan"],
    category: "Corporate & Identity",
    statute: "NSDL / Income Tax Department KYC Gateway",
    description: "Resolves 10-digit mobile number to verified PAN cardholder name and identity status via NSDL/Income Tax Department KYC registry.",
    purpose: "Resolves any 10-digit Indian mobile number to verified PAN cardholder name, status, and linked identity records in the official tax authority database.",
    useCase: "Authenticate the true identity of buyers, sales agents, or representatives who only provide a mobile number during sales discussions.",
    capabilities: ["NSDL Mobile-PAN Bridge", "PAN Name Match", "Identity Verification", "Taxpayer Status Check"],
    cost: 50,
    primaryInputLabel: "10-Digit Mobile Number",
    primaryPlaceholder: "e.g. 9876543210",
    defaultId: "9876543210",
    subjectType: "individual",
    keywords: ["mobile to pan", "phone to pan", "nsdl", "income tax", "pan verification", "cardholder name", "phone lookup", "identity check", "kyc name"],
    icon: CreditCard,
  },
  {
    key: "mobile_identity",
    num: 9,
    label: "Mobile Identity & Alternate Numbers",
    shortLabel: "Mobile Identity",
    reportTypes: ["mobile_identity"],
    category: "Corporate & Identity",
    statute: "Department of Telecommunications (DoT) & Operators",
    description: "Telecom KYC verification across all associated alternate numbers with carrier circle, SIM tenure, and linkages.",
    purpose: "Conducts telecom KYC verification across primary and alternate contact numbers, uncovering telecom circle, SIM card tenure, carrier network, and linked phone linkages.",
    useCase: "Detect newly registered burner SIM cards used by fraudulent debtors to evade collection calls and avoid debt recovery.",
    capabilities: ["Telecom KYC Status", "SIM Card Tenure", "Carrier Network & Circle", "Alternate Contacts Mapping"],
    cost: 200,
    primaryInputLabel: "Primary Mobile Number (+91)",
    primaryPlaceholder: "e.g. 9876543210",
    defaultId: "9876543210",
    subjectType: "individual",
    keywords: ["mobile identity", "alternate numbers", "telecom kyc", "sim tenure", "burner phone", "carrier circle", "airtel", "jio", "vodafone vi", "phone history", "contact tracing"],
    icon: PhoneCall,
  },
  {
    key: "court_case_history",
    num: 10,
    label: "Court Case History & Police FIRs",
    shortLabel: "Court Case & FIR",
    reportTypes: ["court_case_history", "fir_check"],
    category: "Judicial & Legal",
    statute: "e-Courts National Judicial Grid, NCLT & State CCTNS",
    description: "e-Courts commercial litigation, Section 138 NI Act cheque dishonor cases, NCLT insolvency proceedings, and State CCTNS police FIR records.",
    purpose: "Comprehensive judicial search for commercial litigation, Section 138 Negotiable Instruments Act (cheque bounce) cases, NCLT corporate insolvency/bankruptcy proceedings, and police FIR records.",
    useCase: "Prevent disastrous credit exposure to chronic serial defaulters, bankrupt entities, or promoters facing criminal or insolvency proceedings.",
    capabilities: ["Section 138 Cheque Bounce", "NCLT Insolvency Scan", "e-Courts Civil & Commercial", "Police FIR Records"],
    cost: 250,
    primaryInputLabel: "Entity Name, PAN or Director Name",
    primaryPlaceholder: "e.g. Acme Retailers Pvt Ltd or AAECG1234H",
    defaultId: "AAECG1234H",
    subjectType: "business",
    keywords: ["court case", "litigation", "cheque bounce", "section 138", "dishonour of cheque", "nclt", "insolvency", "bankruptcy", "police fir", "cctns", "criminal", "high court", "district court", "commercial dispute", "lawsuit", "defaulter"],
    icon: Gavel,
  },
  {
    key: "import_export_report",
    num: 11,
    label: "Import Export Profile & Customs (IEC)",
    shortLabel: "Import Export Report",
    reportTypes: ["import_export_report"],
    category: "Corporate & Identity",
    statute: "DGFT & ICEGATE Customs Clearance Gateway",
    description: "DGFT Importer-Exporter Code (IEC), ICEGATE customs clearances, export EPCG authorizations, and major sea/air ports.",
    purpose: "Verifies Importer-Exporter Code (IEC) status, foreign trade authorizations, EPCG licenses, export/import volume trends, and active customs port registrations.",
    useCase: "Validate overseas logistics capabilities, shipping activity, and customs credentials of cross-border trading partners and freight clients.",
    capabilities: ["DGFT IEC Verification", "ICEGATE Customs Clearances", "Port Registrations", "Foreign Trade Authorizations"],
    cost: 250,
    primaryInputLabel: "10-Digit IEC Code or Corporate PAN",
    primaryPlaceholder: "e.g. 0388012345 or AAECG1234H",
    defaultId: "0388012345",
    subjectType: "business",
    keywords: ["import export", "iec", "dgft", "icegate", "customs", "shipping", "export licenses", "foreign trade", "port clearance", "cross border", "cargo"],
    icon: Globe,
  },
  {
    key: "education_marksheet_check",
    num: 12,
    label: "10th & 12th Marksheet Verification",
    shortLabel: "10th & 12th Marksheets",
    reportTypes: ["education_marksheet_check"],
    category: "Corporate & Identity",
    statute: "National Academic Depository (NAD) & CBSE Central Registry",
    description: "National Academic Depository (NAD) & CBSE marksheet verification with roll number, passing year, marks, and SHA-256 hash.",
    purpose: "Cryptographically verifies secondary and senior secondary school marksheets, candidate name, roll number, school code, passing year, and marks via official national repositories.",
    useCase: "Essential background verification for key employees, warehouse managers, cashiers, sales agents, and authorized corporate signatories.",
    capabilities: ["CBSE & State Board Auth", "NAD Central Repository", "Cryptographic Hash Validation", "Subject-Wise Score Records"],
    cost: 89,
    primaryInputLabel: "Roll Number / Academic Certificate ID",
    primaryPlaceholder: "e.g. 11223344",
    secondaryInputLabel: "Year & Board Bracket",
    secondaryPlaceholder: "CBSE - 2021",
    defaultId: "11223344",
    defaultSecondary: "CBSE - 2021",
    subjectType: "individual",
    keywords: ["education", "marksheet", "10th", "12th", "cbse", "nad", "academic verification", "roll number", "school certificate", "employee background check", "degree", "qualification"],
    icon: GraduationCap,
  },
  {
    key: "pan_to_gst",
    num: 13,
    label: "PAN to All-India GSTIN Directory",
    shortLabel: "PAN to GST Directory",
    reportTypes: ["pan_to_gst"],
    category: "Tax & GST",
    statute: "GSTN National Master Directory",
    description: "Comprehensive multi-state GSTIN directory linking all state branch registrations under a single parent PAN.",
    purpose: "Discovers all state GSTIN branch registrations, union territory registrations, and trade names registered across India under a single corporate or proprietor PAN.",
    useCase: "Map the full multi-state business footprint of a corporate buyer to discover solvent operating branches or attach assets across state borders.",
    capabilities: ["Multi-State Branch Mapping", "All Associated GSTINs", "State Tax Jurisdictions", "Trade Name Discovery"],
    cost: 15,
    primaryInputLabel: "10-Character Corporate PAN",
    primaryPlaceholder: "e.g. AAECG1234H",
    defaultId: "AAECG1234H",
    subjectType: "business",
    keywords: ["pan to gst", "all gstins", "state branches", "multi-state directory", "sister branches", "corporate hierarchy", "state registrations", "nationwide footprint", "gst search"],
    icon: Building,
  },
  {
    key: "legal_notice_suite",
    num: 14,
    label: "Statutory Legal Notices Suite (§43B(h) / DRC-01A)",
    shortLabel: "Legal Notices Suite",
    reportTypes: ["legal_notice_suite"],
    category: "Judicial & Legal",
    statute: "Advocate Bar Council & Statutory Formats",
    description: "4 statutory notices with official Government Reference Numbers reported to the Income Tax Department (§43B(h)) and GST Department (§16(4) / DRC-01A).",
    purpose: "Generates and issues legally binding statutory demand notices referencing Section 43B(h) of Income Tax Act, Section 16(4) / DRC-01A of GST Act, and Section 18 of MSMED Act with official reference numbers.",
    useCase: "Apply maximum legal leverage on recalcitrant debtors before launching costly court litigation or filing NCLT insolvency petitions.",
    capabilities: ["Income Tax §43B(h) Notice", "GST §16(4) / DRC-01A Warning", "MSMED Act §18 Demand", "Official Govt Reference Numbers"],
    cost: 1500,
    primaryInputLabel: "Target Debtor Name or GSTIN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Outstanding Invoice Amount (₹)",
    secondaryPlaceholder: "e.g. ₹5,40,000",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "₹5,40,000",
    subjectType: "business",
    keywords: ["legal notice", "demand notice", "statutory notice", "section 43b(h)", "income tax warning", "drc-01a", "msmed notice", "advocate notice", "overdue demand", "legal action", "recovery notice"],
    icon: FileWarning,
  },
];

export const ALL_AI_CREDIT_FEATURES = ALL_18_FEATURES;

export function VerificationRunner({
  companyId,
  ledgerMap,
  sampleEntities = [],
}: VerificationRunnerProps) {
  // Main Navigation Modes: "blocks" | "bundle" | "library"
  const [viewMode, setViewMode] = useState<"blocks" | "bundle" | "library">("blocks");
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportsMap, setReportsMap] = useState<Partial<Record<ReportType, NormalizedReport>>>({});

  // Active Runner Modal State
  const [activeModalFeature, setActiveModalFeature] = useState<FeatureItem | null>(null);

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
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chaanbean:wallet-updated"));
        }
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

  // Intelligent Search and Category Filtering
  // Works on: Label, Short Label, Category, Statute, Description, Purpose, Use Case, Capabilities, and Keywords
  const filteredFeatures = useMemo(() => {
    return ALL_18_FEATURES.filter((feat) => {
      // 1. Category check
      if (selectedCategory !== "All" && feat.category !== selectedCategory) {
        return false;
      }

      // 2. Search check (searches name, purpose, use case, statute, keywords, and capabilities)
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchInLabel = feat.label.toLowerCase().includes(q);
      const matchInShort = feat.shortLabel.toLowerCase().includes(q);
      const matchInStatute = feat.statute.toLowerCase().includes(q);
      const matchInPurpose = feat.purpose.toLowerCase().includes(q);
      const matchInUseCase = feat.useCase.toLowerCase().includes(q);
      const matchInDescription = feat.description.toLowerCase().includes(q);
      const matchInKeywords = feat.keywords.some((k) => k.toLowerCase().includes(q));
      const matchInCapabilities = feat.capabilities.some((c) => c.toLowerCase().includes(q));
      const matchInReportTypes = feat.reportTypes.some((rt) => rt.toLowerCase().includes(q));

      return (
        matchInLabel ||
        matchInShort ||
        matchInStatute ||
        matchInPurpose ||
        matchInUseCase ||
        matchInDescription ||
        matchInKeywords ||
        matchInCapabilities ||
        matchInReportTypes
      );
    });
  }, [selectedCategory, searchQuery]);

  const categories: FeatureCategory[] = [
    "All",
    "Corporate & Identity",
    "Tax & GST",
    "Judicial & Legal",
  ];

  const getCategoryCount = (cat: FeatureCategory) => {
    if (cat === "All") return ALL_18_FEATURES.length;
    return ALL_18_FEATURES.filter((f) => f.category === cat).length;
  };

  const generatedCount = Object.keys(reportsMap).length;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* UNIFIED, CLEAN CONTROL BAR (Search + Category Filter + Modes) */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
        {/* Top Row: Search Input (Left/Center) & Primary Mode Switcher (Right) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Smart Search Bar with Purpose Matching */}
          <div className="relative flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by feature name, purpose, statute or use-case (e.g. 'turnover', 'cheque bounce', 'director')..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-chaan-brand focus:bg-white dark:focus:bg-slate-900 shadow-sm transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Clean View Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 shrink-0 self-start lg:self-auto">
            <button
              onClick={() => setViewMode("blocks")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === "blocks"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers size={13} className="text-[#FC8019]" />
              <span>Feature Blocks ({ALL_AI_CREDIT_FEATURES.length})</span>
            </button>

            <button
              onClick={() => setViewMode("bundle")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === "bundle"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Zap size={13} className="text-[#FC8019]" />
              <span>360° Parallel Bundle</span>
            </button>

            <button
              onClick={() => setViewMode("library")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === "library"
                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              <FileText size={13} />
              <span>Report Library</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Clean, Consistent Category Segmented Filter */}
        {viewMode === "blocks" && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = getCategoryCount(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      isSelected
                        ? "bg-orange-50 dark:bg-orange-500/20 text-[#FC8019] border border-orange-200 dark:border-orange-500/40 font-bold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? "bg-[#FC8019] text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Match Summary Indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>
                Showing <strong>{filteredFeatures.length}</strong> of {ALL_18_FEATURES.length} features
              </span>
              {searchQuery && (
                <span className="text-[#FC8019] font-medium">
                  matching &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODE 1: INTERACTIVE BLOCK-BY-BLOCK FEATURE GRID */}
      {/* ------------------------------------------------------------- */}
      {viewMode === "blocks" && (
        <div className="space-y-6">
          {filteredFeatures.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFeatures.map((feat) => {
                const hasCachedReport = feat.reportTypes.some((rt) => Boolean(reportsMap[rt]));
                const cachedReport = feat.reportTypes
                  .map((rt) => reportsMap[rt])
                  .find((r) => Boolean(r)) || null;

                return (
                  <FeatureBlockCard
                    key={feat.key}
                    feature={feat}
                    hasCachedReport={hasCachedReport}
                    cost={ledgerMap[feat.reportTypes[0]]?.cost ?? feat.cost}
                    searchQuery={searchQuery}
                    onOpenRunner={() => setActiveModalFeature(feat)}
                    onViewDossier={() => setActiveModalFeature(feat)}
                  />
                );
              })}
            </div>
          ) : (
            /* Empty Search State with Useful Suggestion Chips */
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
              <Target size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No features matched &quot;{searchQuery}&quot;
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Try searching by commercial purpose, statutory keyword, or common risk vectors.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Popular searches:</span>
                {[
                  "cheque bounce",
                  "exact turnover",
                  "director details",
                  "udyam msme",
                  "telecom kyc",
                  "legal notices",
                  "import export",
                ].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setSearchQuery(term)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-orange-300 hover:text-[#FC8019] transition"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#FC8019] font-bold hover:underline"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 2: 360° PARALLEL MULTI-ADAPTER FAN-OUT BUNDLE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === "bundle" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="text-chaan-brand" size={22} />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Parallel Multi-Adapter Fan-Out Execution
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                Executes all foundational statutory verification adapters (GST turnover, Supreme filing audit, e-Courts litigation, MSME Udyam, MCA21 directorships, Telecom KYC, and trade references) simultaneously in parallel under a single unified call.
              </p>
            </div>

            <span className="px-3 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-[#FC8019] font-mono text-xs font-bold shrink-0">
              {ALL_AI_CREDIT_FEATURES.length} Gateways Fan-Out
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-orange-50/20 dark:bg-orange-950/10 p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-12 items-end">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase font-mono">
                  Subject Type
                </label>
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setBundleSubjectType("business");
                      setBundleSubjectId("27AAECG1234H1Z5");
                    }}
                    className={`rounded py-1 text-xs font-semibold transition ${
                      bundleSubjectType === "business"
                        ? "bg-chaan-brand text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
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
                        ? "bg-chaan-brand text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase font-mono">
                  Target Identifier (GSTIN / PAN / CIN)
                </label>
                <input
                  type="text"
                  value={bundleSubjectId}
                  onChange={(e) => setBundleSubjectId(e.target.value)}
                  placeholder="Enter GSTIN e.g. 27AAECG1234H1Z5"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-mono text-slate-900 dark:text-white uppercase tracking-wider outline-none focus:border-chaan-brand shadow-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={handleRunBundle}
                  disabled={bundleLoading || !bundleSubjectId.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-chaan-brand px-4 py-2 text-xs font-bold text-white hover:bg-chaan-brandDark transition disabled:opacity-50 shadow-md shadow-orange-500/25"
                >
                  <Zap size={15} />
                  {bundleLoading ? "Fan-Out Executing..." : `Execute ${ALL_AI_CREDIT_FEATURES.length}x Parallel Bundle`}
                </button>
              </div>
            </div>

            {/* Quick Autofill Chips */}
            {sampleEntities.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-medium">Autofill from Live Database:</span>
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
                        ? "bg-orange-50 dark:bg-orange-500/20 text-[#FC8019] border-orange-300 dark:border-orange-500 font-bold"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:text-[#FC8019]"
                    }`}
                  >
                    <span className="font-sans font-medium">{ent.name}</span>{" "}
                    <span className="opacity-70 text-[10px]">({ent.id})</span>
                  </button>
                ))}
              </div>
            )}

            {bundleProgress && (
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/40 p-3 text-xs font-mono border border-orange-200 dark:border-orange-800 text-[#FC8019] flex items-center gap-2">
                <Sparkles size={14} className="text-chaan-brand" />
                <span>{bundleProgress}</span>
              </div>
            )}
          </div>

          {/* Compiled Bundle Reports Preview */}
          {generatedCount > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" size={16} />
                Compiled Parallel Dossier Reports ({generatedCount} Available)
              </h3>
              <div className="grid gap-4">
                {Object.values(reportsMap)
                  .filter((r): r is NormalizedReport => Boolean(r))
                  .map((rep) => (
                    <div key={rep.reportType} className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono pl-1">
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

      {/* ------------------------------------------------------------- */}
      {/* MODE 3: PERMANENT REPORT LIBRARY VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === "library" && (
        <ReportLibraryView
          onSelectFeatureTab={(k) => {
            const found = ALL_18_FEATURES.find((f) => f.key === k);
            if (found) {
              setActiveModalFeature(found);
            }
            setViewMode("blocks");
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE FEATURE RUNNER / DOSSIER MODAL */}
      {/* ------------------------------------------------------------- */}
      {activeModalFeature && (
        <FeatureRunnerModal
          isOpen={Boolean(activeModalFeature)}
          onClose={() => setActiveModalFeature(null)}
          feature={activeModalFeature}
          companyId={companyId}
          ledger={ledgerMap[activeModalFeature.reportTypes[0]]}
          sampleEntities={sampleEntities}
          cachedReport={
            activeModalFeature.reportTypes
              .map((rt) => reportsMap[rt])
              .find((r) => Boolean(r)) || null
          }
          onReportGenerated={handleReportGenerated}
        />
      )}
    </div>
  );
}
