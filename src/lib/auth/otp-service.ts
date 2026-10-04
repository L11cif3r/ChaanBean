import crypto from "crypto";
import { prisma } from "@/lib/db";

export interface OtpSessionData {
  txnId: string;
  mobile: string;
  otpHash: string;
  plainOtpForUat?: string;
  purpose: "login" | "register";
  createdAt: number;
  expiresAt: number;
  attempts: number;
  metadata?: {
    fullName?: string;
    companyName?: string;
    email?: string;
    pan?: string;
    gstin?: string;
    plan?: string;
    industry?: string;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __authOtpSessions: Map<string, OtpSessionData> | undefined;
}

const otpSessions: Map<string, OtpSessionData> =
  globalThis.__authOtpSessions || (globalThis.__authOtpSessions = new Map());

// 5 minutes OTP TTL
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

function cleanupExpiredOtpSessions(): void {
  const now = Date.now();
  for (const [txnId, session] of otpSessions.entries()) {
    if (now > session.expiresAt) {
      otpSessions.delete(txnId);
    }
  }
}

/**
 * Dispatches OTP via available SMS Gateway (Fast2SMS, MSG91, Twilio, or Exotel).
 * If no SMS provider credentials are configured in server env, falls back to UAT mode.
 */
async function dispatchSms(mobile: string, otp: string): Promise<{
  dispatched: boolean;
  provider: string;
  messageId?: string;
}> {
  const cleanMobile = mobile.replace(/\D/g, "").slice(-10);

  // 1. Check Fast2SMS
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variables_values: otp,
          route: "otp",
          numbers: cleanMobile,
        }),
      });
      if (res.ok) {
        return { dispatched: true, provider: "Fast2SMS" };
      }
    } catch (err) {
      console.error("Fast2SMS dispatch error:", err);
    }
  }

  // 2. Check Twilio SMS
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const form = new URLSearchParams();
      form.append("From", process.env.TWILIO_PHONE_NUMBER);
      form.append("To", `+91${cleanMobile}`);
      form.append("Body", `Your ChaanBean verification code is ${otp}. Valid for 5 minutes.`);

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
      if (res.ok) {
        const json = await res.json();
        return { dispatched: true, provider: "Twilio", messageId: json.sid };
      }
    } catch (err) {
      console.error("Twilio SMS dispatch error:", err);
    }
  }

  // 3. Fallback: UAT Sandbox Delivery
  return {
    dispatched: false,
    provider: "ChaanBean Sandbox / UAT Gateway",
    messageId: `UAT-${Date.now()}`,
  };
}

/**
 * Step 1: Initiates and stores a new OTP for authentication/registration.
 */
export async function createOtpSession(params: {
  mobile: string;
  purpose?: "login" | "register";
  metadata?: OtpSessionData["metadata"];
}): Promise<{
  success: boolean;
  txnId: string;
  mobile: string;
  expiresInSeconds: number;
  message: string;
  uatOtp?: string; // Included only in UAT/sandbox environments when SMS gateway is unconfigured
}> {
  cleanupExpiredOtpSessions();

  const cleanMobile = params.mobile.replace(/\D/g, "").slice(-10);
  if (cleanMobile.length !== 10) {
    throw new Error("A valid 10-digit Indian mobile number is required.");
  }

  // Generate cryptographically strong 6-digit OTP
  const rawOtp = String(crypto.randomInt(100000, 999999));
  const txnId = `cb_otp_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = Date.now();

  const isLiveSmsConfigured = Boolean(
    process.env.FAST2SMS_API_KEY ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  );

  const sessionEntry: OtpSessionData = {
    txnId,
    mobile: cleanMobile,
    otpHash: hashOtp(rawOtp),
    plainOtpForUat: isLiveSmsConfigured ? undefined : rawOtp,
    purpose: params.purpose || "login",
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    metadata: params.metadata,
  };

  // Remove any previous active sessions for this mobile
  for (const [id, s] of otpSessions.entries()) {
    if (s.mobile === cleanMobile) {
      otpSessions.delete(id);
    }
  }

  otpSessions.set(txnId, sessionEntry);

  // Dispatch via SMS gateway
  const dispatchResult = await dispatchSms(cleanMobile, rawOtp);

  return {
    success: true,
    txnId,
    mobile: cleanMobile,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    message: dispatchResult.dispatched
      ? `One-Time Password (OTP) dispatched via ${dispatchResult.provider} to +91 ${cleanMobile}.`
      : `OTP generated for +91 ${cleanMobile}. Valid for 5 minutes.`,
    uatOtp: sessionEntry.plainOtpForUat,
  };
}

/**
 * Step 2: Validates the OTP against the active session.
 */
export async function verifyOtpSession(params: {
  mobile: string;
  otp: string;
  txnId?: string;
}): Promise<{
  success: boolean;
  mobile: string;
  purpose: "login" | "register";
  metadata?: OtpSessionData["metadata"];
}> {
  cleanupExpiredOtpSessions();

  const cleanMobile = params.mobile.replace(/\D/g, "").slice(-10);
  const cleanOtp = (params.otp || "").replace(/\D/g, "").slice(0, 6);

  if (cleanMobile.length !== 10) {
    throw new Error("Valid 10-digit mobile number is required.");
  }
  if (cleanOtp.length !== 6) {
    throw new Error("Please enter the 6-digit OTP sent to your mobile.");
  }

  // Find session by txnId or fallback to mobile
  let session: OtpSessionData | undefined;
  if (params.txnId) {
    session = otpSessions.get(params.txnId);
  }
  if (!session) {
    for (const s of otpSessions.values()) {
      if (s.mobile === cleanMobile && Date.now() <= s.expiresAt) {
        session = s;
        break;
      }
    }
  }

  if (!session) {
    throw new Error("OTP session expired or not found. Please click 'Resend OTP' to request a new code.");
  }

  if (session.mobile !== cleanMobile) {
    throw new Error("Mobile number does not match the active OTP transaction.");
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(session.txnId);
    throw new Error("OTP has expired. Please request a new code.");
  }

  if (session.attempts >= MAX_ATTEMPTS) {
    otpSessions.delete(session.txnId);
    throw new Error("Too many invalid attempts. This OTP session has been revoked for security. Please request a new code.");
  }

  session.attempts += 1;

  // Constant-time hash verification
  const inputHash = hashOtp(cleanOtp);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(inputHash, "hex"),
    Buffer.from(session.otpHash, "hex")
  );

  if (!isMatch) {
    const remaining = MAX_ATTEMPTS - session.attempts;
    throw new Error(`Incorrect OTP code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  // OTP verified successfully: consume session so it cannot be reused
  const { purpose, metadata, mobile } = session;
  otpSessions.delete(session.txnId);

  return {
    success: true,
    mobile,
    purpose,
    metadata,
  };
}
