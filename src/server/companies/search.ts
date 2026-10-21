import "server-only";
import type { JSONValue } from "postgres";
import { isValidCin, isValidGstin, isValidLlpin, normaliseIdentifier, panFromGstin } from "@/lib/validators";
import { maskPan } from "@/lib/mask";
import { audit } from "@/server/audit";
import { blindIndex, encryptField } from "@/server/crypto";
import { gstFetch } from "@/server/counterparties/service";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { GST_STATES } from "@/server/providers/identity/states";
import { lookupCinLive, mcaKey, normaliseName } from "@/server/providers/mca";
import type { RequestContext } from "@/server/context";
import { saveMcaRecords } from "./mca-import";

// PRD v4.0 section 4: one box for a company name, GSTIN or CIN/LLPIN. "Your buyers" first, then MCA records (up to
// 50, best match first, Active first), each with CIN, city, state, registration date, status and the data date.
// Searching and picking are free (FR-SR-08); only checks are charged.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

export type QueryKind = "gstin" | "cin" | "name" | "short";

/** FR-SR-01. */
export function detectQuery(raw: string): { kind: QueryKind; value: string } {
  const id = normaliseIdentifier(raw);
  if (isValidGstin(id)) return { kind: "gstin", value: id };
  if (isValidCin(id) || isValidLlpin(id)) return { kind: "cin", value: id };
  const name = normaliseName(raw);
  return name.replace(/\s/g, "").length >= 3 ? { kind: "name", value: name } : { kind: "short", value: name };
}

export interface CompanyHit {
  source: "yours" | "mca" | "gst";
  /** Counterparty id for "yours", CIN for "mca", GSTIN for "gst". */
  key: string;
  name: string;
  tradeName: string | null;
  cin: string | null;
  gstin: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  registrationDate: string | null;
  kind: string | null;
  /** MCA open data as of (FR-SR-07). */
  datasetDate: string | null;
  /** Already one of your buyers. */
  counterpartyId: string | null;
  risk: "high" | "medium" | "low" | "not_enough_data" | null;
  lastCheckedAt: string | null;
}

export interface SearchResult {
  kind: QueryKind;
  yours: CompanyHit[];
  matches: CompanyHit[];
  /** GSTIN typed but the GST network did not answer or has no such GSTIN. */
  gstState: "found" | "not_found" | "unavailable" | null;
  /** True when our MCA copy has rows (an import has run). */
  mcaReady: boolean;
  datasetDate: string | null;
  sample: boolean;
}

export interface SearchQuery {
  q: string;
  state?: string;
  city?: string;
  activeOnly?: boolean;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);
const titleCase = (s: string | null) => (s ? s.replace(/\b([a-z])/g, (m) => m.toUpperCase()) : null);
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

type McaRow = {
  cin: string; name: string; status: string | null; class: string | null; category: string | null; state: string | null; city: string | null;
  registration_date: Date | null; dataset_date: Date; counterparty_id: string | null;
};
const mcaHit = (r: McaRow): CompanyHit => ({
  source: "mca", key: r.cin, name: r.name, tradeName: null, cin: r.cin, gstin: null, city: r.city, state: titleCase(r.state),
  status: r.status, registrationDate: iso(r.registration_date), kind: [r.class, r.category].filter(Boolean).join(" · ") || null,
  datasetDate: iso(r.dataset_date), counterpartyId: r.counterparty_id, risk: null, lastCheckedAt: null,
});

async function yourBuyers(ctx: Ctx, kind: QueryKind, value: string, raw: string): Promise<CompanyHit[]> {
  const db = sql();
  const filter =
    kind === "gstin" ? db`c.gstin = ${value}`
    : kind === "cin" ? db`c.cin = ${value}`
    : db`(lower(c.legal_name) like ${`%${escapeLike(raw.trim().toLowerCase())}%`} or lower(coalesce(c.trade_name, '')) like ${`%${escapeLike(raw.trim().toLowerCase())}%`})`;
  const rows = await db<{
    id: string; legal_name: string; trade_name: string | null; gstin: string | null; cin: string | null; city: string | null; state_code: string | null;
    gst_status: string | null; risk_level: CompanyHit["risk"]; last_checked_at: Date | null;
  }[]>`
    select c.id, c.legal_name, c.trade_name, c.gstin, c.cin, c.city, c.state_code, c.gst_status, r.risk_level, r.created_at as last_checked_at
      from public.counterparties c
      left join lateral (
        select risk_level, created_at from public.check_requests
         where counterparty_id = c.id and tab = 'credit_worthiness' and status not in ('pending_start', 'cancelled')
         order by created_at desc limit 1) r on true
     where c.org_id = ${ctx.orgId} and c.status = 'active' and c.type in ('business_gstin', 'business_cin', 'business_pan') and ${filter}
     order by lower(c.legal_name) limit 10`;
  return rows.map((r) => ({
    source: "yours", key: r.id, name: r.legal_name, tradeName: r.trade_name, cin: r.cin, gstin: r.gstin, city: r.city,
    state: r.state_code ? GST_STATES[r.state_code] ?? null : null, status: r.gst_status, registrationDate: null, kind: null, datasetDate: null,
    counterpartyId: r.id, risk: r.risk_level ?? null, lastCheckedAt: r.last_checked_at?.toISOString() ?? null,
  }));
}

