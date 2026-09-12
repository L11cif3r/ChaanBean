"use client";

import React, { useState } from "react";
import type { ReportType, NormalizedReport } from "@/lib/verification-gateway/types";
import { REPORT_LABELS, REPORT_CACHE_TTL_HOURS } from "@/lib/verification-gateway/types";
import { ReportResultView } from "./ReportResultView";
import {
  FileText,
  CreditCard,
  Scale,
  Building2,
  Users,
  Award,
  Ship,
  Phone,
  UserCheck,
  MapPin,
  Mail,
  Search,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Calendar,
  GraduationCap,
  PhoneForwarded,
  Layers,
} from "lucide-react";

export interface AdapterConfig {
  reportType: ReportType;
  title: string;
  category: string;
  description: string;
  primaryInputLabel: string;
  primaryPlaceholder: string;
  secondaryInputLabel?: string;
  secondaryPlaceholder?: string;
  defaultId: string;
  defaultSecondary?: string;
  subjectType: "business" | "individual";
}

const ADAPTER_CONFIGS: Record<ReportType, AdapterConfig> = {
  gst_exact_turnover: {
    reportType: "gst_exact_turnover",
    title: "GST Exact Turnover",
    category: "Tax & GST Intelligence",
    description: "Official APIsetu & GSTN public portal GSTR-3B taxable turnover extraction with multi-year margins.",
    primaryInputLabel: "Target GSTIN (15 characters)",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Financial Year Bracket",
    secondaryPlaceholder: "FY 2023-24",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "FY 2023-24",
    subjectType: "business",
  },
  gst_slab_check: {
    reportType: "gst_slab_check",
    title: "GST Slab Check",
    category: "Tax & GST Intelligence",
    description: "Public aggregate GST turnover band classification, active tax ward jurisdiction, and registration date.",
    primaryInputLabel: "GSTIN or PAN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or AAECG1234H",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  gst_monthly_filings: {
    reportType: "gst_monthly_filings",
    title: "GST Monthly Filings (12 Months)",
    category: "Tax & GST Intelligence",
    description: "Full 12-month return filing regularity calendar with GSTR-1 & GSTR-3B ARN verification, filing dates, and tax payments.",
    primaryInputLabel: "Target GSTIN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Financial Year Bracket",
    secondaryPlaceholder: "FY 2024-25",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "FY 2024-25",
    subjectType: "business",
  },
  gst_supreme_report: {
    reportType: "gst_supreme_report",
    title: "GST Supreme Report",
    category: "Tax & GST Intelligence",
    description: "Authorized 2-step OTP filing regularity audit, GSTR-1 vs 3B mismatch verification, and counterparty PANs.",
    primaryInputLabel: "Target GSTIN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Authorized Signatory Mobile (+91)",
    secondaryPlaceholder: "e.g. 9876543210",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "9876543210",
    subjectType: "business",
  },
  pan_to_gst: {
    reportType: "pan_to_gst",
    title: "PAN to GST Number Directory",
    category: "Tax & GST Intelligence",
    description: "Multi-state corporate GSTIN directory mapping PAN across all registered Indian states, trade branches, and jurisdictional wards.",
    primaryInputLabel: "10-Character Corporate PAN",
    primaryPlaceholder: "e.g. AAECG1234H",
    defaultId: "AAECG1234H",
    subjectType: "business",
  },
  bureau_report: {
    reportType: "bureau_report",
    title: "Commercial Bureau Score",
    category: "Credit Bureau & Scoring",
    description: "Circuit-breaking multi-bureau credit score (CIBIL → Experian → CRIF) with utilization and trade lines.",
    primaryInputLabel: "Entity PAN or Commercial Name",
    primaryPlaceholder: "e.g. AAECG1234H",
    secondaryInputLabel: "Bureau Priority Gateway",
    secondaryPlaceholder: "CIBIL Commercial",
    defaultId: "AAECG1234H",
    defaultSecondary: "CIBIL Commercial",
    subjectType: "business",
  },
  payment_behaviour: {
    reportType: "payment_behaviour",
    title: "Payment Behaviour Exchange",
    category: "Credit Bureau & Scoring",
    description: "B2B commercial payment track record, average payment delay days, and community default history.",
    primaryInputLabel: "Debtor PAN / GSTIN / Trade Name",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or AAECG1234H",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  court_case_history: {
    reportType: "court_case_history",
    title: "e-Courts Case History",
    category: "Judicial & Compliance",
    description: "National e-Courts search for summary recovery suits, Section 138 NI Act bounced cheques, and NCLT petitions.",
    primaryInputLabel: "Company Name / Director / PAN",
    primaryPlaceholder: "e.g. Acme Industrial Traders or AAECG1234H",
    secondaryInputLabel: "Court Jurisdiction",
    secondaryPlaceholder: "All District & Commercial Courts",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "All Commercial Courts",
    subjectType: "business",
  },
  fir_check: {
    reportType: "fir_check",
    title: "CCTNS Police FIR Check",
    category: "Judicial & Compliance",
    description: "Verification against State Police & CCTNS databases for active criminal FIRs and warrants.",
    primaryInputLabel: "Subject Legal Entity / Director Name",
    primaryPlaceholder: "e.g. Rajeshwar Rao Deshmukh or AAECG1234H",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  company_supreme_report: {
    reportType: "company_supreme_report",
    title: "Company Supreme Report",
    category: "Corporate Standing & MSME",
    description: "MCA21 corporate filing audit, paid-up vs authorized capital, balance sheet net worth, and leverage ratios.",
    primaryInputLabel: "Corporate CIN or Registration Number",
    primaryPlaceholder: "e.g. U74999MH2018PTC312345 or AAECG1234H",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  director_details: {
    reportType: "director_details",
    title: "Director Details (DIN Roster)",
    category: "Corporate Standing & MSME",
    description: "MCA21 verified Board of Directors, DIN status, appointments, and disqualification checks.",
    primaryInputLabel: "Director DIN, Name, or Company CIN",
    primaryPlaceholder: "e.g. 02847192 or 27AAECG1234H1Z5",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  msme_report: {
    reportType: "msme_report",
    title: "MSME / Udyam Registry",
    category: "Corporate Standing & MSME",
    description: "Official Udyam verification, micro/small enterprise tiering, major activity, and NIC code validation.",
    primaryInputLabel: "Udyam Number or Entity PAN",
    primaryPlaceholder: "e.g. UDYAM-MH-03-0048291 or AAECG1234H",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  trust_hub_verification: {
    reportType: "trust_hub_verification",
    title: "Trust Hub & Trust ID Verification",
    category: "Trust Network & Identity",
    description: "Enterprise Trust ID verification, 0-100 credibility scoring, peer default registry check, and cryptographic seals.",
    primaryInputLabel: "GSTIN / PAN / Trust ID",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or TRUST-CB-AAEC-001",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  education_marksheet_check: {
    reportType: "education_marksheet_check",
    title: "10th and 12th Educational Marksheets",
    category: "Founder & Director Background",
    description: "National Academic Depository (NAD) & CBSE verified 10th and 12th board marksheet certificates, roll numbers, and passing scores.",
    primaryInputLabel: "Director DIN, Name, or PAN",
    primaryPlaceholder: "e.g. 08492018 or 27AAECG1234H1Z5",
    secondaryInputLabel: "Board / Stream (Optional)",
    secondaryPlaceholder: "CBSE / Commerce",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "CBSE / Commerce",
    subjectType: "individual",
  },
  import_export_report: {
    reportType: "import_export_report",
    title: "DGFT Import-Export Report",
    category: "Corporate Standing & MSME",
    description: "ICEGATE customs & DGFT validation, active shipment counts, and Denied Entity List (DEL) compliance.",
    primaryInputLabel: "10-digit IEC Code or PAN",
    primaryPlaceholder: "e.g. 03AAECG123410 or AAECG1234H",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  mobile_to_pan: {
    reportType: "mobile_to_pan",
    title: "Mobile to PAN Lookup",
    category: "Identity & Delivery Graph",
    description: "NSDL income tax identity linkage and Aadhaar seeding status check from registered mobile.",
    primaryInputLabel: "10-digit Indian Mobile (+91)",
    primaryPlaceholder: "e.g. 9876543210",
    defaultId: "9876543210",
    subjectType: "individual",
  },
  mobile_identity: {
    reportType: "mobile_identity",
    title: "Mobile Identity (All Alternate Numbers)",
    category: "Identity & Delivery Graph",
    description: "Telecom operator KYC validation, subscriber concordance, SIM tenure, and all linked alternate numbers.",
    primaryInputLabel: "10-digit Mobile Number",
    primaryPlaceholder: "e.g. 9876543210",
    secondaryInputLabel: "Subscriber Name (Optional Verification)",
    secondaryPlaceholder: "e.g. Rajeshwar Deshmukh",
    defaultId: "9876543210",
    defaultSecondary: "Rajeshwar Deshmukh",
    subjectType: "individual",
  },
  mobile_to_address: {
    reportType: "mobile_to_address",
    title: "Mobile to Address Verification",
    category: "Identity & Delivery Graph",
    description: "Resolved billing and subscriber addresses from telecom circles with geocode confidence match.",
    primaryInputLabel: "10-digit Mobile Number",
    primaryPlaceholder: "e.g. 9876543210",
    defaultId: "9876543210",
    subjectType: "individual",
  },
  pan_to_mobile_email: {
    reportType: "pan_to_mobile_email",
    title: "PAN to Mobile & Email Linkage",
    category: "Identity & Delivery Graph",
    description: "Direct contactability resolution linking corporate and individual PANs to active phone and email.",
    primaryInputLabel: "10-digit PAN Identifier",
    primaryPlaceholder: "e.g. AAECG1234H",
    defaultId: "AAECG1234H",
    subjectType: "business",
  },
  address_enrichment: {
    reportType: "address_enrichment",
    title: "Address Enrichment (Hyperlocal)",
    category: "Identity & Delivery Graph",
    description: "Physical operational verification via multi-source delivery graphs (Amazon, Swiggy, Zomato, Meesho).",
    primaryInputLabel: "Entity PAN / GSTIN / Address String",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or MIDC Industrial Hub",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  find_someone: {
    reportType: "find_someone",
    title: "OmniTrace 360™ (Find Someone)",
    category: "Identity & Delivery Graph",
    description: "Deep skip tracing engine: addresses, bank payment source, apps used (Amazon/Swiggy/Meesho/Zomato/Blinkit/Paytm/Zepto/WhatsApp), and tri-bureau scores.",
    primaryInputLabel: "Target Subject Name, Mobile, or PAN",
    primaryPlaceholder: "e.g. Rajeshwar Deshmukh or 9876543210",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  voice_call_cadence: {
    reportType: "voice_call_cadence",
    title: "Default Payments Voice Calls (1m/2m/5m/30m/1h)",
    category: "Recovery & Telephony Automation",
    description: "Automated Asterisk PBX / Vobiz voice dialing queue cadence: schedule calls every 1 min, 2 mins, 5 mins, 30 mins, or every hour.",
    primaryInputLabel: "Debtor GSTIN or Phone",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or 9876543210",
    secondaryInputLabel: "Cadence Interval",
    secondaryPlaceholder: "Every 30 Mins (or 1m, 2m, 5m, 1h)",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "Every 30 Mins",
    subjectType: "business",
  },
  legal_notice_suite: {
    reportType: "legal_notice_suite",
    title: "Legal Notices - GST, MSME, Income Tax & Demand",
    category: "Statutory Legal Enforcement",
    description: "Statutory 4-notice suite with verified Government Reference Numbers officially reported to GSTN and Income Tax Department portals.",
    primaryInputLabel: "Debtor GSTIN / PAN / Account ID",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Claim Amount (INR)",
    secondaryPlaceholder: "₹8,90,000",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "₹8,90,000",
    subjectType: "business",
  },
  delayed_payment_followup: {
    reportType: "delayed_payment_followup",
    title: "Delayed Payments Follow-Up",
    category: "Recovery & Telephony Automation",
    description: "Temporal payment escalation engine with aging buckets (1-15d, 16-30d, 31-45d, 45d+), promise-to-pay tracker, and escalation timeline.",
    primaryInputLabel: "Debtor GSTIN or Account ID",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
  },
  subscription_seats: {
    reportType: "subscription_seats",
    title: "User Access (5 Seats Included)",
    category: "Enterprise Subscription & Team",
    description: "5 organization team access seats included per subscription at ₹0 additional charge: Admin, Finance Controller, Collections Lead, Legal, External CA.",
    primaryInputLabel: "Organization Domain / Company ID",
    primaryPlaceholder: "e.g. chaanbean.com",
    defaultId: "chaanbean.com",
    subjectType: "business",
  },
  additional_company_addon: {
    reportType: "additional_company_addon",
    title: "Add Additional Company (₹1,500)",
    category: "Enterprise Subscription & Team",
    description: "Add and monitor additional sister concern corporate entities or subsidiary profiles at ₹1,500 one-time setup fee per company.",
    primaryInputLabel: "Additional Company Name / GSTIN",
    primaryPlaceholder: "e.g. Acme Polymers Manufacturing Pvt Ltd",
    secondaryInputLabel: "Company State & CIN",
    secondaryPlaceholder: "e.g. Gujarat · U25200GJ2021PTC120000",
    defaultId: "Acme Polymers Manufacturing Pvt Ltd",
    defaultSecondary: "Gujarat · U25200GJ2021PTC120000",
    subjectType: "business",
  },
};

export function getAdapterConfig(reportType: ReportType): AdapterConfig {
  return (
    ADAPTER_CONFIGS[reportType] || {
      reportType,
      title: REPORT_LABELS[reportType] || reportType,
      category: "Verification",
      description: "Automated real-time regulatory adapter verification.",
      primaryInputLabel: "Target Identifier",
      primaryPlaceholder: "Enter identifier",
      defaultId: "27AAECG1234H1Z5",
      subjectType: "business",
    }
  );
}

interface AdapterCardProps {
  reportType: ReportType;
  companyId: string;
  ledger?: { timesUsed: number; available: number; cost: number };
  sampleEntities?: Array<{ name: string; id: string; type: "debtor" | "vendor" }>;
  cachedReport?: NormalizedReport | null;
  onReportGenerated?: (report: NormalizedReport) => void;
  isExpandedDefault?: boolean;
}

export function AdapterCard({
  reportType,
  companyId,
  ledger,
  sampleEntities = [],
  cachedReport,
  onReportGenerated,
  isExpandedDefault = false,
}: AdapterCardProps) {
  const config = getAdapterConfig(reportType);

  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);
  const [primaryInput, setPrimaryInput] = useState(config.defaultId);
  const [secondaryInput, setSecondaryInput] = useState(config.defaultSecondary || "");
  const [subjectType, setSubjectType] = useState<"business" | "individual">(config.subjectType);
  const [loading, setLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState<NormalizedReport | null>(cachedReport || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP State specifically for gst_supreme_report
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("482910");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const cost = ledger?.cost ?? 50;
  const ttl = REPORT_CACHE_TTL_HOURS[reportType] ?? 720;
  const timesUsed = ledger?.timesUsed ?? 0;

  const handleRun = async () => {
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
          reportTypes: [reportType],
          companyId,
          forceRefresh: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to generate report");
      } else if (data.reports?.length) {
        const rep = data.reports[0];
        setCurrentReport(rep);
        if (onReportGenerated) onReportGenerated(rep);
      }
    } catch {
      setErrorMessage("Network error connecting to verification gateway");
    } finally {
      setLoading(false);
    }
  };

  // OTP handlers for GST Supreme
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
        setOtpNotice(data.message || "OTP sent to authorized mobile");
      } else {
        setOtpNotice(data.error || "Could not dispatch OTP");
      }
    } catch {
      setOtpNotice("Network error requesting OTP");
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
          subjectId: primaryInput.trim(),
          subjectType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpNotice("OTP verified successfully! Pulling Supreme dossier...");
        await handleRun();
      } else {
        setOtpNotice(data.error || "Invalid OTP code entered");
      }
    } catch {
      setOtpNotice("Network error verifying OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const getIcon = () => {
    switch (reportType) {
      case "gst_exact_turnover":
      case "gst_slab_check":
        return <FileText className="text-chaan-brand" size={18} />;
      case "gst_monthly_filings":
        return <Calendar className="text-chaan-brand" size={18} />;
      case "gst_supreme_report":
        return <KeyRound className="text-amber-400" size={18} />;
      case "pan_to_gst":
        return <Layers className="text-chaan-brand" size={18} />;
      case "bureau_report":
      case "payment_behaviour":
        return <CreditCard className="text-chaan-brand" size={18} />;
      case "court_case_history":
        return <Scale className="text-chaan-brand" size={18} />;
      case "fir_check":
        return <ShieldAlert className="text-rose-400" size={18} />;
      case "company_supreme_report":
        return <Building2 className="text-chaan-brand" size={18} />;
      case "director_details":
        return <Users className="text-chaan-brand" size={18} />;
      case "msme_report":
        return <Award className="text-chaan-brand" size={18} />;
      case "trust_hub_verification":
        return <ShieldCheck className="text-emerald-400" size={18} />;
      case "education_marksheet_check":
        return <GraduationCap className="text-sky-400" size={18} />;
      case "import_export_report":
        return <Ship className="text-chaan-brand" size={18} />;
      case "mobile_to_pan":
      case "mobile_identity":
      case "mobile_to_address":
        return <Phone className="text-chaan-brand" size={18} />;
      case "find_someone":
        return <Search className="text-chaan-brand" size={18} />;
      case "voice_call_cadence":
        return <PhoneForwarded className="text-amber-400" size={18} />;
      case "legal_notice_suite":
        return <Scale className="text-rose-400" size={18} />;
      case "delayed_payment_followup":
        return <Clock className="text-amber-400" size={18} />;
      case "subscription_seats":
        return <Users className="text-sky-400" size={18} />;
      case "additional_company_addon":
        return <Building2 className="text-chaan-brand" size={18} />;
      default:
        return <Sparkles className="text-chaan-brand" size={18} />;
    }
  };

  return (
    <div
      className={`rounded-xl border transition duration-200 ${
        isExpanded
          ? "border-chaan-brand/60 bg-chaan-card shadow-lg shadow-chaan-brand/5"
          : "border-chaan-border bg-chaan-card hover:border-slate-600"
      }`}
    >
      {/* Box Header & Clickable Summary Area */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer p-5 flex items-start justify-between gap-4 select-none"
      >
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl border border-chaan-border bg-slate-900/80 p-2.5 shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white text-sm tracking-tight">{config.title}</h3>
              {currentReport && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300 font-semibold">
                  <CheckCircle2 size={10} />
                  Report Ready
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400 max-w-xl line-clamp-2">{config.description}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-500" />
                Cache TTL: <strong className="text-slate-300">{ttl}h</strong>
              </span>
              <span>·</span>
              <span>Used: <strong className="text-slate-300">{timesUsed}x</strong></span>
              <span>·</span>
              <span className="text-amber-400 font-semibold">Cost: ₹{cost}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <span>{isExpanded ? "Collapse" : "Configure & Pull"}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Specific Area of Respectiveness: Inputs & Controls when expanded */}
      {isExpanded && (
        <div className="border-t border-chaan-border px-5 pb-5 pt-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-chaan-brand" />
                Dedicated Adapter Parameters
              </span>

              {/* Subject Type toggle for dual adapters */}
              <div className="flex items-center gap-1 text-[11px] rounded-lg border border-slate-800 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubjectType("business");
                  }}
                  className={`px-2.5 py-0.5 rounded font-semibold transition ${
                    subjectType === "business"
                      ? "bg-chaan-brand text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Business
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubjectType("individual");
                  }}
                  className={`px-2.5 py-0.5 rounded font-semibold transition ${
                    subjectType === "individual"
                      ? "bg-chaan-brand text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Input fields specific to this adapter */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={config.secondaryInputLabel ? "" : "sm:col-span-2"}>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {config.primaryInputLabel} <span className="text-chaan-brand">*</span>
                </label>
                <input
                  type="text"
                  value={primaryInput}
                  onChange={(e) => setPrimaryInput(e.target.value)}
                  placeholder={config.primaryPlaceholder}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-100 uppercase tracking-wider outline-none focus:border-chaan-brand"
                />
              </div>

              {config.secondaryInputLabel && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {config.secondaryInputLabel}
                  </label>
                  <input
                    type="text"
                    value={secondaryInput}
                    onChange={(e) => setSecondaryInput(e.target.value)}
                    placeholder={config.secondaryPlaceholder}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-chaan-brand"
                  />
                </div>
              )}
            </div>

            {/* Special 2-step OTP workflow for GST Supreme Report */}
            {reportType === "gst_supreme_report" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <KeyRound size={16} />
                  <span>GSTN Authorized OTP Flow</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Per statutory GSTN privacy norms, fetching counterparty PANs and detailed filing consistency requires OTP verification from the authorized phone.
                </p>

                {!otpSessionId ? (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpLoading || !primaryInput.trim()}
                    className="rounded-lg bg-amber-500 px-3.5 py-2 font-bold text-slate-950 hover:bg-amber-400 transition disabled:opacity-50 text-xs"
                  >
                    {otpLoading ? "Requesting OTP..." : "Step 1: Request 6-Digit OTP via GSTN"}
                  </button>
                ) : (
                  <div className="space-y-3 border-t border-amber-900/50 pt-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                      <CheckCircle2 size={14} />
                      <span>OTP Session Active: {otpSessionId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="482910"
                        maxLength={6}
                        className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-center font-mono font-bold tracking-widest text-slate-100 outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading}
                        className="rounded-lg bg-emerald-500 px-3.5 py-1.5 font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 text-xs"
                      >
                        {otpLoading ? "Verifying..." : "Step 2: Submit OTP & Unlock"}
                      </button>
                    </div>
                  </div>
                )}

                {otpNotice && (
                  <div className="rounded bg-slate-950/80 p-2 text-slate-300 font-mono text-[11px] border border-slate-800">
                    {otpNotice}
                  </div>
                )}
              </div>
            )}

            {/* Live Database Entity Autofill Chips */}
            {sampleEntities.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Autofill:</span>
                {sampleEntities.slice(0, 4).map((ent) => (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => {
                      setPrimaryInput(ent.id);
                      setSubjectType("business");
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-mono ${
                      primaryInput === ent.id
                        ? "bg-chaan-brand/20 text-chaan-brand border-chaan-brand/50 font-bold"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="font-sans font-medium">{ent.name}</span>{" "}
                    <span className="opacity-70 text-[10px]">({ent.id.slice(0, 12)}...)</span>
                  </button>
                ))}
              </div>
            )}

            {/* Error notice */}
            {errorMessage && (
              <div className="rounded-lg bg-rose-950/60 border border-rose-800/60 p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Submit Action Button */}
            {reportType !== "gst_supreme_report" && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Instant live lookup with 30-day cache debit
                </span>
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={loading || !primaryInput.trim()}
                  className="flex items-center gap-2 rounded-lg bg-chaan-brand px-4 py-2 text-xs font-bold text-white hover:bg-chaan-brandDark transition disabled:opacity-50 shadow-md shadow-chaan-brand/20"
                >
                  <Zap size={14} />
                  {loading ? "Generating Report..." : `Generate ${config.title}`}
                </button>
              </div>
            )}
          </div>

          {/* Formatted Visually Pleasing Report Display Area */}
          {currentReport && (
            <ReportResultView
              report={currentReport}
              onRefresh={handleRun}
              refreshing={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}
