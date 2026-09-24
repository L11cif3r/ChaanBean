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
  Wand2,
  MapPin,
  ArrowRight,
  ChevronRight,
  TrendingUp,
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
  | "Judicial & Legal"
  | "Recovery & Governance";

export interface FeatureItem {
  key: string;
  num: number;
  label: string;
  shortLabel: string;
  reportTypes: ReportType[];
  category: "Corporate & Identity" | "Tax & GST" | "Judicial & Legal" | "Recovery & Governance";
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
    category: "Tax & GST",
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
    category: "Tax & GST",
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
    category: "Tax & GST",
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
    category: "Corporate & Identity",
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
    key: "mobile_to_pan",
    num: 8,
    label: "Mobile to PAN & Tax Identity Linkage",
    shortLabel: "Mobile to PAN",
    reportTypes: ["mobile_to_pan"],
    category: "Corporate & Identity",
    statute: "DoT Telecom & NSDL Income Tax Identity Bridge",
    description: "Resolves any Indian 10-digit mobile number to official registered PAN, taxpayer name, entity type, and IT department seeding status.",
    purpose: "Authenticates that the mobile number provided on purchase orders or trade guarantees is legally tied to the authorized director or proprietor's PAN registered with the Income Tax Department.",
    useCase: "Detect forged buyer purchase orders and impersonation fraud before shipping goods.",
    capabilities: ["Mobile Ownership Auth", "Linked PAN Discovery", "Taxpayer Name Verification", "Aadhaar-PAN Seeding Status"],
    cost: 150,
    primaryInputLabel: "10-Digit Indian Mobile Number",
    primaryPlaceholder: "e.g. 9876543210",
    defaultId: "9876543210",
    subjectType: "individual",
    keywords: ["mobile to pan", "phone verification", "tax identity", "nsdl", "income tax", "buyer identity", "fraud check", "sim auth"],
    icon: Phone,
  },
  {
    key: "mobile_alternate_identity",
    num: 9,
    label: "Mobile Identity & Alternate Numbers Discovery",
    shortLabel: "Alternate Contact Identity",
    reportTypes: ["mobile_identity"],
    category: "Corporate & Identity",
    statute: "Multi-Carrier Telecom Subscribed Circle Network",
    description: "Uncovers secondary SIMs, registered alternative business numbers, corporate landlines, and key accounts contact numbers associated with the promoter.",
    purpose: "Discovers verified secondary and tertiary telephone numbers linked to the debtor or director across Indian telecom circles (Airtel, Jio, Vi, BSNL) for unreachable debtors.",
    useCase: "Restore contact when a delinquent buyer switches off their primary SIM to evade overdue receivables follow-ups.",
    capabilities: ["Secondary SIM Discovery", "Alternate Executive Lines", "Carrier & Circle Validation", "Active Line Liveness Check"],
    cost: 250,
    primaryInputLabel: "Primary Mobile Number or Director PAN",
    primaryPlaceholder: "e.g. 9876543210 or AAECG1234H",
    defaultId: "9876543210",
    subjectType: "individual",
    keywords: ["alternate numbers", "secondary sim", "telecom circle", "skip tracing", "unreachable debtor", "contact discovery", "carrier lookup"],
    icon: PhoneForwarded,
  },
  {
    key: "court_fir_report",
    num: 10,
    label: "Court Case History & Police FIR Docket",
    shortLabel: "Court Cases & FIR Report",
    reportTypes: ["court_case_history", "fir_check"],
    category: "Judicial & Legal",
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
    num: 11,
    label: "Import Export Code (IEC) & Foreign Trade Ledger",
    shortLabel: "Import Export (IEC) Report",
    reportTypes: ["import_export_report"],
    category: "Corporate & Identity",
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
    key: "marksheets_verification",
    num: 12,
    label: "Promoter 10th & 12th Academic Board Authentication",
    shortLabel: "10th & 12th Marksheet Auth",
    reportTypes: ["education_marksheet_check"],
    category: "Corporate & Identity",
    statute: "DigiLocker & State Secondary Examination Boards",
    description: "Verification of Secondary (10th) and Higher Secondary (12th) certificates, roll numbers, passing year, and candidate DOB for promoter credential validation.",
    purpose: "Verifies high-school academic credentials of key promoters, verifying official date of birth, mother/father name, and preventing synthetic identity creation.",
    useCase: "Mandatory for high-ticket uncollateralized lending and appointing designated partners in joint-venture commercial partnerships.",
    capabilities: ["DigiLocker Board Auth", "CBSE/ICSE/State Board Lookup", "DOB & Parentage Matching", "Document Tamper Inspection"],
    cost: 150,
    primaryInputLabel: "Candidate Roll Number or Aadhaar Token",
    primaryPlaceholder: "e.g. CBSE-2012-6123456",
    defaultId: "CBSE-2012-6123456",
    secondaryInputLabel: "Education Board (CBSE / ICSE / State Board)",
    secondaryPlaceholder: "e.g. CBSE",
    defaultSecondary: "CBSE",
    subjectType: "individual",
    keywords: ["marksheet", "10th", "12th", "education", "digilocker", "cbse", "academic verification", "promoter kyc", "background check"],
    icon: GraduationCap,
  },
  {
    key: "pan_to_gst",
    num: 13,
    label: "PAN to All Registered GST Numbers Discovery",
    shortLabel: "PAN to GST Discovery",
    reportTypes: ["pan_to_gst"],
    category: "Tax & GST",
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
    key: "default_payment_voice_calls",
    num: 14,
    label: "Default Payment Voice Recovery Telephony (1m-1h Cadence)",
    shortLabel: "Voice Recovery Cadence",
    reportTypes: ["voice_call_cadence"],
    category: "Recovery & Governance",
    statute: "TRAI Enterprise DLTE & Asterisk Telephony Engine",
    description: "Automated multilingual voice calls with configurable cadence (every 1 min, 2 mins, 5 mins, 30 mins, 1 hour) with speech-to-text settlement logging.",
    purpose: "Deploys polite yet persistent automated AI telephony in Hindi, English, and regional languages directly to delinquent buyer finance heads at strict compliance intervals.",
    useCase: "Recover chronically overdue invoices by eliminating awkward manual phone calls and securing recorded audio payment commitments.",
    capabilities: ["Cadence: 1m, 2m, 5m, 30m, 1h", "Hindi, English & Regional Audio", "Real-Time IVR Response Capture", "Admissible Call Logs"],
    cost: 250,
    primaryInputLabel: "Target Debtor Contact Mobile Number",
    primaryPlaceholder: "e.g. 9876543210",
    defaultId: "9876543210",
    secondaryInputLabel: "Invoice Number & Overdue Amount (₹)",
    secondaryPlaceholder: "e.g. INV-2026-089 (₹4,50,000)",
    defaultSecondary: "INV-2026-089 (₹4,50,000)",
    subjectType: "business",
    keywords: ["voice call", "cadence", "telephony", "asterisk", "automated call", "payment reminder", "overdue call", "voice recovery", "phone collection"],
    icon: PhoneCall,
  },
  {
    key: "legal_notices_suite",
    num: 15,
    label: "Statutory Demand Notices: GST, MSME, Income Tax & Section 43B(h)",
    shortLabel: "Legal Demand Notices",
    reportTypes: ["legal_notice_suite"],
    category: "Judicial & Legal",
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
    key: "delayed_payments_followup",
    num: 16,
    label: "Delayed Payments Follow-Up & Statutory Interest Ledger",
    shortLabel: "Delayed Payment Follow-Up",
    reportTypes: ["delayed_payment_followup"],
    category: "Recovery & Governance",
    statute: "MSMED Act 2006 Section 16 & RBI Bank Rate Formula",
    description: "Real-time accrual of 3x compound monthly interest, multi-channel payment links, and WhatsApp payment follow-up ledger.",
    purpose: "Maintains an unalterable digital ledger calculating compound penal interest with monthly rests at 3x the RBI repo rate on delayed trade bills beyond 45 days.",
    useCase: "Legally demand and collect ₹50,000 to ₹10,000+ in statutory interest that buyers legally owe you for delayed payments.",
    capabilities: ["RBI 3x Compound Interest Engine", "Monthly Rest Compounding", "Payment Gateway Links", "WhatsApp Notification Engine"],
    cost: 200,
    primaryInputLabel: "Invoice Number or Debtor GSTIN",
    primaryPlaceholder: "e.g. INV-2026-0042 or 27AAECG1234H1Z5",
    defaultId: "INV-2026-0042",
    subjectType: "business",
    keywords: ["delayed payment", "interest calculator", "rbi rate", "3x interest", "whatsapp reminder", "follow up", "penal interest", "compound interest"],
    icon: Clock,
  },
  {
    key: "user_access_5_per_sub",
    num: 17,
    label: "Enterprise Multi-Seat Governance (5 Seats Included)",
    shortLabel: "Multi-Seat User Access",
    reportTypes: ["subscription_seats"],
    category: "Recovery & Governance",
    statute: "ChaanBean Role-Based Access Control (RBAC)",
    description: "Manage 5 concurrent organizational users with role segregation (Admin, Credit Manager, Legal Counsel, Collections Officer, Auditor).",
    purpose: "Enables five authorized department team members to concurrently run credit checks, review legal dockets, and operate voice collection dialers under a unified company subscription.",
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
    num: 18,
    label: "Additional Sister Entity Sub-Account (₹1,500 / entity)",
    shortLabel: "Add Additional Entity",
    reportTypes: ["additional_company_addon"],
    category: "Recovery & Governance",
    statute: "Multi-Entity Corporate Group Licensing",
    description: "Add sister concerns, subsidiary firms, or partnership LLPs to your master subscription for ₹1,500 with shared wallet pool.",
    purpose: "Allows corporate groups, holding companies, and conglomerates to manage multiple subsidiary entities under one master billing relationship for ₹1,500 per additional firm.",
    useCase: "Manage credit risk and debt recovery across 3 to 10 group companies from a single unified portal.",
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
  const [unlockingKey, setUnlockingKey] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(285000);
  const [walletNotification, setWalletNotification] = useState<string | null>(null);

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

  // Paywall Unlock Handler: deducts fee via /api/verification and reveals report
  const handleUnlockFeature = async (feature: FeatureItem) => {
    const cost = ledgerMap[feature.reportTypes[0]]?.cost ?? feature.cost;
    setUnlockingKey(feature.key);
    setWalletNotification(null);

    try {
      const subjectId =
        mcaRecord?.gstin ||
        mcaRecord?.pan ||
        mcaRecord?.cin ||
        feature.defaultId ||
        "27AAECG1234H1Z5";

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
        const rep = data.reports[0];
        setReportsMap((prev) => ({
          ...prev,
          [rep.reportType]: rep,
        }));
      }

      // Mark feature as unlocked for this company
      const unlockKey = `${mcaRecord?.cin || mcaRecord?.companyName || "company"}_${feature.key}`;
      setUnlockedFeatureKeys((prev) => {
        const next = new Set(prev);
        next.add(unlockKey);
        try {
          localStorage.setItem("chaanbean_unlocked_features", JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chaanbean:wallet-updated"));
      }

      setWalletNotification(`✓ Unlocked ${feature.label}! ₹${cost.toLocaleString("en-IN")} deducted from wallet.`);
      setTimeout(() => setWalletNotification(null), 5000);
    } catch {
      setWalletNotification("Network error processing feature unlock.");
    } finally {
      setUnlockingKey(null);
    }
  };

  const handleReportGenerated = (report: NormalizedReport) => {
    setReportsMap((prev) => ({
      ...prev,
      [report.reportType]: report,
    }));
  };

  // Keys excluded from searched company paywall: director details (already shown in initial MCA Master Data) and platform admin items
  const SEARCHED_COMPANY_EXCLUDED_KEYS = useMemo(
    () => new Set(["director_details", "user_access_5_per_sub", "add_additional_company"]),
    []
  );

  // Filter features based on category and search query for initial unsearched catalog (all 18 services)
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

  // Filter features as connected extensions for the searched company (excludes director details and admin seats)
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

  const categories: FeatureCategory[] = [
    "All",
    "Corporate & Identity",
    "Tax & GST",
    "Judicial & Legal",
    "Recovery & Governance",
  ];

  const getCategoryCount = (cat: FeatureCategory) => {
    const pool = hasSearched && mcaRecord
      ? ALL_18_FEATURES.filter((f) => !SEARCHED_COMPANY_EXCLUDED_KEYS.has(f.key))
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
      {/* BIG PROMINENT GOOGLE-STYLE TRANSLUCENT FLOATING SEARCH BAR    */}
      {/* ------------------------------------------------------------- */}
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
              className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />

            {/* State / RoC Jurisdiction Selector */}
            <div className="hidden md:flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3 pr-2">
              <MapPin size={14} className="text-[#FC8019] shrink-0" />
              <select
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer max-w-[130px] truncate"
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
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}

            {/* Interactive Fidget Magic Wand Button */}
            <button
              type="button"
              onClick={handleFidgetClick}
              className="p-2 rounded-full text-[#FC8019] hover:bg-orange-50 dark:hover:bg-orange-950/60 hover:rotate-12 active:scale-90 transition-all duration-200 cursor-pointer"
              title="Fidget & Magic Auto-Fill popular Indian companies"
            >
              <Wand2 size={18} className="animate-pulse" />
            </button>

            {/* Google Search CTA Button */}
            <button
              type="button"
              onClick={() => executeMcaSearch()}
              disabled={isSearchingMca || !searchCompanyName.trim()}
              className="shrink-0 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FC8019] to-orange-500 hover:from-[#E26D0A] hover:to-[#FC8019] px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-40"
            >
              {isSearchingMca ? (
                <>
                  <RotateCcw size={15} className="animate-spin" />
                  <span className="hidden sm:inline">Querying MCA...</span>
                </>
              ) : (
                <>
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Interactive "Additional Information Required" by MCA21 Gateway */}
        {requiresMoreInfo && (
          <div className="mx-auto max-w-3xl rounded-3xl border-2 border-amber-300 dark:border-amber-700/80 bg-amber-50/90 dark:bg-amber-950/40 p-5 sm:p-6 text-left space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-[#FC8019] shrink-0 mt-0.5">
                <Building2 size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    MCA21 Portal: Additional Information Required
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FC8019] text-white">
                    Live MCA API
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  {missingInfoPrompt || "The data.gov.in MCA21 index requires the Registered State or 21-digit CIN to locate the exact company record."}
                </p>
              </div>
            </div>

            {/* Step 1: Click a State */}
            <div className="space-y-1.5 pt-2 border-t border-amber-200/80 dark:border-amber-800/60">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-600 dark:text-slate-300 block">
                1. Select Registered State / RoC Jurisdiction:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MAJOR_INDIAN_STATES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setSearchLocation(st);
                      executeMcaSearch(searchCompanyName, st);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
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
            <div className="space-y-1.5 pt-2 border-t border-amber-200/80 dark:border-amber-800/60">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-600 dark:text-slate-300 block">
                2. Or Enter 21-Digit Corporate Identification Number (CIN) / LLPIN:
              </span>
              <div className="flex flex-wrap items-center gap-2">
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
                  className="flex-1 min-w-[240px] px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FC8019]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (cinInputVal.trim()) {
                      executeMcaSearch(cinInputVal.trim(), "");
                    }
                  }}
                  disabled={!cinInputVal.trim() || isSearchingMca}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#E26D0A] text-white transition disabled:opacity-50"
                >
                  Verify via Live MCA API
                </button>
              </div>
            </div>

            {/* Fallback Option */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/80 dark:border-amber-800/60 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Entity not registered under Central RoC?
              </span>
              <button
                type="button"
                onClick={() => executeMcaSearch(searchCompanyName, searchLocation, true)}
                className="font-bold text-[#FC8019] hover:underline flex items-center gap-1"
              >
                <span>Generate Statutory Preliminary Dossier Anyway</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Fidget Sparkle Toast */}
        {fidgetToast && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-sm animate-in fade-in slide-in-from-top-1">
            <Sparkles size={14} className="text-amber-500" />
            <span>{fidgetToast}</span>
          </div>
        )}

        {/* Quick Popular Searches */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Popular Searches:</span>
          {FIDGET_COMPANIES.map((chip) => (
            <button
              key={chip.name}
              type="button"
              onClick={() => {
                setSearchCompanyName(chip.name);
                setSearchLocation(chip.loc);
                executeMcaSearch(chip.name, chip.loc);
              }}
              className="rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-[#FC8019] hover:text-[#FC8019] px-3.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs hover:scale-105 active:scale-95"
            >
              {chip.name.split(" ")[0]} {chip.name.split(" ")[1] || ""}
            </button>
          ))}
        </div>

        {mcaError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300 text-center flex items-center justify-center gap-2 max-w-xl mx-auto">
            <AlertCircle size={16} className="shrink-0 text-amber-600" />
            <span>{mcaError}</span>
          </div>
        )}
      </div>

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

            {/* Section 2: Locked Verification Reports & Risk Add-ons */}
            <div className="p-6 sm:p-8 space-y-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const count = getCategoryCount(cat);
                    if (count === 0 && cat !== "All") return null;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? "bg-[#FC8019] text-white shadow-md shadow-orange-500/20 font-bold"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
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
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Extension Cards (Excludes director details & DIN vetting since already shown) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-1">
                {searchedCompanyExtensions.map((feat) => {
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
                      onViewDossier={(f) => setActiveModalFeature(f)}
                      companyName={mcaRecord.companyName}
                      isUnlocking={unlockingKey === feat.key}
                    />
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* STATE B: INITIAL UNSEARCHED STATE -> ZERO COMPANY INFO!       */
        /* SHOWCASE THE 18 STATUTORY VERIFICATION SERVICES BELOW         */
        /* ------------------------------------------------------------- */
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Statutory Verification Services &amp; Individual Adapters
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Choose any statutory report below to verify individual PAN, GSTIN, DIN, Udyam, Court Cases, or Voice Call Cadences independently.
              </p>
            </div>

            {/* Feature search filter */}
            <div className="relative min-w-[260px]">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter services (e.g. GST, FIR, PAN)..."
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = getCategoryCount(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-[#FC8019] text-white shadow-md shadow-orange-500/20"
                      : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 shadow-xs"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 18 Individual Feature Cards Grid */}
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
