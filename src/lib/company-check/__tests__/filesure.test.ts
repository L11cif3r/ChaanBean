import { describe, expect, it } from "vitest";
import {
  aoc4ToFinancial, createFileSureProviders, fiscalYearFromPeriodEnd, masterToCharges, masterToCompany, masterToDirectors,
  mgt7ToFinancial, parseIndianDate, parseUsDate, type FsMaster,
} from "../providers/filesure";

const CIN = "U51909MH2012PTC123456";

// Shapes copied from FileSure responses; values are invented.
const MASTER: FsMaster = {
  cin: CIN,
  company: "SHARMA BUILDERS PRIVATE LIMITED",
  masterData: {
    companyData: {
      CIN: CIN, company: "SHARMA BUILDERS PRIVATE LIMITED", classOfCompany: "Private", companyCategory: "Company limited by shares",
      companySubcategory: "Non-govt company", dateOfIncorporation: "04/12/2017", whetherListedOrNot: "N", rocName: "ROC Mumbai",
      authorisedCapital: "10000000", paidUpCapital: "2500000", emailAddress: "accounts@sharma.example", llpStatus: "Active",
      dateOfLastAGM: "09/30/2025", balanceSheetDate: "03/31/2025",
      MCAMDSCompanyAddress: [
        { addressType: "Correspondence Address", streetAddress: "Elsewhere", city: "Pune" },
        { addressType: "Registered Address", streetAddress: "12 Example Road", streetAddress2: "Andheri East", city: "Mumbai", state: "Maharashtra", postalCode: "400069" },
      ],
    },
    commonData: { status: "Active", date_of_incorporation: "2017-04-12", agm_date: "2025-09-30", balance_sheet_date: "2025-03-31" },
    directorData: [
      {
        DIN: "01234567", FirstName: "Ravi", MiddleName: "", LastName: "Sharma", dateOfAppointment: "04/12/2017", DirectorDisqualified: "N",
        MCAUserRole: [
          { cin: "U99999MH2010PTC000001", designation: "Director", personType: "Signatory" }, // another company: ignored
          { cin: CIN, designation: "Managing Director", personType: "Signatory", cessationDate: "" },
        ],
      },
      { DIN: "07654321", FirstName: "Asha", LastName: "Sharma", dateOfAppointment: "01/15/2020", DirectorDisqualified: "Y", MCAUserRole: [{ cin: CIN, designation: "Director", personType: "Signatory", cessationDate: "06/30/2024" }] },
      { DIN: "bad", FirstName: "Not A Din" },
    ],
    indexChargesData: [
      { chargeId: "100000001", chargeHolderName: "Example Bank Limited", dateOfCreation: "01/09/2023", amount: "20000000", chargeStatus: "Open", dateOfSatisfaction: "" },
      { chargeId: "100000002", chargeHolderName: "Other Bank", dateOfCreation: "05/01/2019", amount: "5000000", chargeStatus: "Closed", dateOfSatisfaction: "02/28/2022" },
    ],
  },
};

const aoc = (end: string, revenueRupees: number, prefix = "ind-as") => ({
  cin: CIN, period_start: `${Number(end.slice(0, 4)) - 1}-04-01`, period_end: end, filing_scope: "standalone",
  profit_and_loss: [
    { qname: `${prefix}:RevenueFromOperations`, value: revenueRupees, unit: "INR" },
    { qname: `${prefix}:OtherIncome`, value: 1_000_000, unit: "INR" },
    { qname: `${prefix}:ProfitBeforeTax`, value: 9_000_000, unit: "INR" },
    { qname: `${prefix}:ProfitLossForPeriod`, value: 7_000_000, unit: "INR" },
  ],
  balance_sheet: [
    { qname: "in-ca:NetWorthOfCompany", value: 40_000_000, unit: "INR" },
    { qname: `${prefix}:Assets`, value: 90_000_000, unit: "INR" },
    { qname: `${prefix}:BorrowingsCurrent`, value: 5_000_000, unit: "INR" },
    { qname: `${prefix}:BorrowingsNoncurrent`, value: 15_000_000, unit: "INR" },
    { qname: "in-ca:NumberOfEmployees", value: 120, unit: "pure" },
  ],
  metadata: { source: { dateOfFiling: "28/10/2025" }, source_fileName: "Form AOC-4(XBRL)" },
});

