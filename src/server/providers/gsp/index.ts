import "server-only";
import crypto from "node:crypto";

// GST portal access for GST turnover (PRD v1.0 5.4 step 4, FR-CON-04). The buyer turns on API access on the GST portal
// (My Profile, Manage API Access) and gives the GST username; GSTN sends an OTP that the buyer types on our page; the
// GSP returns a session token used to fetch the filed returns. Only a mock exists until the GSP contract is signed.
//
// Mock scenarios: a username containing "noapi" has API access turned off; "unknown" is not a GST portal user;
// "down" means the GSP is not answering. The GSTN OTP is 123456.

export type GspError = "API_ACCESS_OFF" | "USER_NOT_FOUND" | "INVALID_OTP" | "OTP_EXPIRED" | "PROVIDER_DOWN";

export interface GspProvider {
  name: string;
  isMock: boolean;
  requestOtp(input: { gstin: string; username: string }): Promise<{ ok: true; ref: string } | { ok: false; error: GspError }>;
  verifyOtp(input: { gstin: string; username: string; ref: string; otp: string }): Promise<
    { ok: true; token: string; expiresAt: Date } | { ok: false; error: GspError }
  >;
}

export const MOCK_GSTN_OTP = "123456";

export const mockGspProvider: GspProvider = {
  name: "mock_gsp",
  isMock: true,
  async requestOtp({ username }) {
    const u = username.toLowerCase();
    if (u.includes("down")) return { ok: false, error: "PROVIDER_DOWN" };
    if (u.includes("unknown")) return { ok: false, error: "USER_NOT_FOUND" };
    if (u.includes("noapi")) return { ok: false, error: "API_ACCESS_OFF" };
    return { ok: true, ref: `gsp-${crypto.randomBytes(6).toString("hex")}` };
  },
  async verifyOtp({ otp }) {
    if (otp !== MOCK_GSTN_OTP) return { ok: false, error: "INVALID_OTP" };
    // The GST portal lets the taxpayer allow API access for up to 30 days.
    return { ok: true, token: `mock-gsp-token-${crypto.randomBytes(12).toString("hex")}`, expiresAt: new Date(Date.now() + 30 * 86_400_000) };
  },
};

export function gspProvider(): GspProvider {
  return mockGspProvider;
}
