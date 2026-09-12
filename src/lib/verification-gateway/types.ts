export type ReportType =
  // 1. Director Details
  | "director_details"
  // 2. MSME Report
  | "msme_report"
  // 3. GST Slab
  | "gst_slab_check"
  // 4. GST Exact Turnover Filed
  | "gst_exact_turnover"
  // 5. GST Filing on Month Basis
  | "gst_monthly_filings"
  // 6. GST Supreme Report PAN Number for all Purchase and Sales
  | "gst_supreme_report"
  // 7. Trust Hub and Trust ID
  | "trust_hub_verification"
  // 8. Mobile to PAN
  | "mobile_to_pan"
  // 9. Mobile Identity For All Alternate Numbers
  | "mobile_identity"
  // 10. Court Case History & FIR Report
  | "court_case_history"
  | "fir_check"
  // 11. Import Export Report
  | "import_export_report"
  // 12. 10th and 12th Marksheets
  | "education_marksheet_check"
  // 13. PAN to GST Number
  | "pan_to_gst"
  // 14. Default Payments Voice Calls Cadence
  | "voice_call_cadence"
  // 15. Legal Notices - GST, MSME, Income Tax & Demand
  | "legal_notice_suite"
  // 16. Delayed Payments Follow Up
  | "delayed_payment_followup"
  // 17. User Access 5 per Subscription
  | "subscription_seats"
  // 18. Add Additional Company Name for 1500 Rupees
  | "additional_company_addon"
  // Underlying Supporting Modules
  | "bureau_report"
  | "payment_behaviour"
  | "find_someone"
  | "address_enrichment"
  | "company_supreme_report"
  | "mobile_to_address"
  | "pan_to_mobile_email";

export type SubjectType = "business" | "individual";

export interface NormalizedReport {
  reportType: ReportType;
  subjectType: SubjectType;
  subjectId: string;
  provider: string;
  status: "completed" | "pending" | "failed";
  fetchedAt: string;
  expiresAt: string;
  data: Record<string, unknown>;
  otpRequired?: boolean;
}

export interface VerificationRequest {
  subjectType: SubjectType;
  subjectId: string;
  reportTypes: ReportType[];
  requestedBy?: string;
  forceRefresh?: boolean;
}

export const REPORT_CACHE_TTL_HOURS: Record<ReportType, number> = {
  director_details: 720,
  msme_report: 720,
  gst_slab_check: 168,
  gst_exact_turnover: 720,
  gst_monthly_filings: 168,
  gst_supreme_report: 720,
  trust_hub_verification: 168,
  mobile_to_pan: 168,
  mobile_identity: 168,
  court_case_history: 720,
  fir_check: 720,
  import_export_report: 720,
  education_marksheet_check: 2160,
  pan_to_gst: 360,
  voice_call_cadence: 24,
  legal_notice_suite: 720,
  delayed_payment_followup: 72,
  subscription_seats: 720,
  additional_company_addon: 720,
  bureau_report: 720,
  payment_behaviour: 720,
  find_someone: 168,
  address_enrichment: 168,
  company_supreme_report: 720,
  mobile_to_address: 168,
  pan_to_mobile_email: 168,
};

export const REPORT_LABELS: Record<ReportType, string> = {
  director_details: "Director Details",
  msme_report: "MSME Report (Udyam)",
  gst_slab_check: "GST Slab Check",
  gst_exact_turnover: "GST Exact Turnover Filed",
  gst_monthly_filings: "GST Filing on Month Basis",
  gst_supreme_report: "GST Supreme Report (Purchase & Sales PANs)",
  trust_hub_verification: "Trust Hub & Trust ID Verification",
  mobile_to_pan: "Mobile to PAN",
  mobile_identity: "Mobile Identity (All Alternate Numbers)",
  court_case_history: "Court Case History – FIR Report",
  fir_check: "CCTNS Police FIR Check",
  import_export_report: "Import Export Report (DGFT)",
  education_marksheet_check: "10th and 12th Marksheets",
  pan_to_gst: "PAN to GST Number Directory",
  voice_call_cadence: "Default Payments Voice Calls (1m/2m/5m/30m/1h)",
  legal_notice_suite: "Legal Notices - GST, MSME, Income Tax & Demand",
  delayed_payment_followup: "Delayed Payments Follow-Up",
  subscription_seats: "User Access (5 per Subscription)",
  additional_company_addon: "Add Additional Company (₹1,500)",
  bureau_report: "Bureau Report (CIBIL / Experian / CRIF)",
  payment_behaviour: "Payment Behaviour Exchange",
  find_someone: "OmniTrace 360™ (Find Someone)",
  address_enrichment: "Address Enrichment",
  company_supreme_report: "Company Supreme Report",
  mobile_to_address: "Mobile to Address",
  pan_to_mobile_email: "PAN to Mobile & Email",
};

export const BUNDLE_REPORT_TYPES: ReportType[] = [
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
  "import_export_report",
  "education_marksheet_check",
  "pan_to_gst",
  "voice_call_cadence",
  "legal_notice_suite",
  "delayed_payment_followup",
  "subscription_seats",
  "additional_company_addon",
];
