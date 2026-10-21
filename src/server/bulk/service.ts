import "server-only";
import crypto from "node:crypto";
import type { JSONValue } from "postgres";
import { CW_CHECKS, unavailableReason, type CompanyData, type CwCode, type GstSearchData } from "@/lib/checks";
import { CC_CODES, firCovered, isCcCode, type CcCode } from "@/lib/cases";
import type { ConsentChannel, ConsentPurpose } from "@/lib/consent";
import { maskMobile } from "@/lib/mask";
import { isValidGstin, panFromGstin } from "@/lib/validators";
import { istDate } from "@/lib/dates";
import { screenResult, type ScreenFacts, type ScreenResult } from "@/lib/screen";
import { audit } from "@/server/audit";
import { billingSummary, priceList } from "@/server/billing/service";
import { caseDefaults, quoteChecks, releaseRequests, startChecks } from "@/server/checks/service";
import { pickCompany, searchCompanies, type CompanyHit } from "@/server/companies/search";
import { updateCounterparty } from "@/server/counterparties/service";
import { decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { isSampleMode } from "@/server/sample";
import { evidenceStore } from "@/server/storage";
import type { RequestContext } from "@/server/context";
import { rowContact, rowKey, type BulkInputRow } from "./rows";

// PRD v4.0 sections 6 and 7: multiple search. Rows are matched (free), the user picks and confirms, confirmed rows
// become buyers, a quick screen (GST search + Company check) sorts them into Avoid / Check further / Looks good /
// Not enough data, and the user deep-checks the rows they tick, with one cost popup and one cancel window each time.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

export type MatchState = "matched_exact" | "needs_pick" | "picked" | "not_found" | "duplicate" | "invalid";
export type BulkStatus = "ready" | "confirmed" | "screening" | "screened" | "deep_running" | "done";

export const SCREEN_CODES: CwCode[] = ["CW_GST_SEARCH", "CW_COMPANY"];
/** Personal CIBIL needs the person's PAN and date of birth, asked one buyer at a time from the report. Case Check
 * runs for many buyers too (FR-CC-04), with the search details filled from each buyer's record. */
export type DeepCode = CwCode | CcCode;
export const DEEP_CODES: DeepCode[] = [...CW_CHECKS.map((c) => c.code as CwCode).filter((c) => c !== "CW_CIBIL_PERSONAL"), ...CC_CODES];

const MAX_CANDIDATES = 8;

/** Runs fn over items, a few at a time (the database is a round trip away). */
async function pool<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

// ---------------------------------------------------------------- create and match (6.2)

interface Matched { state: MatchState; candidates: CompanyHit[]; picked: CompanyHit | null; error: string | null }

async function matchRow(ctx: Ctx, r: BulkInputRow, seen: Set<string>): Promise<Matched> {
  const key = rowKey(r);
  if (key.kind === "invalid") return { state: "invalid", candidates: [], picked: null, error: key.reason };
  const dupKey = `${key.kind}:${key.value}`;
  if (seen.has(dupKey)) return { state: "duplicate", candidates: [], picked: null, error: null };
  seen.add(dupKey);
  const res = await searchCompanies(ctx, { q: key.value, state: r.state || undefined, city: key.kind === "name" ? r.city || undefined : undefined, activeOnly: false });
  const hits = [...res.yours, ...res.matches];
  if (key.kind !== "name") {
    if (hits[0]) return { state: "matched_exact", candidates: hits.slice(0, 1), picked: hits[0], error: null };
    return { state: "not_found", candidates: [], picked: null, error: res.gstState === "unavailable" ? "gstUnavailable" : null };
  }
  // FR-SR-05 / FR-BK-02: a name never picks on its own, the user chooses.
  if (!hits.length) return { state: "not_found", candidates: [], picked: null, error: res.mcaReady ? null : "mcaNotReady" };
  return { state: "needs_pick", candidates: hits.slice(0, MAX_CANDIDATES), picked: null, error: null };
}

export async function createBulk(ctx: Ctx, input: { source: "typed" | "file"; rows: BulkInputRow[]; file?: { name: string; bytes: Uint8Array } }) {
  const db = sql();
  const id = crypto.randomUUID();
  let fileRef: string | null = null;
  let sha: string | null = null;
  if (input.file) {
    sha = crypto.createHash("sha256").update(input.file.bytes).digest("hex");
    const safe = input.file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80) || "list";
    const type = safe.toLowerCase().endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    fileRef = await evidenceStore.putOnce(`uploads/bulk/${ctx.orgId}/${id}/${safe}`, input.file.bytes, type);
  }
  const seen = new Set<string>();
  // Duplicates are decided in file order, so keys are claimed before the searches run in parallel.
  const order = input.rows.map((r) => r);
  const dupFlags = order.map((r) => {
    const k = rowKey(r);
    if (k.kind === "invalid") return false;
    const s = `${k.kind}:${k.value}`;
    if (seen.has(s)) return true;
    seen.add(s);
    return false;
  });
  const matched = await pool(order, 6, (r, i) => (dupFlags[i] ? Promise.resolve<Matched>({ state: "duplicate", candidates: [], picked: null, error: null }) : matchRow(ctx, r, new Set())));

  await db.begin(async (tx) => {
    await tx`
      insert into public.bulk_searches (id, org_id, created_by, source, file_name, file_ref, file_sha256, rows_total)
      values (${id}, ${ctx.orgId}, ${ctx.user.id}, ${input.source}, ${input.file?.name.slice(0, 160) ?? null}, ${fileRef}, ${sha}, ${input.rows.length})`;
    await tx`
      insert into public.bulk_rows ${tx(order.map((r, i) => {
        const contact = rowContact(r);
        const m = matched[i];
        return {
          bulk_id: id, org_id: ctx.orgId, row_no: i + 1,
          input: tx.json({ companyName: r.companyName, gstin: r.gstin, cin: r.cin, city: r.city, state: r.state, hasContact: Boolean(contact) } as JSONValue),
          contact_ciphertext: contact ? encryptField(JSON.stringify(contact), "bulk_rows.contact") : null,
          match_state: m.state, candidates: tx.json(m.candidates as unknown as JSONValue), picked: m.picked ? tx.json(m.picked as unknown as JSONValue) : null,
          included: m.state === "matched_exact" || m.state === "needs_pick", error: m.error,
        };
      }))}`;
  });
  await audit(ctx, { action: "bulk.created", entity: "bulk_search", entityId: id, after: { source: input.source, rows: input.rows.length, file: input.file?.name ?? null } });
  return { id };
}

