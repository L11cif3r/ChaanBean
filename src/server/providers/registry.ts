import "server-only";

// Which provider serves each outside service (PRD v3.0 sections 16 and 17).
//
// Every service has a dummy, "mock", that works without keys and follows test scenarios, so the whole portal can be
// built and tested before contracts are signed. A real provider plugs in behind the same interface and is chosen
// with an environment variable, one per service or item code, e.g.
//
//   PROVIDER_CW_GST_SEARCH=surepass          use Surepass
//   PROVIDER_CW_MSME=zoop,surepass           Zoop first, Surepass when Zoop fails (v3 FR-CW-07 fallback)
//   PROVIDER_SMS=exotel
//
// Unset means "mock". Ops will pick providers per item code in the admin console later (v3 section 9); this file stays
// the single list of what exists and which keys each provider needs. See docs/PROVIDERS.md.

/** Every outside service, with the providers PRD v3.0 section 17 names for it (primary first). */
export const SERVICES = {
  // Onboarding (S02) and counterparties (S06)
  identity: ["apisetu", "surepass"],
  upi: ["surepass", "razorpay"],
  // Credit Worthiness, one entry per item code (v3 6.1)
  CW_GST_SEARCH: ["apisetu", "surepass", "setu"],
  CW_GST_TURNOVER_CY: ["finagg", "vayana"],
  CW_GST_TURNOVER_4Y: ["finagg", "vayana"],
  CW_CIBIL_COMPANY: ["cibil", "crif", "experian"],
  CW_CIBIL_PERSONAL: ["cibil", "crif", "experian"],
  CW_MSME: ["zoop", "surepass", "gridlines"],
  CW_PAN: ["surepass", "cashfree"],
  CW_IEC_PROFILE: ["surepass", "setu"],
  CW_IEC_TURNOVER: ["volza", "eximpedia"],
  CW_COMPANY: ["mca", "probe42", "gridlines"],
  CW_DIRECTORS: ["probe42", "signzy", "gridlines"],
  CW_CREDIT_RATING: ["probe42"],
  // Buyer consent: GST portal access through the GSP (v3 FR-CON-04)
  gsp: ["finagg", "vayana"],
  // Case Check (v3 section 7)
  CC_COURT: ["surepass", "legalkart"],
  CC_FIR: ["authbridge", "idfy"],
  CC_AML: ["signzy", "hyperverge"],
  // Messages and OTPs (v3 4.1, section 19)
  // KYC of the person signing up (v4 11.2), and the business's own GST certificate (GSTN collection on API Setu)
  kyc: ["digilocker"],
  gst_certificate: ["apisetu"],
  otp: ["fast2sms", "exotel"],
  sms: ["fast2sms", "exotel"],
  whatsapp: ["exotel"],
  email: ["ses", "zeptomail"],
  // Plans and wallet (v3 FR-BIL-02)
  payments: ["razorpay", "cashfree"],
  // Write-once storage for sealed agreements and settlements (v3 8.5: S3 Object Lock; Phase 2 hosting: GCS Bucket Lock)
  storage: ["s3", "gcs"],
} as const satisfies Record<string, readonly string[]>;

export type Service = keyof typeof SERVICES;

