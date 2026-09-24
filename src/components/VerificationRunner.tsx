"use client";

import React, { useState, useMemo, useEffect } from "react";
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
    key: "voice_call_cadence",
    num: 14,
    label: "Default Payments Voice Calls (1m, 2m, 5m, 30m, 1h)",
    shortLabel: "Voice Call Cadence",
    reportTypes: ["voice_call_cadence"],
    category: "Recovery & Governance",
    statute: "TRAI & Telephony Regulatory Framework · High Frequency Dialer",
    description: "Automated high-velocity debt recovery voice calls deployed at progressive cadences (every 1 min, 2 mins, 5 mins, 30 mins, and hourly).",
    purpose: "Automates persistent, high-frequency debt collection phone calls with neural speech synthesis across configurable intervals (1m, 2m, 5m, 30m, 1h) to break debtor avoidance and secure payment commitments.",
    useCase: "Apply relentless, compliant calling pressure on evasive debtors who ignore emails and WhatsApp reminders until payment is cleared.",
    capabilities: ["Configurable Dialing Cadences (1m–1h)", "Neural Speech Synthesis", "Automated Outbound PBX", "Promise-to-Pay Logging"],
    cost: 1,
    primaryInputLabel: "Target Debtor Mobile (+91)",
    primaryPlaceholder: "e.g. 9876543210",
    secondaryInputLabel: "Calling Cadence Frequency",
    secondaryPlaceholder: "Every 30 Mins",
    defaultId: "9876543210",
    defaultSecondary: "Every 30 Mins",
    subjectType: "individual",
    keywords: ["voice call", "cadence", "dialer", "telephony", "asterisk", "automated call", "1 min", "2 mins", "5 mins", "30 mins", "hourly", "phone call", "collection call", "debtor pressure", "promise to pay"],
    icon: PhoneCall,
  },
  {
    key: "legal_notice_suite",
    num: 15,
    label: "Legal Notices - GST, MSME, INCOME TAX, & Demand",
    shortLabel: "Legal Notices Suite",
    reportTypes: ["legal_notice_suite"],
    category: "Judicial & Legal",
    statute: "Income Tax §43B(h) · CGST §16(4)/DRC-01A · MSMED §18 · §138 NI Act",
    description: "4 official statutory legal notices with verified Government Reference Numbers reported to the Income Tax Department (§43B(h)), GST Portal (§16(4)), and MSME Council.",
    purpose: "Generates and dispatches formal statutory demand notices citing Section 43B(h) tax disallowances, GST DRC-01A ITC reversal warnings, MSMED Act 3x compound interest, and Section 138 NI Act court prosecution.",
    useCase: "Enforce statutory recovery leverage before filing court suits, creating immediate financial consequences for the debtor's tax filings and input credits.",
    capabilities: ["Income Tax §43B(h) Notice", "GST §16(4) / DRC-01A Warning", "MSMED Act §18 Demand", "Official Govt Reference Numbers"],
    cost: 1500,
    primaryInputLabel: "Target Debtor Name or GSTIN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Outstanding Invoice Amount (₹)",
    secondaryPlaceholder: "e.g. ₹5,40,000",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "₹5,40,000",
    subjectType: "business",
    keywords: ["legal notice", "demand notice", "statutory notice", "section 43b(h)", "income tax warning", "drc-01a", "msmed notice", "advocate notice", "overdue demand", "legal action", "recovery notice", "gst notice", "msme notice"],
    icon: FileWarning,
  },
  {
    key: "delayed_payment_followup",
    num: 16,
    label: "Delayed Payments Follow UP",
    shortLabel: "Delayed Payments Follow-Up",
    reportTypes: ["delayed_payment_followup"],
    category: "Recovery & Governance",
    statute: "Temporal Aging Protocols & Dispute Escalation Engine",
    description: "Multi-channel automated collections workflow tracking overdue aging buckets, assigned recovery officers, and automated promise-to-pay confirmations.",
    purpose: "Tracks overdue invoices across progressive aging buckets (1–15, 16–30, 31–45, 45+ days), orchestrating multi-channel WhatsApp, email, and voice outreach with assigned collection personnel.",
    useCase: "Maintain rigorous, systematic payment follow-ups from day 1 overdue to prevent accounts from deteriorating into write-offs or bad debt.",
    capabilities: ["Aging Bucket Classification", "Assigned Collector Routing", "Escalation Sequence Tracking", "Promise-to-Pay Management"],
    cost: 1,
    primaryInputLabel: "Debtor Name or GSTIN",
    primaryPlaceholder: "e.g. 27AAECG1234H1Z5",
    secondaryInputLabel: "Days Overdue Bracket",
    secondaryPlaceholder: "30+ Days",
    defaultId: "27AAECG1234H1Z5",
    defaultSecondary: "30+ Days",
    subjectType: "business",
    keywords: ["delayed payment", "follow up", "aging bucket", "overdue", "collections", "escalation", "promise to pay", "recovery officer", "whatsapp reminder", "payment tracking"],
    icon: Clock,
  },
  {
    key: "subscription_seats",
    num: 17,
    label: "User Access (5 per Subscription)",
    shortLabel: "User Access (5 Seats)",
    reportTypes: ["subscription_seats"],
    category: "Recovery & Governance",
    statute: "Enterprise Team Access & Role-Based Access Control (RBAC)",
    description: "Manage 5 fully included team seats per subscription with role-based permissions for Finance Controllers, Collection Leads, Legal Counsel, and Auditors.",
    purpose: "Configures and allocates 5 enterprise user seats included with every ChaanBean subscription, enabling collaborative credit evaluation and recovery management without per-seat add-on fees.",
    useCase: "Equip your entire credit, recovery, finance, and legal team with dedicated logins, customized permission tiers, and audit-logged actions.",
    capabilities: ["5 Included Team Seats", "Role-Based Access Control", "Seat Allocation & Invites", "Audit Logging"],
    cost: 0,
    primaryInputLabel: "Organization ID or Domain",
    primaryPlaceholder: "e.g. ACME-CORP or acme.in",
    secondaryInputLabel: "Seat Allocation Role",
    secondaryPlaceholder: "Finance Controller",
    defaultId: "ACME-CORP",
    defaultSecondary: "Finance Controller",
    subjectType: "business",
    keywords: ["user access", "5 seats", "subscription", "team members", "roles", "permissions", "finance controller", "collections lead", "legal counsel", "multi user", "rbac", "team seats"],
    icon: Users,
  },
  {
    key: "additional_company_addon",
    num: 18,
    label: "Add Additional Company Name for ₹1,500",
    shortLabel: "Add Company (₹1,500)",
    reportTypes: ["additional_company_addon"],
    category: "Recovery & Governance",
    statute: "Multi-Entity Group Governance & Cross-Company Ledger",
    description: "Register and monitor additional sister companies, subsidiaries, or branch entities under one master subscription for a flat ₹1,500 one-time fee.",
    purpose: "Allows corporate groups and holding companies to add and manage additional company profiles, GSTINs, and debtor books within the same ChaanBean account for ₹1,500.",
    useCase: "Consolidate credit risk monitoring, background underwriting, and payment recovery across multiple sister concerns or subsidiary firms seamlessly.",
    capabilities: ["Sister Concern Linkage", "Multi-Entity Consolidated Ledger", "Instant GSTIN Registration", "Cross-Entity Credit Limits"],
    cost: 1500,
    primaryInputLabel: "Additional Company Name or GSTIN",
    primaryPlaceholder: "e.g. Acme Polymers Manufacturing Pvt Ltd",
    secondaryInputLabel: "State / Jurisdiction",
    secondaryPlaceholder: "e.g. Maharashtra",
    defaultId: "Acme Logistics & Supply Chain LLP",
    defaultSecondary: "Maharashtra",
    subjectType: "business",
    keywords: ["additional company", "1500 rupees", "company name", "sister concern", "subsidiary", "multi-entity", "add company", "group companies", "holding company", "corporate ledger"],
    icon: Building2,
  },
];