// ---------------------------------------------------------------- view

export interface BulkRowView {
  id: string;
  rowNo: number;
  input: { companyName: string; gstin: string; cin: string; city: string; state: string; hasContact: boolean };
  matchState: MatchState;
  candidates: CompanyHit[];
  picked: CompanyHit | null;
  included: boolean;
  error: string | null;
  counterpartyId: string | null;
  companyName: string | null;
  screen: { requestId: string; status: string; result: ScreenResult | null; reasons: { key: string; values?: Record<string, string | number> }[]; facts: Partial<ScreenFacts> } | null;
  deep: { requestId: string; reportNo: string; status: string } | null;
  /** Case Check run from the deep check step (FR-CC-04). */
  case: { requestId: string; reportNo: string; status: string } | null;
}

export interface BulkView {
  id: string;
  source: "typed" | "file";
  fileName: string | null;
  status: BulkStatus;
  createdAt: string;
  rows: BulkRowView[];
  summary: { ready: number; needsPick: number; skipped: number };
  sample: boolean;
}

type RowDb = {
  id: string; row_no: number; input: BulkRowView["input"]; match_state: MatchState; candidates: CompanyHit[]; picked: CompanyHit | null; included: boolean;
  error: string | null; counterparty_id: string | null; legal_name: string | null; screen_request_id: string | null; screen_status: string | null;
  screen_result: ScreenResult | null; screen_reasons: BulkRowView["screen"] extends infer S ? S extends { reasons: infer R } ? R : never : never;
  screen_facts: Partial<ScreenFacts>; deep_request_id: string | null; deep_status: string | null; deep_report_no: string | null;
  case_request_id: string | null; case_status: string | null; case_report_no: string | null;
};

async function loadBulk(ctx: Ctx, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("This search");
  const [b] = await sql()<{ id: string; source: "typed" | "file"; file_name: string | null; status: BulkStatus; created_at: Date }[]>`
    select id, source, file_name, status, created_at from public.bulk_searches where id = ${id} and org_id = ${ctx.orgId}`;
  if (!b) throw notFound("This search");
  return b;
}

