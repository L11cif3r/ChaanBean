// Mock provider with the five PRD fixtures (§21, cases A–E). Used in development and tests only.
// Names are prefixed "MOCK" and identifiers use a reserved 9000xx range so they can never be
// mistaken for real companies. The live adapters replace this once API keys arrive.

import { gstinChecksumChar } from "../identifiers";
import { ONE_CRORE_PAISE, ONE_LAKH_PAISE } from "../money";
import type {
  CompanyCandidate, CompanyMaster, DirectorRecord, ChargeRecord, FinancialRecord, GstFilingRecord,
  GstTaxpayer, ProviderMeta, ProviderResult, ProviderSet,
} from "./types";

const gstin = (first14: string) => first14 + gstinChecksumChar(first14);

interface Fixture {
  key: "A" | "B" | "C" | "D" | "E";
  master?: CompanyMaster;
  directors?: DirectorRecord[];
  charges?: ChargeRecord[];
  revenues?: bigint[]; // oldest → latest, FY2021-22 … FY2024-25
  taxpayer: GstTaxpayer;
  lateMonths: number; // GSTR-3B returns filed late in the last 12 months
}

const fyRows = (revenues: bigint[]): FinancialRecord[] =>
  revenues.map((rev, i) => {
    const start = 2021 + i;
    return {
      fiscalYear: `${start}-${String((start + 1) % 100).padStart(2, "0")}`,
      periodEnd: `${start + 1}-03-31`,
      statementType: "STANDALONE",
      revenueFromOperationsPaise: rev,
      totalIncomePaise: rev + rev / 50n,
      profitAfterTaxPaise: rev / 20n,
      netWorthPaise: rev / 3n,
      totalBorrowingsPaise: rev / 10n,
      totalAssetsPaise: rev / 2n,
      filingForm: "AOC-4 XBRL",
      filedOn: `${start + 1}-10-28`,
      verificationStatus: "VERIFIED",
    };
  });

const director = (din: string, fullName: string, designation = "Director"): DirectorRecord => ({
  din, fullName, designation, appointedOn: "2015-04-01", dinStatus: "Approved", isSignatory: true,
});

