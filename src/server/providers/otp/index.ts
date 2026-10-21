import "server-only";
import crypto from "node:crypto";
import { MOCK, primary } from "@/server/providers/registry";
import { refuse } from "@/server/providers/slots";
import { sendDltOtp } from "@/server/providers/sms/fast2sms";

// OTP for people without an account: the buyer on the consent page (S10) and, in Part 9, the party accepting an
// agreement. Chaanbean makes the code and keeps only its hash; the sender delivers it by SMS (WhatsApp as fallback)
// once Part 6 connects a provider. Until then the mock sends nothing and the code is always 123456, so no real
// person is ever messaged during testing.

export interface OtpSender {
  name: string;
  isMock: boolean;
  /** Makes a code and sends it; returns the code (to hash) and the provider's reference. */
  send(input: { mobile10: string; purpose: "consent" | "agreement" | "settlement"; requester: string }): Promise<{ code: string; ref: string }>;
}

export const MOCK_OTP = "123456";

export const mockOtpSender: OtpSender = {
  name: "mock_otp",
  isMock: true,
  async send() {
    return { code: MOCK_OTP, ref: `otp-${crypto.randomBytes(6).toString("hex")}` };
  },
};

/** Fast2SMS DLT (v4 11.1): Chaanbean makes the code, Fast2SMS delivers it by SMS. */
const fast2smsOtpSender: OtpSender = {
  name: "fast2sms",
  isMock: false,
  async send({ mobile10 }) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const { ref } = await sendDltOtp(mobile10, code);
    return { code, ref };
  },
};

/** Real senders by provider name. Exotel (WhatsApp with SMS fallback, v3 4.1) is still a slot. */
const REAL: Record<string, OtpSender> = { fast2sms: fast2smsOtpSender };

/** OTP delivery for buyers and agreement counterparties (PROVIDER_OTP; dummy when unset). A slot refuses loudly. */
export function otpSender(): OtpSender {
  const name = primary("otp");
  if (name === MOCK) return mockOtpSender;
  return REAL[name] ?? { name, isMock: false, send: async () => refuse(name, "OTP delivery") };
}
