import fs from "fs";
import path from "path";

export interface FeaturePriceItem {
  key: string;
  name: string;
  category: "background_check" | "addon" | "skip_trace" | "subscription";
  price: number;
  defaultPrice: number;
  description: string;
}

export const DEFAULT_PRICING: Record<string, FeaturePriceItem> = {
  // 15 Core Features from Statutory Pricing Schedule
  director_details: {
    key: "director_details",
    name: "Director Details (DIN)",
    category: "background_check",
    price: 200,
    defaultPrice: 200,
    description: "MCA21 director KYC, DIN status, active directorships, and past disqualifications check.",
  },
  msme_report: {
    key: "msme_report",
    name: "MSME Report (Udyam)",
    category: "background_check",
    price: 200,
    defaultPrice: 200,
    description: "Udyam registration validation, classification (Micro/Small/Medium), and enterprise standing.",
  },
  gst_slab: {
    key: "gst_slab",
    name: "GST Slab",
    category: "background_check",
    price: 15,
    defaultPrice: 15,
    description: "Statutory tax bracket and enterprise scale qualification.",
  },
  gst_exact_turnover: {
    key: "gst_exact_turnover",
    name: "GST Exact Turnover Filed",
    category: "background_check",
    price: 200,
    defaultPrice: 200,
    description: "Aggregate historical annual turnovers declared to GSTN (GSTR-3B & 9).",
  },
  gst_filing_month_basis: {
    key: "gst_filing_month_basis",
    name: "GST Filing on Month Basis",
    category: "background_check",
    price: 0,
    defaultPrice: 0,
    description: "Monthly GSTR-3B and GSTR-1 on-time filing regularity timeline (Free).",
  },
  gst_supreme_report: {
    key: "gst_supreme_report",
    name: "GST Supreme Report (PAN Purchase/Sales)",
    category: "background_check",
    price: 299,
    defaultPrice: 299,
    description: "Complete PAN-level sales and supplier outward invoice registry.",
  },
  trust_hub_id: {
    key: "trust_hub_id",
    name: "Trust Network & Trust ID",
    category: "background_check",
    price: 99,
    defaultPrice: 99,
    description: "Verified counterparty credibility certificate and Trust ID assignment.",
  },
  mobile_to_pan: {
    key: "mobile_to_pan",
    name: "Mobile to PAN",
    category: "background_check",
    price: 50,
    defaultPrice: 50,
    description: "Reverse telecom subscriber link to verified Income Tax PAN.",
  },
  mobile_identity: {
    key: "mobile_identity",
    name: "Mobile Identity (All Alternate Numbers)",
    category: "background_check",
    price: 200,
    defaultPrice: 200,
    description: "E-commerce and telecom KYC multi-SIM cross-correlation.",
  },
  court_case_history: {
    key: "court_case_history",
    name: "Court Case History – FIR Report",
    category: "background_check",
    price: 250,
    defaultPrice: 250,
    description: "e-Courts civil/commercial lawsuits, Section 138 NI Act, and CCTNS criminal FIR screening.",
  },
  import_export_report: {
    key: "import_export_report",
    name: "Import Export Report (DGFT IEC)",
    category: "background_check",
    price: 250,
    defaultPrice: 250,
    description: "DGFT Importer-Exporter Code and overseas trade customs clearance.",
  },
  marksheets_10_12: {
    key: "marksheets_10_12",
    name: "10th & 12th Marksheets",
    category: "background_check",
    price: 89,
    defaultPrice: 89,
    description: "DigiLocker/CBSE credential check for key promoters.",
  },
  pan_to_gst: {
    key: "pan_to_gst",
    name: "PAN to GST Number",
    category: "background_check",
    price: 15,
    defaultPrice: 15,
    description: "Discovers all nationwide multi-state GSTINs linked to a PAN.",
  },
  default_payment_voice_calls: {
    key: "default_payment_voice_calls",
    name: "Default Payments Voice Calls (1m, 2m, 5m, 30m, 1h)",
    category: "background_check",
    price: 1,
    defaultPrice: 1,
    description: "Automated Asterisk multi-cadence multilingual phone recovery (₹1/call answered).",
  },
  legal_notices: {
    key: "legal_notices",
    name: "Legal Notices (GST, MSME, Income Tax & Demand)",
    category: "background_check",
    price: 1500,
    defaultPrice: 1500,
    description: "Statutory demand notice suite with regulatory reporting (§43B(h) / DRC-01A).",
  },
  delayed_payments_followup: {
    key: "delayed_payments_followup",
    name: "Delayed Payments Follow UP",
    category: "background_check",
    price: 1,
    defaultPrice: 1,
    description: "Promise-to-pay tracking calendar and aging ledger automation.",
  },
  user_seat: {
    key: "user_seat",
    name: "User Access (Seats Included)",
    category: "addon",
    price: 0,
    defaultPrice: 0,
    description: "User team access seats (3 included on Retail, 5 on Enterprise).",
  },
  additional_company: {
    key: "additional_company",
    name: "Add Additional Company Name",
    category: "addon",
    price: 1500,
    defaultPrice: 1500,
    description: "Onboards an additional trade name or subsidiary under subscription (₹1,500).",
  },

  // Highlight Features
  find_someone_lookup: {
    key: "find_someone_lookup",
    name: "Find Someone (OmniTrace 360™)",
    category: "skip_trace",
    price: 249,
    defaultPrice: 249,
    description: "Deep skip-tracing: delivery apps, paying bank branch, and tri-bureau.",
  },

  // Platform Subscriptions
  starter_subscription: {
    key: "starter_subscription",
    name: "Starter Plan (Monthly)",
    category: "subscription",
    price: 4999,
    defaultPrice: 4999,
    description: "Essential credit scoring and recovery for small enterprises.",
  },
  growth_subscription: {
    key: "growth_subscription",
    name: "Retail Plan (Growth)",
    category: "subscription",
    price: 9899,
    defaultPrice: 9899,
    description: "Retail Plan (3 Mos) - ₹49,200 Gross Value discounted to ₹9,899. 10 Director, 10 MSME, 40 GST Slabs, 40 Turnovers, 3500 Calls, 5 Legal Notices, 3 Seats.",
  },
  enterprise_subscription: {
    key: "enterprise_subscription",
    name: "Enterprise Plan",
    category: "subscription",
    price: 17599,
    defaultPrice: 17599,
    description: "Enterprise Plan (3 Mos) - ₹85,950 Gross Value discounted to ₹17,599. 20 Director, 20 MSME, 65 GST Slabs, 65 Turnovers, 6000 Calls, 10 Legal Notices, 5 Seats.",
  },
  alacarte_3k: {
    key: "alacarte_3k",
    name: "À La Carte - 3,000 Calls (3 Mos)",
    category: "subscription",
    price: 4500,
    defaultPrice: 4500,
    description: "3,000 automated recovery calls with 3 months validity.",
  },
  alacarte_8k: {
    key: "alacarte_8k",
    name: "À La Carte - 8,000 Calls (6 Mos)",
    category: "subscription",
    price: 10000,
    defaultPrice: 10000,
    description: "8,000 automated recovery calls with 6 months validity.",
  },
  alacarte_14k: {
    key: "alacarte_14k",
    name: "À La Carte - 14,000 Calls (9 Mos)",
    category: "subscription",
    price: 15000,
    defaultPrice: 15000,
    description: "14,000 automated recovery calls with 9 months validity.",
  },
  alacarte_19k: {
    key: "alacarte_19k",
    name: "À La Carte - 19,000 Calls (1 Yr)",
    category: "subscription",
    price: 20000,
    defaultPrice: 20000,
    description: "19,000 automated recovery calls with 1 year validity.",
  },
};

