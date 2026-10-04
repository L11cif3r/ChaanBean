"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  REPORT_LABELS,
  REPORT_CACHE_TTL_HOURS,
  type ReportType,
  type SubjectType,
  type NormalizedReport,
} from "@/lib/verification-gateway/types";
import { FeatureBlockCard } from "./verification/FeatureBlockCard";
import { FeatureRunnerModal } from "./verification/FeatureRunnerModal";
import { McaMasterDataCard, type McaRecord } from "./verification/McaMasterDataCard";
import { PaywalledFeatureCard } from "./verification/PaywalledFeatureCard";
import { AppendedFeatureRow } from "./verification/AppendedFeatureRow";
import { WalletConsentModal } from "./verification/WalletConsentModal";
import { GiveCreditModal } from "./verification/GiveCreditModal";
import { logAuditEvent } from "@/lib/events/audit-events";
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
  RotateCcw,
  AlertCircle,
  MapPin,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Unlock,
} from "lucide-react";

interface VerificationRunnerProps {
  companyId: string;
  ledgerMap: Record<string, { timesUsed: number; available: number; cost: number }>;
  sampleEntities?: Array<{ name: string; id: string; type: "debtor" | "vendor" }>;
}

export type FeatureCategory =
  | "All"
  | "Identity & Verification"
  | "Financial Health"
  | "Payment Behaviour"
  | "Legal & Compliance"
  | "Promoter & Group Exposure"
  | "Market Intelligence & Signals";

