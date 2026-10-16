import { describe, expect, it } from "vitest";
import { createCounterpartySchema, rateToBp, updateCounterpartySchema } from "@/lib/counterparties";
import { maskMobile } from "@/lib/mask";
import { gstinChecksumChar } from "@/lib/validators";
import { upiProvider } from "@/server/providers/upi";

const gstin = (() => {
  const first14 = "27AABCK1234K1Z";
  return first14 + gstinChecksumChar(first14);
})();

const base = {
  legalName: "Om Builders Private Limited",
  contactName: "Ramesh Kumar",
  mobile: "98765 43213",
  address: { line: "12, Industrial Estate, MIDC", city: "Pune", state: "Maharashtra", pincode: "411019" },
};

const errorsOf = (input: unknown) => {
  const r = createCounterpartySchema.safeParse(input);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("S06 field rules (FR-CP-01)", () => {
  it("accepts each of the three types with the identifier it needs", () => {
    expect(createCounterpartySchema.safeParse({ ...base, type: "business_gstin", gstin }).success).toBe(true);
    expect(createCounterpartySchema.safeParse({ ...base, type: "business_pan", pan: "AABCK1234K" }).success).toBe(true);
    expect(createCounterpartySchema.safeParse({ ...base, type: "individual", pan: "ABCPK1234L" }).success).toBe(true);
  });

  it("uses the PRD's messages for a bad GSTIN, PAN, CIN and Udyam number", () => {
    expect(errorsOf({ ...base, type: "business_gstin", gstin: "27AABCK1234K1Z0" }).gstin).toBe("This GSTIN is not valid.");
    expect(errorsOf({ ...base, type: "business_pan", pan: "12345" }).pan).toBe("This PAN is not valid.");
    expect(errorsOf({ ...base, type: "individual", pan: "AABCK1234K" }).pan).toMatch(/4th character/);
    expect(errorsOf({ ...base, type: "business_gstin", gstin, cin: "X123" }).cin).toBe("This CIN is not valid.");
    expect(errorsOf({ ...base, type: "business_gstin", gstin, udyam: "UDYAM-1" }).udyam).toBe("This Udyam number is not valid.");
  });

  it("needs a valid mobile, contact name and full address with PIN code", () => {
    const e = errorsOf({ ...base, type: "business_gstin", gstin, mobile: "12345", contactName: "A", address: { ...base.address, pincode: "0123" } });
    expect(e.mobile).toBe("Enter a valid mobile number.");
    expect(e.contactName).toBe("Enter a contact name.");
    expect(e["address.pincode"]).toBe("Enter a complete address with PIN code.");
  });

  it("limits credit days, interest and tags, and stores tags once in lower case", () => {
    expect(errorsOf({ ...base, type: "business_gstin", gstin, creditDays: 400 }).creditDays).toBe("Enter days between 0 and 365.");
    expect(errorsOf({ ...base, type: "business_gstin", gstin, interestRate: 36.5 }).interestRate).toBe("Enter a rate between 0% and 36%.");
    expect(errorsOf({ ...base, type: "business_gstin", gstin, interestRate: 12.345 }).interestRate).toBe("Enter a rate between 0% and 36%.");
    const ok = createCounterpartySchema.parse({ ...base, type: "business_gstin", gstin, interestRate: 18.25, tags: ["Pune", "pune", "Wholesale"] });
    expect(ok.tags).toEqual(["pune", "wholesale"]);
    expect(ok.mobile).toBe("9876543213");
    expect(rateToBp(ok.interestRate)).toBe(1825);
    expect(errorsOf({ ...base, type: "business_gstin", gstin, tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }).tags).toMatch(/10 tags/);
  });

  it("lets the S07 edit clear WhatsApp and email, and caps notes at 2,000 characters", () => {
    expect(updateCounterpartySchema.parse({ whatsapp: null, email: null })).toMatchObject({ whatsapp: null, email: null });
    expect(updateCounterpartySchema.safeParse({ notes: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("mock UPI lookup (FR-CP-03)", () => {
  it("covers linked, not linked and unavailable", async () => {
    const linked = await upiProvider().lookup("9876543213");
    expect(linked.status).toBe("success");
    expect(linked.data?.linked).toBe(true);
    expect(linked.data?.name).toMatch(/^[A-Z ]+$/);
    expect((await upiProvider().lookup("9876543210")).data).toEqual({ linked: false, name: null });
    expect((await upiProvider().lookup("9876543219")).status).toBe("not_available");
  });
});

describe("masking", () => {
  it("does not change a mobile that is already masked", () => {
    expect(maskMobile("9876543213")).toBe("98••••3213");
    expect(maskMobile(maskMobile("9876543213"))).toBe("98••••3213");
  });
});