const rowsQuery = (ctx: Ctx, id: string) => sql()<RowDb[]>`
  select r.id, r.row_no, r.input, r.match_state, r.candidates, r.picked, r.included, r.error, r.counterparty_id, c.legal_name,
         r.screen_request_id, s.status::text as screen_status, r.screen_result, r.screen_reasons, r.screen_facts,
         r.deep_request_id, d.status::text as deep_status, d.report_no as deep_report_no,
         r.case_request_id, k.status::text as case_status, k.report_no as case_report_no
    from public.bulk_rows r
    left join public.counterparties c on c.id = r.counterparty_id
    left join public.check_requests s on s.id = r.screen_request_id
    left join public.check_requests d on d.id = r.deep_request_id
    left join public.check_requests k on k.id = r.case_request_id
   where r.bulk_id = ${id} and r.org_id = ${ctx.orgId}
   order by r.row_no`;

const finished = (status: string | null) => status === "complete" || status === "partial";

/** Works out screen results for finished quick-screen requests and moves the search on (7.2). */
async function refreshScreens(ctx: Ctx, bulkId: string, status: BulkStatus, rows: RowDb[]) {
  const db = sql();
  const due = rows.filter((r) => r.screen_request_id && !r.screen_result && finished(r.screen_status));
  if (due.length) {
    const items = await db<{ request_id: string; item_code: string; status: string; data: unknown }[]>`
      select request_id, item_code, status::text as status, data from public.check_items
       where request_id in ${db(due.map((r) => r.screen_request_id!))} and item_code in ${db(SCREEN_CODES)}`;
    const today = istDate(new Date());
    await Promise.all(due.map(async (r) => {
      const of = (code: string) => items.find((i) => i.request_id === r.screen_request_id && i.item_code === code && i.status === "success")?.data ?? null;
      const s = screenResult(of("CW_GST_SEARCH") as GstSearchData | null, of("CW_COMPANY") as CompanyData | null, today);
      r.screen_result = s.result; r.screen_reasons = s.reasons; r.screen_facts = s.facts;
      await db`update public.bulk_rows set screen_result = ${s.result}, screen_reasons = ${db.json(s.reasons as JSONValue)}, screen_facts = ${db.json(s.facts as unknown as JSONValue)} where id = ${r.id}`;
    }));
  }
  // A screen request cancelled in the window: the row can be screened again.
  const dropped = rows.filter((r) => r.screen_request_id && r.screen_status === "cancelled" && !r.screen_result);
  if (dropped.length) {
    await db`update public.bulk_rows set screen_request_id = null where id in ${db(dropped.map((r) => r.id))}`;
    dropped.forEach((r) => { r.screen_request_id = null; r.screen_status = null; });
  }
  const deepDropped = rows.filter((r) => r.deep_request_id && r.deep_status === "cancelled");
  if (deepDropped.length) {
    await db`update public.bulk_rows set deep_request_id = null where id in ${db(deepDropped.map((r) => r.id))}`;
    deepDropped.forEach((r) => { r.deep_request_id = null; r.deep_status = null; });
  }
  const caseDropped = rows.filter((r) => r.case_request_id && r.case_status === "cancelled");
  if (caseDropped.length) {
    await db`update public.bulk_rows set case_request_id = null where id in ${db(caseDropped.map((r) => r.id))}`;
    caseDropped.forEach((r) => { r.case_request_id = null; r.case_status = null; });
  }
  let next = status;
  const screened = rows.filter((r) => r.screen_request_id);
  if (status === "screening" && !screened.length) next = "confirmed";
  else if (status === "screening" && screened.every((r) => r.screen_result)) next = "screened";
  const deep = [...rows.filter((r) => r.deep_request_id).map((r) => r.deep_status), ...rows.filter((r) => r.case_request_id).map((r) => r.case_status)];
  if (status === "deep_running" && !deep.length) next = "screened";
  else if (status === "deep_running" && deep.every(finished)) next = "done";
  if (next !== status) await db`update public.bulk_searches set status = ${next} where id = ${bulkId}`;
  return next;
}

