import "server-only";
import crypto from "node:crypto";
import type {
  CibilData, CompanyData, CreditRatingData, CwCode, DirectorData, GstSearchData, TurnoverData,
} from "@/lib/checks";
import { normaliseIdentifier, panFromGstin } from "@/lib/validators";
import { mockIdentityProvider } from "@/server/providers/identity/mock";
import { GST_STATES } from "@/server/providers/identity/states";
import type { ProviderResult } from "@/server/providers/identity";

// Data providers for the Credit Worthiness checks (PRD v2.0 section 11), behind one interface so a real partner can
// replace the mock without touching the engine (adapter contract 12.3). Only mocks exist until the keys arrive:
// GSP (GST search and turnover), the bureau partner (CIBIL) and FileSure (company data).
//
// Mock scenarios, so every report outcome can be tested:
//   GSTIN 13th character: 9 cancelled, 8 suspended, 7 not found, 6 provider down, 5 irregular GST filing (3 late).
//   CIN last six digits: 999999 struck off, 888888 one director disqualified, 000000 not found.
//   GSTIN or PAN: last character 'Z' falling turnover; 'Y' a loan 95 days overdue; 'X' 45 days overdue.

export interface CheckSubject {
  type: "business_gstin" | "business_pan" | "individual";
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  legalName: string;
  stateCode: string | null;
}

/** What the buyer gave on the consent page (Part 7): GSP session for GST returns, PAN and date for the bureau. */
export interface ConsentAccess {
  gstToken: string | null;
  companyPan: string | null;
  incorporatedOn: string | null;
  personalPan: string | null;
  birthDate: string | null;
}

export interface CheckProvider {
  name: string;
  isMock: boolean;
  run(code: CwCode, subject: CheckSubject, opts: { today: string; consent?: ConsentAccess | null }): Promise<ProviderResult<unknown> & { raw: unknown }>;
}

const now = () => new Date().toISOString();
const seed = (s: string) => crypto.createHash("sha256").update(s).digest();
const pick = <T,>(key: string, list: T[]) => list[seed(key)[0] % list.length];

const ok = <T,>(data: T): ProviderResult<T> & { raw: unknown } => ({ status: "success", provider: "mock_checks", fetchedAt: now(), data, raw: { mock: true, data } });
const noData = (message: string) => ({ status: "no_data" as const, provider: "mock_checks", fetchedAt: now(), error: { code: "NOT_FOUND", message }, raw: { mock: true, message } });
const noAccess = (message: string) => ({ status: "not_available" as const, provider: "mock_checks", fetchedAt: now(), error: { code: "NO_CONSENT_ACCESS", message }, raw: { mock: true, message } });
const down = () => ({ status: "not_available" as const, provider: "mock_checks", fetchedAt: now(), error: { code: "PROVIDER_DOWN", message: "Source unavailable" }, raw: { mock: true } });

const lastChar = (s: CheckSubject) => (s.gstin ?? s.pan ?? "").slice(-1);

function months(today: string, n: number) {
  const d = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1 - i, 1));
    return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** Indian financial year label of a date: 2026-10-16 → "2026-27". */
