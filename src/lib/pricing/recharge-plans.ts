export interface RechargeTier {
  id: string;
  amount: number;
  name: string;
  badge?: string;
  validityDays: number;
  validityMonths: number;
  validityText: string;
  isCustomization?: boolean;
  tagline: string;
  customizationPerks?: string[];
  recommendedFor: string;
}

export const RECHARGE_TIERS: RechargeTier[] = [
  {
    id: "recharge_5k",
    amount: 5000,
    name: "Starter Pay & Use",
    validityDays: 90,
    validityMonths: 3,
    validityText: "3 Months Validity",
    tagline: "Ideal for small traders verifying initial counterparties on demand.",
    recommendedFor: "1-5 verifications / week + occasional recovery calls",
  },
  {
    id: "recharge_10k",
    amount: 10000,
    name: "Standard Pay & Use",
    validityDays: 90,
    validityMonths: 3,
    validityText: "3 Months Validity",
    tagline: "Essential on-demand access for growing distribution houses.",
    recommendedFor: "Regular statutory KYC, GST checks, and recovery follow-ups",
  },
  {
    id: "recharge_15k",
    amount: 15000,
    name: "Professional Pay & Use",
    validityDays: 180,
    validityMonths: 6,
    validityText: "6 Months Validity",
    tagline: "Expanded validity for steady monthly credit screening.",
    recommendedFor: "Mid-sized suppliers with multi-state buyer networks",
  },
  {
    id: "recharge_20k",
    amount: 20000,
    name: "Growth Pay & Use",
    validityDays: 180,
    validityMonths: 6,
    validityText: "6 Months Validity",
    tagline: "Higher wallet cushion for multi-department operations.",
    recommendedFor: "Active receivables recovery and full statutory dossiers",
  },
  {
    id: "recharge_25k",
    amount: 25000,
    name: "Advanced Pay & Use",
    validityDays: 270,
    validityMonths: 9,
    validityText: "9 Months Validity",
    tagline: "Flexible credits with extended validity across quarters.",
    recommendedFor: "Seasonal businesses and quarterly bulk buyer reviews",
  },
  {
    id: "recharge_30k",
    amount: 30000,
    name: "Executive Pay & Use",
    validityDays: 270,
    validityMonths: 9,
    validityText: "9 Months Validity",
    tagline: "Strong credit reserve for high-volume credit approvals.",
    recommendedFor: "Commercial trading desks and wholesale distributors",
  },
  {
    id: "recharge_40k",
    amount: 40000,
    name: "Corporate Pay & Use",
    validityDays: 365,
    validityMonths: 12,
    validityText: "1 Year Validity",
    tagline: "Full annual validity with unrestricted multi-service deductions.",
    recommendedFor: "Enterprises needing on-demand verification with zero lock-in",
  },
  // -------------------------------------------------------------
  // CUSTOMIZATION TIERS (₹50,000 to ₹100,000+)
  // -------------------------------------------------------------
  {
    id: "recharge_50k",
    amount: 50000,
    name: "Enterprise Customization 50K",
    badge: "Customization Tier",
    validityDays: 365,
    validityMonths: 12,
    validityText: "1 Year Validity",
    isCustomization: true,
    tagline: "Tailored IVR cadences, custom legal notice branding, and priority API.",
    customizationPerks: [
      "Custom Asterisk Voice recovery scripts in 6 regional languages",
      "Company-branded statutory legal notice demand templates",
      "Dedicated Client Success Manager & Priority SLA (under 2 hours)",
      "REST API access for ERP integration (Tally, SAP, Marg)",
    ],
    recommendedFor: "Corporate manufacturers with ₹5Cr - ₹20Cr receivables book",
  },
  {
    id: "recharge_60k",
    amount: 60000,
    name: "Enterprise Customization 60K",
    badge: "Customization Tier",
    validityDays: 365,
    validityMonths: 12,
    validityText: "1 Year Validity",
    isCustomization: true,
    tagline: "Expanded corporate volume with customized risk weighting models.",
    customizationPerks: [
      "Custom Asterisk Voice recovery scripts in 6 regional languages",
      "Tailored credit scoring weights for your specific industry sector",
      "Company-branded statutory legal notice demand templates",
      "Dedicated Client Success Manager & Priority SLA",
      "REST API access with custom rate limits",
    ],
    recommendedFor: "High-cadence FMCG and building materials distributors",
  },
  {
    id: "recharge_70k",
    amount: 70000,
    name: "Enterprise Customization 70K",
    badge: "Customization Tier",
    validityDays: 365,
    validityMonths: 12,
    validityText: "1 Year Validity",
    isCustomization: true,
    tagline: "Advanced debt recovery cadences and legal chamber consultation.",
    customizationPerks: [
      "Priority Legal Chamber review for complex MSMED / NCLT claims",
      "Emergency 1-hour telephony cadence for critical payment defaults",
      "Custom credit policy rules built directly into your workflow",
      "Dedicated Account Director with monthly audit reviews",
      "Unlimited sub-account seats for your credit and sales team",
    ],
    recommendedFor: "Corporate lenders, NBFC vendors, and tier-1 industrial suppliers",
  },
  {
    id: "recharge_80k",
    amount: 80000,
    name: "Enterprise Customization 80K",
    badge: "High-Volume Customization",
    validityDays: 365,
    validityMonths: 12,
    validityText: "1 Year Validity",
    isCustomization: true,
    tagline: "High-volume automated operations with custom webhook integration.",
    customizationPerks: [
      "Custom bidirectional webhooks for automated invoice ingestion",
      "Priority Legal Chamber review & Section 65B evidence packaging",
      "Emergency 1-hour telephony cadence for critical payment defaults",
      "Tailored credit scoring algorithms and custom risk cut-offs",
      "Dedicated Account Director & quarterly receivables strategy audit",
    ],
    recommendedFor: "Multi-branch enterprises managing 1,000+ active counterparties",
  },
  {
    id: "recharge_90k",
    amount: 90000,
    name: "Enterprise Customization 90K",
    badge: "High-Volume Customization",
    validityDays: 365,
    validityMonths: 12,
    validityText: "1 Year Validity",
    isCustomization: true,
    tagline: "Comprehensive bespoke infrastructure with zero service constraints.",
    customizationPerks: [
      "Dedicated telephony trunk with custom Caller ID (CLI) masking",
      "Custom bidirectional webhooks and real-time ledger synchronization",
      "Priority Legal Chamber review & Section 65B evidence packaging",
      "Emergency automated dialer cadences with live agent transfer",
      "Bespoke statutory notice templates vetted by MSME legal experts",
    ],
    recommendedFor: "National supply chain networks and institutional distributors",
  },
  {
    id: "recharge_100k",
    amount: 100000,
    name: "Bespoke Enterprise Customization 100K+",
    badge: "Maximum Customization",
    validityDays: 365,
    validityMonths: 12,
    validityText: "1 Year Validity",
    isCustomization: true,
    tagline: "Full-scale custom deployment with white-glove onboarding and custom integrations.",
    customizationPerks: [
      "100% Bespoke credit assessment engine tailored to your enterprise",
      "Dedicated Asterisk PBX telephony trunk with company-branded voicebot",
      "Full ERP bi-directional sync (SAP S/4HANA, Oracle, Tally Prime)",
      "Direct legal desk representation for expedited MSME Samadhaan decrees",
      "24/7 Dedicated Technical & Legal Account Director",
      "Volume discounts for recharges exceeding ₹1,00,000",
    ],
    recommendedFor: "Large enterprises, conglomerates, and high-frequency trading houses",
  },
];

