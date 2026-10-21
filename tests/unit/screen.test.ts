import { describe, expect, it } from "vitest";
import { screenResult } from "@/lib/screen";
import type { CompanyData, GstSearchData } from "@/lib/checks";

// PRD v4.0 7.2: quick screen rules from public records.
const month = (i: number, filed = true, onTime = true) => ({ period: `2026-${String(12 - i).padStart(2, "0")}`, filed, onTime });
const gst = (over: Partial<GstSearchData> = {}): GstSearchData => ({
  gstin: "29AAPFQ4691F2ZL", legalName: "OM", tradeName: null, status: "Active", registrationDate: "2015-04-01", constitution: "Company",
  taxpayerType: "Regular", address: "", gstinsOnPan: [{ gstin: "29AAPFQ4691F2ZL", state: "Karnataka", status: "Active" }],
  filings: Array.from({ length: 12 }, (_, i) => month(i)), lastReturnPeriod: "2026-09", ...over,
});
const co = (over: Partial<CompanyData> = {}): CompanyData => ({
  cin: "U1", name: "OM", status: "Active", incorporationDate: "2012-01-01", companyClass: "Private", category: "", authorisedCapitalPaise: 0,
  paidUpCapitalPaise: 50_00_000 * 100, registeredOffice: "", lastAgmDate: null, lastBalanceSheetDate: null, charges: [], ...over,
});
const today = "2026-10-20";

describe("quick screen", () => {
  it("looks good with clean records, and not enough data without any", () => {
    expect(screenResult(gst(), co(), today).result).toBe("looks_good");
    expect(screenResult(null, null, today).result).toBe("not_enough_data");
    expect(screenResult(gst(), co(), today).facts).toMatchObject({ filed12: 12, months12: 12, yearsInBusiness: 14, state: "Karnataka" });
  });

  it("avoids a cancelled GSTIN on the PAN, a struck-off company, or no returns for 6 months", () => {
    expect(screenResult(gst({ gstinsOnPan: [{ gstin: "27AAPFQ4691F1ZM", state: "Maharashtra", status: "Cancelled" }] }), co(), today).result).toBe("avoid");
    expect(screenResult(gst(), co({ status: "Strike Off" }), today).reasons[0]).toEqual({ key: "mcaStatus", values: { status: "Strike Off" } });
    const none = gst({ filings: Array.from({ length: 12 }, (_, i) => month(i, i >= 6)) });
    expect(screenResult(none, co(), today).result).toBe("avoid");
  });

  it("asks to check further for late returns, a young business or low capital", () => {
    expect(screenResult(gst({ filings: [month(0, true, false), month(1, false), ...Array.from({ length: 10 }, (_, i) => month(i + 2))] }), co(), today).result).toBe("check_further");
    expect(screenResult(gst({ registrationDate: "2025-06-01" }), co({ incorporationDate: "2025-05-01" }), today).reasons).toEqual([{ key: "young", values: { years: 1 } }]);
    expect(screenResult(null, co({ paidUpCapitalPaise: 10_000 * 100 }), today).reasons).toEqual([{ key: "lowCapital" }]);
  });
});
