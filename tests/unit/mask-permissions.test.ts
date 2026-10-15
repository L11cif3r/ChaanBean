import { describe, expect, it } from "vitest";
import { maskEmail, maskMobile, maskPan, redact, redactText } from "@/lib/mask";
import { can, capabilityPairs, CAPABILITIES } from "@/lib/permissions";

describe("masking (PRD S05, section 15)", () => {
  it("shows the first 2 and last 4 digits of a mobile", () => {
    expect(maskMobile("9876543210")).toBe("98••••3210");
    expect(maskMobile("+919876543210")).toBe("98••••3210");
  });

  it("masks PAN and email", () => {
    expect(maskPan("AAPFU0939F")).toBe("AAPFU••••F");
    expect(maskEmail("rakesh@example.com")).toBe("ra••••@example.com");
  });

  it("removes OTPs, mobiles and PANs from free text", () => {
    const out = redactText("OTP 482913 sent to +91 9876543210 for PAN AAPFU0939F");
    expect(out).not.toMatch(/482913|9876543210|AAPFU0939F/);
    expect(out).toContain("98••••3210");
  });

  it("masks sensitive keys deep inside objects but keeps other values", () => {
    const out = redact({ mobile: "9876543210", otp: "123456", nested: { pan: "AAPFU0939F", city: "Pune" }, ok: true }) as Record<string, unknown>;
    expect(out).toEqual({ mobile: "98••••3210", otp: "[redacted]", nested: { pan: "AAPFU••••F", city: "Pune" }, ok: true });
  });
});

describe("permission matrix (PRD 4.3)", () => {
  it("lets Members run checks but not manage billing or users", () => {
    expect(can("member", "check.run")).toBe(true);
    expect(can("member", "billing.manage")).toBe(false);
    expect(can("member", "team.manage")).toBe(false);
  });

  it("keeps Viewers read-only", () => {
    expect(can("viewer", "report.view")).toBe(true);
    expect(can("viewer", "report.export")).toBe(true);
    const writes = ["counterparty.manage", "check.run", "case.run", "transaction.manage", "payment.record", "settlement.manage"] as const;
    for (const c of writes) expect(can("viewer", c)).toBe(false);
  });

  it("reserves ownership transfer and closing for the Owner", () => {
    expect(can("owner", "org.transfer_close")).toBe(true);
    expect(can("admin", "org.transfer_close")).toBe(false);
  });

  it("denies everything without a role", () => {
    expect(can(null, "dashboard.view")).toBe(false);
  });

  it("has 43 role-capability pairs, the same count seeded in the database", () => {
    expect(capabilityPairs()).toHaveLength(43);
    expect(Object.keys(CAPABILITIES)).toHaveLength(15);
  });
});