/** Keys each real provider needs (v3 Appendix B). Values are read from the environment, never logged. */
export const PROVIDER_KEYS: Record<string, readonly string[]> = {
  surepass: ["SUREPASS_API_TOKEN"],
  setu: ["APISETU_CLIENT_ID", "APISETU_API_KEY"],
  apisetu: ["GSTN_CLIENT_ID", "GSTN_API_KEY"],         // API Setu GSTN (v4); GSTN_BASE_URL optional
  mca: ["DATA_GOV_IN_API_KEY"],                        // or MCA_API_KEY (same data.gov.in key)                        // MCA open data on data.gov.in (v4 2.1)
  finagg: ["GSP_CLIENT_ID", "GSP_CLIENT_SECRET", "GSP_ASP_ID"],
  vayana: ["GSP_CLIENT_ID", "GSP_CLIENT_SECRET", "GSP_ASP_ID"],
  cibil: ["BUREAU_API_KEY", "BUREAU_API_SECRET"],
  crif: ["BUREAU_API_KEY", "BUREAU_API_SECRET"],
  experian: ["BUREAU_API_KEY", "BUREAU_API_SECRET"],
  zoop: ["ZOOP_APP_ID", "ZOOP_API_KEY"],
  gridlines: ["GRIDLINES_API_KEY"],
  cashfree: ["CASHFREE_CLIENT_ID", "CASHFREE_CLIENT_SECRET"],
  volza: ["VOLZA_API_KEY"],
  eximpedia: ["EXIMPEDIA_API_KEY"],
  probe42: ["PROBE42_API_KEY"],
  signzy: ["SIGNZY_API_KEY"],
  hyperverge: ["HYPERVERGE_APP_ID", "HYPERVERGE_APP_KEY"],
  legalkart: ["LEGALKART_API_KEY"],
  authbridge: ["FIR_PROVIDER_API_KEY"],
  idfy: ["FIR_PROVIDER_API_KEY"],
  digilocker: ["DIGILOCKER_CLIENT_ID", "DIGILOCKER_CLIENT_SECRET", "DIGILOCKER_REDIRECT_URI"],   // v4 11.2 KYC
  fast2sms: ["FAST2SMS_API_KEY", "FAST2SMS_SENDER_ID", "FAST2SMS_DLT_TEMPLATE_ID"],   // v4 11.1: SMS OTP on the DLT route
  exotel: ["EXOTEL_API_KEY", "EXOTEL_API_TOKEN", "EXOTEL_ACCOUNT_SID", "EXOTEL_WHATSAPP_FROM", "EXOTEL_SMS_SENDER_ID", "EXOTEL_SMS_DLT_ENTITY_ID"],
  ses: ["SES_FROM_EMAIL", "AWS_REGION"],
  zeptomail: ["ZEPTOMAIL_TOKEN", "ZEPTOMAIL_FROM_EMAIL"],
  s3: ["EVIDENCE_S3_BUCKET", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  gcs: ["EVIDENCE_GCS_BUCKET", "GOOGLE_APPLICATION_CREDENTIALS"],
  razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
};

export const MOCK = "mock";

/** The environment variable that picks the provider for a service: PROVIDER_CW_GST_SEARCH, PROVIDER_SMS, … */
export const envName = (service: Service) => `PROVIDER_${service.toUpperCase()}`;

/**
 * The providers to try for a service, in order. "mock" when nothing is set. A name the service does not know is an
 * error, so a typo in .env fails at once instead of quietly using the dummy.
 */
export function chain(service: Service, env: Record<string, string | undefined> = process.env): string[] {
  const raw = env[envName(service)]?.trim();
  if (!raw) return [MOCK];
  const names = raw.split(",").map((n) => n.trim().toLowerCase()).filter(Boolean);
  const allowed = [MOCK, ...SERVICES[service]] as string[];
  const unknown = names.filter((n) => !allowed.includes(n));
  if (unknown.length) {
    throw new Error(`${envName(service)}=${raw}: unknown provider ${unknown.join(", ")}. Use one of: ${allowed.join(", ")}.`);
  }
  return [...new Set(names)];
}

/** The first provider for services that cannot fall back mid-flow (GSP session, payments, messages). */
export const primary = (service: Service, env: Record<string, string | undefined> = process.env) => chain(service, env)[0];

export interface ProviderStatus {
  service: Service;
  providers: string[];
  /** Keys a chosen real provider needs that are not set. Names only. */
  missingKeys: string[];
}

/** What each service uses now and what is missing, for the health check and the admin console (no secret values). */
export function providerStatus(env: Record<string, string | undefined> = process.env): ProviderStatus[] {
  return (Object.keys(SERVICES) as Service[]).map((service) => {
    const providers = chain(service, env);
    const missingKeys = [...new Set(providers.filter((p) => p !== MOCK).flatMap((p) => PROVIDER_KEYS[p] ?? []))].filter((k) => !env[k]);
    return { service, providers, missingKeys };
  });
}

/** True when a real provider is chosen for the service and all its keys are set (v4 FR-MK-05: "Live" in mixed mode). */
export function hasLiveProvider(service: Service, env: Record<string, string | undefined> = process.env): boolean {
  return chain(service, env).some((p) => p !== MOCK && (PROVIDER_KEYS[p] ?? []).every((k) => Boolean(env[k]?.replace(/^["']|["']$/g, ""))));
}

/** Thrown by a real adapter whose keys are not set, so the router can fall back or report it plainly. */
export function requireKeys(provider: string, env: Record<string, string | undefined> = process.env): Record<string, string> {
  const keys = PROVIDER_KEYS[provider] ?? [];
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) throw new Error(`${provider} is selected but ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set.`);
  return Object.fromEntries(keys.map((k) => [k, env[k]!]));
}