export const MOCK_FIXTURES: Fixture[] = [
  {
    key: "A",
    master: {
      cin: "U51909MH2012PTC900001", legalName: "MOCK Growing Industries Private Limited", entityType: "PRIVATE_LTD",
      companyStatus: "ACTIVE", companyClass: "Private", rocCode: "RoC-Mumbai", incorporationDate: "2012-04-01",
      authorisedCapitalPaise: 5n * ONE_CRORE_PAISE, paidUpCapitalPaise: 2n * ONE_CRORE_PAISE, listingStatus: "Unlisted",
      registeredAddress: { line1: "Unit 1, Mock Estate", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      registeredEmail: "accounts@mock-growing.example", lastAgmDate: "2025-09-30", lastBalanceSheetDate: "2025-03-31",
      pan: "AAACM9001A",
    },
    directors: [director("90000001", "Mock Director One", "Managing Director"), director("90000002", "Mock Director Two")],
    charges: [],
    revenues: [25n, 45n, 70n, 100n].map((c) => c * ONE_CRORE_PAISE),
    taxpayer: { gstin: gstin("27AAACM9001A1Z"), legalName: "MOCK Growing Industries Private Limited", status: "ACTIVE",
      registrationDate: "2017-07-01", constitution: "Private Limited Company", taxpayerType: "Regular",
      principalAddress: { line1: "Unit 1, Mock Estate", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      natureOfBusiness: ["Wholesale Business"], turnoverSlab: "Slab: Rs. 100 Cr. and above", turnoverSlabFy: "2024-25", einvoiceEnabled: true },
    lateMonths: 0,
  },
  {
    key: "B",
    master: {
      cin: "U17120GJ2014PTC900002", legalName: "MOCK Declining Textiles Private Limited", entityType: "PRIVATE_LTD",
      companyStatus: "ACTIVE", companyClass: "Private", rocCode: "RoC-Ahmedabad", incorporationDate: "2014-06-15",
      authorisedCapitalPaise: ONE_CRORE_PAISE, paidUpCapitalPaise: 10n * ONE_LAKH_PAISE, listingStatus: "Unlisted",
      registeredAddress: { line1: "Plot 2, Mock GIDC", city: "Surat", state: "Gujarat", pincode: "395003" },
      lastAgmDate: "2025-09-29", lastBalanceSheetDate: "2025-03-31", pan: "AAACM9002B",
    },
    directors: [director("90000003", "Mock Director Three")],
    charges: [{ chargeId: "900002-1", chargeHolder: "Mock Bank Ltd", amountPaise: 8n * ONE_LAKH_PAISE, createdOn: "2023-01-10", status: "OPEN" }],
    revenues: [100n, 60n, 25n, 10n].map((l) => l * ONE_LAKH_PAISE),
    taxpayer: { gstin: gstin("24AAACM9002B1Z"), legalName: "MOCK Declining Textiles Private Limited", status: "ACTIVE",
      registrationDate: "2017-07-01", constitution: "Private Limited Company", taxpayerType: "Regular",
      principalAddress: { line1: "Plot 2, Mock GIDC", city: "Surat", state: "Gujarat", pincode: "395003" },
      natureOfBusiness: ["Manufacturer"], turnoverSlab: "Slab: Rs. 0 to 40 lakhs", turnoverSlabFy: "2024-25" },
    lateMonths: 3,
  },
  {
    key: "C",
    master: {
      cin: "U24100RJ2010PTC900003", legalName: "MOCK Stable Chemicals Private Limited", entityType: "PRIVATE_LTD",
      companyStatus: "ACTIVE", companyClass: "Private", rocCode: "RoC-Jaipur", incorporationDate: "2010-01-20",
      authorisedCapitalPaise: 10n * ONE_CRORE_PAISE, paidUpCapitalPaise: 5n * ONE_CRORE_PAISE, listingStatus: "Unlisted",
      registeredAddress: { line1: "Mock Industrial Area", city: "Jaipur", state: "Rajasthan", pincode: "302013" },
      lastAgmDate: "2025-09-27", lastBalanceSheetDate: "2025-03-31", pan: "AAACM9003C",
    },
    directors: [director("90000004", "Mock Director Four", "Managing Director"), director("90000005", "Mock Director Five")],
    charges: [{ chargeId: "900003-1", chargeHolder: "Mock Bank Ltd", amountPaise: 5n * ONE_CRORE_PAISE, createdOn: "2021-05-01", status: "OPEN" }],
    revenues: [6050n, 6300n, 6650n, 7000n].map((l) => l * ONE_LAKH_PAISE),
    taxpayer: { gstin: gstin("08AAACM9003C1Z"), legalName: "MOCK Stable Chemicals Private Limited", status: "ACTIVE",
      registrationDate: "2017-07-01", constitution: "Private Limited Company", taxpayerType: "Regular",
      principalAddress: { line1: "Mock Industrial Area", city: "Jaipur", state: "Rajasthan", pincode: "302013" },
      natureOfBusiness: ["Manufacturer", "Supplier of Services"], turnoverSlab: "Slab: Rs. 25 Cr. to 100 Cr.", turnoverSlabFy: "2024-25" },
    lateMonths: 1,
  },
  {
    key: "D", // proprietorship: GST only, no MCA filings
    taxpayer: { gstin: gstin("27ABCPM9004D1Z"), legalName: "MOCK RAMESH KUMAR", tradeName: "MOCK Ramesh Traders", status: "ACTIVE",
      registrationDate: "2019-03-11", constitution: "Proprietorship", taxpayerType: "Regular",
      principalAddress: { line1: "Shop 4, Mock Market", city: "Thane", state: "Maharashtra", pincode: "400601" },
      natureOfBusiness: ["Retail Business"], turnoverSlab: "Slab: Rs. 1.5 Cr. to 5 Cr.", turnoverSlabFy: "2024-25" },
    lateMonths: 2,
  },
  {
    key: "E", // struck off
    master: {
      cin: "U45200MH2011PTC900005", legalName: "MOCK Closed Constructions Private Limited", entityType: "PRIVATE_LTD",
      companyStatus: "STRIKE_OFF", companyClass: "Private", rocCode: "RoC-Mumbai", incorporationDate: "2011-08-08",
      registeredAddress: { line1: "Mock Tower", city: "Mumbai", state: "Maharashtra", pincode: "400051" },
      lastBalanceSheetDate: "2021-03-31", pan: "AAACM9005E",
    },
    directors: [director("90000006", "Mock Director Six")],
    charges: [],
    revenues: [12n, 9n, 5n].map((c) => c * ONE_CRORE_PAISE),
    taxpayer: { gstin: gstin("27AAACM9005E1Z"), legalName: "MOCK Closed Constructions Private Limited", status: "CANCELLED",
      registrationDate: "2017-07-01", cancellationDate: "2022-04-01", constitution: "Private Limited Company", taxpayerType: "Regular" },
    lateMonths: 12,
  },
];

/** Last 12 monthly periods whose GSTR-3B due date (20th of next month) has passed. */
function filings(lateMonths: number, now = new Date()): GstFilingRecord[] {
  const out: GstFilingRecord[] = [];
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (now.getUTCDate() <= 20) d.setUTCMonth(d.getUTCMonth() - 1);
  for (let i = 0; i < 12; i++) {
    d.setUTCMonth(d.getUTCMonth() - 1); // tax period month
    const period = `${String(d.getUTCMonth() + 1).padStart(2, "0")}${d.getUTCFullYear()}`;
    const due = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 20));
    const filed = new Date(due.getTime() + (i < lateMonths ? 6 : -2) * 86_400_000);
    const fyStart = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
    const fiscalYear = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
    out.push({ returnType: "GSTR3B", taxPeriod: period, fiscalYear, dueDate: iso(due), filedOn: iso(filed) });
    const due1 = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 11));
    out.push({ returnType: "GSTR1", taxPeriod: period, fiscalYear, dueDate: iso(due1), filedOn: iso(new Date(due1.getTime() - 86_400_000)) });
  }
  return out;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export interface MockOptions {
  /** Operations that should fail, e.g. ["getFinancials"], to exercise PARTIAL / FAILED paths. */
  fail?: Partial<Record<string, "TIMEOUT" | "ERROR">>;
}