export async function getBulk(ctx: Ctx, id: string): Promise<BulkView> {
  const b = await loadBulk(ctx, id);
  const [rows, sample] = await Promise.all([rowsQuery(ctx, id), isSampleMode(ctx.orgId)]);
  const status = await refreshScreens(ctx, id, b.status, rows);
  const ready = rows.filter((r) => r.included && (r.match_state === "matched_exact" || r.match_state === "picked")).length;
  const needsPick = rows.filter((r) => r.included && r.match_state === "needs_pick").length;
  return {
    id: b.id, source: b.source, fileName: b.file_name, status, createdAt: b.created_at.toISOString(), sample,
    summary: { ready, needsPick, skipped: rows.length - ready - needsPick },
    rows: rows.map((r) => ({
      id: r.id, rowNo: r.row_no, input: r.input, matchState: r.match_state, candidates: r.candidates, picked: r.picked, included: r.included,
      error: r.error, counterpartyId: r.counterparty_id, companyName: r.legal_name ?? r.picked?.name ?? null,
      screen: r.screen_request_id ? { requestId: r.screen_request_id, status: r.screen_status ?? "", result: r.screen_result, reasons: r.screen_reasons ?? [], facts: r.screen_facts ?? {} } : null,
      deep: r.deep_request_id ? { requestId: r.deep_request_id, reportNo: r.deep_report_no ?? "", status: r.deep_status ?? "" } : null,
      case: r.case_request_id ? { requestId: r.case_request_id, reportNo: r.case_report_no ?? "", status: r.case_status ?? "" } : null,
    })),
  };
}

export async function listBulk(ctx: Ctx) {
  const rows = await sql()<{ id: string; source: string; file_name: string | null; status: BulkStatus; rows_total: number; created_at: Date; looks_good: number; screened: number }[]>`
    select b.id, b.source, b.file_name, b.status, b.rows_total, b.created_at,
           (select count(*)::int from public.bulk_rows r where r.bulk_id = b.id and r.screen_result = 'looks_good') as looks_good,
           (select count(*)::int from public.bulk_rows r where r.bulk_id = b.id and r.screen_result is not null) as screened
      from public.bulk_searches b where b.org_id = ${ctx.orgId} order by b.created_at desc limit 50`;
  return rows.map((r) => ({
    id: r.id, source: r.source, fileName: r.file_name, status: r.status, rows: r.rows_total, createdAt: r.created_at.toISOString(),
    looksGood: r.looks_good, screened: r.screened,
  }));
}

// ---------------------------------------------------------------- pick, untick and confirm (FR-BK-03, 04)

export async function updateRows(ctx: Ctx, id: string, changes: { rowId: string; included?: boolean; pick?: string; gstin?: string }[]) {
  const b = await loadBulk(ctx, id);
  if (b.status !== "ready") throw new AppError("conflict", "These rows are already confirmed.");
  const db = sql();
  for (const c of changes) {
    const [row] = await db<{ match_state: MatchState; candidates: CompanyHit[] }[]>`
      select match_state, candidates from public.bulk_rows where id = ${c.rowId} and bulk_id = ${id} and org_id = ${ctx.orgId}`;
    if (!row) throw notFound("This row");
    // 14.2 "add GSTIN": a row that was not found (a proprietor or partnership) is matched again by the GSTIN typed in.
    if (c.gstin !== undefined) {
      const gstin = c.gstin.trim().toUpperCase().replace(/\s/g, "");
      if (!isValidGstin(gstin)) throw new AppError("validation_failed", "This GSTIN is not valid.", { gstin: "This GSTIN is not valid." });
      const res = await searchCompanies(ctx, { q: gstin, activeOnly: false });
      const hit = [...res.yours, ...res.matches][0];
      if (!hit) throw new AppError("validation_failed", res.gstState === "unavailable" ? "The GST network is not answering. Try again in a minute." : "No GST registration found for this GSTIN.", { gstin: "No GST registration found for this GSTIN." });
      await db`
        update public.bulk_rows set match_state = 'matched_exact', picked = ${db.json(hit as unknown as JSONValue)}, candidates = ${db.json([hit] as unknown as JSONValue)},
               included = true, error = null, input = input || ${db.json({ gstin } as JSONValue)}
         where id = ${c.rowId}`;
      continue;
    }
    if (c.pick !== undefined) {
      const hit = row.candidates.find((h) => h.key === c.pick);
      if (!hit) throw new AppError("validation_failed", "Pick one of the companies shown.");
      await db`update public.bulk_rows set match_state = 'picked', picked = ${db.json(hit as unknown as JSONValue)}, included = true where id = ${c.rowId}`;
    }
    if (c.included !== undefined) {
      if (c.included && !["matched_exact", "picked", "needs_pick"].includes(row.match_state) && c.pick === undefined) {
        throw new AppError("validation_failed", "This row has no company to include.");
      }
      await db`update public.bulk_rows set included = ${c.included} where id = ${c.rowId}`;
    }
  }
  return getBulk(ctx, id);
}