describe("FileSure mapping", () => {
  it("parses both date formats FileSure uses and works out the financial year", () => {
    expect(parseUsDate("03/31/2026")).toBe("2026-03-31");
    expect(parseUsDate("31/03/2026")).toBeUndefined();
    expect(parseIndianDate("16/01/2026")).toBe("2026-01-16");
    expect(fiscalYearFromPeriodEnd("2025-03-31")).toBe("2024-25");
  });

  it("maps company master data", () => {
    expect(masterToCompany(MASTER)).toMatchObject({
      cin: CIN, legalName: "SHARMA BUILDERS PRIVATE LIMITED", entityType: "PRIVATE_LTD", companyStatus: "ACTIVE",
      incorporationDate: "2017-04-12", lastBalanceSheetDate: "2025-03-31", listingStatus: "Unlisted", rocCode: "ROC Mumbai",
      authorisedCapitalPaise: 1_00_00_000_00n, paidUpCapitalPaise: 25_00_000_00n,
      registeredAddress: { line1: "12 Example Road, Andheri East", city: "Mumbai", pincode: "400069" },
    });
  });

  it("keeps only this company's directors and drops personal fields", () => {
    const d = masterToDirectors(MASTER);
    expect(d).toHaveLength(2);
    expect(d[0]).toEqual({ din: "01234567", fullName: "Ravi Sharma", dinStatus: "Approved", designation: "Managing Director", appointedOn: "2017-04-12", ceasedOn: undefined, isSignatory: true });
    expect(d[1]).toMatchObject({ dinStatus: "Disqualified", ceasedOn: "2024-06-30" });
    expect(JSON.stringify(d)).not.toMatch(/PAN|contactAddress|mobile/i);
  });

  it("maps charges as open or satisfied", () => {
    expect(masterToCharges(MASTER)).toEqual([
      { chargeId: "100000001", chargeHolder: "Example Bank Limited", amountPaise: 2_00_00_000_00n, createdOn: "2023-01-09", modifiedOn: undefined, satisfiedOn: undefined, status: "OPEN" },
      { chargeId: "100000002", chargeHolder: "Other Bank", amountPaise: 50_00_000_00n, createdOn: "2019-05-01", modifiedOn: undefined, satisfiedOn: "2022-02-28", status: "SATISFIED" },
    ]);
  });

  it("maps AOC-4 facts whatever the taxonomy prefix, and MGT-7 turnover", () => {
    for (const prefix of ["ind-as", "in-gaap", "in-ca"]) {
      expect(aoc4ToFinancial(aoc("2025-03-31", 120_000_000, prefix))).toMatchObject({
        fiscalYear: "2024-25", revenueFromOperationsPaise: 12_00_00_000_00n, profitAfterTaxPaise: 70_00_000_00n,
        netWorthPaise: 4_00_00_000_00n, totalBorrowingsPaise: 2_00_00_000_00n, totalAssetsPaise: 9_00_00_000_00n,
        filingForm: "AOC-4(XBRL)", filedOn: "2025-10-28", verificationStatus: "PROVIDER_PARSED",
      });
    }
    expect(aoc4ToFinancial({ period_end: "2025-03-31", profit_and_loss: [] })).toBeNull(); // no revenue → not usable, not 0
    expect(mgt7ToFinancial({ form_type: "MGT-7A", fy_end: "2023-03-31T00:00:00.000Z", turnover: 80_000_000, net_worth: 30_000_000 })).toMatchObject({
      fiscalYear: "2022-23", revenueFromOperationsPaise: 8_00_00_000_00n, netWorthPaise: 3_00_00_000_00n, filingForm: "MGT-7A",
    });
    expect(mgt7ToFinancial({ fy_end: "2023-03-31", turnover: null })).toBeNull();
  });
});

// --------------------------------------------------------------------------- adapter with a fake FileSure

function fakeFileSure(opts: { unlocked?: boolean; aocYears?: number[]; mgtYears?: number[]; masterCin?: string; status?: Record<string, number> } = {}) {
  const calls: { method: string; path: string; key: string | null }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const path = u.pathname + u.search;
    const method = init?.method ?? "GET";
    calls.push({ method, path, key: (init?.headers as Record<string, string>)["x-api-key"] ?? null });
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    const forced = Object.entries(opts.status ?? {}).find(([p]) => path.includes(p));
    if (forced) return reply(forced[1], { error: { code: "FORCED" } });
    const meta = { priceChargedPaisa: 5 };
    if (u.pathname.endsWith("/resolve")) return reply(200, { data: { candidates: [{ cin: CIN, company: "SHARMA BUILDERS PRIVATE LIMITED", companyStatus: "Active", dateOfIncorporation: "04/12/2017" }] }, meta: { priceChargedPaisa: 500 } });
    if (u.pathname === `/v1/companies/${CIN}`) return reply(200, { data: { ...MASTER, cin: opts.masterCin ?? CIN }, meta: { priceChargedPaisa: 500 } });
    if (u.pathname.endsWith("/unlock") && method === "GET") return reply(200, { data: { cin: CIN, unlocked: opts.unlocked ?? true } });
    if (u.pathname.endsWith("/unlock") && method === "POST") return reply(202, { data: { cin: CIN, unlocked: true, job: null }, meta: { priceChargedPaisa: 33000 } });
    if (u.pathname.endsWith("/extractions/AOC-4")) return reply(200, { data: { formType: "AOC-4", availableYears: opts.aocYears ?? [2025, 2024, 2022] }, meta });
    if (u.pathname.endsWith("/extractions/MGT-7")) return reply(200, { data: { formType: "MGT-7", availableYears: opts.mgtYears ?? [2025, 2023, 2022, 2021] }, meta });
    const a = u.pathname.match(/AOC-4\/(\d{4})$/);
    if (a) return reply(200, { data: aoc(`${a[1]}-03-31`, Number(a[1]) * 10_000), meta });
    const m = u.pathname.match(/MGT-7\/(\d{4})$/);
    if (m) return reply(200, { data: { form_type: "MGT-7", fy_end: `${m[1]}-03-31T00:00:00.000Z`, turnover: Number(m[1]) * 9_000, net_worth: 1 }, meta });
    return reply(404, { error: { code: "NOT_FOUND" } });
  }) as typeof fetch;
  return { impl, calls };
}

