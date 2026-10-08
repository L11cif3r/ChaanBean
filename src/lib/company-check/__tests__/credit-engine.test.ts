import { describe, expect, it } from "vitest";
import { assessCredit, type CreditEngineInput, type GstFilingInput } from "../credit-engine";
import { POLICY_V1 } from "../policy-v1";
import { ONE_CRORE_PAISE, ONE_LAKH_PAISE, rupeesToPaise } from "../money";

const AS_OF = "2026-10-08";

/** 12 monthly GSTR-3B returns before AS_OF; `late` of them filed after the due date. */
function gst3b(late: number): GstFilingInput[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(2025, 9 + i, 20)); // due 20th, Oct 2025 … Sep 2026
    const due = d.toISOString().slice(0, 10);
    const filed = new Date(d.getTime() + (i < late ? 5 : -1) * 86_400_000).toISOString().slice(0, 10);
    return { returnType: "GSTR3B", taxPeriod: "", dueDate: due, filedOn: filed };
  });
}

const fy = (revenues: bigint[]) =>
  revenues.map((r, i) => ({ fiscalYear: `${2021 + i}-${String(22 + i).padStart(2, "0")}`, revenuePaise: r }));

function base(over: Partial<CreditEngineInput>): CreditEngineInput {
  return {
    asOf: AS_OF,
    entityRegisteredWithMca: true,
    companyStatus: "ACTIVE",
    gstStatuses: ["ACTIVE"],
    incorporationDate: "2012-04-01",
    lastBalanceSheetDate: "2025-03-31",
    financials: [],
    gstFilings: gst3b(0),
    activeDirectors: 3,
    disqualifiedDirectors: 0,
    openChargesPaise: 0n,
    requestedPaise: null,
    ...over,
  };
}

describe("credit engine policy v1 (PRD §9.4 worked examples)", () => {
  it("A. growing company: ₹25 cr → ₹100 cr gives ₹1.25 crore, low risk", () => {
    const r = assessCredit(
      base({ financials: fy([25n, 45n, 70n, 100n].map((c) => c * ONE_CRORE_PAISE)) }),
      POLICY_V1,
    );
    expect(r.turnoverCagr).toBeCloseTo(0.5874, 3);
    expect(r.multipliers).toEqual({ growth: 1.25, gst: 1, age: 1 });
    expect(r.recommendedLimitPaise).toBe(125n * ONE_LAKH_PAISE);
    expect(r.riskBand).toBe("LOW");
    expect(r.confidence).toBe("HIGH");
  });

  it("B. declining company asking ₹50 lakh: limit ₹4,000, 1,250× the limit, high risk", () => {
    const r = assessCredit(
      base({
        financials: fy([100n, 60n, 25n, 10n].map((l) => l * ONE_LAKH_PAISE)),
        gstFilings: gst3b(3), // 9 of 12 on time = 75 %
        requestedPaise: 50n * ONE_LAKH_PAISE,
      }),
      POLICY_V1,
    );
    expect(r.turnoverCagr).toBeCloseTo(-0.5358, 3);
    expect(r.gstOnTimeRatio).toBe(0.75);
    expect(r.multipliers).toEqual({ growth: 0.5, gst: 0.85, age: 1 });
    expect(r.recommendedLimitPaise).toBe(rupeesToPaise(4_000));
    expect(r.exceedsLimit).toBe(true);
    expect(r.exceedRatio).toBe(1250);
    expect(r.requestVerdict).toBe("HIGH_RISK");
  });

  it("C. stable company: ₹70 cr → ₹70 lakh (Praveen's example)", () => {
    const r = assessCredit(
      base({
        financials: fy([6050n, 6300n, 6650n, 7000n].map((l) => l * ONE_LAKH_PAISE)),
        gstFilings: gst3b(1), // 11/12 ≈ 91.7 %
        requestedPaise: 70n * ONE_LAKH_PAISE,
      }),
      POLICY_V1,
    );
    expect(r.turnoverCagr).toBeCloseTo(0.0498, 3);
    expect(r.recommendedLimitPaise).toBe(70n * ONE_LAKH_PAISE);
    expect(r.requestVerdict).toBe("WITHIN_LIMIT");
  });

  it("D. ₹10 cr → ₹70 cr gives ₹87.5 lakh (does not match the ₹20 lakh said on the call; flagged)", () => {
    const r = assessCredit(base({ financials: fy([10n, 20n, 40n, 70n].map((c) => c * ONE_CRORE_PAISE)) }), POLICY_V1);
    expect(r.recommendedLimitPaise).toBe(rupeesToPaise(87_50_000));
  });

  it("request between 1× and 2× the limit is ABOVE_LIMIT, not HIGH_RISK", () => {
    const r = assessCredit(
      base({ financials: fy([7000n, 7000n, 7000n, 7000n].map((l) => l * ONE_LAKH_PAISE)), requestedPaise: 100n * ONE_LAKH_PAISE }),
      POLICY_V1,
    );
    expect(r.recommendedLimitPaise).toBe(70n * ONE_LAKH_PAISE);
    expect(r.requestVerdict).toBe("ABOVE_LIMIT");
  });
});