export const FEATURE_KEY_ALIASES: Record<string, string> = {
  gst_slab_check: "gst_slab",
  gst_monthly_filings: "gst_filing_month_basis",
  trust_hub_verification: "trust_hub_id",
  fir_check: "court_case_history",
  education_marksheet_check: "marksheets_10_12",
  voice_call_cadence: "default_payment_voice_calls",
  legal_notice_suite: "legal_notices",
  delayed_payment_followup: "delayed_payments_followup",
  subscription_seats: "user_seat",
  additional_company_addon: "additional_company",
  retail_subscription: "growth_subscription",
  growth_plan: "growth_subscription",
  retail_plan: "growth_subscription",
  enterprise_plan: "enterprise_subscription",
};

const PRICING_STORE_PATH = path.join(process.cwd(), "pricing-config.json");

// In-memory cache synced with disk
let cachedPricing: Record<string, FeaturePriceItem> | null = null;

function loadPricingFromDisk(): Record<string, FeaturePriceItem> {
  if (cachedPricing) return cachedPricing;

  try {
    if (fs.existsSync(PRICING_STORE_PATH)) {
      const raw = fs.readFileSync(PRICING_STORE_PATH, "utf-8");
      const saved = JSON.parse(raw);
      cachedPricing = { ...DEFAULT_PRICING, ...saved };
      return cachedPricing!;
    }
  } catch (err) {
    console.error("Error reading pricing-config.json:", err);
  }

  cachedPricing = { ...DEFAULT_PRICING };
  return cachedPricing;
}