/** FR-BK-04: confirmed rows become buyers (or link to existing ones), free; the file's contact is added when missing. */
export async function confirmBulk(ctx: Ctx, id: string) {
  const b = await loadBulk(ctx, id);
  if (b.status !== "ready") return getBulk(ctx, id);
  const db = sql();
  const rows = await db<{ id: string; match_state: MatchState; picked: CompanyHit | null; contact_ciphertext: string | null }[]>`
    select id, match_state, picked, contact_ciphertext from public.bulk_rows
     where bulk_id = ${id} and org_id = ${ctx.orgId} and included and match_state in ('matched_exact', 'picked') order by row_no`;
  if (!rows.length) throw new AppError("validation_failed", "Choose at least one company.", { rows: "Pick or tick at least one company to continue." });
  const pending = await db<{ n: number }[]>`select count(*)::int as n from public.bulk_rows where bulk_id = ${id} and included and match_state = 'needs_pick'`;
  if (pending[0].n) throw new AppError("validation_failed", "Pick a company for every ticked row, or untick it.", { rows: "Pick a company for every ticked row, or untick it." });

  const linked = new Set<string>();
  for (const r of rows) {
    const h = r.picked!;
    let cpId: string;
    try {
      cpId = h.counterpartyId ?? (await pickCompany(ctx, h.source === "gst" ? { source: "gst", gstin: h.key } : { source: "mca", cin: h.key })).id;
    } catch (e) {
      await db`update public.bulk_rows set included = false, error = ${(e instanceof AppError ? e.message : "Could not add this company.").slice(0, 300)} where id = ${r.id}`;
      continue;
    }
    if (linked.has(cpId)) {
      await db`update public.bulk_rows set match_state = 'duplicate', included = false where id = ${r.id}`;
      continue;
    }
    linked.add(cpId);
    if (r.contact_ciphertext) {
      const contact = JSON.parse(decryptField(r.contact_ciphertext, "bulk_rows.contact")) as { name: string; mobile: string; email: string | null };
      const [cp] = await db<{ has: boolean }[]>`select mobile_hash is not null as has from public.counterparties where id = ${cpId}`;
      if (cp && !cp.has) {
        await updateCounterparty(ctx, cpId, { contactName: contact.name, mobile: contact.mobile, email: contact.email, whatsapp: null } as Parameters<typeof updateCounterparty>[2]).catch(() => undefined);
      }
    }
    await db`update public.bulk_rows set counterparty_id = ${cpId} where id = ${r.id}`;
  }
  await db`update public.bulk_searches set status = 'confirmed' where id = ${id}`;
  await audit(ctx, { action: "bulk.confirmed", entity: "bulk_search", entityId: id, after: { companies: linked.size } });
  return getBulk(ctx, id);
}

// ---------------------------------------------------------------- quotes (one popup for many companies)

export interface BulkQuoteLine { code: DeepCode; name: string; count: number; unitPaise: number; pricePaise: number; gstPaise: number; amountPaise: number }
export interface BulkQuote {
  companies: number;
  skipped: number;
  lines: BulkQuoteLine[];
  pricePaise: number;
  gstPaise: number;
  walletPaise: number;
  walletBeforePaise: number;
  walletAfterPaise: number;
  enough: boolean;
  sample: boolean;
  /** Companies whose buyer is asked for a yes by OTP (GST turnover, company CIBIL). */
  needsConsent: number;
}

type Plan = { rowId: string; counterpartyId: string; codes: DeepCode[] };