describe("hard stops and missing data", () => {
  it("struck-off company: limit 0, VERY_HIGH", () => {
    const r = assessCredit(
      base({ companyStatus: "STRIKE_OFF", financials: fy([5n, 5n, 5n, 5n].map((c) => c * ONE_CRORE_PAISE)), requestedPaise: ONE_LAKH_PAISE }),
      POLICY_V1,
    );
    expect(r.hardStops).toContain("MCA_STRIKE_OFF");
    expect(r.recommendedLimitPaise).toBe(0n);
    expect(r.riskBand).toBe("VERY_HIGH");
    expect(r.requestVerdict).toBe("HIGH_RISK");
  });

  it("every GSTIN cancelled is a hard stop", () => {
    const r = assessCredit(base({ gstStatuses: ["CANCELLED", "SUSPENDED"], financials: fy([5n].map((c) => c * ONE_CRORE_PAISE)) }), POLICY_V1);
    expect(r.hardStops).toContain("ALL_GSTIN_CANCELLED");
    expect(r.recommendedLimitPaise).toBe(0n);
  });

  it("proprietorship with GST only: INSUFFICIENT_DATA, no numeric limit, nothing invented", () => {
    const r = assessCredit(
      base({ entityRegisteredWithMca: false, companyStatus: null, financials: [], activeDirectors: null, openChargesPaise: null, lastBalanceSheetDate: null }),
      POLICY_V1,
    );
    expect(r.riskBand).toBe("INSUFFICIENT_DATA");
    expect(r.recommendedLimitPaise).toBeNull();
    expect(r.turnoverLatestPaise).toBeNull();
  });

  it("only one year of revenue: limit computed without growth, confidence LOW", () => {
    const r = assessCredit(base({ financials: fy([10n * ONE_CRORE_PAISE]) }), POLICY_V1);
    expect(r.turnoverCagr).toBeNull();
    expect(r.multipliers?.growth).toBe(1);
    expect(r.recommendedLimitPaise).toBe(10n * ONE_LAKH_PAISE);
    expect(r.confidence).toBe("LOW");
  });

  it("company under 2 years old gets the 0.75 age multiplier", () => {
    const r = assessCredit(
      base({ incorporationDate: "2025-06-01", financials: fy([4n, 4n].map((c) => c * ONE_CRORE_PAISE)) }),
      POLICY_V1,
    );
    expect(r.multipliers?.age).toBe(0.75);
    expect(r.recommendedLimitPaise).toBe(3n * ONE_LAKH_PAISE);
  });

  it("limit is capped at ₹5 crore and rounded down to ₹1,000", () => {
    const big = assessCredit(base({ financials: fy([2000n, 3000n, 5000n, 9000n].map((c) => c * ONE_CRORE_PAISE)) }), POLICY_V1);
    expect(big.recommendedLimitPaise).toBe(5n * ONE_CRORE_PAISE);
    const odd = assessCredit(base({ financials: fy([rupeesToPaise(12_34_567)]) }), POLICY_V1);
    expect(odd.recommendedLimitPaise).toBe(rupeesToPaise(12_000));
  });

  it("is deterministic", () => {
    const input = base({ financials: fy([25n, 45n, 70n, 100n].map((c) => c * ONE_CRORE_PAISE)), requestedPaise: ONE_CRORE_PAISE });
    expect(assessCredit(input, POLICY_V1)).toEqual(assessCredit(input, POLICY_V1));
  });
});