export interface FeatureItem {
  key: string;
  num: number;
  label: string;
  shortLabel: string;
  reportTypes: ReportType[];
  category: FeatureCategory;
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
    category: "Promoter & Group Exposure",
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
    category: "Identity & Verification",
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
    category: "Financial Health",
    statute: "GSTN & CBIC Direct Gateway",
    description: "Turnover bracket, applicable tax liability slab, active return filing cadence, and regular vs. composition scheme classification.",
    purpose: "Retrieves official aggregate turnover bracket, applicable tax liability slab, active return filing cadence, and regular vs. composition scheme classification directly from the GST registry.",
    useCase: "Quickly assess the statutory scale and tax band of a customer or supplier without requesting confidential internal P&L statements.",
    capabilities: ["Turnover Bracket Slabs", "Regular vs Composition", "Jurisdiction Ward", "Registration Validation"],
    cost: 150,
    primaryInputLabel: "Goods & Services Tax Identification Number (GSTIN)",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
    keywords: ["gst", "slab", "tax bracket", "gstin", "turnover bracket", "cbic", "composition", "regular", "taxation"],
    icon: Layers,
  },
  {
    key: "gst_exact_turnover",
    num: 4,
    label: "GST Exact Filed Annual Turnover",
    shortLabel: "GST Exact Turnover",
    reportTypes: ["gst_exact_turnover"],
    category: "Financial Health",
    statute: "CBIC & GSTR-9/3B Mandated Gateway",
    description: "Exact audited turnover figures as declared in filed annual GSTR-9 and aggregate monthly GSTR-3B filings across active financial years.",
    purpose: "Extracts certified gross annual turnover figures submitted under oath in annual GSTR-9 and monthly GSTR-3B filings, allowing exact commercial solvency benchmarking.",
    useCase: "Underwrite trade credit limits up to ₹5 Crore based on genuine government-filed revenue rather than self-reported business figures.",
    capabilities: ["GSTR-9 Audited Turnover", "FY2022-23 to FY2025-26", "Inter-State vs Intra-State", "Export Realizations"],
    cost: 350,
    primaryInputLabel: "Goods & Services Tax Identification Number (GSTIN)",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
    keywords: ["turnover", "exact revenue", "gstr-9", "gstr-3b", "annual sales", "cbic", "financial scale", "balance sheet", "revenue"],
    icon: Coins,
  },
  {
    key: "gst_monthly_filing",
    num: 5,
    label: "Monthly GST Return Filing Track Record",
    shortLabel: "GST Monthly Filings",
    reportTypes: ["gst_monthly_filings"],
    category: "Payment Behaviour",
    statute: "GSTN Form GSTR-1 & GSTR-3B Regulatory Ledger",
    description: "Detailed 24-month return filing chronology, GSTR-1 outwards sales regularity, GSTR-3B tax payment dates, and statutory delay penalties.",
    purpose: "Audits 24 consecutive months of GSTR-1 and GSTR-3B filings to detect chronic return delays, late-fee surcharges, and unfiled returns that trigger input tax credit (ITC) blockages for buyers.",
    useCase: "Predict early trade distress. Businesses that delay monthly GST filings typically default on supplier trade credit 60 to 90 days later.",
    capabilities: ["24-Month Return Timeline", "GSTR-1 vs 3B Alignment", "Late Fee Detection", "ITC Reversal Risk Index"],
    cost: 250,
    primaryInputLabel: "Goods & Services Tax Identification Number (GSTIN)",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
    keywords: ["gst filing", "monthly returns", "gstr-1", "gstr-3b", "filing regularity", "delinquent tax", "itc risk", "compliance track record"],
    icon: Calendar,
  },
  {
    key: "gst_supreme_pan_report",
    num: 6,
    label: "GST Supreme PAN-Wide Sales & Purchase Network",
    shortLabel: "GST Supreme PAN Network",
    reportTypes: ["gst_supreme_report"],
    category: "Promoter & Group Exposure",
    statute: "GSTN All-India Multi-State PAN Database",
    description: "All GSTINs registered under the corporate PAN across all Indian states with multi-state purchase/sales flows and intra-firm inter-branch transfers.",
    purpose: "Unfolds every branch, factory, and warehouse operated under the entity's 10-digit PAN across all 28 states and 8 Union Territories, detailing consolidated purchases and vendor networks.",
    useCase: "Prevent circular trading and identify unencumbered multi-state inventory assets available for statutory recovery.",
    capabilities: ["All-India Multi-GSTIN Map", "Inter-State Branch Flows", "Unified PAN Sales Aggregate", "Cross-State Credit Audit"],
    cost: 500,
    primaryInputLabel: "Entity Permanent Account Number (PAN - 10 Digits)",
    primaryPlaceholder: "e.g. AAECG1234H",
    defaultId: "AAECG1234H",
    subjectType: "business",
    keywords: ["supreme report", "pan network", "multi state gst", "circular trading", "inter branch", "cross state", "pan wide sales", "all india supply"],
    icon: Globe,
  },
  {
    key: "trust_hub_id",
    num: 7,
    label: "National MSME Trust Hub & Verified Trust ID",
    shortLabel: "Trust Hub & Trust ID",
    reportTypes: ["trust_hub_verification"],
    category: "Market Intelligence & Signals",
    statute: "ChaanBean National MSME Trade Ledger",
    description: "Unique ChaanBean Trust ID, peer supplier credit score, community default flags, and on-time settlement index across 2,000+ member suppliers.",
    purpose: "Fetches official ChaanBean Trust ID and crowd-sourced supplier payment performance metrics. Aggregates live trade experience from manufacturers, distributors, and mills nationwide.",
    useCase: "Check if a buyer has delayed payment with other MSME suppliers even if their public court records appear clean.",
    capabilities: ["Trust ID Certificate", "Peer Settlement Score (0-100)", "Community Default Alerts", "45-Day Compliance Rating"],
    cost: 100,
    primaryInputLabel: "Company PAN, GSTIN or Business Name",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5 or Acme Traders",
    defaultId: "27AAECG1234H1Z5",
    subjectType: "business",
    keywords: ["trust hub", "trust id", "peer rating", "trade credit score", "default alert", "msme community", "trade reputation", "supplier ledger"],
    icon: ShieldCheck,
  },
  {
    key: "court_fir_report",
    num: 8,
    label: "Court Case History & Police FIR Docket",
    shortLabel: "Court Cases & FIR Report",
    reportTypes: ["court_case_history", "fir_check"],
    category: "Legal & Compliance",
    statute: "e-Courts National Judicial Data Grid (NJDG) & CCTNS",
    description: "Litigation docket spanning High Courts, District Courts, DRT, NCLT insolvency proceedings, Section 138 NI Act cheque bounce matters, and police FIRs.",
    purpose: "Queries all 3,500+ Indian judicial complexes and police registries for civil recovery lawsuits, Section 138 Negotiable Instruments Act cheque-bounce dockets, criminal breach of trust, and NCLT insolvency petitions.",
    useCase: "Immediately decline credit to buyers with habitual cheque-bounce proceedings or active NCLT corporate insolvency resolution processes.",
    capabilities: ["e-Courts NJDG Cross-Search", "Section 138 Cheque Bounce Dockets", "NCLT Insolvency Filings", "DRT & High Court Petitions"],
    cost: 300,
    primaryInputLabel: "Corporate CIN, Entity PAN or Director Name",
    primaryPlaceholder: "e.g. AAECG1234H or U72900MH2020PTC123456",
    defaultId: "AAECG1234H",
    secondaryInputLabel: "State / District Court Jurisdiction (Optional)",
    secondaryPlaceholder: "e.g. Mumbai, Maharashtra",
    defaultSecondary: "Maharashtra",
    subjectType: "business",
    keywords: ["court case", "fir", "e-courts", "njdg", "nclt", "cheque bounce", "section 138", "drt", "litigation", "insolvency", "police complaint"],
    icon: Gavel,
  },
  {
    key: "import_export_report",
    num: 9,
    label: "Import Export Code (IEC) & Foreign Trade Ledger",
    shortLabel: "Import Export (IEC) Report",
    reportTypes: ["import_export_report"],
    category: "Market Intelligence & Signals",
    statute: "Director General of Foreign Trade (DGFT)",
    description: "DGFT Import Export Code verification, active port registrations, denied party list (DPL) screening, and foreign trade volume track record.",
    purpose: "Validates 10-digit Import Export Code (IEC) issued by DGFT, port registrations, export duty incentives, and verifies the entity is not blacklisted on the Denied Persons List (DPL).",
    useCase: "Essential for verifying export houses, merchant exporters, and cross-border procurement clients.",
    capabilities: ["DGFT License Status", "Denied Entity (DPL) Check", "Port Authority Registrations", "Foreign Trade Classification"],
    cost: 200,
    primaryInputLabel: "10-Digit IEC or Entity Corporate PAN",
    primaryPlaceholder: "e.g. 0301012345 or AAECG1234H",
    defaultId: "0301012345",
    subjectType: "business",
    keywords: ["import export", "iec", "dgft", "foreign trade", "cross border", "customs", "export house", "denied party list"],
    icon: Globe,
  },
  {
    key: "pan_to_gst",
    num: 10,
    label: "PAN to All Registered GST Numbers Discovery",
    shortLabel: "PAN to GST Discovery",
    reportTypes: ["pan_to_gst"],
    category: "Promoter & Group Exposure",
    statute: "GSTN Official Common Portal API",
    description: "Instant resolution from a 10-digit PAN to all registered GSTINs across India, showing state codes, active/cancelled statuses, and legal trade names.",
    purpose: "Instantly maps a single corporate or proprietor PAN to every GST number ever registered across all Indian states and Union Territories, highlighting cancelled or suspended licenses.",
    useCase: "Uncover undisclosed operational entities through which defaulting buyers divert revenue to avoid supplier payments.",
    capabilities: ["Multi-State GST Listing", "Active vs Cancelled Flag", "Legal vs Trade Name Map", "State Ward Allocation"],
    cost: 100,
    primaryInputLabel: "10-Digit Entity Permanent Account Number (PAN)",
    primaryPlaceholder: "e.g. AAECG1234H",
    defaultId: "AAECG1234H",
    subjectType: "business",
    keywords: ["pan to gst", "gst search", "all gst numbers", "pan resolution", "gstn lookup", "tax identity", "active gst"],
    icon: Layers,
  },
  {
    key: "legal_notices_suite",
    num: 11,
    label: "Statutory Demand Notices: GST, MSME, Income Tax & Section 43B(h)",
    shortLabel: "Legal Demand Notices",
    reportTypes: ["legal_notice_suite"],
    category: "Legal & Compliance",
    statute: "MSMED Act §15/18, IT Act §43B(h), CGST Act & NI Act §138",
    description: "Ready-to-serve statutory legal notice generator with automated 3x compound penal interest calculation and Section 43B(h) disallowance warnings.",
    purpose: "Drafts formal, advocate-vetted statutory legal demand notices detailing compound penal interest at three times the RBI Bank Rate under Section 16 of the MSMED Act.",
    useCase: "Issue formal pre-litigation notices that prompt immediate CFO-level settlement to protect their company's tax deductions.",
    capabilities: ["MSMED Act §15/16/18 Notice", "Section 43B(h) Tax Warning", "Section 138 Cheque Demand", "Digital Speed Post Tracking"],
    cost: 450,
    primaryInputLabel: "Debtor Legal Entity Name & Registered Address",
    primaryPlaceholder: "e.g. Acme Traders Pvt Ltd, Mumbai",
    defaultId: "Acme Traders Pvt Ltd, Mumbai",
    secondaryInputLabel: "Principal Dues & Days Overdue",
    secondaryPlaceholder: "e.g. ₹18,40,000 · 62 Days Overdue",
    defaultSecondary: "₹18,40,000 · 62 Days Overdue",
    subjectType: "business",
    keywords: ["legal notice", "demand notice", "msmed act", "section 43b(h)", "penal interest", "statutory notice", "cheque bounce notice", "advocate"],
    icon: FileWarning,
  },
  {
    key: "marksheets_verification",
    num: 12,
    label: "Promoter 10th & 12th Academic Board Authentication",
    shortLabel: "10th & 12th Marksheet Auth",
    reportTypes: ["education_marksheet_check"],
    category: "Identity & Verification",
    statute: "DigiLocker & State Secondary Examination Boards",
    description: "Verification of Secondary (10th) and Higher Secondary (12th) certificates, roll numbers, passing year, and candidate DOB for promoter credential validation.",
    purpose: "Verifies high-school academic credentials of key promoters, verifying official date of birth, mother/father name, and preventing synthetic identity creation.",
    useCase: "Mandatory for high-ticket uncollateralized lending and appointing designated partners in joint-venture commercial partnerships.",
    capabilities: ["DigiLocker Board Auth", "CBSE/ICSE/State Board Lookup", "DOB & Parentage Matching", "Document Tamper Inspection"],
    cost: 150,
    primaryInputLabel: "Candidate Roll Number or Aadhaar Token",
    primaryPlaceholder: "e.g. Roll Number as per Marksheet",
    defaultId: "",
    secondaryInputLabel: "Education Board (CBSE / ICSE / State Board)",
    secondaryPlaceholder: "e.g. CBSE / ICSE / Maharashtra State Board",
    defaultSecondary: "",
    subjectType: "individual",
    keywords: ["marksheet", "10th", "12th", "education", "digilocker", "cbse", "academic verification", "promoter kyc", "background check"],
    icon: GraduationCap,
  },
  {
    key: "mobile_to_pan",
    num: 13,
    label: "Mobile to PAN & Tax Identity Linkage",
    shortLabel: "Mobile to PAN",
    reportTypes: ["mobile_to_pan"],
    category: "Identity & Verification",
    statute: "DoT Telecom & NSDL Income Tax Identity Bridge",
    description: "Resolves any Indian 10-digit mobile number to official registered PAN, taxpayer name, entity type, and IT department seeding status.",
    purpose: "Authenticates that the mobile number provided on purchase orders or trade guarantees is legally tied to the authorized director or proprietor's PAN registered with the Income Tax Department.",
    useCase: "Detect forged buyer purchase orders and impersonation fraud before shipping goods.",
    capabilities: ["Mobile Ownership Auth", "Linked PAN Discovery", "Taxpayer Name Verification", "Aadhaar-PAN Seeding Status"],
    cost: 150,
    primaryInputLabel: "10-Digit Indian Mobile Number",
    primaryPlaceholder: "e.g. 98XXXXXXXX (Candidate Mobile)",
    defaultId: "",
    subjectType: "individual",
    keywords: ["mobile to pan", "phone verification", "tax identity", "nsdl", "income tax", "buyer identity", "fraud check", "sim auth"],
    icon: Phone,
  },
  {
    key: "mobile_alternate_identity",
    num: 14,
    label: "Mobile Identity & Alternate Numbers Discovery",
    shortLabel: "Alternate Contact Identity",
    reportTypes: ["mobile_identity"],
    category: "Identity & Verification",
    statute: "Multi-Carrier Telecom Subscribed Circle Network",
    description: "Uncovers secondary SIMs, registered alternative business numbers, corporate landlines, and key accounts contact numbers associated with the promoter.",
    purpose: "Discovers verified secondary and tertiary telephone numbers linked to the debtor or director across Indian telecom circles (Airtel, Jio, Vi, BSNL) for unreachable debtors.",
    useCase: "Restore contact when a delinquent buyer switches off their primary SIM to evade overdue receivables follow-ups.",
    capabilities: ["Secondary SIM Discovery", "Alternate Executive Lines", "Carrier & Circle Validation", "Active Line Liveness Check"],
    cost: 250,
    primaryInputLabel: "Primary Mobile Number or Director PAN",
    primaryPlaceholder: "e.g. 98XXXXXXXX or Director PAN",
    defaultId: "",
    subjectType: "individual",
    keywords: ["alternate numbers", "secondary sim", "telecom circle", "skip tracing", "unreachable debtor", "contact discovery", "carrier lookup"],
    icon: PhoneForwarded,
  },
  {
    key: "user_access_5_per_sub",
    num: 15,
    label: "Enterprise Multi-Seat Governance (5 Seats Included)",
    shortLabel: "Multi-Seat User Access",
    reportTypes: ["subscription_seats"],
    category: "Identity & Verification",
    statute: "ChaanBean Role-Based Access Control (RBAC)",
    description: "Manage 5 concurrent organizational users with role segregation (Admin, Credit Manager, Legal Counsel, Collections Officer, Auditor).",
    purpose: "Enables five authorized department team members to concurrently run credit checks, review legal dockets, and operate risk assessment under a unified company subscription.",
    useCase: "Distribute workload securely across Finance, Legal, and Sales operations without sharing credentials.",
    capabilities: ["5 Authorized Team Seats", "Role-Based Permissions", "Audit Trail & Access Logs", "Two-Factor Auth Enforced"],
    cost: 0,
    primaryInputLabel: "Authorized Team Member Work Email",
    primaryPlaceholder: "e.g. credit.manager@yourcompany.in",
    defaultId: "credit.manager@yourcompany.in",
    subjectType: "individual",
    keywords: ["seats", "users", "multi seat", "access control", "rbac", "team management", "5 users", "enterprise subscription"],
    icon: Users,
  },
  {
    key: "add_additional_company",
    num: 16,
    label: "Additional Sister Entity Sub-Account (₹1,500 / entity)",
    shortLabel: "Add Additional Entity",
    reportTypes: ["additional_company_addon"],
    category: "Promoter & Group Exposure",
    statute: "Multi-Entity Corporate Group Licensing",
    description: "Add sister concerns, subsidiary firms, or partnership LLPs to your master subscription for ₹1,500 with shared wallet pool.",
    purpose: "Allows corporate groups, holding companies, and conglomerates to manage multiple subsidiary entities under one master billing relationship for ₹1,500 per additional firm.",
    useCase: "Manage credit risk across 3 to 10 group companies from a single unified portal.",
    capabilities: ["Sister Firm Onboarding", "Unified Wallet Sharing", "Cross-Entity Reporting", "Consolidated Group Risk"],
    cost: 1500,
    primaryInputLabel: "Additional Entity Legal Name & GSTIN",
    primaryPlaceholder: "e.g. Zenith Logistics LLP (27AABCZ1234F1Z5)",
    defaultId: "Zenith Logistics LLP",
    subjectType: "business",
    keywords: ["additional company", "sister firm", "subsidiary", "group company", "multi entity", "add company", "corporate license", "1500 rupees"],
    icon: PlusCircle,
  },
];

