// FileSure (https://api.filesure.in) — MCA data API. Gives company master data, directors,
// charges and extracted financial statements, so it covers the MCA_MASTER, DIRECTORS, CHARGES
// and FINANCIALS sections of a Company Check.
//
// Financials come from AOC-4 (XBRL financial statements) and, where a year is missing there,
// from MGT-7/MGT-7A (annual return: turnover + net worth). Both are "unlock-gated" on FileSure:
// a company must be unlocked (paid, valid one year) before its extractions can be read.
//
// Config:
//   FILESURE_API_KEY       fsk_live_… (production) or fsk_test_… (sandbox: ~20 whitelisted companies, free)
//   FILESURE_BASE_URL      default https://api.filesure.in
//   FILESURE_AUTO_UNLOCK   "true" to let a check pay FileSure's company-unlock fee when financials are
//                          locked. Default "false": the section reports "not available" instead of spending.

import { mapEntityType, mapStatus } from "./datagov";
import type {
  ChargeRecord, CompanyCandidate, CompanyMaster, DirectorRecord, FinancialRecord, FinancialsProvider, MCARegistryProvider,
  ProviderMeta, ProviderMode, ProviderOutcome, ProviderResult, CompanySearchProvider, Address,
} from "./types";

const PROVIDER = "filesure";
const MASTER_CACHE_MS = 5 * 60_000;

// ----------------------------------------------------------------------------- parsing helpers

