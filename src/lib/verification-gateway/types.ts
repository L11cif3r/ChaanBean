export type ReportType =
  | "director_details"
  | "gst_slab_check"
  | "gst_exact_turnover"
  | "gst_supreme_report"
  | "bureau_report"
  | "mobile_to_pan"
  | "mobile_identity"
  | "mobile_to_address"
  | "court_case_history"
  | "import_export_report"
  | "fir_check"
  | "address_enrichment"
  | "company_supreme_report"
  | "msme_report"
  | "pan_to_mobile_email"
  | "payment_behaviour"
  | "find_someone";

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
  gst_slab_check: 168,
  gst_exact_turnover: 720,
  gst_supreme_report: 720,
  bureau_report: 720,
  mobile_to_pan: 168,
  mobile_identity: 168,
  mobile_to_address: 168,
  court_case_history: 720,
  import_export_report: 720,
  fir_check: 720,
  address_enrichment: 168,
  company_supreme_report: 720,
  msme_report: 720,
  pan_to_mobile_email: 168,
  payment_behaviour: 720,
  find_someone: 168,
};

export const REPORT_LABELS: Record<ReportType, string> = {
  director_details: "Director Details",
  gst_slab_check: "GST Slab Check",
  gst_exact_turnover: "GST Exact Turnover",
  gst_supreme_report: "GST Supreme Report",
  bureau_report: "Bureau Report (CIBIL/Experian/CRIF)",
  mobile_to_pan: "Mobile to PAN",
  mobile_identity: "Mobile Identity",
  mobile_to_address: "Mobile to Address",
  court_case_history: "Court Case History",
  import_export_report: "Import Export Report",
  fir_check: "FIR Check",
  address_enrichment: "Address Enrichment",
  company_supreme_report: "Company Supreme Report",
  msme_report: "MSME Report (Udyam)",
  pan_to_mobile_email: "PAN to Mobile & Email",
  payment_behaviour: "Payment Behaviour Report",
  find_someone: "Find Someone",
};

export const BUNDLE_REPORT_TYPES: ReportType[] = [
  "gst_exact_turnover",
  "gst_supreme_report",
  "bureau_report",
  "court_case_history",
  "msme_report",
  "company_supreme_report",
  "director_details",
  "mobile_to_pan",
  "mobile_identity",
  "address_enrichment",
  "fir_check",
];
