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
  // 18 Features under Business Background Check & Add-ons
  director_details: {
    key: "director_details",
    name: "Director Details (DIN)",
    category: "background_check",
    price: 149,
    defaultPrice: 149,
    description: "MCA21 director KYC, DIN status, and past disqualifications check.",
  },
  msme_report: {
    key: "msme_report",
    name: "MSME Report (Udyam)",
    category: "background_check",
    price: 99,
    defaultPrice: 99,
    description: "Udyam registration validation and enterprise category standing.",
  },
  gst_slab: {
    key: "gst_slab",
    name: "GST Slab",
    category: "background_check",
    price: 49,
    defaultPrice: 49,
    description: "Statutory tax bracket and enterprise scale qualification.",
  },
  gst_exact_turnover: {
    key: "gst_exact_turnover",
    name: "GST Exact Turnover Filed",
    category: "background_check",
    price: 199,
    defaultPrice: 199,
    description: "Aggregate historical annual turnovers declared to GSTN.",
  },
  gst_filing_month_basis: {
    key: "gst_filing_month_basis",
    name: "GST Filing on Month Basis",
    category: "background_check",
    price: 149,
    defaultPrice: 149,
    description: "Monthly GSTR-3B and GSTR-1 on-time filing regularity timeline.",
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
    price: 499,
    defaultPrice: 499,
    description: "Verified counterparty credibility certificate and Trust ID assignment.",
  },
  mobile_to_pan: {
    key: "mobile_to_pan",
    name: "Mobile to PAN",
    category: "background_check",
    price: 79,
    defaultPrice: 79,
    description: "Reverse telecom subscriber link to verified Income Tax PAN.",
  },
  mobile_identity: {
    key: "mobile_identity",
    name: "Mobile Identity (All Alternate Numbers)",
    category: "background_check",
    price: 129,
    defaultPrice: 129,
    description: "E-commerce and telecom KYC multi-SIM cross-correlation.",
  },
  court_case_history: {
    key: "court_case_history",
    name: "Court Case History – FIR Report",
    category: "background_check",
    price: 249,
    defaultPrice: 249,
    description: "e-Courts civil/commercial lawsuits and CCTNS criminal FIR screening.",
  },
  import_export_report: {
    key: "import_export_report",
    name: "Import Export Report (DGFT IEC)",
    category: "background_check",
    price: 199,
    defaultPrice: 199,
    description: "DGFT Importer-Exporter Code and overseas trade customs clearance.",
  },
  marksheets_10_12: {
    key: "marksheets_10_12",
    name: "10th & 12th Marksheets",
    category: "background_check",
    price: 149,
    defaultPrice: 149,
    description: "DigiLocker/CBSE credential check for key promoters.",
  },
  pan_to_gst: {
    key: "pan_to_gst",
    name: "PAN to GST Number",
    category: "background_check",
    price: 79,
    defaultPrice: 79,
    description: "Discovers all nationwide multi-state GSTINs linked to a PAN.",
  },
  default_payment_voice_calls: {
    key: "default_payment_voice_calls",
    name: "Default Payments Voice Calls (1m, 2m, 5m, 30m, 1h)",
    category: "background_check",
    price: 399,
    defaultPrice: 399,
    description: "Automated Asterisk multi-cadence multilingual phone recovery.",
  },
  legal_notices: {
    key: "legal_notices",
    name: "Legal Notices (GST, MSME, Income Tax & Demand)",
    category: "background_check",
    price: 499,
    defaultPrice: 499,
    description: "Statutory demand notice suite with regulatory reporting.",
  },
  delayed_payments_followup: {
    key: "delayed_payments_followup",
    name: "Delayed Payments Follow UP",
    category: "background_check",
    price: 299,
    defaultPrice: 299,
    description: "Promise-to-pay tracking calendar and aging ledger automation.",
  },
  user_seat: {
    key: "user_seat",
    name: "User Access (Per Seat Add-On)",
    category: "addon",
    price: 999,
    defaultPrice: 999,
    description: "Additional concurrent operator seat beyond base allocation.",
  },
  additional_company: {
    key: "additional_company",
    name: "Add Additional Company Name",
    category: "addon",
    price: 1500,
    defaultPrice: 1500,
    description: "Onboards an additional trade name or subsidiary under single subscription.",
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
    name: "Growth Plan (Monthly)",
    category: "subscription",
    price: 14999,
    defaultPrice: 14999,
    description: "5 Seats, 250 Checks, OmniTrace 360, and Dispute Resolution Center.",
  },
  enterprise_subscription: {
    key: "enterprise_subscription",
    name: "Enterprise Plan (Monthly)",
    category: "subscription",
    price: 39999,
    defaultPrice: 39999,
    description: "Unlimited seats & checks, dedicated arbitrator, and priority API access.",
  },
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

/**
 * Get dynamic price for any feature key.
 * This is queried directly by payment gateways, add-on checkout, and invoice calculations.
 */
export function getFeaturePrice(featureKey: string): number {
  const pricing = loadPricingFromDisk();
  const item = pricing[featureKey];
  return item ? item.price : (DEFAULT_PRICING[featureKey]?.price ?? 50);
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

  const pricing = loadPricingFromDisk();
  if (!pricing[featureKey]) {
    if (DEFAULT_PRICING[featureKey]) {
      pricing[featureKey] = { ...DEFAULT_PRICING[featureKey] };
    } else {
      return { success: false };
    }
  }

  pricing[featureKey] = {
    ...pricing[featureKey],
    price: newPrice,
  };

  savePricingToDisk(pricing);
  return { success: true, item: pricing[featureKey] };
}

/**
 * Reset a feature price to factory default.
 */
export function resetFeaturePrice(featureKey: string): { success: boolean; item?: FeaturePriceItem } {
  const def = DEFAULT_PRICING[featureKey];
  if (!def) return { success: false };
  return updateFeaturePrice(featureKey, def.defaultPrice);
}
