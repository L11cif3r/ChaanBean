import { describe, expect, it } from "vitest";
import { caseInputSchema, nameSimilarity, scoreMatch, type CaseCandidate, type CaseInput } from "@/lib/cases";
import { evaluateReport } from "@/lib/report-rules";
import { mockCaseProvider } from "@/server/providers/cases";

// Part 8 Case Check rules (PRD v3.0 section 7, FR-CC-02–08).
const today = "2026-10-18";
const input: CaseInput = { name: "Kaveri Steel Distributors", state: "29", district: "Bengaluru Urban", address: "Peenya, Bengaluru" };
const candidate = (over: Partial<CaseCandidate> = {}, subject: Partial<CaseCandidate["subject"]> = {}): CaseCandidate => ({
  sourceId: "x", caseNo: "CC 1/2026", court: "CJM", caseType: "Cheque bounce", filedOn: "2026-01-01", status: "Pending", pending: true,
  nextHearing: null, parties: [], acts: [], recovery: true, details: {},
  subject: { name: "Kaveri Steel Distributors", relativeName: null, district: "Bengaluru Urban", stateCode: "29", pan: null, ...subject },
  ...over,
});

describe("match confidence (FR-CC-03)", () => {
  it("ignores company suffixes and punctuation when comparing names", () => {
    expect(nameSimilarity("M/s. Kaveri Steel Distributors Pvt Ltd", "KAVERI STEEL DISTRIBUTORS")).toBe(1);
    expect(nameSimilarity("Kaveri Traders", "Kaveri Steel Distributors")).toBeCloseTo(1 / 3);
  });

  it("is High for the same name in the same district, lower elsewhere or with another father's name", () => {
    expect(scoreMatch(input, candidate()).confidence).toBe("high");
    expect(scoreMatch(input, candidate({}, { district: null, stateCode: "27" })).confidence).toBe("medium");
    expect(scoreMatch({ ...input, relativeName: "Ravi Rao" }, candidate({}, { relativeName: "Suresh Iyer", district: null, stateCode: "27" })).confidence).toBe("low");
    expect(scoreMatch(input, candidate({}, { name: "Kaveri Kumar", stateCode: "27", district: null })).confidence).toBe("low");
  });

  it("treats a matching PAN as decisive and a different PAN as a weak match", () => {
    const withPan = { ...input, pan: "AAPFK1234K" };
    expect(scoreMatch(withPan, candidate({}, { name: "K S Distributors", pan: "AAPFK1234K", district: null })).confidence).toBe("high");
    expect(scoreMatch(withPan, candidate({}, { pan: "BBBBB1111B" })).confidence).toBe("low");
  });

  it("keeps a watchlist provider's score within what the name allows", () => {
    expect(scoreMatch(input, candidate({ providerScore: 92 })).score).toBe(92);
    expect(scoreMatch(input, candidate({ providerScore: 92 }, { name: "Someone Else" })).confidence).toBe("low");
  });
});

describe("search details (S12 fields)", () => {
  it("needs name, state, district and address, and checks the optional ones", () => {
    expect(caseInputSchema.safeParse(input).success).toBe(true);
    const bad = caseInputSchema.safeParse({ ...input, state: "", pan: "123", mobile: "12" });
    expect(bad.success).toBe(false);
    expect(Object.keys(bad.error!.flatten().fieldErrors).sort()).toEqual(["mobile", "pan", "state"]);
  });
});

describe("mock case provider", () => {
  it("returns ranked court cases, no records, too many matches, and FIR coverage by state", async () => {
    const r = await mockCaseProvider.run("CC_COURT", input, { today });
    expect(r.status).toBe("success");
    expect(r.data!.matches.map((m) => scoreMatch(input, m).confidence)).toEqual(["high", "medium", "low"]);
    expect((await mockCaseProvider.run("CC_COURT", { ...input, name: "Clean Traders" }, { today })).status).toBe("no_data");
    const many = await mockCaseProvider.run("CC_COURT", { ...input, name: "Common Name" }, { today });
    expect(many.error).toMatchObject({ code: "TOO_MANY_MATCHES", retryable: false });
    expect((await mockCaseProvider.run("CC_FIR", { ...input, state: "10" }, { today })).error?.code).toBe("STATE_NOT_COVERED");
  });

  it("finds a watchlist hit only for the test names", async () => {
    expect((await mockCaseProvider.run("CC_AML", input, { today })).status).toBe("no_data");
    const hit = await mockCaseProvider.run("CC_AML", { ...input, name: "Sanction Test Exports" }, { today });
    expect(hit.data!.matches[0]).toMatchObject({ listName: "UN Security Council Consolidated List", providerScore: 92 });
  });
});

describe("confirmed cases in the credit report (v3 6.7)", () => {
  it("makes the risk Medium for a confirmed pending recovery case, High for a confirmed watchlist hit", () => {
    expect(evaluateReport({ cases: { pendingChequeBounce: 1, amlHit: false }, cibil: [], today }).signals.map((s) => s.key)).toContain("pending_cases");
    expect(evaluateReport({ cases: { pendingChequeBounce: 0, amlHit: true }, today }).level).toBe("high");
  });
});