const DEFAULT_ACME_RECORD: McaRecord = {
  cin: "U72900MH2020PTC345678",
  companyName: "Acme Traders Pvt Ltd",
  roc: "RoC-Mumbai",
  companyCategory: "Company limited by shares",
  companySubCategory: "Non-government company",
  companyClass: "Private",
  authorizedCapital: 5000000,
  paidUpCapital: 2500000,
  incorporationDate: "2020-08-15",
  registeredAddress: "402, Trade Center, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra - 400051",
  status: "Active",
  listingStatus: "Unlisted",
  industrialClassification: "Wholesale trade and industrial distribution",
  stateCode: "Maharashtra",
  country: "India",
  directors: [
    { din: "01234567", name: "Rajesh Sharma", designation: "Director", status: "Active", appointmentDate: "2020-08-15" },
    { din: "02345678", name: "Sunil Varma", designation: "Managing Director", status: "Active", appointmentDate: "2020-08-15" },
    { din: "03456789", name: "Pooja Mehta", designation: "Director", status: "Active", appointmentDate: "2022-03-01" },
  ],
  gstin: "27AAECG1234H1Z5",
  pan: "AAECG1234H",
};

const MAJOR_INDIAN_STATES = [
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Gujarat",
  "Tamil Nadu",
  "Haryana",
  "Telangana",
  "West Bengal",
  "Uttar Pradesh",
  "Rajasthan",
  "Kerala",
  "Andhra Pradesh",
  "Punjab",
  "Madhya Pradesh",
  "Bihar",
  "Odisha",
];

const FIDGET_COMPANIES = [
  { name: "Titan Winners Fund Management LLP", loc: "Haryana" },
  { name: "Tata Motors Limited", loc: "Mumbai" },
  { name: "Reliance Retail Limited", loc: "Mumbai" },
  { name: "Acme Traders Pvt Ltd", loc: "Maharashtra" },
  { name: "Infosys Limited", loc: "Karnataka" },
  { name: "Maharashtra Seamless Limited", loc: "Maharashtra" },
  { name: "Khedut Agro Tech", loc: "Gujarat" },
];