async function planFor(ctx: Ctx, bulkId: string, rowIds: string[] | null, wanted: DeepCode[], screen = false): Promise<{ plans: Plan[]; skipped: number }> {
  const db = sql();
  const rows = await db<{ id: string; counterparty_id: string; type: string; gstin: string | null; pan_masked: string | null; cin: string | null; udyam: string | null; iec: string | null; has_mobile: boolean; status: string; state_code: string | null }[]>`
    select r.id, r.counterparty_id, c.type::text as type, c.gstin, c.pan_masked, c.cin, c.udyam, c.iec, c.mobile_hash is not null as has_mobile, c.status::text as status,
           c.state_code
      from public.bulk_rows r join public.counterparties c on c.id = r.counterparty_id
     where r.bulk_id = ${bulkId} and r.org_id = ${ctx.orgId} and r.included
       and ${rowIds ? db`r.id in ${db(rowIds)}` : db`true`}
     order by r.row_no`;
  const plans: Plan[] = [];
  for (const r of rows) {
    if (r.status !== "active") continue;
    const ids = {
      type: r.type as never, gstin: r.gstin, pan: r.pan_masked ? "PAN" : r.gstin ? panFromGstin(r.gstin) : null, cin: r.cin, udyam: r.udyam, iec: r.iec, hasMobile: r.has_mobile,
    };
    // 7.1: the quick screen runs the Company check only where a CIN exists.
    const codes = wanted.filter((c) => {
      // Case Check needs the state for the court search; FIR only where the provider covers the state (v3 section 7).
      if (isCcCode(c)) return Boolean(r.state_code) && (c !== "CC_FIR" || firCovered(r.state_code!));
      return !unavailableReason(c, ids) && !(screen && c === "CW_COMPANY" && !r.cin);
    });
    if (codes.length) plans.push({ rowId: r.id, counterpartyId: r.counterparty_id, codes });
  }
  return { plans, skipped: rows.length - plans.length };
}

async function quoteFor(ctx: Ctx, plans: Plan[], skipped: number): Promise<BulkQuote> {
  const [prices, summary, sample] = await Promise.all([priceList(ctx.orgId), billingSummary(ctx.orgId), isSampleMode(ctx.orgId)]);
  const byCode = new Map(prices.map((p) => [p.code, p]));
  const counts = new Map<DeepCode, number>();
  for (const p of plans) for (const c of p.codes) if (byCode.has(c)) counts.set(c, (counts.get(c) ?? 0) + 1);
  const lines: BulkQuoteLine[] = [...counts.entries()].map(([code, count]) => {
    const p = byCode.get(code)!;
    const price = Number(p.pricePaise);
    const gst = Number(p.gstPaise);
    return { code, name: p.name, count, unitPaise: price + gst, pricePaise: price * count, gstPaise: gst * count, amountPaise: (price + gst) * count };
  });
  const total = lines.reduce((s, l) => s + l.amountPaise, 0);
  const wallet = Number(summary.walletPaise);
  const walletPaise = sample ? 0 : total;
  const consentCodes: string[] = CW_CHECKS.filter((c) => c.consent).map((c) => c.code);
  return {
    companies: plans.length, skipped, lines,
    pricePaise: lines.reduce((s, l) => s + l.pricePaise, 0), gstPaise: lines.reduce((s, l) => s + l.gstPaise, 0),
    walletPaise, walletBeforePaise: wallet, walletAfterPaise: wallet - walletPaise, enough: wallet >= walletPaise, sample,
    needsConsent: plans.filter((p) => p.codes.some((c) => consentCodes.includes(c))).length,
  };
}

export async function screenQuote(ctx: Ctx, id: string) {
  const b = await loadBulk(ctx, id);
  if (b.status !== "confirmed") throw new AppError("conflict", "The quick screen has already run for this search.");
  const { plans, skipped } = await planFor(ctx, id, null, SCREEN_CODES, true);
  return quoteFor(ctx, plans, skipped);
}

export async function deepQuote(ctx: Ctx, id: string, rowIds: string[], codes: string[]) {
  const b = await loadBulk(ctx, id);
  if (b.status !== "screened" && b.status !== "done") throw new AppError("conflict", "Wait for the quick screen to finish.");
  const wanted = codes.filter((c): c is DeepCode => (DEEP_CODES as string[]).includes(c));
  if (!wanted.length) throw new AppError("validation_failed", "Select at least one check.", { items: "Select at least one check." });
  if (!rowIds.length) throw new AppError("validation_failed", "Select at least one company.", { rows: "Select at least one company." });
  const { plans, skipped } = await planFor(ctx, id, rowIds, wanted);
  return quoteFor(ctx, plans, skipped);
}

// ---------------------------------------------------------------- start (one cancel window for all)