function savePricingToDisk(pricing: Record<string, FeaturePriceItem>) {
  try {
    fs.writeFileSync(PRICING_STORE_PATH, JSON.stringify(pricing, null, 2), "utf-8");
    cachedPricing = pricing;
  } catch (err) {
    console.error("Error saving pricing-config.json:", err);
  }
}

export function resolveFeatureKey(featureKey: string): string {
  return FEATURE_KEY_ALIASES[featureKey] || featureKey;
}

/**
 * Get dynamic price for any feature key.
 * This is queried directly by payment gateways, add-on checkout, and invoice calculations.
 */
export function getFeaturePrice(featureKey: string): number {
  const canonicalKey = resolveFeatureKey(featureKey);
  const pricing = loadPricingFromDisk();
  const item = pricing[canonicalKey] ?? pricing[featureKey];
  if (item && typeof item.price === "number") {
    return item.price;
  }
  const fallback = DEFAULT_PRICING[canonicalKey] ?? DEFAULT_PRICING[featureKey];
  if (fallback && typeof fallback.price === "number") {
    return fallback.price;
  }
  return 50;
}

/**
 * Get all feature pricing items.
 */
export function getAllFeaturePricing(): Record<string, FeaturePriceItem> {
  return loadPricingFromDisk();
}

/**
 * Owner-authorized feature cost modification.
 * Updates the price in the persistent store and in-memory cache.
 * Any subsequent gateway checkout will immediately charge this modified price.
 */
export function updateFeaturePrice(featureKey: string, newPrice: number): { success: boolean; item?: FeaturePriceItem } {
  if (typeof newPrice !== "number" || newPrice < 0) {
    return { success: false };
  }

  const canonicalKey = resolveFeatureKey(featureKey);
  const pricing = loadPricingFromDisk();
  const targetKey = pricing[canonicalKey] ? canonicalKey : (DEFAULT_PRICING[canonicalKey] ? canonicalKey : featureKey);

  if (!pricing[targetKey]) {
    if (DEFAULT_PRICING[targetKey]) {
      pricing[targetKey] = { ...DEFAULT_PRICING[targetKey] };
    } else {
      return { success: false };
    }
  }

  pricing[targetKey] = {
    ...pricing[targetKey],
    price: newPrice,
  };

  savePricingToDisk(pricing);
  return { success: true, item: pricing[targetKey] };
}

/**
 * Reset a feature price to factory default.
 */
export function resetFeaturePrice(featureKey: string): { success: boolean; item?: FeaturePriceItem } {
  const canonicalKey = resolveFeatureKey(featureKey);
  const def = DEFAULT_PRICING[canonicalKey] ?? DEFAULT_PRICING[featureKey];
  if (!def) return { success: false };
  return updateFeaturePrice(canonicalKey, def.defaultPrice);
}
