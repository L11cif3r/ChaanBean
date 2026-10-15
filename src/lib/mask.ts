// Masking for display and logs (PRD S05: mobiles show first 2 and last 4 digits; section 15: no OTPs, full PAN or
// full mobile numbers in application logs).

/** "98••••3210" */
export function maskMobile(mobile10: string): string {
  const d = mobile10.replace(/\D/g, "").slice(-10);
  if (d.length < 6) return "•".repeat(d.length);
  return `${d.slice(0, 2)}${"•".repeat(d.length - 6)}${d.slice(-4)}`;
}

/** "ABCDE••••F" */
export function maskPan(pan: string): string {
  const v = pan.trim().toUpperCase();
  if (v.length !== 10) return "•".repeat(v.length);
  return `${v.slice(0, 5)}••••${v.slice(-1)}`;
}

/** "ra•••@example.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

const SENSITIVE_KEYS = /otp|password|secret|token|authorization|cookie|aadhaar|pan|mobile|phone|email|address/i;
const MOBILE_IN_TEXT = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/g;
const PAN_IN_TEXT = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const OTP_IN_TEXT = /\b(otp|code)\b(\W{0,3})\d{4,8}\b/gi;

/** Masks PII inside free text (error messages, provider responses) before it is logged. */
export function redactText(text: string): string {
  return text
    .replace(OTP_IN_TEXT, (_m, word: string, sep: string) => `${word}${sep}••••••`)
    .replace(MOBILE_IN_TEXT, (m) => maskMobile(m))
    .replace(PAN_IN_TEXT, (m) => maskPan(m));
}

/** Deep copy of a value with sensitive keys masked and PII patterns redacted from strings. Safe for logs and audit. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k) && v !== null && v !== undefined && typeof v !== "boolean") {
        out[k] = typeof v === "string" ? maskByKey(k, v) : "[redacted]";
      } else {
        out[k] = redact(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function maskByKey(key: string, v: string): string {
  if (/mobile|phone/i.test(key)) return maskMobile(v);
  if (/^pan$|_pan$|pan_/i.test(key) && v.length === 10) return maskPan(v);
  if (/email/i.test(key) && v.includes("@")) return maskEmail(v);
  return "[redacted]";
}