export function createMockProviders(options: MockOptions = {}): ProviderSet {
  const meta = (operation: string): ProviderMeta => ({ provider: "mock", operation, mode: "MOCK", latencyMs: 5, costPaise: 0n });
  function respond<T>(operation: string, find: () => T | undefined): Promise<ProviderResult<T>> {
    const failure = options.fail?.[operation];
    if (failure) return Promise.resolve({ outcome: failure, error: `Mock ${failure.toLowerCase()}`, meta: meta(operation) });
    const data = find();
    if (data === undefined) return Promise.resolve({ outcome: "NOT_FOUND", error: "Not found", meta: meta(operation) });
    return Promise.resolve({ outcome: "SUCCESS", data, meta: { ...meta(operation), raw: data } });
  }
  const byMca = (id: { cin?: string; llpin?: string }) =>
    MOCK_FIXTURES.find((f) => f.master && ((id.cin && f.master.cin === id.cin) || (id.llpin && f.master.llpin === id.llpin)));
  const byGstin = (g: string) => MOCK_FIXTURES.find((f) => f.taxpayer.gstin === g);

  return {
    search: {
      searchByName: (q) =>
        respond("searchByName", () => {
          const needle = q.toLowerCase();
          return MOCK_FIXTURES.filter((f) =>
            [f.master?.legalName, f.taxpayer.legalName, f.taxpayer.tradeName].some((n) => n?.toLowerCase().includes(needle)),
          ).map<CompanyCandidate>((f) => ({
            legalName: f.master?.legalName ?? f.taxpayer.tradeName ?? f.taxpayer.legalName!,
            tradeName: f.taxpayer.tradeName,
            entityType: f.master?.entityType ?? "PROPRIETORSHIP",
            cin: f.master?.cin,
            gstins: [f.taxpayer.gstin],
            stateCode: f.taxpayer.gstin.slice(0, 2),
            status: f.master?.companyStatus ?? f.taxpayer.status,
            incorporationYear: Number((f.master?.incorporationDate ?? f.taxpayer.registrationDate ?? "").slice(0, 4)) || undefined,
            source: "mock",
          }));
        }),
    },
    mca: {
      getCompanyMaster: (id) => respond("getCompanyMaster", () => byMca(id)?.master),
      getDirectors: (id) => respond("getDirectors", () => byMca(id)?.directors),
      getCharges: (id) => respond("getCharges", () => byMca(id)?.charges),
    },
    financials: {
      getFinancials: (id, years) =>
        respond("getFinancials", () => {
          const f = byMca(id);
          return f?.revenues ? fyRows(f.revenues).slice(-years) : undefined;
        }),
    },
    gst: {
      getTaxpayer: (g) => respond("getTaxpayer", () => byGstin(g)?.taxpayer),
      getGstinsByPan: (pan) =>
        respond("getGstinsByPan", () => {
          const list = MOCK_FIXTURES.filter((f) => f.taxpayer.gstin.slice(2, 12) === pan).map((f) => f.taxpayer.gstin);
          return list.length ? list : undefined;
        }),
      getFilingStatus: (g) => respond("getFilingStatus", () => {
        const f = byGstin(g);
        return f ? filings(f.lateMonths) : undefined;
      }),
    },
  };
}