export const ALL_AI_CREDIT_FEATURES = ALL_18_FEATURES;

const DEFAULT_ACME_RECORD: McaRecord = {
  cin: "U74999MH2019PTC328491",
  companyName: "Acme Traders Private Limited",
  roc: "ROC Mumbai",
  companyCategory: "Company limited by Shares",
  companySubCategory: "Non-govt company",
  companyClass: "Private Limited",
  authorizedCapital: 5000000,
  paidUpCapital: 2500000,
  incorporationDate: "2019-06-18",
  registeredAddress: "Plot No. 42, MIDC Industrial Area, Andheri East, Mumbai 400093, Maharashtra, India",
  listingStatus: "Unlisted",
  status: "Active",
  stateCode: "27",
  country: "India",
  nicCode: "74999",
  industrialClassification: "Trade, Commerce & Engineering Services",
  directors: [
    {
      din: "07044465",
      name: "Rajesh Sharma",
      designation: "Managing Director",
      status: "active",
      appointmentDate: "2019-06-18",
      dir3KycStatus: "DIR-3 KYC Compliant (FY 2024-25)",
      section164Disqualification: "Clear (§164(2) Compliant)",
      mcaSignatory: true,
    },
    {
      din: "08192847",
      name: "Vikram Mehta",
      designation: "Director",
      status: "active",
      appointmentDate: "2019-06-18",
      dir3KycStatus: "DIR-3 KYC Compliant (FY 2024-25)",
      section164Disqualification: "Clear (§164(2) Compliant)",
      mcaSignatory: true,
    },
  ],
  gstin: "27AAECG1234H1Z5",
  pan: "AAECG1234H",
};

