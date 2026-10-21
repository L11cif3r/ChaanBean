import { describe, expect, it } from "vitest";
import { exampleReport, projectFullYear } from "@/lib/example-report";

// The example report shown before a company is chosen, and the run-rate projection on the turnover chart.
describe("projectFullYear", () => {
  const months = (n: number, each: number) => Array.from({ length: n }, () => ({ turnoverPaise: each }));

  it("projects a part-filed year at the pace of the months filed", () => {
    expect(projectFullYear({ turnoverPaise: 600, partial: true, months: months(6, 100) })).toBe(1200);
    expect(projectFullYear({ turnoverPaise: 300, partial: true, months: months(3, 100) })).toBe(1200);
  });

  it("leaves complete years and empty years alone", () => {
    expect(projectFullYear({ turnoverPaise: 1200, partial: false, months: months(12, 100) })).toBeNull();
    expect(projectFullYear({ turnoverPaise: 0, partial: true, months: [] })).toBeNull();
    expect(projectFullYear({ turnoverPaise: 1200, partial: true, months: months(12, 100) })).toBeNull();
  });
});

describe("exampleReport", () => {
  it("has 12 filing periods ending last month, four full years and a part year", () => {
    const ex = exampleReport(new Date(Date.UTC(2026, 9, 21)));
    expect(ex.gst.filings).toHaveLength(12);
    expect(ex.gst.filings[0].period).toBe("2026-09");
    expect(ex.gst.lastReturnPeriod).toBe("2026-09");
    expect(ex.turnover.years.filter((y) => !y.partial)).toHaveLength(4);
    const cur = ex.turnover.years.at(-1)!;
    expect(cur).toMatchObject({ fy: "2026-27", partial: true });
    expect(cur.months).toHaveLength(6); // April to September
  });

  it("puts the safe range at 1% to 2% of the last full year", () => {
    const ex = exampleReport(new Date(Date.UTC(2026, 9, 21)));
    const base = ex.turnover.years.filter((y) => !y.partial).at(-1)!.turnoverPaise;
    expect(ex.range).toEqual({ lowPaise: Math.round(base * 0.01), highPaise: Math.round(base * 0.02), basePaise: base });
  });

  it("works in April, when the new year has just started", () => {
    const ex = exampleReport(new Date(Date.UTC(2027, 3, 5)));
    expect(ex.turnover.years.at(-1)!.fy).toBe("2027-28");
    expect(ex.turnover.years.at(-1)!.months.length).toBeGreaterThanOrEqual(1);
  });
});
