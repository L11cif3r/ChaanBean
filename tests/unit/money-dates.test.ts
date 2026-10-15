import { describe, expect, it } from "vitest";
import { formatInr, formatInrShort, gstOn, rupeesToPaise, toJsonSafe } from "@/lib/money";
import { addDays, daysBetween, financialYear, formatDate, formatDateTimeIst, istDate, istInstant, isIsoDate } from "@/lib/dates";

describe("money", () => {
  it("formats in Indian digit grouping (PRD: ₹15,13,360)", () => {
    expect(formatInr(rupeesToPaise(1513360))).toBe("₹15,13,360");
    expect(formatInr(rupeesToPaise(999))).toBe("₹999");
    expect(formatInr(rupeesToPaise(-125000))).toBe("-₹1,25,000");
    expect(formatInr(125050n, { withPaise: true })).toBe("₹1,250.50");
  });

  it("formats short amounts for cards (PRD: ₹1.84 Cr, ₹12.6 L)", () => {
    expect(formatInrShort(rupeesToPaise(18_400_000))).toBe("₹1.84 Cr");
    expect(formatInrShort(rupeesToPaise(1_260_000))).toBe("₹12.6 L");
    expect(formatInrShort(rupeesToPaise(4000))).toBe("₹4,000");
  });

  it("computes 18% GST on plan prices exactly", () => {
    expect(gstOn(rupeesToPaise(11599), 18)).toBe(rupeesToPaise(2087.82));
    expect(gstOn(rupeesToPaise(17599), 18)).toBe(rupeesToPaise(3167.82));
  });

  it("serialises paise for JSON", () => {
    expect(toJsonSafe({ a: 150n })).toEqual({ a: 150 });
  });
});

describe("dates (IST)", () => {
  it("gives the IST calendar date of an instant", () => {
    expect(istDate(new Date("2026-10-14T18:29:00Z"))).toBe("2026-10-14");
    expect(istDate(new Date("2026-10-14T18:31:00Z"))).toBe("2026-10-15");
  });

  it("builds the instant of an IST wall-clock time (overdue job at 00:30 IST)", () => {
    expect(istInstant("2026-10-15", "00:30").toISOString()).toBe("2026-10-14T19:00:00.000Z");
  });

  it("does date arithmetic on calendar dates", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-10-14", "2026-11-13")).toBe(30);
  });

  it("formats as DD MMM YYYY", () => {
    expect(formatDate("2027-03-05")).toBe("05 Mar 2027");
    expect(formatDateTimeIst(new Date("2026-10-14T08:37:00Z"))).toBe("14 Oct 2026, 14:07 IST");
  });

  it("knows the Indian financial year", () => {
    expect(financialYear("2026-04-01")).toBe("2026-27");
    expect(financialYear("2027-03-31")).toBe("2026-27");
    expect(financialYear("2026-03-31")).toBe("2025-26");
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("14/10/2026")).toBe(false);
  });
});
