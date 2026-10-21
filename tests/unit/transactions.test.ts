import { describe, expect, it } from "vitest";
import { draftProblems, draftSchema, fixedClauses, position, runningStatus, totals } from "@/lib/transactions";
import { REFERENCE_RE } from "@/server/transactions/verify";

// Part 9 Business Security rules (PRD v3.0 8.3 and 8.6).
describe("amounts (v3 8.3)", () => {
  it("works out each line with GST and the total, as in Figure 19", () => {
    const t = totals([
      { product: "TMT 12 mm", qty: 20, unit: "MT", ratePaise: 52_000_00, gstBp: 1800 },
      { product: "TMT 16 mm", qty: 8, unit: "MT", ratePaise: 51_500_00, gstBp: 1800 },
    ]);
    expect(t.lines.map((l) => l.amountPaise)).toEqual([12_27_200_00, 4_86_160_00]);
    expect(t.totalPaise).toBe(17_13_360_00);
  });

  it("checks the S13 rules: invoice for goods, principal for loans, due date after invoice, paid within total", () => {
    const base = draftSchema.parse({ type: "seller", counterpartyId: crypto.randomUUID(), invoiceDate: "2026-10-14", dueDate: "2026-11-13", items: [] });
    expect(Object.keys(draftProblems(base, "2026-10-18")).sort()).toEqual(["invoiceNo", "items", "placeOfSupply"]);
    const loan = draftSchema.parse({ type: "lender", counterpartyId: crypto.randomUUID(), invoiceDate: "2026-10-14", dueDate: "2026-10-10", principalPaise: 500_00, paidNowPaise: 600_00 });
    expect(Object.keys(draftProblems(loan, "2026-10-18")).sort()).toEqual(["dueDate", "paidNowPaise", "principalPaise"]);
  });
});

describe("interest and payments (v3 8.6)", () => {
  const base = { openingPaise: 15_13_360_00, dueDate: "2026-11-13", rateBp: 1800 };

  it("charges nothing before the due date, then balance × rate × days / 365", () => {
    expect(position({ ...base, payments: [], today: "2026-11-13" }).interestPaise).toBe(0);
    const p = position({ ...base, payments: [], today: "2026-12-13" }); // 30 days overdue
    expect(p.daysOverdue).toBe(30);
    expect(p.interestPaise).toBe(Math.floor((15_13_360_00 * 1800 * 30) / (10_000 * 365)));
  });

  it("pays accrued interest first, then principal, and keeps accruing on what is left", () => {
    const p = position({ ...base, payments: [{ paidOn: "2026-12-13", amountPaise: 5_00_000_00 }], today: "2027-01-12" });
    const firstInterest = Math.floor((15_13_360_00 * 1800 * 30) / (10_000 * 365));
    expect(p.allocations[0]).toMatchObject({ interestPaise: firstInterest, principalPaise: 5_00_000_00 - firstInterest });
    const left = 15_13_360_00 - (5_00_000_00 - firstInterest);
    expect(p.principalPaise).toBe(left);
    expect(p.interestPaise).toBe(Math.floor((left * 1800 * 30) / (10_000 * 365)));
  });

  it("moves to Partly paid, Overdue and Paid from the numbers", () => {
    const paid = position({ ...base, payments: [{ paidOn: "2026-11-01", amountPaise: 15_13_360_00 }], today: "2026-11-20" });
    expect(runningStatus(paid, true, base.dueDate, "2026-11-20")).toBe("paid");
    const part = position({ ...base, payments: [{ paidOn: "2026-11-01", amountPaise: 1_00_000_00 }], today: "2026-11-05" });
    expect(runningStatus(part, true, base.dueDate, "2026-11-05")).toBe("partially_paid");
    expect(runningStatus(part, true, base.dueDate, "2026-11-14")).toBe("overdue");
  });
});

describe("agreement text and references", () => {
  it("keeps the fixed clauses for each type, with interest only when a rate is set", () => {
    expect(fixedClauses("seller", { rateBp: 1800, dueDate: "13 Nov 2026", jurisdiction: "Bengaluru" }).join(" ")).toContain("18% a year");
    expect(fixedClauses("lender", { rateBp: 0, dueDate: "13 Nov 2026", jurisdiction: "Pune" }).join(" ")).not.toContain("Interest at");
  });

  it("accepts only CHB-TX and CHB-ST references on the verify page", () => {
    expect(REFERENCE_RE.test("CHB-TX-000042")).toBe(true);
    expect(REFERENCE_RE.test("CHB-ST-000001")).toBe(true);
    expect(REFERENCE_RE.test("CR-2026-000001")).toBe(false);
  });
});