/** FR-SR-03: our copy first, then data.gov.in by CIN (saved to our copy for next time). */
async function mcaByCin(ctx: Ctx, cin: string): Promise<McaRow | null> {
  const find = () => sql()<McaRow[]>`
    select m.cin, m.name, m.status, m.class, m.category, m.state, m.city, m.registration_date, m.dataset_date, c.id as counterparty_id
      from public.mca_companies m
      left join public.counterparties c on c.org_id = ${ctx.orgId} and c.cin = m.cin
     where m.cin = ${cin}`;
  const [local] = await find();
  if (local) return local;
  const live = await lookupCinLive(cin).catch(() => ({ record: null, datasetDate: null }));
  if (!live.record) return null;
  await saveMcaRecords([live.record], live.datasetDate);
  return (await find())[0] ?? null;
}

/** FR-SR-04: word similarity >= 0.3 on the normalised name, best first, Active first (app_private.search_mca). */
async function mcaByName(ctx: Ctx, name: string, query: SearchQuery): Promise<McaRow[]> {
  const state = query.state?.trim().toLowerCase() || null;
  const city = query.city?.trim().toLowerCase().replace(/[\\%_]/g, "") || null;
  return sql()<McaRow[]>`
    select m.cin, m.name, m.status, m.class, m.category, m.state, m.city, m.registration_date, m.dataset_date, c.id as counterparty_id
      from app_private.search_mca(${name}, ${state}, ${query.activeOnly !== false}, ${city})
           with ordinality as m(cin, name, status, class, category, state, city, registration_date, dataset_date, score, ord)
      left join public.counterparties c on c.org_id = ${ctx.orgId} and c.cin = m.cin
     order by m.ord`; // keep the function's order: word match, then Active, then the closest whole name
}

export async function searchCompanies(ctx: Ctx, query: SearchQuery): Promise<SearchResult> {
  const { kind, value } = detectQuery(query.q);
  // The Sydney database is a round trip away, so the independent queries run together (FR-SR-04: under 1 s).
  const [[meta], yours, named] = await Promise.all([
    sql()<{ ready: boolean; dataset_date: Date | null }[]>`
      select exists (select 1 from public.mca_companies) as ready,
             (select dataset_date from app_private.mca_imports where dataset_date is not null order by id desc limit 1) as dataset_date`,
    kind === "short" ? Promise.resolve([]) : yourBuyers(ctx, kind, value, query.q),
    kind === "name" ? mcaByName(ctx, value, query) : Promise.resolve([]),
  ]);
  const base = { kind, gstState: null, mcaReady: meta.ready, datasetDate: iso(meta.dataset_date), sample: false } as const;
  if (kind === "short") return { ...base, yours: [], matches: [] };
  const known = new Set(yours.flatMap((y) => [y.cin, y.gstin]).filter(Boolean));

  if (kind === "gstin") {
    if (known.has(value)) return { ...base, yours, matches: [], gstState: "found" };
    const gst = await gstFetch(value);
    if (gst.state !== "found") return { ...base, yours, matches: [], gstState: gst.state, sample: gst.testData };
    return {
      ...base, yours, gstState: "found", sample: gst.testData,
      matches: [{
        source: "gst", key: value, name: gst.legalName, tradeName: gst.tradeName, cin: null, gstin: value, city: gst.address.city || null,
        state: gst.address.state || GST_STATES[gst.stateCode] || null, status: gst.gstStatus, registrationDate: null, kind: "GST registration",
        datasetDate: null, counterpartyId: null, risk: null, lastCheckedAt: null,
      }],
    };
  }

  if (kind === "cin") {
    const row = known.has(value) ? null : await mcaByCin(ctx, value);
    return { ...base, yours, matches: row && !row.counterparty_id ? [mcaHit(row)] : [] };
  }

  return { ...base, yours, matches: named.filter((r) => !known.has(r.cin)).map(mcaHit) };
}

