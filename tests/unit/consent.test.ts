import { describe, expect, it } from "vitest";
import {
  CONSENT_RULES, ageOn, consentDataHidden, needsGst, recentDecline, reusableConsent, sendAllowance, type ConsentSummary,
} from "@/lib/consent";

// Part 7 consent rules (PRD S09 "States and rules", S10, FR-CON-01–07).
const now = new Date("2026-10-16T10:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const consent = (over: Partial<ConsentSummary>): ConsentSummary => ({
  id: "c1", status: "approved", scope: ["CW_GST_TURNOVER_4Y", "CW_CIBIL_COMPANY"], approvedAt: daysAgo(3), declinedAt: null,
  gstAccessUntil: daysAgo(-10), ...over,
});

describe("consent rules", () => {
  it("allows 3 requests to the same buyer in 7 days, then says from when", () => {
    expect(sendAllowance([daysAgo(1), daysAgo(2)], now)).toMatchObject({ allowed: true, sent: 2 });
    const full = sendAllowance([daysAgo(1), daysAgo(2), daysAgo(6), daysAgo(9)], now);
    expect(full.allowed).toBe(false);
    expect(full.nextAt?.toISOString()).toBe(new Date(daysAgo(6).getTime() + CONSENT_RULES.limitWindowMs).toISOString());
  });

  it("uses a yes from the last 30 days again only when it covers everything asked", () => {
    expect(reusableConsent([consent({})], ["CW_GST_TURNOVER_4Y"], now)?.id).toBe("c1");
    expect(reusableConsent([consent({})], ["CW_GST_TURNOVER_4Y", "CW_CIBIL_PERSONAL"], now)).toBeNull();
    expect(reusableConsent([consent({ approvedAt: daysAgo(31) })], ["CW_GST_TURNOVER_4Y"], now)).toBeNull();
    expect(reusableConsent([consent({ status: "withdrawn" })], ["CW_GST_TURNOVER_4Y"], now)).toBeNull();
  });

  it("does not reuse GST consent once the GST portal access has ended", () => {
    const lapsed = consent({ gstAccessUntil: daysAgo(1) });
    expect(reusableConsent([lapsed], ["CW_GST_TURNOVER_4Y"], now)).toBeNull();
    expect(reusableConsent([lapsed], ["CW_CIBIL_COMPANY"], now)?.id).toBe("c1");
  });

  it("warns when the buyer said no in the last 7 days", () => {
    expect(recentDecline([consent({ status: "declined", declinedAt: daysAgo(2) })], now)?.toISOString()).toBe(daysAgo(2).toISOString());
    expect(recentDecline([consent({ status: "declined", declinedAt: daysAgo(8) })], now)).toBeNull();
  });

  it("hides consent data when withdrawn or after the 30 days", () => {
    expect(consentDataHidden({ status: "withdrawn", visibleUntil: daysAgo(-20) }, now)).toBe("withdrawn");
    expect(consentDataHidden({ status: "approved", visibleUntil: daysAgo(1) }, now)).toBe("lapsed");
    expect(consentDataHidden({ status: "approved", visibleUntil: daysAgo(-1) }, now)).toBeNull();
    expect(consentDataHidden(null, now)).toBeNull();
  });

  it("knows which steps the buyer page needs, and the 18-or-over rule", () => {
    expect(needsGst(["CW_GST_TURNOVER_CY"])).toBe(true);
    expect(needsGst(["CW_CIBIL_PERSONAL"])).toBe(false);
    expect(ageOn("2008-10-17", "2026-10-16")).toBe(17);
    expect(ageOn("2008-10-16", "2026-10-16")).toBe(18);
  });
});