async function startMany(ctx: Ctx, bulkId: string, plans: Plan[], column: "screen_request_id" | "deep_request_id", origin: string, key: string, consent?: { purpose: ConsentPurpose; channels: ConsentChannel[] }) {
  const db = sql();
  const started = await pool(plans, 6, async (p) => {
    const ids: string[] = [];
    const cw = p.codes.filter((c) => !isCcCode(c));
    const cc = p.codes.filter(isCcCode);
    try {
      if (cw.length) {
        const q = await quoteChecks(ctx, p.counterpartyId, cw, undefined);
        const r = await startChecks(ctx, {
          quoteId: q.quoteId, counterpartyId: p.counterpartyId, items: cw, mode: "together", bulkId, consent: q.consent ? consent : undefined,
        }, origin, `${key}:${p.rowId}`, { defer: true });
        await db`update public.bulk_rows set ${db({ [column]: r.id } as Record<string, never>)} where id = ${p.rowId}`;
        ids.push(r.id);
      }
      if (cc.length) {
        // FR-CC-02: the search details come from the buyer's record.
        const d = await caseDefaults(ctx, p.counterpartyId);
        const q = await quoteChecks(ctx, p.counterpartyId, cc, undefined, { tab: "case_check" });
        const r = await startChecks(ctx, {
          tab: "case_check", quoteId: q.quoteId, counterpartyId: p.counterpartyId, items: cc, mode: "together", bulkId,
          caseInput: { name: d.name, state: d.state, district: d.district || d.name, address: d.address || d.district || d.name },
        }, origin, `${key}:${p.rowId}:case`, { defer: true });
        await db`update public.bulk_rows set case_request_id = ${r.id} where id = ${p.rowId}`;
        ids.push(r.id);
      }
      return ids;
    } catch (e) {
      await db`update public.bulk_rows set error = ${(e instanceof AppError ? e.message : "Could not start for this company.").slice(0, 300)} where id = ${p.rowId}`;
      return ids;
    }
  });
  const ids = started.flat();
  if (!ids.length) throw new AppError("conflict", "Nothing could start. Check the rows and try again.");
  const window = await releaseRequests(ctx, ids);
  return { started: started.filter((x) => x.length).length, ...window! };
}

export async function startScreen(ctx: Ctx, id: string, origin: string, key: string) {
  const b = await loadBulk(ctx, id);
  if (b.status !== "confirmed") throw new AppError("conflict", "The quick screen has already started.");
  const { plans, skipped } = await planFor(ctx, id, null, SCREEN_CODES, true);
  const quote = await quoteFor(ctx, plans, skipped);
  if (!quote.enough) throw new AppError("conflict", "Your wallet does not have enough money for this. Add money and try again.");
  await sql()`update public.bulk_searches set status = 'screening' where id = ${id}`;
  try {
    const r = await startMany(ctx, id, plans, "screen_request_id", origin, key);
    await audit(ctx, { action: "bulk.screen_confirmed", entity: "bulk_search", entityId: id, after: { companies: r.started, walletPaise: quote.walletPaise } });
    return r;
  } catch (e) {
    await sql()`update public.bulk_searches set status = 'confirmed' where id = ${id}`;
    throw e;
  }
}

export async function startDeep(ctx: Ctx, id: string, input: { rowIds: string[]; codes: string[]; consent?: { purpose: ConsentPurpose; channels: ConsentChannel[] } }, origin: string, key: string) {
  const b = await loadBulk(ctx, id);
  if (b.status !== "screened" && b.status !== "done") throw new AppError("conflict", "Wait for the quick screen to finish.");
  const wanted = input.codes.filter((c): c is DeepCode => (DEEP_CODES as string[]).includes(c));
  const { plans, skipped } = await planFor(ctx, id, input.rowIds, wanted);
  const quote = await quoteFor(ctx, plans, skipped);
  if (!quote.enough) throw new AppError("conflict", "Your wallet does not have enough money for this. Add money and try again.");
  if (quote.needsConsent && !input.consent?.channels.length) {
    throw new AppError("validation_failed", "Choose how to send the consent requests.", { channels: "Choose at least one way to send the requests." });
  }
  await sql()`update public.bulk_searches set status = 'deep_running' where id = ${id}`;
  try {
    const r = await startMany(ctx, id, plans, "deep_request_id", origin, key, input.consent);
    await audit(ctx, { action: "bulk.deep_confirmed", entity: "bulk_search", entityId: id, after: { companies: r.started, items: wanted, walletPaise: quote.walletPaise } });
    return r;
  } catch (e) {
    await sql()`update public.bulk_searches set status = ${b.status} where id = ${id}`;
    throw e;
  }
}

