import type { CibilData, CompanyData, CreditRatingData, DirectorData, GstSearchData, IecTurnoverData, MsmeData, PanData, TurnoverData } from "./checks";

// A made-up company used only to show what a Credit Worthiness report looks like: before a company is chosen, and in
// place of a section that has no data. Every view that uses it is labelled "Example". Nothing here is a real business.

const L = 100_000_00; // one lakh rupees in paise
const CR = 100 * L;

/** Last 12 GSTR-3B periods (newest first) ending with the month before `today`, with two late and one missing. */
function filings(today: Date): GstSearchData["filings"] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1 - i, 1));
    const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { period, filed: i !== 7, onTime: i !== 3 && i !== 9 && i !== 7 };
  });
}

/** Financial year label "2025-26" for a date (April to March). */
const fyOf = (d: Date) => {
  const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return { start: y, label: `${y}-${String((y + 1) % 100).padStart(2, "0")}` };
};

function turnover(today: Date): TurnoverData {
  const cur = fyOf(today);
  const full = [3.1, 3.6, 4.2, 4.5].map((cr) => Math.round(cr * CR));
  const years: TurnoverData["years"] = full.map((p, i) => {
    const y = cur.start - 4 + i;
    return { fy: `${y}-${String((y + 1) % 100).padStart(2, "0")}`, turnoverPaise: p, partial: false, months: [] };
  });
  // Months of the current year filed so far (April up to last month), rising slowly with a festive bump.
  const monthsFiled = Math.max(1, (today.getUTCMonth() - 3 + 12) % 12);
  const shape = [0.92, 0.95, 0.98, 1.0, 1.04, 1.12, 1.2, 1.1, 1.0, 0.98, 1.02, 1.08];
  const months = Array.from({ length: Math.min(monthsFiled, 12) }, (_, i) => {
    const d = new Date(Date.UTC(cur.start, 3 + i, 1));
    return { month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, turnoverPaise: Math.round(((4.9 * CR) / 12) * shape[i]) };
  });
  years.push({ fy: cur.label, turnoverPaise: months.reduce((s, m) => s + m.turnoverPaise, 0), partial: true, months });
  return { years };
}

export function exampleReport(today = new Date()) {
  const gst: GstSearchData = {
    gstin: "29ABCDE1234F1Z5",
    legalName: "Example Traders Private Limited",
    tradeName: "Example Traders",
    status: "Active",
    registrationDate: "2017-07-01",
    constitution: "Private Limited Company",
    taxpayerType: "Regular",
    address: "Peenya Industrial Area, Bengaluru, Karnataka 560058",
    gstinsOnPan: [
      { gstin: "29ABCDE1234F1Z5", state: "Karnataka", status: "Active" },
      { gstin: "33ABCDE1234F1Z9", state: "Tamil Nadu", status: "Active" },
    ],
    filings: filings(today),
    lastReturnPeriod: null,
    natureOfBusiness: ["Wholesale business", "Supplier of services"],
    eInvoice: true,
    otherPlaces: 2,
    jurisdiction: "Bengaluru South",
  };
  gst.lastReturnPeriod = gst.filings[0].period;
  const cibil: CibilData = {
    bureau: "CIBIL",
    scoreOrRank: "CMR-4",
    activeLoans: 3,
    sanctionedPaise: 85 * L,
    outstandingPaise: 52 * L,
    overdue: [{ lender: "Example Bank", amountPaise: 3.2 * L, daysPastDue: 34 }],
    enquiries6m: 2,
    wilfulDefaulter: false,
    suitFiled: false,
  };
  const company: CompanyData = {
    cin: "U51909KA2012PTC000000",
    name: gst.legalName,
    status: "Active",
    incorporationDate: "2012-05-14",
    companyClass: "Private",
    category: "Company limited by Shares",
    subCategory: "Non-govt company",
    authorisedCapitalPaise: 1 * CR,
    paidUpCapitalPaise: 65 * L,
    registeredOffice: gst.address,
    lastAgmDate: "2025-09-28",
    lastBalanceSheetDate: "2025-03-31",
    charges: [
      { holder: "Example Bank", amountPaise: 60 * L, status: "Open", createdOn: "2021-08-10" },
      { holder: "Sample Finance", amountPaise: 40 * L, status: "Satisfied", createdOn: "2018-02-02" },
    ],
    listing: "Unlisted",
    origin: "India",
    activity: "Wholesale trade",
    registrar: "RoC-Bangalore",
  };
  const directors: DirectorData = {
    directors: [
      { din: "00000001", name: "Asha Rao", designation: "Director", appointedOn: "2012-05-14", otherCompanies: 2, disqualified: false },
      { din: "00000002", name: "Vikram Shetty", designation: "Director", appointedOn: "2016-11-01", otherCompanies: 5, disqualified: false },
      { din: "00000003", name: "Meera Iyer", designation: "Additional Director", appointedOn: "2023-04-20", otherCompanies: 0, disqualified: false },
    ],
  };
  const rating: CreditRatingData = {
    ratings: [{ agency: "CRISIL", instrument: "Cash credit", rating: "BBB+", outlook: "Stable", date: "2025-12-05" }],
  };
  const msme: MsmeData = {
    udyamNumber: "UDYAM-KR-03-0000000",
    name: gst.legalName,
    category: "Small",
    majorActivity: "Trading",
    nicCodes: ["46909"],
    registeredOn: "2021-02-11",
    address: gst.address,
  };
  const pan: PanData = { pan: "ABCDE1234F", name: gst.legalName, status: "Valid", aadhaarLinked: null };
  const trade: IecTurnoverData = {
    iec: "ABCDE1234F",
    years: turnover(today).years.filter((y) => !y.partial).slice(-3).map((y, i) => ({ fy: y.fy, exportPaise: (12 + i * 4) * L, importPaise: (30 - i * 3) * L })),
    topPorts: ["Chennai", "Bengaluru ICD"],
    topHs: ["8481", "7307"],
  };
  const turnoverData = turnover(today);
  const base = turnoverData.years.filter((y) => !y.partial).at(-1)!.turnoverPaise;
  return {
    name: gst.legalName,
    gst,
    turnover: turnoverData,
    cibil,
    company,
    directors,
    rating,
    msme,
    pan,
    trade,
    risk: "medium" as const,
    range: { lowPaise: Math.round(base * 0.01), highPaise: Math.round(base * 0.02), basePaise: base },
  };
}

export type ExampleReport = ReturnType<typeof exampleReport>;

/**
 * Run-rate projection for a part-filed financial year: what the full year comes to if the business keeps the pace of
 * the months filed so far (turnover so far × 12 ÷ months filed). Null when nothing is filed yet or the year is complete.
 */
export function projectFullYear(year: { turnoverPaise: number; partial: boolean; months: { turnoverPaise: number }[] }): number | null {
  if (!year.partial) return null;
  const filed = year.months.filter((m) => m.turnoverPaise > 0).length;
  if (!filed || filed >= 12) return null;
  return Math.round((year.turnoverPaise * 12) / filed);
}