// ---------------------------------------------------------------- pick (FR-SR-06)

const stateCodeFor = (state: string | null) => {
  const wanted = (state ?? "").trim().toLowerCase();
  return Object.entries(GST_STATES).find(([, name]) => name.toLowerCase() === wanted)?.[0] ?? null;
};

/** Creates (free) or finds the counterparty for a picked company. */
export async function pickCompany(ctx: Ctx, pick: { source: "mca"; cin: string } | { source: "gst"; gstin: string }): Promise<{ id: string; created: boolean }> {
  const db = sql();
  if (pick.source === "mca") {
    const cin = normaliseIdentifier(pick.cin);
    if (!isValidCin(cin) && !isValidLlpin(cin)) throw new AppError("validation_failed", "Please check the CIN or LLPIN.");
    const row = await mcaByCin(ctx, cin);
    if (!row) throw notFound("Company");
    if (row.counterparty_id) return { id: row.counterparty_id, created: false };
    const [m] = await db<{ address: string | null; pincode: string | null }[]>`select address, pincode from public.mca_companies where cin = ${cin}`;
    const state = titleCase(row.state) ?? "";
    const address = { line: m?.address ?? "", city: row.city ?? "", state, pincode: m?.pincode ?? "" };
    try {
      const [created] = await db<{ id: string }[]>`
        insert into public.counterparties (org_id, type, legal_name, cin, address, state_code, city, created_by)
        values (${ctx.orgId}, 'business_cin', ${row.name.slice(0, 120)}, ${cin}, ${db.json(address as JSONValue)}, ${stateCodeFor(state)},
                ${row.city}, ${ctx.user.id})
        returning id`;
      await audit(ctx, { action: "counterparty.created", entity: "counterparty", entityId: created.id, after: { type: "business_cin", legalName: row.name, cin, via: "search" } });
      return { id: created.id, created: true };
    } catch (e) {
      if ((e as { code?: string }).code !== "23505") throw e;
      const [again] = await db<{ id: string }[]>`select id from public.counterparties where org_id = ${ctx.orgId} and cin = ${cin}`;
      if (again) return { id: again.id, created: false };
      throw e;
    }
  }

  const gstin = normaliseIdentifier(pick.gstin);
  const [existing] = await db<{ id: string }[]>`select id from public.counterparties where org_id = ${ctx.orgId} and gstin = ${gstin}`;
  if (existing) return { id: existing.id, created: false };
  const gst = await gstFetch(gstin);
  if (gst.state !== "found") {
    throw new AppError("validation_failed", gst.state === "not_found" ? "No GST registration found for this GSTIN." : "The GST network is not answering. Please try again.");
  }
  const pan = panFromGstin(gstin);
  // The same PAN may already be a buyer saved by PAN or CIN: link the GSTIN to it instead of adding a second one.
  const [samePan] = await db<{ id: string; type: string }[]>`
    select id, type from public.counterparties where org_id = ${ctx.orgId} and pan_hash = ${blindIndex(pan, "pan")} and gstin is null`;
  if (samePan?.type === "business_cin") {
    await db`update public.counterparties set gstin = ${gstin}, gst_status = ${gst.gstStatus}, trade_name = coalesce(trade_name, ${gst.tradeName}) where id = ${samePan.id}`;
    return { id: samePan.id, created: false };
  }
  if (samePan) return { id: samePan.id, created: false };
  const address = { line: gst.address.line, city: gst.address.city, state: gst.address.state, pincode: gst.address.pincode };
  const [created] = await db<{ id: string }[]>`
    insert into public.counterparties (org_id, type, legal_name, trade_name, gstin, gst_status, pan_hash, pan_ciphertext, pan_masked,
                                       address, state_code, city, created_by)
    values (${ctx.orgId}, 'business_gstin', ${gst.legalName.slice(0, 120)}, ${gst.tradeName?.slice(0, 120) ?? null}, ${gstin}, ${gst.gstStatus},
            ${blindIndex(pan, "pan")}, ${encryptField(pan, "counterparties.pan")}, ${maskPan(pan)}, ${db.json(address as JSONValue)},
            ${gst.stateCode}, ${gst.address.city || null}, ${ctx.user.id})
    on conflict (org_id, gstin) where gstin is not null do update set updated_at = now()
    returning id`;
  await audit(ctx, { action: "counterparty.created", entity: "counterparty", entityId: created.id, after: { type: "business_gstin", legalName: gst.legalName, gstin, via: "search" } });
  return { id: created.id, created: true };
}

/** For screens that want to say whether MCA search is live yet. */
export const mcaConfigured = () => Boolean(mcaKey());