/** FR-PAY-02 for a multiple search: cancel every request of this step still inside the window. */
export async function cancelBulk(ctx: Ctx, id: string) {
  const b = await loadBulk(ctx, id);
  const db = sql();
  const cancelled = await db<{ id: string }[]>`
    update public.check_requests set status = 'cancelled', completed_at = now(), start_error = 'Cancelled before it started. Nothing charged.'
     where bulk_id = ${id} and org_id = ${ctx.orgId} and status = 'pending_start' and start_at > now()
     returning id`;
  if (!cancelled.length) throw new AppError("conflict", "It has already started. You pay only for data that arrives.");
  const ids = cancelled.map((c) => c.id);
  await db`update public.check_items set status = 'cancelled', error_message = 'Cancelled before it started. Not charged.' where request_id in ${db(ids)}`;
  await db`update public.bulk_rows set screen_request_id = null where screen_request_id in ${db(ids)}`;
  await db`update public.bulk_rows set deep_request_id = null where deep_request_id in ${db(ids)}`;
  await db`update public.bulk_rows set case_request_id = null where case_request_id in ${db(ids)}`;
  const back = b.status === "screening" ? "confirmed" : b.status === "deep_running" ? "screened" : b.status;
  await db`update public.bulk_searches set status = ${back} where id = ${id}`;
  await audit(ctx, { action: "bulk.cancelled", entity: "bulk_search", entityId: id, after: { requests: ids.length } });
  return { cancelled: ids.length };
}

// ---------------------------------------------------------------- Excel export (FR-QS-04)

const RESULT_TEXT: Record<ScreenResult, string> = { avoid: "Avoid", check_further: "Check further", looks_good: "Looks good", not_enough_data: "Not enough data" };
const REASON_TEXT: Record<string, (v: Record<string, string | number>) => string> = {
  noRecords: () => "No GST or MCA record found",
  gstinInactive: (v) => `GSTIN ${v.gstin} is ${String(v.status).toLowerCase()}`,
  mcaStatus: (v) => `MCA status: ${v.status}`,
  noFilings: (v) => `No GST return filed in the last ${v.months} months`,
  lateFilings: (v) => `${v.count} late or missing GSTR-3B in 12 months`,
  young: (v) => `In business ${v.years} year(s)`,
  lowCapital: () => "Paid-up capital below ₹1 lakh",
};
export const reasonText = (r: { key: string; values?: Record<string, string | number> }) => REASON_TEXT[r.key]?.(r.values ?? {}) ?? r.key;

export async function exportBulk(ctx: Ctx, id: string): Promise<{ name: string; rows: (string | number | null)[][] }> {
  const view = await getBulk(ctx, id);
  const header = ["Row", "Company", "GSTIN", "CIN/LLPIN", "GST status", "Returns filed (12 months)", "MCA status", "Years in business", "Paid-up capital (₹)", "Screen result", "Reasons", "Deep check report", "Case Check report"];
  const rows = view.rows.filter((r) => r.counterpartyId).map((r) => {
    const f = r.screen?.facts ?? {};
    return [
      r.rowNo, r.companyName, r.picked?.gstin ?? (r.input.gstin || null), r.picked?.cin ?? (r.input.cin || null), f.gstStatus ?? null,
      f.months12 ? `${f.filed12}/${f.months12}` : null, f.mcaStatus ?? null, f.yearsInBusiness ?? null,
      f.paidUpCapitalPaise == null ? null : Math.round(f.paidUpCapitalPaise / 100), r.screen?.result ? RESULT_TEXT[r.screen.result] : null,
      (r.screen?.reasons ?? []).map(reasonText).join("; ") || null, r.deep?.reportNo ?? null, r.case?.reportNo ?? null,
    ];
  });
  await audit(ctx, { action: "bulk.exported", entity: "bulk_search", entityId: id, after: { rows: rows.length } });
  const note = [view.sample ? "SAMPLE DATA: not real results." : "", "This uses public records only. It is a first filter, not a credit decision."].filter(Boolean).join(" ");
  return { name: `chaanbean-multiple-search-${view.createdAt.slice(0, 10)}.xlsx`, rows: [header, ...rows, [], [note]] };
}

export const maskedContact = (ciphertext: string | null) => {
  if (!ciphertext) return null;
  const c = JSON.parse(decryptField(ciphertext, "bulk_rows.contact")) as { name: string; mobile: string };
  return { name: c.name, mobile: maskMobile(c.mobile) };
};
