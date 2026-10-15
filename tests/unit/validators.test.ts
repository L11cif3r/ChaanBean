import { describe, expect, it } from "vitest";
import {
  gstinChecksumChar,
  isIndividualPan,
  isValidCin,
  isValidGstin,
  isValidIec,
  isValidPan,
  isValidPinCode,
  isValidUdyam,
  normaliseMobile,
  panFromGstin,
  panHolderType,
  stateCodeFromGstin,
  toE164,
} from "@/lib/validators";

const withChecksum = (first14: string) => first14 + gstinChecksumChar(first14);

describe("GSTIN", () => {
  it("accepts a GSTIN with a correct checksum, in any case and with spaces", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin(" 27aapfu0939f1zv ")).toBe(true);
  });

  it("rejects a wrong checksum, unknown state codes and a bad embedded PAN", () => {
    expect(isValidGstin("27AAPFU0939F1ZA")).toBe(false);
    expect(isValidGstin(withChecksum("45AAPFU0939F1Z"))).toBe(false);
    expect(isValidGstin(withChecksum("27AAPXU0939F1Z"))).toBe(false); // X is not a PAN holder type
  });

  it("extracts the PAN and state code", () => {
    expect(panFromGstin("27AAPFU0939F1ZV")).toBe("AAPFU0939F");
    expect(stateCodeFromGstin("27AAPFU0939F1ZV")).toBe("27");
  });
});

describe("PAN", () => {
  it("checks format and the holder type in the 4th character", () => {
    expect(isValidPan("AAPFU0939F")).toBe(true);
    expect(isValidPan("ABCPX1234Z")).toBe(true);
    expect(isValidPan("ABCXX1234Z")).toBe(false);
    expect(isValidPan("ABCP1234Z")).toBe(false);
    expect(panHolderType("AAPFU0939F")).toBe("F");
  });

  it("knows an individual's PAN (S06 type 3)", () => {
    expect(isIndividualPan("ABCPX1234Z")).toBe(true);
    expect(isIndividualPan("AAPFU0939F")).toBe(false);
  });
});

describe("other identifiers", () => {
  it("validates CIN including a plausible year", () => {
    expect(isValidCin("U74999MH2016PTC312345", new Date("2026-10-14"))).toBe(true);
    expect(isValidCin("U74999MH2099PTC312345", new Date("2026-10-14"))).toBe(false);
  });

  it("validates Udyam, IEC and PIN codes", () => {
    expect(isValidUdyam("UDYAM-KA-03-0012345")).toBe(true);
    expect(isValidUdyam("UDYAM-KA-3-0012345")).toBe(false);
    expect(isValidIec("AAPFU0939F")).toBe(true);
    expect(isValidIec("AAPFU0939")).toBe(false);
    expect(isValidPinCode("560001")).toBe(true);
    expect(isValidPinCode("060001")).toBe(false);
  });
});

describe("mobile", () => {
  it("normalises the ways people type Indian numbers", () => {
    expect(normaliseMobile("98765 43210")).toBe("9876543210");
    expect(normaliseMobile("+91 98765-43210")).toBe("9876543210");
    expect(normaliseMobile("919876543210")).toBe("9876543210");
    expect(normaliseMobile("09876543210")).toBe("9876543210");
  });

  it("rejects numbers that cannot be Indian mobiles", () => {
    expect(normaliseMobile("5876543210")).toBeNull();
    expect(normaliseMobile("98765")).toBeNull();
    expect(normaliseMobile("+1 415 555 0100")).toBeNull();
  });

  it("formats for Supabase phone sign-in", () => {
    expect(toE164("9876543210")).toBe("+919876543210");
  });
});