export function VerificationRunner({
  companyId,
  ledgerMap,
  sampleEntities = [],
}: VerificationRunnerProps) {
  // Navigation Modes: "company_mca" (Default) | "blocks" | "bundle" | "library"
  const [viewMode, setViewMode] = useState<"company_mca" | "blocks" | "bundle" | "library">("company_mca");
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportsMap, setReportsMap] = useState<Partial<Record<ReportType, NormalizedReport>>>({});

  // Centered MCA Company Search State
  const [searchCompanyName, setSearchCompanyName] = useState("Acme Traders Pvt Ltd");
  const [searchLocation, setSearchLocation] = useState("Maharashtra");
  const [isSearchingMca, setIsSearchingMca] = useState(false);
  const [mcaRecord, setMcaRecord] = useState<McaRecord | null>(DEFAULT_ACME_RECORD);
  const [mcaSource, setMcaSource] = useState<string>("Ministry of Corporate Affairs (data.gov.in MCA21 Gateway)");
  const [mcaError, setMcaError] = useState<string | null>(null);

  // Paywalled Unlocked Features State (Persisted in state & localStorage)
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

  // Bundle Fan-Out Tab State
  const [bundleSubjectId, setBundleSubjectId] = useState("27AAECG1234H1Z5");
  const [bundleSubjectType, setBundleSubjectType] = useState<SubjectType>("business");
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleProgress, setBundleProgress] = useState<string | null>(null);

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

  // Execute MCA Master Search
  const executeMcaSearch = async (targetName?: string, targetLoc?: string) => {
    const qName = (targetName !== undefined ? targetName : searchCompanyName).trim();
    const qLoc = (targetLoc !== undefined ? targetLoc : searchLocation).trim();

    if (!qName) {
      setMcaError("Please enter a company or business name to search.");
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

      const res = await fetch(`/api/mca?${params.toString()}`);
      const data = await res.json();

      if (data.records && data.records.length > 0) {
        setMcaRecord(data.records[0]);
        setMcaSource(data.source || "Ministry of Corporate Affairs (data.gov.in MCA21 Gateway)");
      } else {
        setMcaError(`No official MCA records found matching "${qName}". Showing synthesized statutory registry dossier.`);
      }
    } catch {
      setMcaError("Network error querying Ministry of Corporate Affairs gateway. Using offline corporate knowledge.");
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

  // Intelligent Search and Category Filtering for paid features
  const filteredFeatures = useMemo(() => {
    return ALL_18_FEATURES.filter((feat) => {
      // 1. Category check
      if (selectedCategory !== "All" && feat.category !== selectedCategory) {
        return false;
      }

      // 2. Search check
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

  const categories: FeatureCategory[] = [
    "All",
    "Corporate & Identity",
    "Tax & GST",
    "Judicial & Legal",
    "Recovery & Governance",
  ];

  const getCategoryCount = (cat: FeatureCategory) => {
    if (cat === "All") return ALL_18_FEATURES.length;
    return ALL_18_FEATURES.filter((f) => f.category === cat).length;
  };

  const generatedCount = Object.keys(reportsMap).length;

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------- */}
      {/* TOP VIEW MODE SELECTOR & WALLET STATUS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setViewMode("company_mca")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              viewMode === "company_mca"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 size={14} className="text-[#FC8019]" />
            <span>Company MCA Search &amp; Paid Unlocks</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("blocks")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              viewMode === "blocks"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers size={14} className="text-[#FC8019]" />
            <span>All 18 Feature Blocks</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("bundle")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              viewMode === "bundle"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap size={14} className="text-[#FC8019]" />
            <span>360° Parallel Bundle</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("library")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              viewMode === "library"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            <FileText size={14} />
            <span>Report Library</span>
          </button>
        </div>

        {/* Enterprise Wallet Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-xs font-mono font-bold text-[#FC8019]">
          <Coins size={14} />
          <span>Wallet Balance: ₹{walletBalance.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Global Wallet Action Notification Toast */}
      {walletNotification && (
        <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{walletNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setWalletNotification(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white font-bold"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 1: PROMINENT CENTER MCA SEARCH + MASTER DATA + PAYWALLED UNLOCKS */}
      {/* ------------------------------------------------------------- */}
      {viewMode === "company_mca" && (
        <div className="space-y-8">
          {/* 1. BIG PROMINENT SEARCH BAR IN THE MIDDLE */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-lg text-center space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-orange-50 dark:bg-orange-500/10 text-[#FC8019] border border-orange-200 dark:border-orange-500/30">
                <Sparkles size={13} />
                <span>Ministry of Corporate Affairs · MCA21 Real-Time Registry</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Search Company &amp; Verify MCA Corporate Master Data
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Enter any registered company or LLP name and location to retrieve live corporate master filings, verified Board of Directors, and unlock deep statutory underwriting reports.
              </p>
            </div>

            {/* Prominent Search Inputs Container */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeMcaSearch();
              }}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2"
            >
              {/* Input 1: Company Name (Primary) */}
              <div className="md:col-span-7 relative">
                <Building2
                  size={18}
                  className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500"
                />
                <input
                  type="text"
                  value={searchCompanyName}
                  onChange={(e) => setSearchCompanyName(e.target.value)}
                  placeholder="Enter Company or LLP Name (e.g. Acme Traders, Tata Motors)..."
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FC8019] focus:bg-white dark:focus:bg-slate-900 transition shadow-xs"
                />
              </div>

              {/* Input 2: Location (Optional) */}
              <div className="md:col-span-3 relative">
                <Filter
                  size={16}
                  className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500"
                />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Location / State (e.g. Mumbai)..."
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FC8019] focus:bg-white dark:focus:bg-slate-900 transition shadow-xs"
                />
              </div>

              {/* CTA Search Button */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isSearchingMca || !searchCompanyName.trim()}
                  className="w-full h-full min-h-[46px] flex items-center justify-center gap-2 rounded-2xl bg-[#FC8019] hover:bg-[#E26D0A] text-white text-xs sm:text-sm font-bold transition shadow-md shadow-orange-500/25 disabled:opacity-50"
                >
                  {isSearchingMca ? (
                    <>
                      <RotateCcw size={16} className="animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      <span>Search MCA</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Suggestion Chips */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Quick Test Entities:</span>
              {[
                { name: "Titan Winners Fund Management LLP", loc: "Haryana" },
                { name: "Acme Traders Pvt Ltd", loc: "Maharashtra" },
                { name: "Tata Motors Limited", loc: "Mumbai" },
                { name: "Reliance Retail Limited", loc: "Mumbai" },
                { name: "Infosys Limited", loc: "Karnataka" },
                { name: "Maharashtra Seamless", loc: "Maharashtra" },
                { name: "Khedut Agro Tech", loc: "Gujarat" },
              ].map((chip) => (
                <button
                  key={chip.name}
                  type="button"
                  onClick={() => {
                    setSearchCompanyName(chip.name);
                    setSearchLocation(chip.loc);
                    executeMcaSearch(chip.name, chip.loc);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition border ${
                    searchCompanyName === chip.name
                      ? "bg-orange-50 dark:bg-orange-500/20 text-[#FC8019] border-orange-300 dark:border-orange-500 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:text-[#FC8019]"
                  }`}
                >
                  {chip.name}
                </button>
              ))}
            </div>

            {mcaError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs font-medium text-amber-800 dark:text-amber-300 text-left flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>{mcaError}</span>
              </div>
            )}
          </div>

          {/* 2. OFFICIAL MCA21 CORPORATE MASTER DATA CARD */}
          {isSearchingMca ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4 shadow-sm animate-pulse">
              <RotateCcw size={32} className="mx-auto text-[#FC8019] animate-spin" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Querying Ministry of Corporate Affairs Gateway...
                </h3>
                <p className="text-xs text-slate-500">
                  Retrieving official RoC master records, corporate registration, and Board of Directors.
                </p>
              </div>
            </div>
          ) : mcaRecord ? (
            <McaMasterDataCard
              record={mcaRecord}
              source={mcaSource}
              onSelectDirectorDin={(din) => {
                const feat = ALL_18_FEATURES.find((f) => f.key === "director_details");
                if (feat) setActiveModalFeature(feat);
              }}
            />
          ) : null}

          {/* 3. OPTIONS FOR UNLOCKING OTHER FEATURES (PAYWALLED FEATURE GRID) */}
          {mcaRecord && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Coins className="text-[#FC8019]" size={22} />
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Unlock Statutory Intelligence &amp; Deep Underwriting Dossiers
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                    All preliminary MCA master data is displayed above for <strong>{mcaRecord.companyName}</strong>. Unlock real-time GST filings, exact filed turnover, e-Courts litigation, MSME status, and legal notices below. Reports are paid on-demand from your enterprise wallet.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 font-bold shrink-0">
                    Wallet: ₹{walletBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Search for the 18 Features */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const count = getCategoryCount(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          isSelected
                            ? "bg-orange-50 dark:bg-orange-500/20 text-[#FC8019] border border-orange-200 dark:border-orange-500/40 font-bold shadow-xs"
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

                {/* Keyword Search Filter for Features */}
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search features (e.g. turnover, slab)..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Paywalled Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
                {filteredFeatures.map((feat) => {
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
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 2: ALL 18 INDIVIDUAL FEATURE BLOCKS VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === "blocks" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by feature name, purpose, statute or use-case..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-chaan-brand shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>Showing <strong>{filteredFeatures.length}</strong> of {ALL_18_FEATURES.length} features</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedCategory === cat
                      ? "bg-orange-50 dark:bg-orange-500/20 text-[#FC8019] border border-orange-200 dark:border-orange-500/40 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200 dark:bg-slate-700">
                    {getCategoryCount(cat)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
      {/* MODE 3: 360° PARALLEL MULTI-ADAPTER FAN-OUT BUNDLE */}
      {/* ------------------------------------------------------------- */}
      {viewMode === "bundle" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-xs">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="text-chaan-brand" size={22} />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Parallel Multi-Adapter Fan-Out Execution
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                Executes foundational statutory verification adapters simultaneously under a single unified parallel fan-out call.
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
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setBundleSubjectType("business");
                      setBundleSubjectId("27AAECG1234H1Z5");
                    }}
                    className={`rounded py-1 text-xs font-semibold transition ${
                      bundleSubjectType === "business"
                        ? "bg-chaan-brand text-white shadow-xs"
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
                        ? "bg-chaan-brand text-white shadow-xs"
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
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-mono text-slate-900 dark:text-white uppercase tracking-wider outline-none focus:border-chaan-brand shadow-xs"
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

            {bundleProgress && (
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/40 p-3 text-xs font-mono border border-orange-200 dark:border-orange-800 text-[#FC8019] flex items-center gap-2">
                <Sparkles size={14} className="text-chaan-brand" />
                <span>{bundleProgress}</span>
              </div>
            )}
          </div>

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
      {/* MODE 4: PERMANENT REPORT LIBRARY VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === "library" && (
        <ReportLibraryView
          onSelectFeatureTab={(k) => {
            const found = ALL_18_FEATURES.find((f) => f.key === k);
            if (found) {
              setActiveModalFeature(found);
            }
            setViewMode("company_mca");
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

