import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  clampMaxAttempts, dayAfterPromiseStart, isWithinCallingHours, istDateString, istInstant, nextEligibleTime, nextSlotAfter,
} from "../policy";
import { decryptPhone, encryptPhone, last4, normalizeIndianMobile } from "../pii";
import { canTransition, normalizeProviderStatus } from "../status";
import { signAttempt, verifyAttemptSignature } from "../signing";
import { mockProvider } from "../providers/mock";
import { exotelProvider } from "../providers/exotel";
import { devAuthEnabled } from "../context";

const ist = (d: string, h: number, m = 0) => {
  const [y, mo, da] = d.split("-").map(Number);
  return istInstant(y, mo, da, h, m);
};

describe("calling window (IST)", () => {
  it("is open 09:00-17:59 and closed otherwise", () => {
    expect(isWithinCallingHours(ist("2026-03-10", 8, 59))).toBe(false);
    expect(isWithinCallingHours(ist("2026-03-10", 9, 0))).toBe(true);
    expect(isWithinCallingHours(ist("2026-03-10", 17, 59))).toBe(true);
    expect(isWithinCallingHours(ist("2026-03-10", 18, 0))).toBe(false);
  });
  it("defers to the next window start", () => {
    expect(nextEligibleTime(ist("2026-03-10", 7, 0)).toISOString()).toBe(ist("2026-03-10", 9).toISOString());
    expect(nextEligibleTime(ist("2026-03-10", 21, 30)).toISOString()).toBe(ist("2026-03-11", 9).toISOString());
    const inside = ist("2026-03-10", 11, 15);
    expect(nextEligibleTime(inside)).toBe(inside);
  });
  it("handles month rollover", () => {
    expect(nextEligibleTime(ist("2026-03-31", 23, 0)).toISOString()).toBe(ist("2026-04-01", 9).toISOString());
    expect(istDateString(ist("2026-03-31", 0, 30))).toBe("2026-03-31"); // 00:30 IST is still the 31st (UTC 30th)
  });
});

describe("cadence", () => {
  const now = ist("2026-03-10", 10);
  it("advances by the frequency inside the window", () => {
    expect(nextSlotAfter(now, "DAILY", now).toISOString()).toBe(ist("2026-03-11", 10).toISOString());
    expect(nextSlotAfter(now, "EVERY_2_DAYS", now).toISOString()).toBe(ist("2026-03-12", 10).toISOString());
    expect(nextSlotAfter(now, "WEEKLY", now).toISOString()).toBe(ist("2026-03-17", 10).toISOString());
  });
  it("does not burst catch-up calls after downtime", () => {
    const late = ist("2026-03-20", 10);
    expect(nextSlotAfter(now, "DAILY", late).getTime()).toBeGreaterThan(late.getTime());
  });
  it("waits until the day after a promised date", () => {
    expect(dayAfterPromiseStart("2026-03-31").toISOString()).toBe(ist("2026-04-01", 9).toISOString());
  });
  it("clamps attempts", () => {
    expect(clampMaxAttempts(0)).toBe(1);
    expect(clampMaxAttempts(99)).toBe(10);
  });
});

describe("phone + PII", () => {
  beforeAll(() => { process.env.COLLECT_PII_KEY = Buffer.alloc(32, 7).toString("base64"); });
  it("normalises Indian mobiles", () => {
    for (const v of ["9876543210", "09876543210", "919876543210", "+91 98765-43210"]) expect(normalizeIndianMobile(v)).toBe("+919876543210");
    for (const v of ["1234567890", "98765", "+14155550123", ""]) expect(normalizeIndianMobile(v)).toBeNull();
  });
  it("round-trips ciphertext, never contains the number, and rejects tampering", () => {
    const blob = encryptPhone("+919876543210");
    expect(blob.toString("utf8")).not.toContain("9876543210");
    expect(decryptPhone(blob)).toBe("+919876543210");
    expect(encryptPhone("+919876543210").equals(blob)).toBe(false); // random IV
    blob[blob.length - 1] ^= 1;
    expect(() => decryptPhone(blob)).toThrow();
    expect(last4("+919876543210")).toBe("3210");
  });
  it("fails closed without a key", () => {
    const k = process.env.COLLECT_PII_KEY; delete process.env.COLLECT_PII_KEY;
    expect(() => encryptPhone("+919876543210")).toThrow(/not configured/);
    process.env.COLLECT_PII_KEY = k;
  });
});