/** FileSure master/charge dates are MM/DD/YYYY (e.g. balanceSheetDate "03/31/2026"). */
export function parseUsDate(raw?: string | null): string | undefined {
  const m = (raw ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return undefined;
  const [mm, dd, yyyy] = [Number(m[1]), Number(m[2]), m[3]];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Extraction metadata dates are DD/MM/YYYY (e.g. dateOfFiling "16/01/2026"). */
export function parseIndianDate(raw?: string | null): string | undefined {
  const m = (raw ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return undefined;
  const [dd, mm, yyyy] = [Number(m[1]), Number(m[2]), m[3]];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

const isoDay = (raw?: string | null) => (raw && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : undefined);

/** Rupees (number or numeric string) → paise. Empty / non-numeric → undefined, never 0. */
export function rupeesToPaise(v: unknown): bigint | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "" || !/^-?\d+(\.\d+)?$/.test(s)) return undefined;
  return BigInt(Math.round(Number(s) * 100));
}

/** "2025-03-31" → "2024-25" (Indian financial year ending on that date). */
export function fiscalYearFromPeriodEnd(periodEnd: string): string {
  const y = Number(periodEnd.slice(0, 4));
  const m = Number(periodEnd.slice(5, 7));
  const start = m <= 3 ? y - 1 : y;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

interface Fact { qname: string; value: number | string; unit?: string }

/** Look up an XBRL fact by its local name, whatever the taxonomy prefix (ind-as:, in-ca:, in-gaap:). */
function fact(rows: Fact[] | undefined, ...localNames: string[]): bigint | undefined {
  for (const name of localNames) {
    const row = (rows ?? []).find((r) => r.qname.split(":").pop() === name && (r.unit ?? "INR") === "INR");
    if (row) return rupeesToPaise(row.value);
  }
  return undefined;
}

function sumFacts(rows: Fact[] | undefined, names: string[]): bigint | undefined {
  const parts = names.map((n) => fact(rows, n)).filter((x): x is bigint => x !== undefined);
  return parts.length ? parts.reduce((a, b) => a + b, 0n) : undefined;
}

export interface Aoc4Extraction {
  period_start?: string;
  period_end?: string;
  filing_scope?: string;
  balance_sheet?: Fact[];
  profit_and_loss?: Fact[];
  metadata?: { source?: { dateOfFiling?: string }; source_fileName?: string };
}

export function aoc4ToFinancial(x: Aoc4Extraction): FinancialRecord | null {
  if (!x.period_end) return null;
  const pl = x.profit_and_loss;
  const bs = x.balance_sheet;
  const revenue = fact(pl, "RevenueFromOperations");
  if (revenue === undefined) return null; // without revenue the year is no use for the engine
  return {
    fiscalYear: fiscalYearFromPeriodEnd(x.period_end),
    periodEnd: x.period_end.slice(0, 10),
    statementType: x.filing_scope === "consolidated" ? "CONSOLIDATED" : "STANDALONE",
    revenueFromOperationsPaise: revenue,
    otherIncomePaise: fact(pl, "OtherIncome"),
    totalIncomePaise: fact(pl, "Income", "TotalIncome", "Revenue"),
    profitBeforeTaxPaise: fact(pl, "ProfitBeforeTax", "ProfitBeforeTaxAndExceptionalItems"),
    profitAfterTaxPaise: fact(pl, "ProfitLossForPeriod", "ProfitLossForPeriodFromContinuingOperations"),
    netWorthPaise: fact(bs, "NetWorthOfCompany", "Equity", "ShareholdersFunds"),
    totalBorrowingsPaise: sumFacts(bs, ["BorrowingsCurrent", "BorrowingsNoncurrent"]) ?? sumFacts(bs, ["ShortTermBorrowings", "LongTermBorrowings"]),
    totalAssetsPaise: fact(bs, "Assets"),
    currentAssetsPaise: fact(bs, "CurrentAssets"),
    currentLiabilitiesPaise: fact(bs, "CurrentLiabilities"),
    filingForm: x.metadata?.source_fileName?.replace(/^Form\s+/i, "") || "AOC-4",
    filedOn: parseIndianDate(x.metadata?.source?.dateOfFiling),
    verificationStatus: "PROVIDER_PARSED",
  };
}

export interface Mgt7Extraction {
  form_type?: string;
  fy_end?: string;
  filing_date?: string;
  turnover?: number | string | null;
  net_worth?: number | string | null;
}

export function mgt7ToFinancial(x: Mgt7Extraction): FinancialRecord | null {
  const end = isoDay(x.fy_end);
  const turnover = rupeesToPaise(x.turnover);
  if (!end || turnover === undefined) return null;
  return {
    fiscalYear: fiscalYearFromPeriodEnd(end),
    periodEnd: end,
    statementType: "STANDALONE",
    revenueFromOperationsPaise: turnover,
    netWorthPaise: rupeesToPaise(x.net_worth),
    filingForm: x.form_type || "MGT-7",
    filedOn: isoDay(x.filing_date) ?? parseIndianDate(x.filing_date),
    verificationStatus: "PROVIDER_PARSED",
  };
}

// ----------------------------------------------------------------------------- master data

interface FsAddress {
  addressType?: string; streetAddress?: string; streetAddress2?: string; streetAddress3?: string; streetAddress4?: string;
  locality?: string; district?: string; city?: string; state?: string; postalCode?: string;
}
interface FsRole { cin?: string; designation?: string; role?: string; cessationDate?: string; personType?: string }
interface FsDirector {
  DIN?: string; FirstName?: string; MiddleName?: string; LastName?: string; dateOfAppointment?: string;
  DirectorDisqualified?: string; MCAUserRole?: FsRole[];
}
interface FsCharge {
  chargeId?: string; chargeHolderName?: string; dateOfCreation?: string; dateOfModification?: string;
  dateOfSatisfaction?: string; amount?: string | number; chargeStatus?: string;
}
export interface FsMaster {
  cin?: string;
  company?: string;
  masterData?: {
    companyData?: Record<string, unknown> & { MCAMDSCompanyAddress?: FsAddress[] };
    commonData?: Record<string, unknown> | null;
    directorData?: FsDirector[];
    indexChargesData?: FsCharge[];
  };
}

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);

function toAddress(a?: FsAddress): Address | undefined {
  if (!a) return undefined;
  const line1 = [a.streetAddress, a.streetAddress2].map((s) => s?.replace(/\s+/g, " ").trim()).filter(Boolean).join(", ");
  const line2 = [a.streetAddress3, a.streetAddress4, a.locality].map((s) => s?.trim()).filter(Boolean).join(", ");
  return { line1: line1 || undefined, line2: line2 || undefined, city: a.city || undefined, district: a.district || undefined, state: a.state || undefined, pincode: a.postalCode || undefined };
}

export function masterToCompany(m: FsMaster): CompanyMaster | null {
  const cd = m.masterData?.companyData ?? {};
  const common = m.masterData?.commonData ?? {};
  const id = (m.cin ?? str(cd.CIN) ?? "").toUpperCase();
  const name = m.company ?? str(cd.company);
  if (!id || !name) return null;
  const isLlp = /^[A-Z]{3}-\d{4}$/.test(id);
  const registered = cd.MCAMDSCompanyAddress?.find((a) => /registered/i.test(a.addressType ?? "")) ?? cd.MCAMDSCompanyAddress?.[0];
  const listed = str(cd.whetherListedOrNot);
  return {
    cin: isLlp ? undefined : id,
    llpin: isLlp ? id : undefined,
    legalName: name,
    entityType: isLlp ? "LLP" : mapEntityType(str(cd.classOfCompany), id),
    companyStatus: mapStatus(str(common.status) ?? str(cd.llpStatus)),
    companyClass: str(cd.classOfCompany),
    category: str(cd.companyCategory),
    subCategory: str(cd.companySubcategory),
    rocCode: str(cd.rocName) ?? str(common.roc_code),
    incorporationDate: isoDay(str(common.date_of_incorporation)) ?? parseUsDate(str(cd.dateOfIncorporation)),
    authorisedCapitalPaise: rupeesToPaise(cd.authorisedCapital),
    paidUpCapitalPaise: rupeesToPaise(cd.paidUpCapital),
    listingStatus: listed === "Y" ? "Listed" : listed === "N" ? "Unlisted" : undefined,
    registeredAddress: toAddress(registered),
    registeredEmail: str(cd.emailAddress),
    lastAgmDate: isoDay(str(common.agm_date)) ?? parseUsDate(str(cd.dateOfLastAGM)),
    lastBalanceSheetDate: isoDay(str(common.balance_sheet_date)) ?? parseUsDate(str(cd.balanceSheetDate)),
  };
}

/** Directors of THIS company only. Personal fields FileSure returns (PAN, contact, DOB …) are dropped. */
export function masterToDirectors(m: FsMaster): DirectorRecord[] {
  const cin = (m.cin ?? "").toUpperCase();
  return (m.masterData?.directorData ?? [])
    .filter((d) => d.DIN && /^\d{8}$/.test(d.DIN))
    .map((d) => {
      const roles = (d.MCAUserRole ?? []).filter((r) => (r.cin ?? "").toUpperCase() === cin);
      const role = roles.find((r) => r.personType === "Signatory") ?? roles[0];
      const ceased = parseUsDate(role?.cessationDate);
      return {
        din: d.DIN!,
        fullName: [d.FirstName, d.MiddleName, d.LastName].map((s) => s?.trim()).filter(Boolean).join(" "),
        dinStatus: d.DirectorDisqualified === "Y" ? "Disqualified" : "Approved",
        designation: role?.designation || role?.role || undefined,
        appointedOn: parseUsDate(d.dateOfAppointment),
        ceasedOn: ceased,
        isSignatory: role ? role.personType === "Signatory" : undefined,
      };
    })
    .filter((d) => d.fullName);
}

export function masterToCharges(m: FsMaster): ChargeRecord[] {
  return (m.masterData?.indexChargesData ?? []).map((c) => ({
    chargeId: c.chargeId || undefined,
    chargeHolder: c.chargeHolderName || undefined,
    amountPaise: rupeesToPaise(c.amount),
    createdOn: parseUsDate(c.dateOfCreation),
    modifiedOn: parseUsDate(c.dateOfModification),
    satisfiedOn: parseUsDate(c.dateOfSatisfaction),
    status: /open|active/i.test(c.chargeStatus ?? "") && !c.dateOfSatisfaction ? "OPEN" : "SATISFIED",
  }));
}

// ----------------------------------------------------------------------------- adapter

export interface FileSureOptions {
  apiKey?: string;
  baseUrl?: string;
  autoUnlock?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type Http =
  | { kind: "res"; status: number; body: unknown; latencyMs: number; costPaise: bigint }
  | { kind: "net"; status: 0; error: "TIMEOUT" | "ERROR"; latencyMs: number; body: null; costPaise: 0n };

export function createFileSureProviders(opts: FileSureOptions = {}): {
  search: CompanySearchProvider;
  mca: MCARegistryProvider;
  financials: FinancialsProvider;
} {
  const apiKey = (opts.apiKey ?? process.env.FILESURE_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");
  const baseUrl = (opts.baseUrl ?? process.env.FILESURE_BASE_URL ?? "https://api.filesure.in").replace(/\/+$/, "");
  const autoUnlock = opts.autoUnlock ?? process.env.FILESURE_AUTO_UNLOCK === "true";
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const doFetch = opts.fetchImpl ?? fetch;
  const mode: ProviderMode = apiKey.startsWith("fsk_test_") ? "SANDBOX" : "LIVE";
  const masterCache = new Map<string, { at: number; value: ProviderResult<FsMaster> }>();

  async function http(method: "GET" | "POST", path: string): Promise<Http> {
    const started = Date.now();
    try {
      const res = await doFetch(`${baseUrl}${path}`, {
        method,
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const charged = (body as { meta?: { priceChargedPaisa?: number } } | null)?.meta?.priceChargedPaisa;
      return { kind: "res", status: res.status, body, latencyMs: Date.now() - started, costPaise: BigInt(Math.max(0, Math.round(charged ?? 0))) };
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      return { kind: "net", status: 0, error: timeout ? "TIMEOUT" : "ERROR", latencyMs: Date.now() - started, body: null, costPaise: 0n };
    }
  }

  const meta = (operation: string, r: Http, extraCost = 0n): ProviderMeta => ({
    provider: PROVIDER,
    operation,
    mode,
    latencyMs: r.latencyMs,
    costPaise: r.costPaise + extraCost,
    httpStatus: r.status || undefined,
  });

  function failure<T>(operation: string, r: Http, extraCost = 0n): ProviderResult<T> {
    if (r.kind === "net") return { outcome: r.error, error: r.error === "TIMEOUT" ? "Timed out" : "Network error", meta: meta(operation, r, extraCost) };
    const code = (r.body as { error?: { code?: string } } | null)?.error?.code ?? `HTTP_${r.status}`;
    let outcome: Exclude<ProviderOutcome, "SUCCESS"> = "ERROR";
    if (r.status === 404) outcome = "NOT_FOUND";
    else if (r.status === 429) outcome = "RATE_LIMITED";
    // 401 bad key · 402 FileSure wallet empty · 403 SANDBOX_ONLY (test key on a real company): all configuration problems.
    else if (r.status === 401 || r.status === 402 || r.status === 403) outcome = "AUTH_ERROR";
    return { outcome, error: code, meta: meta(operation, r, extraCost) };
  }

  async function master(id: { cin?: string; llpin?: string }): Promise<ProviderResult<FsMaster>> {
    const key = (id.cin ?? id.llpin ?? "").toUpperCase();
    if (!apiKey) return { outcome: "AUTH_ERROR", error: "FILESURE_API_KEY not configured", meta: { provider: PROVIDER, operation: "getCompanyMaster", mode, latencyMs: 0, costPaise: 0n } };
    if (!key) return { outcome: "NOT_FOUND", error: "No CIN or LLPIN", meta: { provider: PROVIDER, operation: "getCompanyMaster", mode, latencyMs: 0, costPaise: 0n } };
    const hit = masterCache.get(key);
    if (hit && Date.now() - hit.at < MASTER_CACHE_MS) {
      // Same check asks for master, directors and charges: pay FileSure once.
      return { ...hit.value, meta: { ...hit.value.meta, costPaise: 0n, latencyMs: 0 } } as ProviderResult<FsMaster>;
    }
    const r = await http("GET", `/v1/companies/${encodeURIComponent(key)}`);
    let result: ProviderResult<FsMaster>;
    if (r.status === 200) {
      const data = (r.body as { data?: FsMaster })?.data;
      result = data && (data.cin ?? "").toUpperCase() === key
        ? { outcome: "SUCCESS", data, meta: meta("getCompanyMaster", r) }
        : { outcome: "ERROR", error: "Source returned a different company", meta: meta("getCompanyMaster", r) };
    } else {
      result = failure("getCompanyMaster", r);
    }
    if (result.outcome === "SUCCESS") masterCache.set(key, { at: Date.now(), value: result });
    return result;
  }

  function derive<T>(operation: string, base: ProviderResult<FsMaster>, map: (m: FsMaster) => T): ProviderResult<T> {
    if (base.outcome !== "SUCCESS") return { ...base, meta: { ...base.meta, operation } } as ProviderResult<T>;
    return { outcome: "SUCCESS", data: map(base.data), meta: { ...base.meta, operation } };
  }

  return {
    search: {
      async searchByName(q) {
        if (!apiKey) return { outcome: "AUTH_ERROR", error: "FILESURE_API_KEY not configured", meta: { provider: PROVIDER, operation: "searchByName", mode, latencyMs: 0, costPaise: 0n } };
        const r = await http("GET", `/v1/companies/resolve?q=${encodeURIComponent(q)}&limit=10`);
        if (r.status !== 200) return failure("searchByName", r);
        const cands = ((r.body as { data?: { candidates?: Array<Record<string, unknown>> } })?.data?.candidates ?? []);
        if (cands.length === 0) return { outcome: "NOT_FOUND", error: "No matching company", meta: meta("searchByName", r) };
        const data = cands
          .filter((c) => typeof c.cin === "string" && typeof c.company === "string")
          .map<CompanyCandidate>((c) => {
            const id = String(c.cin).toUpperCase();
            const isLlp = /^[A-Z]{3}-\d{4}$/.test(id);
            const inc = parseUsDate(c.dateOfIncorporation as string);
            return {
              legalName: String(c.company),
              entityType: isLlp ? "LLP" : mapEntityType(undefined, id),
              cin: isLlp ? undefined : id,
              llpin: isLlp ? id : undefined,
              status: mapStatus(c.companyStatus as string),
              incorporationYear: inc ? Number(inc.slice(0, 4)) : undefined,
              source: PROVIDER,
            };
          });
        return { outcome: "SUCCESS", data, meta: meta("searchByName", r) };
      },
    },

    mca: {
      async getCompanyMaster(id) {
        const m = await master(id);
        if (m.outcome !== "SUCCESS") return m as ProviderResult<CompanyMaster>;
        const c = masterToCompany(m.data);
        return c ? { outcome: "SUCCESS", data: c, meta: m.meta } : { outcome: "ERROR", error: "Incomplete company record", meta: m.meta };
      },
      async getDirectors(id) {
        return derive("getDirectors", await master(id), masterToDirectors);
      },
      async getCharges(id) {
        return derive("getCharges", await master(id), masterToCharges);
      },
    },

    financials: {
      async getFinancials(id, years) {
        const key = (id.cin ?? id.llpin ?? "").toUpperCase();
        const op = "getFinancials";
        const none = (error: string, cost = 0n): ProviderResult<FinancialRecord[]> => ({
          outcome: "NOT_FOUND", error, meta: { provider: PROVIDER, operation: op, mode, latencyMs: 0, costPaise: cost },
        });
        if (!apiKey) return { outcome: "AUTH_ERROR", error: "FILESURE_API_KEY not configured", meta: { provider: PROVIDER, operation: op, mode, latencyMs: 0, costPaise: 0n } };
        if (!key) return none("No CIN or LLPIN");
        const base = `/v1/companies/${encodeURIComponent(key)}`;
        let cost = 0n;
        let latency = 0;
        const track = (r: Http) => {
          latency += r.latencyMs;
          cost += r.costPaise;
          return r;
        };

        // 1. Financials are unlock-gated. Status check is free.
        const status = track(await http("GET", `${base}/unlock`));
        if (status.status !== 200) return failure(op, status, cost - status.costPaise);
        const unlocked = (status.body as { data?: { unlocked?: boolean } })?.data?.unlocked === true;
        if (!unlocked) {
          if (!autoUnlock) return none("Financial statements are locked on FileSure (company unlock not enabled)", cost);
          const u = track(await http("POST", `${base}/unlock`));
          if (u.status !== 200 && u.status !== 202 && u.status !== 409) return failure(op, u, cost - u.costPaise);
        }

        // 2. Which years exist for each form.
        const yearsOf = async (form: "AOC-4" | "MGT-7") => {
          const r = track(await http("GET", `${base}/extractions/${form}`));
          if (r.status === 404) return [] as number[];
          if (r.status !== 200) throw r;
          return ((r.body as { data?: { availableYears?: number[] } })?.data?.availableYears ?? []).filter((y) => Number.isInteger(y));
        };
        let aocYears: number[];
        let mgtYears: number[];
        try {
          [aocYears, mgtYears] = await Promise.all([yearsOf("AOC-4"), yearsOf("MGT-7")]);
        } catch (r) {
          return failure(op, r as Http, cost);
        }
        const wanted = [...new Set([...aocYears, ...mgtYears])].sort((a, b) => b - a).slice(0, years);
        if (wanted.length === 0) return none("No financial filings extracted for this company", cost);

        // 3. Prefer AOC-4 (full statements) per year; fall back to MGT-7 turnover + net worth.
        const records: FinancialRecord[] = [];
        let lockedOrPending = false;
        for (const y of wanted) {
          let rec: FinancialRecord | null = null;
          if (aocYears.includes(y)) {
            const r = track(await http("GET", `${base}/extractions/AOC-4/${y}?scope=standalone`));
            const d = (r.body as { data?: Aoc4Extraction & { unlocked?: boolean } })?.data;
            if (r.status === 200 && d && d.unlocked === undefined) rec = aoc4ToFinancial(d);
            else if (r.status === 200) lockedOrPending = true; // unlock-status JSON instead of data
          }
          if (!rec && mgtYears.includes(y)) {
            const r = track(await http("GET", `${base}/extractions/MGT-7/${y}`));
            const d = (r.body as { data?: Mgt7Extraction & { unlocked?: boolean } })?.data;
            if (r.status === 200 && d && d.unlocked === undefined) rec = mgt7ToFinancial(d);
            else if (r.status === 200) lockedOrPending = true;
          }
          if (rec && !records.some((x) => x.fiscalYear === rec!.fiscalYear)) records.push(rec);
        }

        const metaOut: ProviderMeta = { provider: PROVIDER, operation: op, mode, latencyMs: latency, costPaise: cost };
        if (records.length === 0) {
          return lockedOrPending
            ? { outcome: "ERROR", error: "FileSure is still preparing this company's financials; retry shortly", meta: metaOut }
            : { outcome: "NOT_FOUND", error: "No usable financial statements", meta: metaOut };
        }
        records.sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear));
        return { outcome: "SUCCESS", data: records, meta: metaOut };
      },
    },
  };
}