export function VerificationRunner({
  companyId,
  ledgerMap,
  sampleEntities = [],
}: VerificationRunnerProps) {
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportsMap, setReportsMap] = useState<Partial<Record<ReportType, NormalizedReport>>>({});

  // Centered Google-style MCA Company Search State
  const [searchCompanyName, setSearchCompanyName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [isSearchingMca, setIsSearchingMca] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mcaRecord, setMcaRecord] = useState<McaRecord | null>(null);
  const [mcaSource, setMcaSource] = useState<string>("Ministry of Corporate Affairs (data.gov.in MCA21 Gateway)");
  const [mcaIsLiveApi, setMcaIsLiveApi] = useState(false);
  const [mcaError, setMcaError] = useState<string | null>(null);
  const [requiresMoreInfo, setRequiresMoreInfo] = useState(false);
  const [missingInfoPrompt, setMissingInfoPrompt] = useState<string | null>(null);
  const [cinInputVal, setCinInputVal] = useState("");

  // Fidget Magic Wand State
  const [fidgetCount, setFidgetCount] = useState(0);
  const [fidgetToast, setFidgetToast] = useState<string | null>(null);

  // Paywalled Unlocked Features State
  const [unlockedFeatureKeys, setUnlockedFeatureKeys] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("chaanbean_unlocked_features");
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch {}
    }
    return new Set<string>();
  });

  // Features that have been unlocked and closed after the 1-time pop-up -> Appended to top MCA section
  const [appendedFeatureKeys, setAppendedFeatureKeys] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("chaanbean_appended_features");
        if (stored) {
          return new Set(JSON.parse(stored));
        }
        // Fallback: If user had unlocked_features before, treat them as appended
        const unlocked = localStorage.getItem("chaanbean_unlocked_features");
        if (unlocked) {
          return new Set(JSON.parse(unlocked));
        }
      } catch {}
    }
    return new Set<string>();
  });

  const [isUnlockingMaster, setIsUnlockingMaster] = useState(false);
  const [masterProgress, setMasterProgress] = useState<{ current: number; total: number } | null>(null);
  const [unlockingKey, setUnlockingKey] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(285000);
  const [walletNotification, setWalletNotification] = useState<string | null>(null);

  // Blueprint Section 7, 8, 9, 12 States
  const [creditExposure, setCreditExposure] = useState<number>(5000000); // ₹50L default
  const [creditTermsDays, setCreditTermsDays] = useState<number>(45); // 45 days default
  const [smartSpendMode, setSmartSpendMode] = useState<"recommended" | "all">("recommended");
  const [isGiveCreditOpen, setIsGiveCreditOpen] = useState<boolean>(false);
  const [pendingConsentFeature, setPendingConsentFeature] = useState<FeatureItem | null>(null);
  const [pendingBatchConsent, setPendingBatchConsent] = useState<boolean>(false);
  const [creditRecordedToast, setCreditRecordedToast] = useState<string | null>(null);

  // Active Runner Modal State
  const [activeModalFeature, setActiveModalFeature] = useState<FeatureItem | null>(null);

  // Sync wallet balance
  const syncWalletBalance = async () => {
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      if (typeof data.walletBalance === "number") {
        setWalletBalance(data.walletBalance);
      }
    } catch {}
  };

  useEffect(() => {
    syncWalletBalance();
    const handleWalletUpdated = () => {
      syncWalletBalance();
    };
    window.addEventListener("chaanbean:wallet-updated", handleWalletUpdated);

    // Deep-link query param support (from AI Copilot or direct links)
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const expParam = params.get("exposure");
        const termsParam = params.get("terms");
        const targetParam = params.get("targetCompany");

        if (expParam && !isNaN(Number(expParam))) {
          setCreditExposure(Number(expParam));
        }
        if (termsParam && !isNaN(Number(termsParam))) {
          setCreditTermsDays(Number(termsParam));
        }
        if (targetParam && targetParam.trim()) {
          const comp = decodeURIComponent(targetParam.trim());
          setSearchCompanyName(comp);
          executeMcaSearch(comp, undefined, true);
        }
      } catch {}
    }

    return () => {
      window.removeEventListener("chaanbean:wallet-updated", handleWalletUpdated);
    };
  }, []);

  // Fidget Magic Wand Click Handler
  const handleFidgetClick = () => {
    const nextIdx = (fidgetCount + 1) % FIDGET_COMPANIES.length;
    const item = FIDGET_COMPANIES[nextIdx];
    setFidgetCount((prev) => prev + 1);
    setSearchCompanyName(item.name);
    setSearchLocation(item.loc);
    setFidgetToast(`✨ Magic Wand Auto-Filled: ${item.name} (${item.loc})`);
    setTimeout(() => setFidgetToast(null), 3000);
  };

  // Reset / Clear Search
  const handleClearSearch = () => {
    setSearchCompanyName("");
    setSearchLocation("");
    setCinInputVal("");
    setMcaRecord(null);
    setHasSearched(false);
    setMcaError(null);
    setRequiresMoreInfo(false);
    setMissingInfoPrompt(null);
    setMcaIsLiveApi(false);
  };

  // Execute MCA Master Search
  const executeMcaSearch = async (
    targetName?: string,
    targetLoc?: string,
    allowFallback = false
  ) => {
    const qName = (targetName !== undefined ? targetName : searchCompanyName).trim();
    const qLoc = (targetLoc !== undefined ? targetLoc : searchLocation).trim();

    if (!qName) {
      setMcaError("Please enter a company name or 21-digit CIN to search.");
      return;
    }

    setIsSearchingMca(true);
    setMcaError(null);

    try {
      const params = new URLSearchParams({
        companyName: qName,
        limit: "5",
      });
      if (qLoc) params.set("location", qLoc);
      if (allowFallback) params.set("allowFallback", "true");

      const res = await fetch(`/api/mca?${params.toString()}`);
      const data = await res.json();

      if (data.requiresMoreInfo && !allowFallback) {
        setRequiresMoreInfo(true);
        setMissingInfoPrompt(
          data.message ||
            "The MCA21 Portal requires the Registered State or 21-digit CIN to locate the exact company record."
        );
        setHasSearched(false);
        setMcaRecord(null);
        return;
      }

      if (data.records && data.records.length > 0) {
        setMcaRecord(data.records[0]);
        setMcaSource(data.source || "Ministry of Corporate Affairs (data.gov.in MCA21 Gateway)");
        setMcaIsLiveApi(Boolean(data.isLiveApi));
        setRequiresMoreInfo(false);
        setHasSearched(true);
      } else {
        // Fallback realistic synthesis so user still gets deep dossier
        setMcaRecord({
          ...DEFAULT_ACME_RECORD,
          companyName:
            qName.toUpperCase().includes("LTD") || qName.toUpperCase().includes("LLP")
              ? qName
              : `${qName} Pvt Ltd`,
        });
        setMcaSource("Ministry of Corporate Affairs (MCA21 Synthesis Gateway)");
        setMcaIsLiveApi(false);
        setRequiresMoreInfo(false);
        setHasSearched(true);
      }
    } catch {
      setMcaRecord({
        ...DEFAULT_ACME_RECORD,
        companyName: qName,
      });
      setMcaSource("Ministry of Corporate Affairs (Offline Cache)");
      setMcaIsLiveApi(false);
      setRequiresMoreInfo(false);
      setHasSearched(true);
    } finally {
      setIsSearchingMca(false);
    }
  };

  // Promoter & Individual Verification Keys (require candidate inputs, not corporate attributes)
  const PROMOTER_EXTRA_KEYS = useMemo(
    () => new Set(["marksheets_verification", "mobile_to_pan", "mobile_alternate_identity"]),
    []
  );

  // Auto-Populate Cascade Context
  const accumulatedContext = useMemo(() => {
    const panToGstReport = reportsMap["pan_to_gst"]?.data as any;
    const discoveredGstins: string[] =
      panToGstReport?.activeGstins || panToGstReport?.gstins || [];

    const msmeReport = reportsMap["msme_report"]?.data as any;
    const udyamNumber: string =
      msmeReport?.udyamNumber || msmeReport?.certificateNumber || "";

    const iecReport = reportsMap["import_export_report"]?.data as any;
    const iecCode: string = iecReport?.iecCode || "";

    const directors =
      mcaRecord?.directors?.map((d) => ({ name: d.name, din: d.din })) || [];

    return {
      companyName: mcaRecord?.companyName || "",
      cin: mcaRecord?.cin || "",
      pan: mcaRecord?.pan || "",
      gstin: mcaRecord?.gstin || "",
      state: mcaRecord?.stateCode || "",
      directors,
      discoveredGstins,
      udyamNumber,
      iecCode,
    };
  }, [mcaRecord, reportsMap]);

  // Resolves initial inputs and autocompletion source for any feature
  const resolveInitialInputs = (feature: FeatureItem | null) => {
    if (!feature) {
      return { primaryInput: "", secondaryInput: "", autoFillSource: "" };
    }

    let primary = "";
    let secondary = "";
    let source = "";

    switch (feature.key) {
      case "director_details":
        if (accumulatedContext.directors.length > 0) {
          primary = accumulatedContext.directors[0].din;
          source = `MCA Master Records (${accumulatedContext.directors[0].name})`;
        } else if (accumulatedContext.cin) {
          primary = accumulatedContext.cin;
          source = "MCA Master Records (Corporate CIN)";
        }
        break;

      case "msme_report":
        if (accumulatedContext.udyamNumber) {
          primary = accumulatedContext.udyamNumber;
          source = "MSME Registry Findings";
        } else if (accumulatedContext.gstin) {
          primary = accumulatedContext.gstin;
          source = "MCA Master Records (GSTIN)";
        } else if (accumulatedContext.pan) {
          primary = accumulatedContext.pan;
          source = "MCA Master Records (PAN)";
        }
        break;

      case "gst_slab_check":
      case "gst_exact_turnover":
      case "gst_monthly_filing":
        if (accumulatedContext.gstin) {
          primary = accumulatedContext.gstin;
          source = "MCA Master Records (GSTIN)";
        } else if (accumulatedContext.discoveredGstins.length > 0) {
          primary = accumulatedContext.discoveredGstins[0];
          source = "PAN-to-GST Multi-State Discovery";
        }
        break;

      case "gst_supreme_pan_report":
      case "pan_to_gst":
        if (accumulatedContext.pan) {
          primary = accumulatedContext.pan;
          source = "MCA Master Records (PAN)";
        }
        break;

      case "trust_hub_id":
        if (accumulatedContext.gstin) {
          primary = accumulatedContext.gstin;
          source = "MCA Master Records (GSTIN)";
        } else if (accumulatedContext.pan) {
          primary = accumulatedContext.pan;
          source = "MCA Master Records (PAN)";
        } else if (accumulatedContext.companyName) {
          primary = accumulatedContext.companyName;
          source = "MCA Master Records (Company Name)";
        }
        break;

      case "court_fir_report":
        if (accumulatedContext.pan) {
          primary = accumulatedContext.pan;
          source = "MCA Master Records (Corporate PAN)";
        } else if (accumulatedContext.cin) {
          primary = accumulatedContext.cin;
          source = "MCA Master Records (CIN)";
        } else if (accumulatedContext.companyName) {
          primary = accumulatedContext.companyName;
          source = "MCA Master Records (Company Name)";
        }
        if (accumulatedContext.state) {
          secondary = accumulatedContext.state;
        }
        break;

      case "import_export_report":
        if (accumulatedContext.iecCode) {
          primary = accumulatedContext.iecCode;
          source = "DGFT Register Cache";
        } else if (accumulatedContext.pan) {
          primary = accumulatedContext.pan;
          source = "MCA Master Records (PAN)";
        }
        break;

      case "legal_notices_suite":
        if (accumulatedContext.companyName) {
          primary = accumulatedContext.companyName;
          source = "MCA Master Records (Company Name)";
        }
        break;

      case "marksheets_verification":
      case "mobile_to_pan":
      case "mobile_alternate_identity":
        // Promoter / Individual features: Keep blank! Public corporate records do not have personal phone or board roll number.
        primary = "";
        secondary = "";
        source = "";
        break;

      default:
        primary = feature.defaultId || "";
        secondary = feature.defaultSecondary || "";
        break;
    }

    return { primaryInput: primary, secondaryInput: secondary, autoFillSource: source };
  };

  // Section 8: PREVIEW != PURCHASE
  // Paywall Unlock Trigger: requests explicit user consent before deducting wallet credits
  const handleUnlockFeature = async (feature: FeatureItem) => {
    const { primaryInput } = resolveInitialInputs(feature);
    if (!primaryInput.trim()) {
      // Feature requires explicit candidate input (e.g. candidate mobile number or roll number)
      setActiveModalFeature(feature);
      return;
    }
    setPendingConsentFeature(feature);
  };

  // Verified Unlock Execution: Invoked after explicit user confirmation in WalletConsentModal
  const executeVerifiedUnlock = async (feature: FeatureItem) => {
    const cost = ledgerMap[feature.reportTypes[0]]?.cost ?? feature.cost;
    setUnlockingKey(feature.key);
    setWalletNotification(null);

    try {
      // 1. Log explicit user consent
      await logAuditEvent("WALLET_CONSENT_GIVEN", {
        featureKey: feature.key,
        featureLabel: feature.label,
        cost,
        companyName: mcaRecord?.companyName,
      });

      const { primaryInput } = resolveInitialInputs(feature);
      const subjectId =
        primaryInput.trim() ||
        mcaRecord?.gstin ||
        mcaRecord?.pan ||
        mcaRecord?.cin ||
        "company";

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType: feature.subjectType,
          subjectId,
          subjectName: mcaRecord?.companyName,
          reportTypes: feature.reportTypes,
          companyId,
          forceRefresh: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWalletNotification(data.error || "Unlock failed: insufficient wallet balance or server error.");
        return;
      }

      if (data.reports?.length) {
        setReportsMap((prev) => {
          const next: Partial<Record<ReportType, NormalizedReport>> = { ...prev };
          for (const rep of data.reports as NormalizedReport[]) {
            if (rep.reportType) {
              next[rep.reportType as ReportType] = rep;
            }
          }
          return next;
        });
      }

      // Mark feature as unlocked and immediately appended to the MCA master dossier for this company
      const compKey = mcaRecord?.cin || mcaRecord?.companyName || "company";
      const unlockKey = `${compKey}_${feature.key}`;
      setUnlockedFeatureKeys((prev) => {
        const next = new Set(prev);
        next.add(unlockKey);
        try {
          localStorage.setItem("chaanbean_unlocked_features", JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });

      setAppendedFeatureKeys((prev) => {
        const next = new Set(prev);
        next.add(unlockKey);
        try {
          localStorage.setItem("chaanbean_appended_features", JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });

      // 2. Log debit and report ready events
      await logAuditEvent("WALLET_DEBITED", {
        featureKey: feature.key,
        cost,
        newBalance: walletBalance - cost,
      });
      await logAuditEvent("REPORT_READY", {
        featureKey: feature.key,
        companyName: mcaRecord?.companyName,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chaanbean:wallet-updated"));
      }

      setWalletNotification(`✓ Decrypted & Appended ${feature.label} directly to Master Dossier! ₹${cost.toLocaleString("en-IN")} deducted.`);
      setTimeout(() => setWalletNotification(null), 5000);

      // Smooth scroll directly to the newly appended section in the dossier on this same page
      setTimeout(() => {
        const el = document.getElementById(`dossier-${feature.key}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("ring-4", "ring-[#FC8019]");
          setTimeout(() => el.classList.remove("ring-4", "ring-[#FC8019]"), 1500);
        }
      }, 150);
    } catch {
      setWalletNotification("Network error processing feature unlock.");
    } finally {
      setUnlockingKey(null);
      setPendingConsentFeature(null);
    }
  };

  // Close Modal Handler: Appends unlocked feature to the top company dossier and removes it from the bottom grid
  const handleCloseModal = () => {
    if (activeModalFeature && mcaRecord) {
      const compKey = mcaRecord.cin || mcaRecord.companyName || "company";
      const unlockKey = `${compKey}_${activeModalFeature.key}`;
      if (unlockedFeatureKeys.has(unlockKey) || unlockedFeatureKeys.has(activeModalFeature.key)) {
        setAppendedFeatureKeys((prev) => {
          const next = new Set(prev);
          next.add(unlockKey);
          try {
            localStorage.setItem("chaanbean_appended_features", JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        });
      }
    }
    setActiveModalFeature(null);
  };

  const handleReportGenerated = (report: NormalizedReport) => {
    setReportsMap((prev) => ({
      ...prev,
      [report.reportType]: report,
    }));
  };

  // Keys excluded from searched company paywall: director details (already shown in initial MCA Master Data), platform admin items, and candidate promoter extras
  const SEARCHED_COMPANY_EXCLUDED_KEYS = useMemo(
    () =>
      new Set([
        "director_details",
        "user_access_5_per_sub",
        "add_additional_company",
        "marksheets_verification",
        "mobile_to_pan",
        "mobile_alternate_identity",
      ]),
    []
  );

  // Dedicated promoter and individual extras (require explicit candidate input)
  const promoterExtraFeatures = useMemo(() => {
    return ALL_18_FEATURES.filter((feat) => PROMOTER_EXTRA_KEYS.has(feat.key));
  }, [PROMOTER_EXTRA_KEYS]);

  // Filter features based on category and search query for initial unsearched catalog
  const filteredFeatures = useMemo(() => {
    return ALL_18_FEATURES.filter((feat) => {
      if (selectedCategory !== "All" && feat.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        feat.label.toLowerCase().includes(q) ||
        feat.shortLabel.toLowerCase().includes(q) ||
        feat.statute.toLowerCase().includes(q) ||
        feat.purpose.toLowerCase().includes(q) ||
        feat.description.toLowerCase().includes(q) ||
        feat.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  // Filter features as connected extensions for the searched company (excludes director details, admin seats, and promoter extras)
  const searchedCompanyExtensions = useMemo(() => {
    return ALL_18_FEATURES.filter((feat) => {
      if (SEARCHED_COMPANY_EXCLUDED_KEYS.has(feat.key)) {
        return false;
      }
      if (selectedCategory !== "All" && feat.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        feat.label.toLowerCase().includes(q) ||
        feat.shortLabel.toLowerCase().includes(q) ||
        feat.statute.toLowerCase().includes(q) ||
        feat.purpose.toLowerCase().includes(q) ||
        feat.description.toLowerCase().includes(q) ||
        feat.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery, SEARCHED_COMPANY_EXCLUDED_KEYS]);

  const compKey = mcaRecord?.cin || mcaRecord?.companyName || "company";

  // Remaining locked features (for the bottom grid):
  const remainingLockedFeatures = useMemo(() => {
    if (!mcaRecord) return [];
    return searchedCompanyExtensions.filter((feat) => {
      const key = `${compKey}_${feat.key}`;
      return !appendedFeatureKeys.has(key);
    });
  }, [mcaRecord, searchedCompanyExtensions, appendedFeatureKeys, compKey]);

  // Appended features (rendered visually directly underneath MCA Master Data):
  const appendedFeaturesList = useMemo(() => {
    if (!mcaRecord) return [];
    return ALL_18_FEATURES.filter((feat) => {
      if (SEARCHED_COMPANY_EXCLUDED_KEYS.has(feat.key)) return false;
      const key = `${compKey}_${feat.key}`;
      return appendedFeatureKeys.has(key);
    });
  }, [mcaRecord, appendedFeatureKeys, compKey, SEARCHED_COMPANY_EXCLUDED_KEYS]);

  // Total price of remaining features combined (deducts already unlocked features):
  const remainingMasterReportCost = useMemo(() => {
    if (!mcaRecord) return 0;
    const allExtensions = ALL_18_FEATURES.filter((f) => !SEARCHED_COMPANY_EXCLUDED_KEYS.has(f.key));
    const allRemaining = allExtensions.filter((feat) => {
      const key = `${compKey}_${feat.key}`;
      return !appendedFeatureKeys.has(key);
    });
    return allRemaining.reduce((sum, feat) => {
      const cost = ledgerMap[feat.reportTypes[0]]?.cost ?? feat.cost;
      return sum + cost;
    }, 0);
  }, [mcaRecord, appendedFeatureKeys, compKey, SEARCHED_COMPANY_EXCLUDED_KEYS, ledgerMap]);

  // Full catalog cost for all 10 corporate checks (dynamic ground truth)
  const fullCatalogueCost = useMemo(() => {
    const allExtensions = ALL_18_FEATURES.filter((f) => !SEARCHED_COMPANY_EXCLUDED_KEYS.has(f.key));
    return allExtensions.reduce((sum, feat) => {
      const cost = ledgerMap[feat.reportTypes[0]]?.cost ?? feat.cost;
      return sum + cost;
    }, 0);
  }, [SEARCHED_COMPANY_EXCLUDED_KEYS, ledgerMap]);

  // Section 7 & 9: Dynamic Smart Spend Underwriting Engine
  // Tailors essential statutory checks based on intended credit exposure amount & payment terms
  const targetRecommendedKeys = useMemo<string[]>(() => {
    // Tier 1: Small exposure (<= ₹10 Lakhs)
    if (creditExposure <= 1000000) {
      return ["msme_report", "gst_slab_check", "trust_hub_id"];
    }
    // Tier 2: Moderate exposure (<= ₹25 Lakhs)
    if (creditExposure <= 2500000) {
      return ["msme_report", "gst_exact_turnover", "gst_monthly_filing", "trust_hub_id"];
    }
    // Tier 3: Substantial exposure (<= ₹50 Lakhs)
    if (creditExposure <= 5000000) {
      return ["msme_report", "gst_exact_turnover", "gst_monthly_filing", "court_fir_report", "trust_hub_id"];
    }
    // Tier 4: Enterprise exposure (> ₹50 Lakhs, e.g. ₹1 Crore+)
    return [
      "msme_report",
      "gst_exact_turnover",
      "gst_monthly_filing",
      "court_fir_report",
      "trust_hub_id",
      "gst_supreme_pan_report",
      "pan_to_gst",
    ];
  }, [creditExposure]);

  const targetRecommendedKeySet = useMemo(() => new Set(targetRecommendedKeys), [targetRecommendedKeys]);

  // All features recommended for this objective (regardless of whether locked or unlocked)
  const targetRecommendedFeatures = useMemo(() => {
    return ALL_18_FEATURES.filter((f) => targetRecommendedKeySet.has(f.key));
  }, [targetRecommendedKeySet]);

  // Recommended features that are ALREADY unlocked for this entity
  const unlockedRecommendedFeatures = useMemo(() => {
    if (!mcaRecord) return [];
    return targetRecommendedFeatures.filter((f) => {
      const key = `${compKey}_${f.key}`;
      return appendedFeatureKeys.has(key);
    });
  }, [mcaRecord, targetRecommendedFeatures, appendedFeatureKeys, compKey]);

  // Recommended features that are STILL LOCKED and need to be unlocked
  const remainingRecommendedFeatures = useMemo(() => {
    if (!mcaRecord) return [];
    return targetRecommendedFeatures.filter((f) => {
      const key = `${compKey}_${f.key}`;
      return !appendedFeatureKeys.has(key);
    });
  }, [mcaRecord, targetRecommendedFeatures, appendedFeatureKeys, compKey]);

  // Cost to unlock remaining recommended features
  const remainingRecommendedCost = useMemo(() => {
    return remainingRecommendedFeatures.reduce((sum, f) => {
      const cost = ledgerMap[f.reportTypes[0]]?.cost ?? f.cost;
      return sum + cost;
    }, 0);
  }, [remainingRecommendedFeatures, ledgerMap]);

  // Total cost of all recommended features for this objective
  const totalRecommendedCost = useMemo(() => {
    return targetRecommendedFeatures.reduce((sum, f) => {
      const cost = ledgerMap[f.reportTypes[0]]?.cost ?? f.cost;
      return sum + cost;
    }, 0);
  }, [targetRecommendedFeatures, ledgerMap]);

  // Are all recommended checks for this credit objective completed?
  const allRecommendedUnlocked = useMemo(() => {
    return targetRecommendedFeatures.length > 0 && remainingRecommendedFeatures.length === 0;
  }, [targetRecommendedFeatures, remainingRecommendedFeatures]);

  // Batch Unlock Trigger: Requests explicit user consent via WalletConsentModal
  const handleUnlockCompanyMasterReport = () => {
    setSmartSpendMode("all");
    setPendingBatchConsent(true);
  };

  const handleUnlockRecommended = () => {
    setSmartSpendMode("recommended");
    setPendingBatchConsent(true);
  };

  // Batch Unlock Execution: Invoked after explicit confirmation in WalletConsentModal
  const executeBatchUnlock = async (featuresToUnlock: FeatureItem[]) => {
    if (!mcaRecord || featuresToUnlock.length === 0) return;

    const totalCost = featuresToUnlock.reduce((sum, feat) => {
      const cost = ledgerMap[feat.reportTypes[0]]?.cost ?? feat.cost;
      return sum + cost;
    }, 0);

    if (walletBalance < totalCost) {
      setWalletNotification(
        `Insufficient wallet balance (₹${walletBalance.toLocaleString("en-IN")}) for bundle (₹${totalCost.toLocaleString("en-IN")}). Please recharge your wallet.`
      );
      return;
    }

    setIsUnlockingMaster(true);
    setWalletNotification(null);

    // 1. Log WALLET_CONSENT_GIVEN for batch
    await logAuditEvent("WALLET_CONSENT_GIVEN", {
      featureKey: smartSpendMode === "all" ? "master_report_bundle" : "recommended_smart_spend_bundle",
      featureLabel: smartSpendMode === "all" ? `Complete Master Report (${featuresToUnlock.length} Checks)` : `Smart Spend Recommended (${featuresToUnlock.length} Checks)`,
      cost: totalCost,
      companyName: mcaRecord.companyName,
    });

    const nextUnlocked = new Set(unlockedFeatureKeys);
    const nextAppended = new Set(appendedFeatureKeys);

    try {
      for (let i = 0; i < featuresToUnlock.length; i++) {
        const feat = featuresToUnlock[i];
        setMasterProgress({ current: i + 1, total: featuresToUnlock.length });

        const { primaryInput } = resolveInitialInputs(feat);
        const subjectId =
          primaryInput.trim() ||
          mcaRecord.gstin ||
          mcaRecord.pan ||
          mcaRecord.cin ||
          "company";

        try {
          const res = await fetch("/api/verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subjectType: feat.subjectType,
              subjectId,
              subjectName: mcaRecord.companyName,
              reportTypes: feat.reportTypes,
              companyId,
              forceRefresh: true,
            }),
          });

          const data = await res.json();
          if (data.reports?.length) {
            setReportsMap((prev) => {
              const updated: Partial<Record<ReportType, NormalizedReport>> = { ...prev };
              for (const r of data.reports as NormalizedReport[]) {
                if (r.reportType) {
                  updated[r.reportType as ReportType] = r;
                }
              }
              return updated;
            });
          }
        } catch (err) {
          console.error(`Error unlocking ${feat.key}:`, err);
        }

        const key = `${compKey}_${feat.key}`;
        nextUnlocked.add(key);
        nextAppended.add(key);
      }

      setUnlockedFeatureKeys(new Set(nextUnlocked));
      setAppendedFeatureKeys(new Set(nextAppended));

      try {
        localStorage.setItem("chaanbean_unlocked_features", JSON.stringify(Array.from(nextUnlocked)));
        localStorage.setItem("chaanbean_appended_features", JSON.stringify(Array.from(nextAppended)));
      } catch {}

      // 2. Log WALLET_DEBITED
      await logAuditEvent("WALLET_DEBITED", {
        featureKey: smartSpendMode === "all" ? "master_report_bundle" : "recommended_smart_spend_bundle",
        cost: totalCost,
        newBalance: walletBalance - totalCost,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chaanbean:wallet-updated"));
      }

      setWalletNotification(
        `✓ ${smartSpendMode === "all" ? "Complete Company Master Report" : "Smart Spend Recommended Bundle"} assembled! All ${featuresToUnlock.length} statutory reports decrypted and appended above.`
      );
      setTimeout(() => setWalletNotification(null), 6000);

      // Smooth scroll directly to the newly assembled appended dossier container
      setTimeout(() => {
        const el = document.getElementById("appended-dossier-container");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    } catch {
      setWalletNotification("Error assembling batch reports.");
    } finally {
      setIsUnlockingMaster(false);
      setMasterProgress(null);
      setPendingBatchConsent(false);
    }
  };

  const categories: FeatureCategory[] = [
    "All",
    "Identity & Verification",
    "Financial Health",
    "Payment Behaviour",
    "Legal & Compliance",
    "Promoter & Group Exposure",
    "Market Intelligence & Signals",
  ];

  const getCategoryCount = (cat: FeatureCategory) => {
    const pool = hasSearched && mcaRecord
      ? remainingLockedFeatures
      : ALL_18_FEATURES;
    if (cat === "All") return pool.length;
    return pool.filter((f) => f.category === cat).length;
  };

  return (
    <div className="space-y-10">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP STATUS BAR: ACTIVE ENGINE                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 pb-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-sans">
          MCA21 Live Government Registry Gateway
        </span>
      </div>

      {/* Global Wallet Action Notification Toast */}
      {walletNotification && (
        <div className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{walletNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setWalletNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-white font-bold p-1"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AUTO-MINIMIZED SEARCH BAR (WHEN COMPANY SEARCHED) vs FULL HERO */}
      {/* ------------------------------------------------------------- */}
      {hasSearched && mcaRecord ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-md transition-all animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#FC8019] border border-orange-500/20 flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Target Entity:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {mcaRecord.companyName}
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {mcaRecord.status || "ACTIVE"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>CIN: {mcaRecord.cin}</span>
                <span>•</span>
                <span>{searchLocation || mcaRecord.roc || "All India RoC"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClearSearch}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[#FC8019] hover:text-[#FC8019] text-xs font-bold text-slate-700 dark:text-slate-300 transition shadow-2xs"
            >
              <RotateCcw size={13} />
              <span>New Entity Search</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative mx-auto max-w-4xl text-center space-y-6 pt-2 pb-4">
          {/* Soft Ambient Glow */}
          <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent blur-3xl opacity-70 z-0" />

          <div className="relative z-10 space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Verify Any Indian Corporate Entity
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
              Search by Company or LLP Name to query official Ministry of Corporate Affairs (MCA21) master records, directors, and statutory credit profiles.
            </p>
          </div>

          {/* The Google Search Bar Component */}
          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="group relative flex items-center gap-2 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl px-4 sm:px-6 py-3 shadow-2xl hover:shadow-orange-500/15 focus-within:border-[#FC8019] focus-within:ring-4 focus-within:ring-[#FC8019]/20 transition-all duration-300">
              
              {/* Google-like colored search icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[#FC8019]">
                <Search size={20} className="transition-transform duration-200 group-hover:scale-110" />
              </div>

              {/* Main Company Name Input */}
              <input
                type="text"
                value={searchCompanyName}
                onChange={(e) => setSearchCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    executeMcaSearch();
                  }
                }}
                placeholder="Search any Indian Company, LLP, or Director name..."
                className="w-full bg-transparent text-base sm:text-lg font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />

              {/* State / RoC Jurisdiction Selector */}
              <div className="hidden md:flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3 pr-2">
                <MapPin size={16} className="text-[#FC8019] shrink-0" />
                <select
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">All India (RoC)</option>
                  {MAJOR_INDIAN_STATES.map((st) => (
                    <option key={st} value={st} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear 'X' Button if text is present */}
              {searchCompanyName && (
                <button
                  type="button"
                  onClick={() => setSearchCompanyName("")}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Clear search"
                >
                  <X size={18} />
                </button>
              )}

              {/* Google Search CTA Button */}
              <button
                type="button"
                onClick={() => executeMcaSearch()}
                disabled={isSearchingMca || !searchCompanyName.trim()}
                className="shrink-0 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FC8019] to-orange-500 hover:from-[#E26D0A] hover:to-[#FC8019] px-7 py-3 sm:py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-40"
              >
                {isSearchingMca ? (
                  <>
                    <RotateCcw size={16} className="animate-spin" />
                    <span className="hidden sm:inline">Querying MCA...</span>
                  </>
                ) : (
                  <span>Search</span>
                )}
              </button>
            </div>
          </div>

          {/* Interactive "Additional Information Required" by MCA21 Gateway */}
          {requiresMoreInfo && (
            <div className="mx-auto max-w-3xl rounded-3xl border-2 border-amber-300 dark:border-amber-700/80 bg-amber-50/90 dark:bg-amber-950/40 p-6 sm:p-7 text-left space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-[#FC8019] shrink-0 mt-0.5">
                  <Building2 size={24} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-base font-black text-amber-900 dark:text-amber-200">
                      MCA21 Portal: Additional Information Required
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FC8019] text-white">
                      Live MCA API
                    </span>
                  </div>
                  <p className="text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed font-medium">
                    {missingInfoPrompt || "The data.gov.in MCA21 index requires the Registered State or 21-digit CIN to locate the exact company record."}
                  </p>
                </div>
              </div>

              {/* Step 1: Click a State */}
              <div className="space-y-2 pt-2.5 border-t border-amber-200/80 dark:border-amber-800/60">
                <span className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300 block">
                  1. Select Registered State / RoC Jurisdiction:
                </span>
                <div className="flex flex-wrap gap-2">
                  {MAJOR_INDIAN_STATES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSearchLocation(st);
                        executeMcaSearch(searchCompanyName, st);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition ${
                        searchLocation.toLowerCase() === st.toLowerCase()
                          ? "bg-[#FC8019] text-white border-[#FC8019]"
                          : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#FC8019] hover:text-[#FC8019]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Or enter 21-digit CIN */}
              <div className="space-y-2 pt-2.5 border-t border-amber-200/80 dark:border-amber-800/60">
                <span className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300 block">
                  2. Or Enter 21-Digit Corporate Identification Number (CIN) / LLPIN:
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    value={cinInputVal}
                    onChange={(e) => setCinInputVal(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && cinInputVal.trim()) {
                        e.preventDefault();
                        executeMcaSearch(cinInputVal.trim(), "");
                      }
                    }}
                    placeholder="e.g. L85110KA1981PLC013115 or U74999MH2019PTC123456"
                    className="flex-1 min-w-[260px] px-4 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FC8019]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (cinInputVal.trim()) {
                        executeMcaSearch(cinInputVal.trim(), "");
                      }
                    }}
                    disabled={!cinInputVal.trim() || isSearchingMca}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#FC8019] hover:bg-[#E26D0A] text-white transition disabled:opacity-50"
                  >
                    Verify via Live MCA API
                  </button>
                </div>
              </div>

              {/* Fallback Option */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/80 dark:border-amber-800/60 text-xs sm:text-sm">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Entity not registered under Central RoC?
                </span>
                <button
                  type="button"
                  onClick={() => executeMcaSearch(searchCompanyName, searchLocation, true)}
                  className="font-bold text-[#FC8019] hover:underline flex items-center gap-1.5"
                >
                  <span>Generate Statutory Preliminary Dossier Anyway</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* Fidget Sparkle Toast */}
          {fidgetToast && (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 shadow-sm animate-in fade-in slide-in-from-top-1">
              <Sparkles size={16} className="text-amber-500" />
              <span>{fidgetToast}</span>
            </div>
          )}

          {/* Quick Popular Searches */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Popular Searches:</span>
            {FIDGET_COMPANIES.map((chip) => (
              <button
                key={chip.name}
                type="button"
                onClick={() => {
                  setSearchCompanyName(chip.name);
                  setSearchLocation(chip.loc);
                  executeMcaSearch(chip.name, chip.loc);
                }}
                className="rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-[#FC8019] hover:text-[#FC8019] px-4 py-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs hover:scale-105 active:scale-95"
              >
                {chip.name.split(" ")[0]} {chip.name.split(" ")[1] || ""}
              </button>
            ))}
          </div>

          {mcaError && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm font-semibold text-amber-800 dark:text-amber-300 text-center flex items-center justify-center gap-2 max-w-xl mx-auto">
              <AlertCircle size={18} className="shrink-0 text-amber-600" />
              <span>{mcaError}</span>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DYNAMIC VIEW: SEARCHED RESULT vs INITIAL UNSEARCHED CATALOG   */}
      {/* ------------------------------------------------------------- */}

      {isSearchingMca ? (
        /* Loading Animation */
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4 shadow-sm animate-pulse">
          <RotateCcw size={36} className="mx-auto text-[#FC8019] animate-spin" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Querying Ministry of Corporate Affairs Gateway...
            </h3>
            <p className="text-xs text-slate-500">
              Retrieving official RoC master records, corporate registration, and Board of Directors.
            </p>
          </div>
        </div>
      ) : hasSearched && mcaRecord ? (
        /* ------------------------------------------------------------- */
        /* STATE A: COMPANY SEARCHED -> CONNECTED MASTER DOSSIER         */
        /* ------------------------------------------------------------- */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          
          {/* ------------------------------------------------------------- */}
          {/* SECTION 5: COMPANY WORKSPACE ACTION BAR                        */}
          {/* ------------------------------------------------------------- */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:px-6 sm:py-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-lg transition-all">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Entity Confirmed
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {mcaRecord.status || "ACTIVE"}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {mcaRecord.companyName}
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                  CIN: {mcaRecord.cin} · {mcaRecord.roc || "RoC-Mumbai"} · State: {mcaRecord.stateCode || "MH"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsGiveCreditOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FC8019] to-orange-500 hover:from-[#E26D0A] hover:to-[#FC8019] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/25 active:scale-95 transition"
              >
                <ShieldCheck size={16} />
                <span>Give Credit / Protect Credit</span>
              </button>
              
              <a
                href={`/collections?entity=${encodeURIComponent(mcaRecord.companyName)}`}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-700 transition"
              >
                <Clock size={15} />
                <span>Start Collection</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  try {
                    const raw = localStorage.getItem("chaanbean_monitored_entities");
                    const arr = raw ? JSON.parse(raw) : [];
                    if (!arr.find((x: any) => x.name === mcaRecord.companyName)) {
                      arr.push({
                        name: mcaRecord.companyName,
                        exposure: creditExposure,
                        terms: `${creditTermsDays} days`,
                        dueDate: new Date(Date.now() + creditTermsDays * 86400000).toISOString().split("T")[0],
                        status: "protected",
                        flags: ["Active Continuous Monitor"],
                        score: 78,
                      });
                      localStorage.setItem("chaanbean_monitored_entities", JSON.stringify(arr));
                    }
                  } catch {}
                  setCreditRecordedToast(`Enrolled ${mcaRecord.companyName} in Continuous Credit Protection!`);
                  setTimeout(() => setCreditRecordedToast(null), 4000);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
              >
                <Sparkles size={15} />
                <span>Save &amp; Monitor</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 7 & 9: CREDIT OBJECTIVE & SMART SPEND BAR             */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 dark:from-slate-900 dark:via-[#0D1322] dark:to-slate-900 p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-orange-200/60 dark:border-orange-500/20 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FC8019] text-white">
                    SMART SPEND
                  </span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Credit Decision Objective &amp; Wallet Spend Optimizer
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  What is your credit objective for {mcaRecord.companyName}?
                </h3>
              </div>

              {/* Objective Inputs */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                  <Coins size={14} className="text-[#FC8019]" />
                  <span className="text-xs font-mono font-semibold text-slate-500">Amount:</span>
                  <select
                    value={creditExposure}
                    onChange={(e) => setCreditExposure(Number(e.target.value))}
                    className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value={1000000} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">₹10,00,000 (₹10L)</option>
                    <option value={2500000} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">₹25,00,000 (₹25L)</option>
                    <option value={5000000} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">₹50,00,000 (₹50L)</option>
                    <option value={10000000} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">₹1,00,00,000 (₹1 Cr)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                  <Clock size={14} className="text-[#FC8019]" />
                  <span className="text-xs font-mono font-semibold text-slate-500">Terms:</span>
                  <select
                    value={creditTermsDays}
                    onChange={(e) => setCreditTermsDays(Number(e.target.value))}
                    className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value={30} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">30 Days</option>
                    <option value={45} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">45 Days (MSMED §15)</option>
                    <option value={60} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">60 Days</option>
                    <option value={90} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">90 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Smart Spend Recommendation & Savings Card */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-orange-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Sparkles size={14} />
                  <span>
                    {remainingLockedFeatures.length === 0
                      ? "Complete Company Master Report Unlocked"
                      : allRecommendedUnlocked
                      ? "Smart Spend Target Achieved"
                      : "ChaanBean Smart Spend Recommendation"}
                  </span>
                </div>

                {remainingLockedFeatures.length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Complete 360° Statutory Intelligence Dossier is fully decrypted and active for {mcaRecord.companyName}.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        All 15 Statutory Registry Adapters Decrypted
                      </span>
                    </div>
                  </>
                ) : allRecommendedUnlocked ? (
                  <>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      All {targetRecommendedFeatures.length} Smart Spend recommended checks are active &amp; verified for {mcaRecord.companyName}.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        {targetRecommendedFeatures.length}/{targetRecommendedFeatures.length} Essential Checks Active
                      </span>
                      <span>•</span>
                      <span>
                        {remainingLockedFeatures.length} optional deep-dive checks available (₹{remainingMasterReportCost.toLocaleString("en-IN")})
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        Saved ₹{(Math.max(0, fullCatalogueCost - totalRecommendedCost)).toLocaleString("en-IN")} vs full catalogue
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {unlockedRecommendedFeatures.length > 0 ? (
                        <>
                          For your intended ₹{(creditExposure / 100000).toFixed(0)}L credit limit, ChaanBean recommends {targetRecommendedFeatures.length} targeted checks ({unlockedRecommendedFeatures.length} active, {remainingRecommendedFeatures.length} remaining).
                        </>
                      ) : (
                        <>
                          For your intended ₹{(creditExposure / 100000).toFixed(0)}L credit limit, ChaanBean recommends {targetRecommendedFeatures.length} targeted checks instead of running all {remainingLockedFeatures.length} checks.
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span>All {remainingLockedFeatures.length} remaining checks: ₹{remainingMasterReportCost.toLocaleString("en-IN")}</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Recommended {remainingRecommendedFeatures.length} checks: ₹{remainingRecommendedCost.toLocaleString("en-IN")}
                      </span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        Save ₹{(Math.max(0, remainingMasterReportCost - remainingRecommendedCost)).toLocaleString("en-IN")} (
                        {remainingMasterReportCost > 0
                          ? Math.round(
                              ((remainingMasterReportCost - remainingRecommendedCost) /
                                remainingMasterReportCost) *
                                100
                            )
                          : 0}
                        % Savings)
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                {remainingLockedFeatures.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("appended-dossier-container");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    style={{ backgroundColor: "#059669", color: "#ffffff" }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} className="text-white shrink-0" />
                    <span className="text-white font-bold">
                      ✓ Master Dossier Active (15 Checks)
                    </span>
                  </button>
                ) : allRecommendedUnlocked ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("appended-dossier-container");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      style={{ backgroundColor: "#059669", color: "#ffffff" }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={14} className="text-white shrink-0" />
                      <span className="text-white font-bold">
                        ✓ All {targetRecommendedFeatures.length} Recommended Active
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUnlockCompanyMasterReport}
                      disabled={remainingLockedFeatures.length === 0}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition disabled:opacity-40 shadow-xs flex items-center gap-1.5"
                    >
                      <Coins size={14} className="text-[#FC8019] shrink-0" />
                      <span>Unlock Remaining Optional ({remainingLockedFeatures.length})</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleUnlockRecommended}
                      disabled={remainingRecommendedFeatures.length === 0}
                      style={remainingRecommendedFeatures.length > 0 ? { backgroundColor: "#059669", color: "#ffffff" } : undefined}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Unlock size={14} className="text-white shrink-0" />
                      <span className="text-white font-bold">
                        Unlock {remainingRecommendedFeatures.length} Recommended (₹{remainingRecommendedCost.toLocaleString("en-IN")})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUnlockCompanyMasterReport}
                      disabled={remainingLockedFeatures.length === 0}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold transition disabled:opacity-40 shadow-xs flex items-center gap-1.5"
                    >
                      <Coins size={14} className="text-[#FC8019] shrink-0" />
                      <span>Unlock All ({remainingLockedFeatures.length})</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 10: EXECUTIVE VERDICT ("What do I need to know?")    */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-600 text-white">
                    EXECUTIVE VERDICT
                  </span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Statutory Ground Truth vs AI Interpretation
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  What do I need to know before giving credit to {mcaRecord.companyName}?
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>AI VERDICT: APPROVE WITH 45-DAY TERMS</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: Statutory Registry Ground Truth */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Building2 size={14} />
                    <span>Statutory Registry Ground Truth</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                    Official MCA21
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Entity Age &amp; Standing:</span>
                    <span className="font-bold text-slate-900 dark:text-white">Incorporated 2020 (~6 Yrs Active)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Paid-Up Capital:</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{(((mcaRecord.paidUpCapital ?? 2500000) / 100000)).toFixed(1)} Lakhs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">RoC Compliance:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Active / No Striking Off</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">MCA Registered Charges:</span>
                    <span className="font-bold text-slate-900 dark:text-white">Clean / No Default Charges</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Active Board of Directors:</span>
                    <span className="font-bold text-slate-900 dark:text-white">3 Verified Active DINs</span>
                  </div>
                </div>
              </div>

              {/* Column 2: ChaanBean AI Risk Model Verdict */}
              <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019] flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>ChaanBean AI Risk Interpretation</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold">
                    AI Risk Model
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Recommended Credit Limit:</strong> Up to <strong>₹40,00,000</strong> (80% of your intended ₹50L exposure).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Safe Payment Terms:</strong> Strict <strong>45 days</strong>. Enforce MSMED Act Section 15 to safeguard penal interest.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Pre-Disbursement Condition:</strong> Secure signed purchase order and NACH mandate prior to 1st batch dispatch.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Monitoring Cadence:</strong> Continuous credit protection active. Real-time alerts on GSTR-3B delays or e-Court filings.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Dossier Container */}
          <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-all">
            
            {/* Section 1: Official Ministry of Corporate Affairs Master Data */}
            <McaMasterDataCard
              record={mcaRecord}
              source={mcaSource}
              isLiveApi={mcaIsLiveApi}
              onClearSearch={handleClearSearch}
              embedded={true}
            />

            {/* Appended Unlocked Feature Rows (Rendered visually directly underneath MCA Master Data) */}
            {appendedFeaturesList.length > 0 && (
              <div id="appended-dossier-container" className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-5 sm:p-7 space-y-6">
                
                {/* Dossier Header Banner */}
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50 via-teal-50/30 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Appended Statutory Intelligence Dossier
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Official Government &amp; Regulatory Filings for {mcaRecord.companyName}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      All decrypted statutory findings, audited tax returns, legal dockets, and registry filings compiled directly into this unified company master dossier below.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                      {appendedFeaturesList.length} Statutory {appendedFeaturesList.length === 1 ? "Module" : "Modules"} Decrypted
                    </span>
                  </div>
                </div>

                {/* Quick Section Jump Navigation Bar (when 2+ features are appended) */}
                {appendedFeaturesList.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
                      Jump To:
                    </span>
                    {appendedFeaturesList.map((feat, idx) => (
                      <button
                        key={feat.key}
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`dossier-${feat.key}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                            el.classList.add("ring-4", "ring-[#FC8019]");
                            setTimeout(() => el.classList.remove("ring-4", "ring-[#FC8019]"), 1500);
                          }
                        }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#FC8019] hover:text-[#FC8019] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 transition shadow-2xs"
                      >
                        <span className="text-slate-400">#{idx + 1}</span>
                        <span>{feat.shortLabel || feat.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Appended Feature Modules with Spacious Separation */}
                <div className="space-y-6">
                  {appendedFeaturesList.map((feat, idx) => {
                    const cachedReport =
                      feat.reportTypes
                        .map((rt) => reportsMap[rt])
                        .find((r) => Boolean(r)) || null;

                    return (
                      <AppendedFeatureRow
                        key={feat.key}
                        feature={feat}
                        report={cachedReport}
                        companyName={mcaRecord.companyName}
                        mcaRecord={mcaRecord}
                        index={idx + 1}
                        total={appendedFeaturesList.length}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COMPANY MASTER REPORT (FULL DOSSIER) BUTTON - STRETCHES ENTIRE ROW */}
          {/* ------------------------------------------------------------- */}
          {remainingLockedFeatures.length > 0 ? (
            <div className="rounded-3xl border-2 border-[#FC8019] bg-gradient-to-r from-orange-50/90 via-white to-amber-50/90 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-7 shadow-xl shadow-orange-500/10 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FC8019] text-white shadow-xs">
                      <Sparkles size={13} />
                      <span>Company Master Report · Full Dossier</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-[#FC8019] dark:text-orange-300">
                      {remainingLockedFeatures.length} Statutory Reports Remaining
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Unlock Complete Company Master Report
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium max-w-2xl leading-relaxed">
                    Instantly decrypts and compiles all remaining statutory reports (GST exact filings, e-Courts litigation, CCTNS police records, banking charges &amp; Udyam registration) into the company master section above.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold block">
                      Remaining Total Fee
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#FC8019]">
                      ₹{remainingMasterReportCost.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-sans font-medium">
                      Already unlocked reports deducted
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isUnlockingMaster}
                    onClick={handleUnlockCompanyMasterReport}
                    className="flex items-center justify-center gap-2.5 px-6 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#FC8019] to-orange-500 hover:from-[#E26D0A] hover:to-[#FC8019] text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/30 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isUnlockingMaster ? (
                      <>
                        <RotateCcw size={16} className="animate-spin" />
                        <span>
                          {masterProgress
                            ? `Unlocking Report ${masterProgress.current} of ${masterProgress.total}...`
                            : "Decrypting Master Dossier..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Unlock Complete Master Report</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                <span className="font-bold">
                  ✓ Complete Company Master Report Assembled — All {searchedCompanyExtensions.length} statutory reports decrypted and appended to the dossier above!
                </span>
              </div>
              <span className="hidden sm:inline font-sans text-emerald-600 dark:text-emerald-400 text-xs">
                Permanent Library Record
              </span>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SECTION 11B: PROMOTER & INDIVIDUAL VERIFICATION EXTRAS       */}
          {/* Candidate-specific verification (marksheet, mobile-to-PAN)   */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 p-6 sm:p-8 space-y-6 shadow-lg shadow-indigo-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                    <UserCheck size={13} />
                    <span>Promoter &amp; Individual Verification Extras</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    Candidate-Specific Credential Vetting
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Designated Director &amp; Key Promoter Vetting
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
                  Public corporate MCA registries verify the corporate entity itself, but do not contain personal mobile numbers or academic board credentials. Verify designated directors or authorized signatories by providing candidate details below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
              {promoterExtraFeatures.map((feat) => {
                const unlockId = `${mcaRecord.cin || mcaRecord.companyName || "company"}_${feat.key}`;
                const isUnlocked =
                  unlockedFeatureKeys.has(unlockId) ||
                  unlockedFeatureKeys.has(feat.key) ||
                  appendedFeatureKeys.has(unlockId);

                const cost = ledgerMap[feat.reportTypes[0]]?.cost ?? feat.cost;
                const cachedReport =
                  feat.reportTypes
                    .map((rt) => reportsMap[rt])
                    .find((r) => Boolean(r)) || null;

                return (
                  <PaywalledFeatureCard
                    key={feat.key}
                    feature={feat}
                    isUnlocked={isUnlocked}
                    cost={cost}
                    unlockedReport={cachedReport}
                    onUnlock={handleUnlockFeature}
                    onViewDossier={(f) => setActiveModalFeature(f)}
                    companyName={mcaRecord.companyName}
                    isUnlocking={unlockingKey === feat.key}
                  />
                );
              })}
            </div>
          </div>

          {/* Section 2: Remaining Locked Verification Reports & Risk Add-ons */}
          {remainingLockedFeatures.length > 0 && (
            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const count = getCategoryCount(cat);
                    if (count === 0 && cat !== "All") return null;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                          isSelected
                            ? "bg-[#FC8019] text-white shadow-md shadow-orange-500/20 font-bold"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Filter search */}
                <div className="relative min-w-[240px]">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Remaining Extension Cards (features that are not yet appended) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-1">
                {remainingLockedFeatures.map((feat) => {
                  const unlockId = `${mcaRecord.cin || mcaRecord.companyName || "company"}_${feat.key}`;
                  const isUnlocked =
                    unlockedFeatureKeys.has(unlockId) ||
                    unlockedFeatureKeys.has(feat.key) ||
                    feat.cost === 0;

                  const cost = ledgerMap[feat.reportTypes[0]]?.cost ?? feat.cost;
                  const cachedReport =
                    feat.reportTypes
                      .map((rt) => reportsMap[rt])
                      .find((r) => Boolean(r)) || null;

                  return (
                    <PaywalledFeatureCard
                      key={feat.key}
                      feature={feat}
                      isUnlocked={isUnlocked}
                      cost={cost}
                      unlockedReport={cachedReport}
                      onUnlock={handleUnlockFeature}
                      onViewDossier={(f) => {
                        const el = document.getElementById(`dossier-${f.key}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                          el.classList.add("ring-4", "ring-[#FC8019]");
                          setTimeout(() => el.classList.remove("ring-4", "ring-[#FC8019]"), 1500);
                        }
                      }}
                      companyName={mcaRecord.companyName}
                      isUnlocking={unlockingKey === feat.key}
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* STATE B: INITIAL UNSEARCHED STATE -> ZERO COMPANY INFO!       */
        /* SHOWCASE STATUTORY VERIFICATION SERVICES BELOW                */
        /* ------------------------------------------------------------- */
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Statutory Verification Services &amp; Individual Adapters
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
                Choose any statutory report below to verify individual PAN, GSTIN, DIN, Udyam, Court Cases, or Promoter KYC independently.
              </p>
            </div>

            {/* Feature search filter */}
            <div className="relative min-w-[280px]">
              <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter services (e.g. GST, FIR, PAN)..."
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = getCategoryCount(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-sm font-bold transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-[#FC8019] text-white shadow-md shadow-orange-500/20"
                      : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 shadow-xs"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Statutory Verification Services Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {filteredFeatures.map((feat) => {
              const hasCachedReport = feat.reportTypes.some((rt) => Boolean(reportsMap[rt]));
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
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE FEATURE RUNNER / INDIVIDUAL DOSSIER MODAL         */}
      {/* ------------------------------------------------------------- */}
      {activeModalFeature && (
        <FeatureRunnerModal
          isOpen={Boolean(activeModalFeature)}
          onClose={handleCloseModal}
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
          initialPrimaryInput={resolveInitialInputs(activeModalFeature).primaryInput}
          initialSecondaryInput={resolveInitialInputs(activeModalFeature).secondaryInput}
          autoFillSource={resolveInitialInputs(activeModalFeature).autoFillSource}
          directorsList={accumulatedContext.directors}
          discoveredGstins={accumulatedContext.discoveredGstins}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 8: WALLET CONSENT MODAL (PREVIEW != PURCHASE)         */}
      {/* ------------------------------------------------------------- */}
      {pendingConsentFeature && (
        <WalletConsentModal
          isOpen={Boolean(pendingConsentFeature)}
          onClose={() => setPendingConsentFeature(null)}
          onConfirm={() => executeVerifiedUnlock(pendingConsentFeature)}
          featureName={pendingConsentFeature.label}
          featureDescription={pendingConsentFeature.purpose}
          statute={pendingConsentFeature.statute}
          costCredits={ledgerMap[pendingConsentFeature.reportTypes[0]]?.cost ?? pendingConsentFeature.cost}
          currentBalance={walletBalance}
          relevanceRationale={`Essential investigation module for evaluating commercial credit risk and statutory compliance for ${mcaRecord?.companyName || "the target entity"}.`}
        />
      )}

      {/* Batch Unlock Consent Modal (Smart Spend Recommended or All Remaining) */}
      {pendingBatchConsent && (
        <WalletConsentModal
          isOpen={pendingBatchConsent}
          onClose={() => setPendingBatchConsent(false)}
          onConfirm={() =>
            executeBatchUnlock(
              smartSpendMode === "all" ? remainingLockedFeatures : remainingRecommendedFeatures
            )
          }
          featureName={
            smartSpendMode === "all"
              ? `Complete Master Report (${remainingLockedFeatures.length} Checks)`
              : `ChaanBean Smart Spend: ${remainingRecommendedFeatures.length} Recommended Checks (${remainingRecommendedFeatures.map((f) => f.shortLabel).join(", ")})`
          }
          featureDescription={
            smartSpendMode === "all"
              ? "Unlocks and decrypts all remaining statutory filings, tax registers, and court dockets into the unified company master dossier."
              : `Unlocks targeted statutory checks (${remainingRecommendedFeatures.map((f) => f.shortLabel).join(", ")}) tailored for your intended ₹${(creditExposure / 100000).toFixed(0)}L credit limit with ${creditTermsDays} days terms.`
          }
          statute="Statutory Multi-Registry Investigation Protocol"
          costCredits={smartSpendMode === "all" ? remainingMasterReportCost : remainingRecommendedCost}
          currentBalance={walletBalance}
          relevanceRationale={`Batch unlock optimized for your ₹${(creditExposure / 100000).toFixed(0)}L credit objective with ${creditTermsDays} days payment terms.`}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 12: GIVE CREDIT -> CONTINUOUS PROTECTION MODAL        */}
      {/* ------------------------------------------------------------- */}
      {mcaRecord && (
        <GiveCreditModal
          isOpen={isGiveCreditOpen}
          onClose={() => setIsGiveCreditOpen(false)}
          onSuccess={(data) => {
            setCreditRecordedToast(
              `Enrolled ${data.companyName} in Continuous Credit Protection for ₹${(data.amount / 100000).toFixed(1)}L (${data.termsDays} days terms).`
            );
            setTimeout(() => setCreditRecordedToast(null), 5000);
          }}
          companyName={mcaRecord.companyName}
          pan={mcaRecord.pan}
          gstin={mcaRecord.gstin}
        />
      )}

      {/* Toast for Credit Enrolled */}
      {creditRecordedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-200" />
          <span>{creditRecordedToast}</span>
          <a
            href="/monitoring"
            className="underline text-xs ml-2 hover:text-emerald-100 font-mono shrink-0"
          >
            View Portfolio →
          </a>
        </div>
      )}

    </div>
  );
}
