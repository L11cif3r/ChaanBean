import { describe, expect, it } from "vitest";
import type { CibilData, GstSearchData, TurnoverData } from "@/lib/checks";
import { evaluateReport } from "@/lib/report-rules";
import { gstinChecksumChar } from "@/lib/validators";
import { mockCheckProvider } from "@/server/providers/checks";

const today = "2026-10-16";
const filings = (late: number) =>
  Array.from({ length: 12 }, (_, i) => ({ period: `p${i}`, filed: true, onTime: i >= late }));
const gst = (over: Partial<GstSearchData> = {}): GstSearchData => ({
  gstin: "27AABCK1234K1Z5", legalName: "Om Builders", tradeName: null, status: "Active", registrationDate: "2015-07-01",
  constitution: "Private Limited", taxpayerType: "Regular", address: "Pune", lastReturnPeriod: "2026-09",
  gstinsOnPan: [{ gstin: "27AABCK1234K1Z5", state: "Maharashtra", status: "Active" }], filings: filings(0), ...over,
});
const crore = 1_00_00_000_00; // ₹1 crore in paise
const turnover = (values: number[]): TurnoverData => ({
  years: values.map((v, i) => ({ fy: `${2021 + i}-${String(22 + i)}`, turnoverPaise: v * crore, partial: false })),
});
const cibil = (over: Partial<CibilData> = {}): CibilData => ({
  bureau: "CIBIL", scoreOrRank: "CMR-3", activeLoans: 2, sanctionedPaise: 0, outstandingPaise: 0, overdue: [],
  enquiries6m: 1, wilfulDefaulter: false, suitFiled: false, ...over,
});

describe("risk level (PRD v2.0 section 6, v1.0 9.2)", () => {
  it("is High for any serious problem, even without turnover or CIBIL", () => {
    expect(evaluateReport({ gst: gst({ status: "Cancelled" }), today }).level).toBe("high");
    expect(evaluateReport({ gst: gst(), cibil: [cibil({ overdue: [{ lender: "HDFC", amountPaise: 1, daysPastDue: 90 }] })], today }).level).toBe("high");
    expect(evaluateReport({ cibil: [cibil({ wilfulDefaulter: true })], today }).level).toBe("high");
  });

  it("is Not enough data without GST turnover and CIBIL", () => {
    const r = evaluateReport({ gst: gst(), today });
    expect(r.level).toBe("not_enough_data");
    expect(r.rangeNote).toBe("no_turnover");
  });

  it("is Medium with a warning sign: 31–89 days overdue, falling turnover, late returns", () => {
    expect(evaluateReport({ cibil: [cibil({ overdue: [{ lender: "X", amountPaise: 1, daysPastDue: 45 }] })], today }).level).toBe("medium");
    expect(evaluateReport({ turnover: turnover([10, 10, 10, 7.9]), today }).level).toBe("medium");
    expect(evaluateReport({ gst: gst({ filings: filings(2) }), cibil: [cibil()], today }).level).toBe("medium");
  });

  it("is Low with no warning signs and at least 3 good signs", () => {
    const r = evaluateReport({ gst: gst(), turnover: turnover([4, 5, 6, 8]), cibil: [cibil()], today });
    expect(r.level).toBe("low");
    expect(r.signals.map((s) => s.key).sort()).toEqual(["clean_bureau", "growing_turnover", "long_standing", "regular_filing"]);
  });
});

describe("safe credit range (v1.0 9.3)", () => {
  it("is 1% to 2% of last year's filed turnover", () => {
    const r = evaluateReport({ gst: gst(), turnover: turnover([4, 5, 6, 10]), cibil: [cibil()], today });
    expect(r.range).toMatchObject({ lowPaise: 0.1 * crore, highPaise: 0.2 * crore, basePaise: 10 * crore, reduced: false });
  });

  it("drops to 0.5% to 1% when turnover is falling", () => {
    const r = evaluateReport({ turnover: turnover([10, 10, 10, 7]), today });
    expect(r.range).toMatchObject({ lowPaise: 0.035 * crore, highPaise: 0.07 * crore, reduced: true });
  });

  it("gives no range when risk is High, and asks for last year's turnover when only the current year is in", () => {
    expect(evaluateReport({ gst: gst({ status: "Suspended" }), turnover: turnover([5, 6]), today }).rangeNote).toBe("high_risk");
    const cy: TurnoverData = { years: [{ fy: "2026-27", turnoverPaise: 3 * crore, partial: true }] };
    expect(evaluateReport({ turnoverCurrentYear: cy, today }).rangeNote).toBe("needs_full_year");
  });
});

describe("mock check provider scenarios", () => {
  const gstinWith = (entity: string, last = "") => {
    const first14 = `27AABCK1234K${entity}Z`;
    const g = first14 + gstinChecksumChar(first14);
    return last ? g : g;
  };
  const subject = (gstin: string) => ({ type: "business_gstin" as const, gstin, pan: gstin.slice(2, 12), cin: null, legalName: "Om Builders Private Limited", stateCode: "27" });

  it("follows the GSTIN scenarios: active, cancelled, irregular filing, provider down", async () => {
    expect(((await mockCheckProvider.run("CW_GST_SEARCH", subject(gstinWith("1")), { today })).data as GstSearchData).status).toBe("Active");
    expect(((await mockCheckProvider.run("CW_GST_SEARCH", subject(gstinWith("9")), { today })).data as GstSearchData).status).toBe("Cancelled");
    const late = (await mockCheckProvider.run("CW_GST_SEARCH", subject(gstinWith("5")), { today })).data as GstSearchData;
    expect(late.filings.filter((f) => !f.onTime)).toHaveLength(3);
    expect((await mockCheckProvider.run("CW_GST_SEARCH", subject(gstinWith("6")), { today })).status).toBe("not_available");
  });

  it("gives four full years of turnover plus the current one, and struck-off companies by CIN", async () => {
    const access = { gstToken: "mock-token", companyPan: null, incorporatedOn: null, personalPan: null, birthDate: null };
    expect((await mockCheckProvider.run("CW_GST_TURNOVER", subject(gstinWith("1")), { today })).status).toBe("not_available"); // no buyer consent
    const t = (await mockCheckProvider.run("CW_GST_TURNOVER", subject(gstinWith("1")), { today, consent: access })).data as TurnoverData;
    expect(t.years).toHaveLength(5);
    expect(t.years.filter((y) => y.partial)).toHaveLength(1);
    const struck = await mockCheckProvider.run("CW_COMPANY", { ...subject(gstinWith("1")), cin: "U51909MH2015PTC999999" }, { today });
    expect((struck.data as { status: string }).status).toBe("Strike Off");
  });
});
