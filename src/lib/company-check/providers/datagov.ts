// Live adapter for the data.gov.in "Company Master Data" dataset (MCA, open government data).
// Gives: company search by exact name / CIN, status, class, category, ROC, registration date,
// capital and registered address. Does NOT give directors, charges or financial statements,
// so those operations report NOT_FOUND ("not available from this source") instead of guessing.

import { isValidCin } from "../identifiers";
import type {
  CompanyCandidate, CompanyMaster, CompanySearchProvider, EntityType, MCARegistryProvider, ProviderMeta, ProviderMode,
  ProviderResult,
} from "./types";

export const DATAGOV_MCA_RESOURCE = "https://api.data.gov.in/resource/4dbe5667-7b6b-41d7-82af-211562424d9a";
const PROVIDER = "datagov_mca";

export interface DataGovRecord {
  CIN?: string;
  CompanyName?: string;
  CompanyROCcode?: string;
  CompanyCategory?: string;
  CompanySubCategory?: string;
  CompanyClass?: string;
  AuthorizedCapital?: string | number;
  PaidupCapital?: string | number;
  CompanyRegistrationdate_date?: string;
  Registered_Office_Address?: string;
  Listingstatus?: string;
  CompanyStatus?: string;
  CompanyStateCode?: string;
  [key: string]: unknown;
}

const STATUS_MAP: [RegExp, string][] = [
  [/under process of strik/i, "UNDER_PROCESS_OF_STRIKE_OFF"],
  [/strike|struck/i, "STRIKE_OFF"],
  [/liquidat/i, "UNDER_LIQUIDATION"],
  [/dissolv/i, "DISSOLVED"],
  [/amalgamat/i, "AMALGAMATED"],
  [/dormant/i, "DORMANT"],
  [/^active/i, "ACTIVE"],
];

export function mapStatus(raw?: string): string {
  const s = (raw ?? "").trim();
  return STATUS_MAP.find(([re]) => re.test(s))?.[1] ?? "OTHER";
}

export function mapEntityType(cls?: string, cin?: string): EntityType {
  const c = (cls ?? "").toLowerCase();
  if (c.includes("one person")) return "OPC";
  if (c.includes("public")) return "PUBLIC_LTD";
  if (c.includes("private")) return "PRIVATE_LTD";
  // CIN characters 13–15 carry the company type (PTC private, PLC public, OPC one-person …)
  const t = cin?.slice(12, 15);
  if (t === "PTC") return "PRIVATE_LTD";
  if (t === "PLC") return "PUBLIC_LTD";
  if (t === "OPC") return "OPC";
  return "OTHER";
}

/** Accepts "YYYY-MM-DD", "DD-MM-YYYY" or "DD/MM/YYYY"; returns YYYY-MM-DD or undefined. */
export function parseDate(raw?: string): string | undefined {
  const s = (raw ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return undefined;
}

const rupeesToPaise = (v: unknown): bigint | undefined => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 && String(v ?? "").trim() !== "" ? BigInt(Math.round(n * 100)) : undefined;
};

export function recordToMaster(r: DataGovRecord): CompanyMaster | null {
  const cin = String(r.CIN ?? "").trim().toUpperCase();
  const name = String(r.CompanyName ?? "").trim();
  if (!cin || !name) return null;
  return {
    cin,
    legalName: name,
    entityType: mapEntityType(r.CompanyClass, cin),
    companyStatus: mapStatus(r.CompanyStatus),
    companyClass: r.CompanyClass?.trim() || undefined,
    category: r.CompanyCategory?.trim() || undefined,
    subCategory: r.CompanySubCategory?.trim() || undefined,
    rocCode: r.CompanyROCcode?.trim() || undefined,
    incorporationDate: parseDate(r.CompanyRegistrationdate_date),
    authorisedCapitalPaise: rupeesToPaise(r.AuthorizedCapital),
    paidUpCapitalPaise: rupeesToPaise(r.PaidupCapital),
    listingStatus: r.Listingstatus?.trim() || undefined,
    registeredAddress: r.Registered_Office_Address?.trim()
      ? { line1: r.Registered_Office_Address.trim(), state: r.CompanyStateCode?.trim() || undefined }
      : undefined,
  };
}

