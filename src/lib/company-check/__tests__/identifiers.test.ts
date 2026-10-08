import { describe, expect, it } from "vitest";
import { detectQuery, gstinChecksumChar, isValidCin, isValidGstin } from "../identifiers";
import { formatInr, formatInrWords, rupeesToPaise } from "../money";

const withChecksum = (first14: string) => first14 + gstinChecksumChar(first14);

describe("identifiers", () => {
  it("accepts a GSTIN with a correct checksum and rejects a wrong one", () => {
    const good = withChecksum("27AAPFU0939F1Z");
    expect(good).toBe("27AAPFU0939F1ZV"); // published GSTN example
    expect(isValidGstin(good)).toBe(true);
    expect(isValidGstin("27AAPFU0939F1ZA")).toBe(false);
  });

  it("rejects unknown GST state codes", () => {
    expect(isValidGstin(withChecksum("45AAPFU0939F1Z"))).toBe(false);
  });

  it("detects what was typed", () => {
    expect(detectQuery(" 27aapfu0939f1zv ")).toEqual({ type: "GSTIN", value: "27AAPFU0939F1ZV", invalid: false });
    expect(detectQuery("27AAPFU0939F1ZA")).toMatchObject({ type: "GSTIN", invalid: true });
    expect(detectQuery("U74999MH2018PTC312345")).toMatchObject({ type: "CIN", invalid: false });
    expect(detectQuery("aab1234")).toEqual({ type: "LLPIN", value: "AAB-1234", invalid: false });
    expect(detectQuery("AAPFU0939F")).toMatchObject({ type: "PAN", invalid: false });
    expect(detectQuery("Cruise  Event")).toEqual({ type: "NAME", value: "Cruise Event", invalid: false });
  });

  it("rejects a CIN with a future incorporation year", () => {
    expect(isValidCin("U74999MH2099PTC312345", new Date("2026-10-08"))).toBe(false);
  });
});

describe("money", () => {
  it("formats Indian rupees", () => {
    expect(formatInr(rupeesToPaise(12_500_000))).toBe("₹1,25,00,000");
    expect(formatInr(rupeesToPaise(4_000))).toBe("₹4,000");
    expect(formatInrWords(rupeesToPaise(12_500_000))).toBe("₹1.25 crore");
    expect(formatInrWords(rupeesToPaise(7_000_000))).toBe("₹70 lakh");
  });
});