describe("FileSure adapter", () => {
  it("sends the key in x-api-key, fetches master once for master + directors + charges, and records cost", async () => {
    const f = fakeFileSure();
    const p = createFileSureProviders({ apiKey: "fsk_test_x", fetchImpl: f.impl });
    const m = await p.mca.getCompanyMaster({ cin: CIN });
    const d = await p.mca.getDirectors({ cin: CIN });
    const c = await p.mca.getCharges({ cin: CIN });
    expect([m.outcome, d.outcome, c.outcome]).toEqual(["SUCCESS", "SUCCESS", "SUCCESS"]);
    expect(f.calls.filter((x) => x.path === `/v1/companies/${CIN}`)).toHaveLength(1);
    expect(f.calls[0].key).toBe("fsk_test_x");
    expect(m.meta).toMatchObject({ provider: "filesure", mode: "SANDBOX", costPaise: 500n });
    expect(d.meta.costPaise).toBe(0n);
  });

  it("takes the latest 4 years: AOC-4 where available, MGT-7 turnover for the gaps", async () => {
    const f = fakeFileSure();
    const r = await createFileSureProviders({ apiKey: "fsk_live_x", fetchImpl: f.impl }).financials.getFinancials({ cin: CIN }, 4);
    expect(r.outcome).toBe("SUCCESS");
    if (r.outcome !== "SUCCESS") return;
    expect(r.data.map((x) => [x.fiscalYear, x.filingForm])).toEqual([
      ["2021-22", "AOC-4(XBRL)"], ["2022-23", "MGT-7"], ["2023-24", "AOC-4(XBRL)"], ["2024-25", "AOC-4(XBRL)"],
    ]);
    expect(f.calls.some((x) => x.path.includes("MGT-7/2025"))).toBe(false); // AOC-4 2025 existed, so MGT-7 2025 not bought
    expect(r.meta.costPaise).toBe(5n * 6n); // 2 year lists + 3 AOC-4 + 1 MGT-7
  });

  it("does not spend on an unlock unless FILESURE_AUTO_UNLOCK is on", async () => {
    const off = fakeFileSure({ unlocked: false });
    const r = await createFileSureProviders({ apiKey: "fsk_live_x", autoUnlock: false, fetchImpl: off.impl }).financials.getFinancials({ cin: CIN }, 4);
    expect(r).toMatchObject({ outcome: "NOT_FOUND" });
    expect(off.calls.some((x) => x.method === "POST")).toBe(false);

    const on = fakeFileSure({ unlocked: false });
    const r2 = await createFileSureProviders({ apiKey: "fsk_live_x", autoUnlock: true, fetchImpl: on.impl }).financials.getFinancials({ cin: CIN }, 4);
    expect(r2.outcome).toBe("SUCCESS");
    expect(on.calls.filter((x) => x.method === "POST" && x.path.endsWith("/unlock"))).toHaveLength(1);
    expect(r2.meta.costPaise).toBeGreaterThanOrEqual(33_000n);
  });

  it("rejects a record for a different company and maps errors", async () => {
    const other = await createFileSureProviders({ apiKey: "fsk_live_x", fetchImpl: fakeFileSure({ masterCin: "U51909MH2012PTC999999" }).impl }).mca.getCompanyMaster({ cin: CIN });
    expect(other.outcome).toBe("ERROR");
    const sandbox = await createFileSureProviders({ apiKey: "fsk_test_x", fetchImpl: fakeFileSure({ status: { [`/v1/companies/${CIN}`]: 403 } }).impl }).mca.getCompanyMaster({ cin: CIN });
    expect(sandbox.outcome).toBe("AUTH_ERROR");
    const wallet = await createFileSureProviders({ apiKey: "fsk_live_x", fetchImpl: fakeFileSure({ status: { "/unlock": 402 } }).impl }).financials.getFinancials({ cin: CIN }, 4);
    expect(wallet.outcome).toBe("AUTH_ERROR");
    const missing = await createFileSureProviders({ apiKey: "", fetchImpl: fakeFileSure().impl }).mca.getCompanyMaster({ cin: CIN });
    expect(missing.outcome).toBe("AUTH_ERROR");
  });

  it("searches by name", async () => {
    const r = await createFileSureProviders({ apiKey: "fsk_live_x", fetchImpl: fakeFileSure().impl }).search.searchByName("Sharma Builders");
    expect(r).toMatchObject({ outcome: "SUCCESS", data: [{ cin: CIN, legalName: "SHARMA BUILDERS PRIVATE LIMITED", status: "ACTIVE", incorporationYear: 2017, source: "filesure" }] });
  });
});