export interface DataGovOptions {
  apiKey?: string;
  mode?: ProviderMode;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function createDataGovProviders(opts: DataGovOptions = {}): { search: CompanySearchProvider; mca: MCARegistryProvider } {
  const apiKey = opts.apiKey ?? process.env.DATA_GOV_IN_API_KEY ?? process.env.MCA_API_KEY ?? "";
  const mode = opts.mode ?? "LIVE";
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const doFetch = opts.fetchImpl ?? fetch;

  async function query(operation: string, filters: Record<string, string>, limit: number): Promise<ProviderResult<DataGovRecord[]>> {
    const started = Date.now();
    const meta = (extra: Partial<ProviderMeta> = {}): ProviderMeta => ({
      provider: PROVIDER, operation, mode, latencyMs: Date.now() - started, costPaise: 0n, ...extra,
    });
    if (!apiKey) return { outcome: "AUTH_ERROR", error: "DATA_GOV_IN_API_KEY not configured", meta: meta() };
    const url = new URL(DATAGOV_MCA_RESOURCE);
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    for (const [k, v] of Object.entries(filters)) url.searchParams.set(`filters[${k}]`, v);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(url, { signal: controller.signal, headers: { accept: "application/json" }, cache: "no-store" });
      if (res.status === 401 || res.status === 403) return { outcome: "AUTH_ERROR", error: `HTTP ${res.status}`, meta: meta({ httpStatus: res.status }) };
      if (res.status === 429) return { outcome: "RATE_LIMITED", error: "HTTP 429", meta: meta({ httpStatus: 429 }) };
      if (!res.ok) return { outcome: "ERROR", error: `HTTP ${res.status}`, meta: meta({ httpStatus: res.status }) };
      const body = (await res.json()) as { status?: string; message?: string; records?: DataGovRecord[] };
      if (body.status && body.status !== "ok") {
        const auth = /key/i.test(body.message ?? "");
        return { outcome: auth ? "AUTH_ERROR" : "ERROR", error: body.message ?? "data.gov.in error", meta: meta({ httpStatus: res.status }) };
      }
      const records = body.records ?? [];
      if (records.length === 0) return { outcome: "NOT_FOUND", error: "No matching company", meta: meta({ httpStatus: res.status }) };
      return { outcome: "SUCCESS", data: records, meta: meta({ httpStatus: res.status, raw: body }) };
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "AbortError";
      // The error message never includes the URL, so the API key is not leaked into logs.
      return { outcome: timedOut ? "TIMEOUT" : "ERROR", error: timedOut ? "Timed out" : "Network error", meta: meta() };
    } finally {
      clearTimeout(timer);
    }
  }

  /** data.gov.in filters are exact matches, so try the common legal-name endings. */
  function nameVariants(q: string): string[] {
    const base = q.trim().toUpperCase().replace(/\s+/g, " ").replace(/\bPVT\.?\b/g, "PRIVATE").replace(/\bLTD\.?\b/g, "LIMITED");
    const out = [base];
    if (!/\bLIMITED$/.test(base)) out.push(`${base} PRIVATE LIMITED`, `${base} LIMITED`);
    return [...new Set(out)];
  }

  const notOffered = <T,>(operation: string): Promise<ProviderResult<T>> =>
    Promise.resolve({
      outcome: "NOT_FOUND",
      error: "Not available from data.gov.in",
      meta: { provider: PROVIDER, operation, mode, latencyMs: 0, costPaise: 0n },
    });

  return {
    search: {
      async searchByName(q) {
        let last: ProviderResult<DataGovRecord[]> | null = null;
        for (const name of nameVariants(q)) {
          last = await query("searchByName", { CompanyName: name }, 20);
          if (last.outcome !== "NOT_FOUND") break;
        }
        if (!last || last.outcome !== "SUCCESS") return last as ProviderResult<CompanyCandidate[]>;
        const data = last.data
          .map(recordToMaster)
          .filter((m): m is CompanyMaster => m !== null)
          .map<CompanyCandidate>((m) => ({
            legalName: m.legalName,
            entityType: m.entityType,
            cin: m.cin,
            status: m.companyStatus,
            incorporationYear: m.incorporationDate ? Number(m.incorporationDate.slice(0, 4)) : undefined,
            source: PROVIDER,
          }));
        return { outcome: "SUCCESS", data, meta: last.meta };
      },
    },
    mca: {
      async getCompanyMaster(id) {
        if (!id.cin || !isValidCin(id.cin)) return notOffered<CompanyMaster>("getCompanyMaster"); // LLPs are a separate dataset
        const r = await query("getCompanyMaster", { CIN: id.cin.toUpperCase() }, 1);
        if (r.outcome !== "SUCCESS") return r as ProviderResult<CompanyMaster>;
        const master = recordToMaster(r.data[0]);
        if (!master || master.cin !== id.cin.toUpperCase()) {
          return { outcome: "ERROR", error: "Source returned a different company", meta: r.meta };
        }
        return { outcome: "SUCCESS", data: master, meta: r.meta };
      },
      getDirectors: () => notOffered("getDirectors"),
      getCharges: () => notOffered("getCharges"),
    },
  };
}