export function getAllRechargeTiers(): RechargeTier[] {
  return RECHARGE_TIERS;
}

export function getRechargeTier(id: string): RechargeTier | undefined {
  return RECHARGE_TIERS.find((t) => t.id === id);
}

export function getCustomizationTiers(): RechargeTier[] {
  return RECHARGE_TIERS.filter((t) => t.isCustomization);
}

export interface RateCardItem {
  key: string;
  name: string;
  category: "verification" | "recovery" | "legal" | "addon";
  categoryLabel: string;
  unit: string;
  price: number;
  description: string;
}

export const DEFAULT_RATE_CARD: RateCardItem[] = [
  { key: "director_details", name: "Director Details (DIN)", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "per DIN lookup", price: 200, description: "Full DIN lookup, active directorships, DIN KYC status, and disqualification screening." },
  { key: "msme_report", name: "MSME Report (Udyam)", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "per Udyam report", price: 200, description: "Udyam registration validation, enterprise classification, and MSME standing." },
  { key: "gst_slab", name: "GST Slab Check", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "per GSTIN check", price: 15, description: "Determines active tax bracket, statutory registration status, and filing jurisdiction." },
  { key: "gst_exact_turnover", name: "GST Exact Turnover Filed", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "per filing dossier", price: 200, description: "Extracts exact aggregate turnovers from GSTR-3B and annual GSTR-9 returns." },
  { key: "gst_filing_month_basis", name: "GST Monthly Filing Calendar", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "Free (Included)", price: 0, description: "Complete month-by-month return filing chronology and delay tracking." },
  { key: "mobile_to_pan", name: "Mobile to PAN Lookup", category: "verification", categoryLabel: "Identity Resolution", unit: "per lookup", price: 50, description: "Resolves promoter phone numbers to verified PAN identity records." },
  { key: "mobile_identity", name: "Mobile Identity (Alternate Numbers)", category: "verification", categoryLabel: "Identity Resolution", unit: "per dossier", price: 200, description: "Discovers all active alternative SIMs and telecom circles associated with the entity." },
  { key: "court_case_history", name: "Court Case History – FIR Report", category: "verification", categoryLabel: "Dispute & Crime Screening", unit: "per e-Courts search", price: 250, description: "Searches nationwide District, High Courts, and NCLT tribunals for commercial and criminal disputes." },
  { key: "import_export_report", name: "Import Export (DGFT IEC) Report", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "per IEC report", price: 250, description: "Cross-references DGFT IEC database for export performance and customs standing." },
  { key: "pan_to_gst", name: "PAN to GST Number Directory", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "per PAN lookup", price: 15, description: "Maps single PAN to all registered GSTIN branches across Indian states." },
  { key: "default_payment_voice_calls", name: "Default Payments Voice Recovery", category: "recovery", categoryLabel: "Automated Telephony", unit: "per connected call", price: 1, description: "Asterisk automated debt recovery dialer across 5 cadences (1m, 2m, 5m, 30m, 1h)." },
  { key: "delayed_payments_followup", name: "Delayed Payments Follow-Up", category: "recovery", categoryLabel: "Automated Telephony", unit: "per PTP follow-up", price: 1, description: "Automated Promise-to-Pay (PTP) tracking and payment reminder cadences." },
  { key: "legal_notices", name: "Statutory Legal Notice Docket", category: "legal", categoryLabel: "Legal Infrastructure", unit: "per notice suite", price: 1500, description: "Full advocate-drafted statutory demand notices (§43B(h), DRC-01A, MSMED Act 2006)." },
  { key: "gst_supreme_report", name: "GST Supreme Intelligence Dossier", category: "verification", categoryLabel: "Statutory Due Diligence", unit: "per PAN registry", price: 150, description: "Comprehensive nationwide GST profile combining all state branch registrations." },
  { key: "marksheets_10_12", name: "Promoter Background & Verification", category: "verification", categoryLabel: "Identity Resolution", unit: "per promoter check", price: 100, description: "Statutory background verification for key directors and authorized signatories." },
  { key: "find_someone_lookup", name: "OmniTrace 360™ Skip-Tracing", category: "verification", categoryLabel: "Identity Resolution", unit: "per skip-trace", price: 249, description: "Deep skip-tracing resolving paying bank branch, delivery location, and business footprint." },
  { key: "trust_hub_id", name: "Trust Network Identity Stamp", category: "verification", categoryLabel: "Trust Network", unit: "per Trust ID verification", price: 100, description: "Section 65B tamper-proof evidentiary audit trail and counterparty risk stamp." },
  { key: "additional_company", name: "Additional Company Profile", category: "addon", categoryLabel: "Platform Add-on", unit: "per company profile", price: 1500, description: "Onboards an additional trade name or subsidiary under active subscription." }
];
