import "server-only";
import crypto from "node:crypto";

// OTP for people without an account: the buyer on the consent page (S10) and, in Part 9, the party accepting an
// agreement. Chaanbean makes the code and keeps only its hash; the sender delivers it by SMS (WhatsApp as fallback)
// once Part 6 connects a provider. Until then the mock sends nothing and the code is always 123456, so no real
// person is ever messaged during testing.

export interface OtpSender {
  name: string;
  isMock: boolean;
  /** Makes a code and sends it; returns the code (to hash) and the provider's reference. */
  send(input: { mobile10: string; purpose: "consent" | "agreement"; requester: string }): Promise<{ code: string; ref: string }>;
}

export const MOCK_OTP = "123456";

export const mockOtpSender: OtpSender = {
  name: "mock_otp",
  isMock: true,
  async send() {
    return { code: MOCK_OTP, ref: `otp-${crypto.randomBytes(6).toString("hex")}` };
  },
};

export function otpSender(): OtpSender {
  return mockOtpSender;
}