describe("status model", () => {
  it("only moves forward and terminal is final", () => {
    expect(canTransition("INITIATED", "ANSWERED")).toBe(true);
    expect(canTransition("ANSWERED", "INITIATED")).toBe(false);
    expect(canTransition("COMPLETED", "ANSWERED")).toBe(false);
    expect(canTransition("COMPLETED", "FAILED")).toBe(false);
    expect(canTransition("INITIATED", "NO_ANSWER")).toBe(true);
  });
  it("maps provider vocabularies", () => {
    expect(normalizeProviderStatus("in-progress")).toBe("ANSWERED");
    expect(normalizeProviderStatus("No-Answer")).toBe("NO_ANSWER");
    expect(normalizeProviderStatus("canceled")).toBe("FAILED");
    expect(normalizeProviderStatus("weird")).toBeNull();
  });
});

describe("webhook signing", () => {
  beforeAll(() => { process.env.COLLECT_WEBHOOK_SECRET = "unit-test-secret-0123456789"; });
  it("verifies only the matching attempt and fails closed", () => {
    const sig = signAttempt("a1");
    expect(verifyAttemptSignature("a1", sig)).toBe(true);
    expect(verifyAttemptSignature("a2", sig)).toBe(false);
    expect(verifyAttemptSignature("a1", "zz")).toBe(false);
    expect(verifyAttemptSignature("a1", null)).toBe(false);
    const s = process.env.COLLECT_WEBHOOK_SECRET; delete process.env.COLLECT_WEBHOOK_SECRET;
    expect(verifyAttemptSignature("a1", sig)).toBe(false);
    process.env.COLLECT_WEBHOOK_SECRET = s;
  });
});

describe("providers", () => {
  const req = (phone: string) => ({
    attemptId: "11111111-1111-4111-8111-111111111111", caseId: "c", organisationId: "o", toPhone: phone, debtorName: "x",
    amountDuePaise: 100, dueDate: "2026-01-01", language: "en" as const, idempotencyKey: "k", callbackUrl: null,
  });
  it("mock outcome is deterministic by last digit", async () => {
    const ok = await mockProvider.initiateCall(req("+919876543210"));
    expect(ok.accepted).toBe(true);
    expect((await mockProvider.getCallStatus(ok.providerCallId!))?.status).toBe("COMPLETED");
    expect((await mockProvider.initiateCall(req("+919876543219"))).accepted).toBe(false);
    const na = await mockProvider.initiateCall(req("+919876543215"));
    expect((await mockProvider.getCallStatus(na.providerCallId!))?.status).toBe("NO_ANSWER");
  });
  describe("exotel readiness (no network)", () => {
    const keys = ["EXOTEL_API_KEY", "EXOTEL_API_TOKEN", "EXOTEL_ACCOUNT_SID", "EXOTEL_CALLER_ID", "EXOTEL_CALL_FLOW_URL", "COLLECT_PUBLIC_BASE_URL", "CALL_AUTOMATION_POLICY_APPROVED"];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    afterEach(() => keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));
    it("is not ready without credentials and refuses to call", async () => {
      keys.forEach((k) => delete process.env[k]);
      expect(exotelProvider.isReady().ready).toBe(false);
      expect(await exotelProvider.initiateCall(req("+919876543210"))).toEqual({ accepted: false, failureReason: "PROVIDER_NOT_READY" });
    });
    it("is not ready until the calling policy is approved", () => {
      keys.slice(0, 6).forEach((k) => (process.env[k] = "x"));
      delete process.env.CALL_AUTOMATION_POLICY_APPROVED;
      expect(exotelProvider.isReady().reason).toMatch(/policy/i);
      process.env.CALL_AUTOMATION_POLICY_APPROVED = "1";
      expect(exotelProvider.isReady().ready).toBe(true);
    });
  });
});

describe("dev auth bypass gate", () => {
  it("never enables in production", () => {
    expect(devAuthEnabled({ NODE_ENV: "production", COLLECT_DEV_AUTH: "1" } as never)).toBe(false);
    expect(devAuthEnabled({ NODE_ENV: "development" } as never)).toBe(false);
    expect(devAuthEnabled({ NODE_ENV: "development", COLLECT_DEV_AUTH: "1" } as never)).toBe(true);
  });
});
