import "server-only";
import type { JSONValue } from "postgres";
import { sql } from "@/server/db/sql";
import { enqueue } from "@/server/jobs/runner";
import { fetchMcaPage, mcaResource, normaliseName, type McaRecord } from "@/server/providers/mca";

// Our copy of the MCA master data (PRD v4.0 2.3): data.gov.in filters are exact-match only, so names are searched in
// public.mca_companies. One job imports one page of 5,000 rows and queues the next, so an import survives restarts
// and never holds a request open. Karnataka first (about 2.6 lakh rows); all India needs the paid database plan.

const PAGE = 5000;

/** Writes (or refreshes) MCA records in our copy. Shared with the live CIN lookup. */
export async function saveMcaRecords(records: McaRecord[], datasetDate: string | null) {
  if (!records.length) return 0;
  const date = datasetDate ?? new Date().toISOString().slice(0, 10);
  const rows = records.map((r) => ({
    cin: r.cin, name: r.name, name_norm: normaliseName(r.name), status: r.status, class: r.class, category: r.category, roc: r.roc,
    state: r.state, city: r.city, pincode: r.pincode, address: r.address, registration_date: r.registrationDate,
    authorised_capital_paise: r.authorisedCapitalPaise, paidup_capital_paise: r.paidupCapitalPaise, activity: r.activity,
    sub_category: r.subCategory, listing_status: r.listing, origin: r.origin, nic_code: r.nicCode,
  }));
  const db = sql();
  const result = await db`
    insert into public.mca_companies (
      cin, name, name_norm, status, class, category, roc, state, city, pincode, address, registration_date,
      authorised_capital_paise, paidup_capital_paise, activity, sub_category, listing_status, origin, nic_code, dataset_date, updated_at)
    select distinct on (x.cin) x.cin, x.name, x.name_norm, x.status, x.class, x.category, x.roc, x.state, x.city, x.pincode, x.address,
           x.registration_date, x.authorised_capital_paise, x.paidup_capital_paise, x.activity, x.sub_category, x.listing_status, x.origin,
           x.nic_code, ${date}::date, now()
      from jsonb_to_recordset(${db.json(rows as unknown as JSONValue)}::jsonb) as x(
        cin text, name text, name_norm text, status text, class text, category text, roc text, state text, city text, pincode text,
        address text, registration_date date, authorised_capital_paise bigint, paidup_capital_paise bigint, activity text,
        sub_category text, listing_status text, origin text, nic_code text)
    on conflict (cin) do update set
      name = excluded.name, name_norm = excluded.name_norm, status = excluded.status, class = excluded.class,
      category = excluded.category, roc = excluded.roc, state = excluded.state, city = excluded.city, pincode = excluded.pincode,
      address = excluded.address, registration_date = excluded.registration_date,
      authorised_capital_paise = excluded.authorised_capital_paise, paidup_capital_paise = excluded.paidup_capital_paise,
      activity = excluded.activity, sub_category = excluded.sub_category, listing_status = excluded.listing_status,
      origin = excluded.origin, nic_code = excluded.nic_code, dataset_date = excluded.dataset_date, updated_at = now()`;
  return result.count;
}

/** Starts importing one state (as the dataset spells it, e.g. "Karnataka"). Returns the import id. */
export async function startMcaImport(state: string): Promise<number> {
  const scope = `state=${state.trim().toLowerCase()}`;
  const [running] = await sql()<{ id: number }[]>`
    select id from app_private.mca_imports where scope = ${scope} and status = 'running' order by id desc limit 1`;
  if (running) return Number(running.id);
  const [row] = await sql()<{ id: number }[]>`
    insert into app_private.mca_imports (resource_id, scope) values (${mcaResource()}, ${scope}) returning id`;
  await enqueue("mca.import_page", { importId: Number(row.id), state: state.trim() }, { dedupeKey: `mca-import:${row.id}:0`, maxAttempts: 8 });
  return Number(row.id);
}

export async function importMcaPage(importId: number, state: string) {
  const db = sql();
  const [imp] = await db<{ next_offset: number; status: string }[]>`
    select next_offset, status from app_private.mca_imports where id = ${importId}`;
  if (!imp || imp.status !== "running") return;
  try {
    const page = await fetchMcaPage({ CompanyStateCode: state.toLowerCase() }, imp.next_offset, PAGE);
    await saveMcaRecords(page.records, page.datasetDate);
    const next = imp.next_offset + PAGE;
    const done = next >= page.total || page.records.length === 0;
    await db`
      update app_private.mca_imports
         set rows_done = rows_done + ${page.records.length}, rows_total = ${page.total}, next_offset = ${next},
             dataset_date = coalesce(${page.datasetDate}::date, dataset_date),
             status = ${done ? "done" : "running"}, finished_at = ${done ? new Date() : null}
       where id = ${importId}`;
    if (!done) await enqueue("mca.import_page", { importId, state }, { dedupeKey: `mca-import:${importId}:${next}`, maxAttempts: 8 });
    // 14.3: refresh weekly. MCA updates the dataset from time to time; each finished import books the next one.
    else await enqueue("mca.refresh", { state }, { runAt: new Date(Date.now() + 7 * 86_400_000), dedupeKey: `mca-refresh:${state.toLowerCase()}:${importId}` });
  } catch (e) {
    await db`update app_private.mca_imports set error = ${(e as Error).message.slice(0, 300)} where id = ${importId}`;
    throw e; // retried by the runner; after the last attempt the import stays "running" with the error shown
  }
}

export interface McaImportStatus {
  scope: string;
  status: string;
  rowsDone: number;
  rowsTotal: number | null;
  datasetDate: string | null;
  error: string | null;
  startedAt: string;
}

export async function mcaImports(): Promise<McaImportStatus[]> {
  const rows = await sql()<{ scope: string; status: string; rows_done: number; rows_total: number | null; dataset_date: Date | null; error: string | null; started_at: Date }[]>`
    select scope, status, rows_done, rows_total, dataset_date, error, started_at from app_private.mca_imports order by id desc limit 20`;
  return rows.map((r) => ({
    scope: r.scope, status: r.status, rowsDone: r.rows_done, rowsTotal: r.rows_total,
    datasetDate: r.dataset_date?.toISOString().slice(0, 10) ?? null, error: r.error, startedAt: r.started_at.toISOString(),
  }));
}
