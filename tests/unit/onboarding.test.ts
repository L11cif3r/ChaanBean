import { describe, expect, it } from "vitest";
import { gstinChecksumChar } from "@/lib/validators";
import { mockIdentityProvider } from "@/server/providers/identity/mock";
import { completeSchema, profileSchema, workEmail } from "@/server/onboarding/schemas";

const gstinWith = (entity: string) => {
  const first14 = `29AAPFU0939F${entity}Z`;
  return first14 + gstinChecksumChar(first14);
};

describe("mock identity provider scenarios (S02 paths)", () => {
  it("returns an active registration with state and constitution", async () => {
    const r = await mockIdentityProvider.searchGstin(gstinWith("1"));
    expect(r.status).toBe("success");
    expect(r.data).toMatchObject({ status: "Active", stateName: "Karnataka", constitution: "Partnership" });
  });

  it("covers cancelled, suspended, not found and provider down", async () => {
    expect((await mockIdentityProvider.searchGstin(gstinWith("9"))).data?.status).toBe("Cancelled");
    expect((await mockIdentityProvider.searchGstin(gstinWith("8"))).data?.status).toBe("Suspended");
    expect((await mockIdentityProvider.searchGstin(gstinWith("7"))).status).toBe("no_data");
    expect((await mockIdentityProvider.searchGstin(gstinWith("6"))).status).toBe("not_available");
  });

  it("verifies a PAN and reports a missing one", async () => {
    expect((await mockIdentityProvider.verifyPan("ABCPK1234L", "Rakesh Kumar")).data).toMatchObject({ status: "Valid", holderType: "Proprietorship" });
    expect((await mockIdentityProvider.verifyPan("ABCPK0000L", "Rakesh Kumar")).status).toBe("no_data");
  });
});

describe("S02 field rules", () => {
  it("blocks disposable email domains", () => {
    expect(workEmail.safeParse("anita@steeltraders.in").success).toBe(true);
    expect(workEmail.safeParse("anita@mailinator.com").success).toBe(false);
    expect(workEmail.safeParse("not-an-email").success).toBe(false);
  });

  it("needs a real name and designation", () => {
    expect(profileSchema.safeParse({ fullName: "Anita Rao", designation: "Accountant", workEmail: "a@b.in" }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: "A", designation: "Accountant", workEmail: "a@b.in" }).success).toBe(false);
    expect(profileSchema.safeParse({ fullName: "Anita 99", designation: "Accountant", workEmail: "a@b.in" }).success).toBe(false);
  });

  it("requires both confirmations, with the PRD messages", () => {
    const r = completeSchema.safeParse({
      method: "gstin",
      lookupId: "8b3c5d1e-1111-4111-8111-111111111111",
      profile: { fullName: "Anita Rao", designation: "Accountant", workEmail: "a@b.in" },
      authority: false,
      terms: false,
    });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toContain("Please confirm you can act for this business.");
    expect(messages).toContain("Please accept the Terms of Use and Privacy Notice.");
  });
});