function fyOf(date: Date) {
  const y = date.getUTCMonth() >= 3 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

async function gstSearch(s: CheckSubject, today: string) {
  const gstin = s.gstin ?? (s.pan ? `${s.stateCode ?? "27"}${s.pan}1Z5` : null);
  if (!gstin) return noData("No GSTIN or PAN to search");
  const scenario = normaliseIdentifier(gstin)[12];
  const base = await mockIdentityProvider.searchGstin(gstin);
  if (base.status === "not_available") return down();
  if (base.status !== "success" || !base.data) return noData("No GST registration found");
  const late = scenario === "5" ? 3 : 0;
  const filings = months(today, 12).map((period, i) => ({ period, filed: true, onTime: i >= late }));
  const pan = panFromGstin(gstin);
  const otherState = pick(pan, ["29", "33", "07", "24"]);
  const data: GstSearchData = {
    gstin: base.data.gstin,
    legalName: s.legalName || base.data.legalName,
    tradeName: base.data.tradeName,
    status: base.data.status,
    registrationDate: base.data.registrationDate,
    constitution: base.data.constitution,
    taxpayerType: base.data.taxpayerType,
    address: `${base.data.address.line}, ${base.data.address.city}, ${base.data.address.state} ${base.data.address.pincode}`,
    gstinsOnPan: [
      { gstin: base.data.gstin, state: base.data.stateName, status: base.data.status },
      ...(otherState !== gstin.slice(0, 2) ? [{ gstin: `${otherState}${pan}1Z${gstin.slice(-1)}`, state: GST_STATES[otherState] ?? otherState, status: "Active" as const }] : []),
    ],
    filings,
    lastReturnPeriod: filings[0]?.period ?? null,
  };
  return ok(data);
}

function companyCin(s: CheckSubject) {
  if (s.cin) return s.cin;
  const digits = String(seed(s.legalName).readUInt32BE(0) % 1_000_000).padStart(6, "0");
  return `U51909${s.stateCode === "29" ? "KA" : "MH"}2015PTC${digits}`;
}

function company(s: CheckSubject): ProviderResult<CompanyData> & { raw: unknown } | ReturnType<typeof noData> {
  const cin = companyCin(s);
  const tail = cin.slice(-6);
  if (tail === "000000") return noData("No company found at MCA");
  const year = Number(cin.slice(8, 12)) || 2015;
  return ok<CompanyData>({
    cin,
    name: s.legalName,
    status: tail === "999999" ? "Strike Off" : "Active",
    incorporationDate: `${year}-04-12`,
    companyClass: cin.startsWith("L") ? "Public" : "Private",
    category: "Company limited by shares",
    authorisedCapitalPaise: 50_00_000_00,
    paidUpCapitalPaise: 25_00_000_00,
    registeredOffice: "Plot 12, Industrial Estate, Main Road",
    lastAgmDate: "2025-09-28",
    lastBalanceSheetDate: "2025-03-31",
    charges: [
      { holder: pick(cin, ["State Bank of India", "HDFC Bank", "ICICI Bank", "Bank of Baroda"]), amountPaise: 1_50_00_000_00, status: "Open", createdOn: "2021-06-18" },
      { holder: "Axis Bank", amountPaise: 40_00_000_00, status: "Satisfied", createdOn: "2018-02-02" },
    ],
  });
}

function directors(s: CheckSubject) {
  const cin = companyCin(s);
  if (cin.slice(-6) === "000000") return noData("No directors found at MCA");
  const names = ["Rajesh Mehta", "Sunita Mehta", "Vikram Shah", "Anjali Rao", "Mohan Kulkarni"];
  const start = seed(cin)[1] % names.length;
  const list = [0, 1, 2].map((i) => ({
    din: String(seed(cin + i).readUInt32BE(0) % 100_000_000).padStart(8, "0"),
    name: names[(start + i) % names.length],
    designation: i === 0 ? "Managing Director" : "Director",
    appointedOn: `20${15 + i}-04-12`,
    otherCompanies: seed(cin + i)[4] % 4,
    disqualified: cin.slice(-6) === "888888" && i === 2,
  }));
  return ok<DirectorData>({ directors: list });
}

function rating(s: CheckSubject) {
  if (seed(s.legalName)[2] % 3 === 0) return noData("Not rated by any agency");
  return ok<CreditRatingData>({
    ratings: [
      {
        agency: pick(s.legalName, ["CRISIL", "ICRA", "CARE", "India Ratings"]),
        instrument: "Long-term bank facilities",
        rating: pick(s.legalName + "r", ["BBB+", "A-", "BBB", "A"]),
        outlook: "Stable",
        date: "2026-03-14",
      },
    ],
  });
}

function turnover(s: CheckSubject, today: string, years: number) {
  if (!s.gstin) return noData("No GSTIN");
  const base = 6_00_00_000_00 + (seed(s.gstin).readUInt32BE(0) % 10) * 50_00_000_00; // ₹6 Cr to ₹10.5 Cr
  const falling = lastChar(s) === "Z";
  const d = new Date(`${today}T00:00:00Z`);
  const fys = Array.from({ length: years }, (_, i) => fyOf(new Date(Date.UTC(d.getUTCFullYear() - (years - 1 - i), d.getUTCMonth(), 1))));
  const current = fyOf(d);
  const list = fys.map((fy, i) => {
    const step = falling ? 1.25 - i * 0.18 : 0.62 + i * 0.16;
    const partial = fy === current;
    return { fy, turnoverPaise: Math.round((base * step * (partial ? 0.55 : 1)) / 100) * 100, partial };
  });
  return ok<TurnoverData>({ years: list });
}

function cibil(s: CheckSubject, personal: boolean) {
  const flag = lastChar(s);
  const overdue = flag === "Y" ? [{ lender: "HDFC Bank", amountPaise: 8_40_000_00, daysPastDue: 95 }]
    : flag === "X" ? [{ lender: "Bajaj Finance", amountPaise: 2_10_000_00, daysPastDue: 45 }] : [];
  return ok<CibilData>({
    bureau: "CIBIL",
    scoreOrRank: personal ? String(640 + (seed(s.legalName)[3] % 160)) : `CMR-${2 + (seed(s.legalName)[3] % 4)}`,
    activeLoans: 3,
    sanctionedPaise: 3_00_00_000_00,
    outstandingPaise: 2_10_00_000_00,
    overdue,
    enquiries6m: 2 + (seed(s.legalName)[5] % 3),
    wilfulDefaulter: false,
    suitFiled: false,
  });
}

export const mockCheckProvider: CheckProvider = {
  name: "mock_checks",
  isMock: true,
  async run(code, subject, { today, consent }) {
    // Consent checks need what the buyer gave on the consent page, as the real GSP and bureau do.
    if ((code === "CW_GST_TURNOVER" || code === "CW_GST_TURNOVER_CY") && !consent?.gstToken) return noAccess("No GST portal access from the buyer");
    if (code === "CW_CIBIL_COMPANY" && !(consent?.companyPan && consent.incorporatedOn)) return noAccess("No bureau consent from the buyer");
    if (code === "CW_CIBIL_PERSONAL" && !(consent?.personalPan && consent.birthDate)) return noAccess("No bureau consent from the buyer");
    switch (code) {
      case "CW_GST_SEARCH": return gstSearch(subject, today);
      case "CW_COMPANY": return company(subject);
      case "CW_DIRECTOR": return directors(subject);
      case "CW_CREDIT_RATING": return rating(subject);
      case "CW_GST_TURNOVER": return turnover(subject, today, 5); // 4 full years plus the current one
      case "CW_GST_TURNOVER_CY": return turnover(subject, today, 1);
      case "CW_CIBIL_COMPANY": return cibil(subject, false);
      case "CW_CIBIL_PERSONAL": return cibil(subject, true);
    }
  },
};

export function checkProvider(): CheckProvider {
  return mockCheckProvider;
}
