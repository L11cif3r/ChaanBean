import "server-only";

// MCA company master data from data.gov.in (PRD v4.0 2.1, adapter mca_open_data). The "RoC-wise Company Master Data"
// resource holds every company and LLP (about 3.7 million rows, refreshed by MCA from time to time). Its API filters
// are exact-match only, so name search runs on our own copy (public.mca_companies); a single CIN is looked up live.
// Key: DATA_GOV_IN_API_KEY. Resource: MCA_DATASET_RESOURCE_IDS (first id), default the RoC-wise master.

export const DEFAULT_MCA_RESOURCE = "4dbe5667-7b6b-41d7-82af-211562424d9a";
const BASE = "https://api.data.gov.in/resource";

export interface McaRecord {
  cin: string;
  name: string;
  status: string | null;
  class: string | null;
  category: string | null;
  roc: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  address: string | null;
  registrationDate: string | null;
  authorisedCapitalPaise: number | null;
  paidupCapitalPaise: number | null;
  activity: string | null;
  subCategory: string | null;
  /** "Listed" or "Unlisted". */
  listing: string | null;
  /** "India" or a foreign company. */
  origin: string | null;
  nicCode: string | null;
}

export const mcaKey = () => (process.env.DATA_GOV_IN_API_KEY ?? process.env.MCA_API_KEY)?.replace(/^["']|["']$/g, "").trim() || null;
export const mcaResource = () => (process.env.MCA_DATASET_RESOURCE_IDS ?? "").split(",").map((s) => s.trim()).find(Boolean) ?? DEFAULT_MCA_RESOURCE;

/** Lower case, letters and digits only, single spaces: the form names are searched in. */
export const normaliseName = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const blank = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s && s.toUpperCase() !== "NA" ? s : null;
};
const rupeesToPaise = (v: unknown) => {
  const s = blank(v)?.replace(/[^0-9.]/g, "");
  const n = Number(s);
  return s && Number.isFinite(n) ? Math.round(n * 100) : null;
};

/**
 * The dataset ends addresses as "…,Mumbai,Maharashtra,India-400063" or "…,Mysore,Karnataka,570016-India":
 * city Mumbai / Mysore, PIN 400063 / 570016.
 */
export function splitAddress(address: string | null): { city: string | null; pincode: string | null } {
  if (!address) return { city: null, pincode: null };
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const last = parts.at(-1) ?? "";
  const pincode = last.match(/\b(\d{6})\b/)?.[1] ?? null;
  const rest = /india/i.test(last) || /^\d{6}$/.test(last) ? parts.slice(0, -1) : parts;
  return { city: rest.length >= 2 ? rest.at(-2)! : null, pincode };
}

export function toRecord(r: Record<string, unknown>): McaRecord | null {
  const cin = blank(r.CIN)?.toUpperCase();
  const name = blank(r.CompanyName);
  if (!cin || !name) return null;
  const address = blank(r.Registered_Office_Address);
  const { city, pincode } = splitAddress(address);
  const date = blank(r.CompanyRegistrationdate_date);
  return {
    cin, name, status: blank(r.CompanyStatus), class: blank(r.CompanyClass), category: blank(r.CompanyCategory), roc: blank(r.CompanyROCcode),
    state: blank(r.CompanyStateCode)?.toLowerCase() ?? null, city, pincode, address,
    registrationDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    authorisedCapitalPaise: rupeesToPaise(r.AuthorizedCapital), paidupCapitalPaise: rupeesToPaise(r.PaidupCapital),
    activity: blank(r.CompanyIndustrialClassification),
    subCategory: blank(r.CompanySubCategory), listing: blank(r.Listingstatus), origin: blank(r["CompanyIndian/Foreign Company"]),
    nicCode: blank(r.nic_code),
  };
}

export interface McaPage {
  records: McaRecord[];
  total: number;
  /** When MCA last refreshed the dataset. */
  datasetDate: string | null;
}

export async function fetchMcaPage(filters: Record<string, string>, offset: number, limit = 5000): Promise<McaPage> {
  const key = mcaKey();
  if (!key) throw new Error("DATA_GOV_IN_API_KEY is not set.");
  const url = new URL(`${BASE}/${mcaResource()}`);
  url.searchParams.set("api-key", key);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  for (const [k, v] of Object.entries(filters)) url.searchParams.set(`filters[${k}]`, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000), cache: "no-store" });
  if (!res.ok) throw new Error(`data.gov.in answered ${res.status}`);
  const body = (await res.json()) as { total?: number; updated_date?: string; records?: Record<string, unknown>[] };
  return {
    records: (body.records ?? []).map(toRecord).filter((r): r is McaRecord => r !== null),
    total: Number(body.total ?? 0),
    datasetDate: body.updated_date ? body.updated_date.slice(0, 10) : null,
  };
}

/** FR-SR-03: one company by CIN or LLPIN, live, when it is not in our copy yet. */
export async function lookupCinLive(cin: string): Promise<{ record: McaRecord | null; datasetDate: string | null }> {
  if (!mcaKey()) return { record: null, datasetDate: null };
  const page = await fetchMcaPage({ CIN: cin }, 0, 1);
  return { record: page.records[0] ?? null, datasetDate: page.datasetDate };
}
