import "server-only";
import type { JSONValue } from "postgres";
import { maskEmail, maskMobile, maskPan } from "@/lib/mask";
import {
  bpToRate, rateToBp, type CounterpartyType, type UpiStatus, type createCounterpartySchema, type updateCounterpartySchema,
} from "@/lib/counterparties";
import { isValidGstin, isValidPan, normaliseIdentifier, normaliseMobile, panFromGstin } from "@/lib/validators";
import { audit } from "@/server/audit";
import { blindIndex, decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError, notFound } from "@/server/errors";
import { identityProvider } from "@/server/providers/identity";
import { GST_STATES } from "@/server/providers/identity/states";
import { upiProvider } from "@/server/providers/upi";
import type { RequestContext } from "@/server/context";
import type { z } from "zod";

// Counterparties: the buyers, debtors and borrowers an organisation checks and deals with (PRD S05–S07, FR-CP-01–08).
// PAN, mobile, WhatsApp and email are encrypted at rest and found by keyed hash, so they match on the full value only;
// name and GSTIN are searchable as the user types.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

const UPI_RESULT_VALID_MS = 24 * 60 * 60 * 1000; // a UPI lookup is attached to a new counterparty for a day

const enc = {
  pan: (v: string) => encryptField(v, "counterparties.pan"),
  mobile: (v: string) => encryptField(v, "counterparties.mobile"),
  whatsapp: (v: string) => encryptField(v, "counterparties.whatsapp"),
  email: (v: string) => encryptField(v, "counterparties.email"),
};

// ---------------------------------------------------------------- list (S05)

export interface CounterpartyRow {
  id: string;
  type: CounterpartyType;
  legalName: string;
  identifier: string;
  mobile: string;
  upiStatus: UpiStatus;
  city: string | null;
  tags: string[];
  status: "active" | "archived";
  createdAt: string;
}

export interface ListQuery {
  q?: string;
  status?: "active" | "archived" | "all";
  tag?: string;
  sort?: "name" | "created";
  dir?: "asc" | "desc";
  page?: number;
  size?: number;
}

type DbRow = {
  id: string; type: CounterpartyType; legal_name: string; gstin: string | null; pan_masked: string | null;
  mobile_masked: string; upi_status: UpiStatus; city: string | null; tags: string[]; status: "active" | "archived"; created_at: Date;
};

const toRow = (r: DbRow): CounterpartyRow => ({
  id: r.id, type: r.type, legalName: r.legal_name, identifier: r.gstin ?? r.pan_masked ?? "", mobile: r.mobile_masked,
  upiStatus: r.upi_status, city: r.city, tags: r.tags, status: r.status, createdAt: r.created_at.toISOString(),
});

/** What the search box matches: a full mobile or PAN by hash, a GSTIN by prefix, otherwise name or GSTIN by substring. */
function searchFilter(db: ReturnType<typeof sql>, raw: string | undefined) {
  const q = (raw ?? "").trim();
  if (q.length < 2) return db`true`;
  const mobile = normaliseMobile(q);
  if (mobile) return db`c.mobile_hash = ${blindIndex(mobile, "mobile")}`;
  const id = normaliseIdentifier(q);
  if (isValidPan(id)) return db`c.pan_hash = ${blindIndex(id, "pan")}`;
  const like = `%${q.toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  return db`(lower(c.legal_name) like ${like} or lower(coalesce(c.trade_name, '')) like ${like} or c.gstin like ${`${id.replace(/[\\%_]/g, "")}%`})`;
}

export async function listCounterparties(ctx: Ctx, query: ListQuery) {
  const db = sql();
  const size = [10, 25, 50].includes(query.size ?? 0) ? query.size! : 10;
  const page = Math.max(1, query.page ?? 1);
  const status = query.status ?? "active";
  const where = db`
    c.org_id = ${ctx.orgId}
    and ${status === "all" ? db`true` : db`c.status = ${status}::public.counterparty_status`}
    and ${query.tag ? db`${query.tag.toLowerCase()} = any(c.tags)` : db`true`}
    and ${searchFilter(db, query.q)}`;
  const order = query.sort === "name"
    ? (query.dir === "desc" ? db`lower(c.legal_name) desc` : db`lower(c.legal_name) asc`)
    : (query.dir === "asc" ? db`c.created_at asc` : db`c.created_at desc`);
  const [rows, [{ total }], tags] = await Promise.all([
    db<DbRow[]>`
      select c.id, c.type, c.legal_name, c.gstin, c.pan_masked, c.mobile_masked, c.upi_status, c.city, c.tags, c.status, c.created_at
        from public.counterparties c where ${where} order by ${order} limit ${size} offset ${(page - 1) * size}`,
    db<{ total: number }[]>`select count(*)::int as total from public.counterparties c where ${where}`,
    db<{ tag: string }[]>`
      select distinct unnest(tags) as tag from public.counterparties where org_id = ${ctx.orgId} order by 1 limit 100`,
  ]);
  return { rows: rows.map(toRow), total, page, size, tags: tags.map((t) => t.tag) };
}

/** The whole filtered list for CSV export (S05 marker 3, Owner and Admin). Masked values only. */
export async function exportCounterparties(ctx: Ctx, query: ListQuery): Promise<string> {
  const db = sql();
  const status = query.status ?? "active";
  const rows = await db<(DbRow & { contact_name: string; state_code: string | null; credit_days: number | null; interest_rate_bp: number | null })[]>`
    select c.id, c.type, c.legal_name, c.gstin, c.pan_masked, c.mobile_masked, c.upi_status, c.city, c.tags, c.status, c.created_at,
           c.contact_name, c.state_code, c.credit_days, c.interest_rate_bp
      from public.counterparties c
     where c.org_id = ${ctx.orgId}
       and ${status === "all" ? db`true` : db`c.status = ${status}::public.counterparty_status`}
       and ${query.tag ? db`${query.tag.toLowerCase()} = any(c.tags)` : db`true`}
       and ${searchFilter(db, query.q)}
     order by lower(c.legal_name) limit 10000`;
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // keep spreadsheet formulas out of exported cells
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ["Name", "Type", "GSTIN or PAN", "Contact", "Mobile", "City", "State", "Bank-linked mobile", "Credit days", "Interest % a year", "Tags", "Status", "Added on"];
  const lines = rows.map((r) =>
    [
      r.legal_name, r.type, r.gstin ?? r.pan_masked, r.contact_name, r.mobile_masked, r.city, r.state_code ? GST_STATES[r.state_code] ?? r.state_code : "",
      r.upi_status, r.credit_days, bpToRate(r.interest_rate_bp), r.tags.join("; "), r.status, r.created_at.toISOString().slice(0, 10),
    ].map(cell).join(","),
  );
  await audit(ctx, { action: "counterparty.exported", entity: "counterparty", after: { rows: rows.length, status, tag: query.tag ?? null } });
  return [header.join(","), ...lines].join("\n") + "\n";
}

// ---------------------------------------------------------------- duplicates (FR-CP-04)

export interface DuplicateMatch {
  id: string;
  legalName: string;
  status: "active" | "archived";
  matchedOn: ("gstin" | "pan" | "mobile")[];
}

export async function findDuplicates(ctx: Ctx, input: { gstin?: string; pan?: string; mobile?: string }, excludeId?: string) {
  const gstin = input.gstin && isValidGstin(input.gstin) ? normaliseIdentifier(input.gstin) : null;
  const panRaw = input.pan ? normaliseIdentifier(input.pan) : gstin ? panFromGstin(gstin) : null;
  const pan = panRaw && isValidPan(panRaw) ? panRaw : null;
  const mobile = input.mobile ? normaliseMobile(input.mobile) : null;
  if (!gstin && !pan && !mobile) return [];
  const panHash = pan ? blindIndex(pan, "pan") : null;
  const mobileHash = mobile ? blindIndex(mobile, "mobile") : null;
  const rows = await sql()<{ id: string; legal_name: string; status: "active" | "archived"; by_gstin: boolean; by_pan: boolean; by_mobile: boolean }[]>`
    select id, legal_name, status,
           (gstin is not null and gstin = ${gstin}) as by_gstin,
           (pan_hash is not null and pan_hash = ${panHash}) as by_pan,
           (mobile_hash = ${mobileHash}) as by_mobile
      from public.counterparties
     where org_id = ${ctx.orgId} and (gstin = ${gstin} or pan_hash = ${panHash} or mobile_hash = ${mobileHash})
       and ${excludeId ? sql()`id <> ${excludeId}` : sql()`true`}`;
  return rows.map<DuplicateMatch>((r) => ({
    id: r.id,
    legalName: r.legal_name,
    status: r.status,
    matchedOn: [r.by_gstin && "gstin", r.by_pan && "pan", r.by_mobile && "mobile"].filter(Boolean) as DuplicateMatch["matchedOn"],
  }));
}

function duplicateError(matches: DuplicateMatch[]) {
  const m = matches[0];
  return new AppError("conflict", "This counterparty already exists.", { duplicateId: m.id, duplicateName: m.legalName });
}

// ---------------------------------------------------------------- GSTIN fetch (FR-CP-02) and UPI check (FR-CP-03)

export async function gstFetch(raw: string) {
  const gstin = normaliseIdentifier(raw);
  if (!isValidGstin(gstin)) throw new AppError("validation_failed", "Please check the GSTIN.", { gstin: "This GSTIN is not valid." });
  const provider = identityProvider();
  const result = await provider.searchGstin(gstin);
  if (result.status === "not_available" || result.status === "failed") {
    return { state: "unavailable" as const, gstin, testData: provider.isMock };
  }
  if (result.status === "no_data" || !result.data) return { state: "not_found" as const, gstin, testData: provider.isMock };
  const d = result.data;
  return {
    state: "found" as const,
    gstin,
    testData: provider.isMock,
    legalName: d.legalName,
    tradeName: d.tradeName,
    pan: panFromGstin(gstin),
    gstStatus: d.status,
    stateCode: d.stateCode,
    address: { line: d.address.line, city: d.address.city, state: d.address.state, pincode: d.address.pincode },
  };
}

export async function checkUpi(ctx: Ctx, raw: string) {
  const mobile = normaliseMobile(raw);
  if (!mobile) throw new AppError("validation_failed", "Please check the mobile number.", { mobile: "Enter a valid mobile number." });
  const provider = upiProvider();
  const result = await provider.lookup(mobile);
  const status: Exclude<UpiStatus, "not_checked" | "manual_confirmed"> =
    result.status === "success" && result.data ? (result.data.linked ? "linked" : "not_linked") : "unavailable";
  const name = status === "linked" ? result.data!.name : null;
  const [row] = await sql()<{ checked_at: Date }[]>`
    insert into app_private.upi_checks (org_id, mobile_hash, status, upi_name, provider, checked_by)
    values (${ctx.orgId}, ${blindIndex(mobile, "mobile")}, ${status}::public.upi_status, ${name}, ${provider.name}, ${ctx.user.id})
    returning checked_at`;
  return { status, name, checkedAt: row.checked_at.toISOString(), testData: provider.isMock };
}

async function latestUpiCheck(orgId: string, mobileHash: string) {
  const [row] = await sql()<{ status: UpiStatus; upi_name: string | null; checked_at: Date }[]>`
    select status, upi_name, checked_at from app_private.upi_checks
     where org_id = ${orgId} and mobile_hash = ${mobileHash} and checked_at > now() - ${`${UPI_RESULT_VALID_MS / 1000} seconds`}::interval
     order by checked_at desc limit 1`;
  return row ?? null;
}

// ---------------------------------------------------------------- create (S06, FR-CP-01)

export async function createCounterparty(ctx: Ctx, input: z.output<typeof createCounterpartySchema>) {
  const pan = input.type === "business_gstin" ? panFromGstin(input.gstin!) : input.pan!;
  const gstin = input.type === "business_gstin" ? input.gstin! : null;
  const dupes = await findDuplicates(ctx, { gstin: gstin ?? undefined, pan, mobile: input.mobile });
  if (dupes.length) throw duplicateError(dupes);

  const mobileHash = blindIndex(input.mobile, "mobile");
  const upi = await latestUpiCheck(ctx.orgId, mobileHash);
  const gst = gstin ? await gstFetch(gstin) : null;
  const stateCode = gstin ? gstin.slice(0, 2) : stateCodeFor(input.address.state);
  const whatsapp = input.whatsapp && input.whatsapp !== input.mobile ? input.whatsapp : null;

  let id: string;
  try {
    const [row] = await sql()<{ id: string }[]>`
      insert into public.counterparties (
        org_id, type, legal_name, trade_name, gstin, gst_status, pan_hash, pan_ciphertext, pan_masked, cin, udyam,
        contact_name, mobile_hash, mobile_ciphertext, mobile_masked, whatsapp_ciphertext, whatsapp_masked,
        email_ciphertext, email_masked, address, state_code, city, credit_days, interest_rate_bp, tags,
        upi_status, upi_name, upi_checked_at, created_by)
      values (
        ${ctx.orgId}, ${input.type}::public.counterparty_type, ${input.legalName}, ${input.tradeName ?? null}, ${gstin},
        ${gst?.state === "found" ? gst.gstStatus : null}, ${blindIndex(pan, "pan")}, ${enc.pan(pan)}, ${maskPan(pan)},
        ${input.cin ?? null}, ${input.udyam ?? null}, ${input.contactName}, ${mobileHash}, ${enc.mobile(input.mobile)},
        ${maskMobile(input.mobile)}, ${whatsapp ? enc.whatsapp(whatsapp) : null}, ${whatsapp ? maskMobile(whatsapp) : null},
        ${input.email ? enc.email(input.email.toLowerCase()) : null}, ${input.email ? maskEmail(input.email) : null},
        ${sql().json(input.address as JSONValue)}, ${stateCode}, ${input.address.city}, ${input.creditDays ?? null},
        ${rateToBp(input.interestRate)}, ${input.tags}, ${upi?.status ?? "not_checked"}::public.upi_status,
        ${upi?.upi_name ?? null}, ${upi?.checked_at ?? null}, ${ctx.user.id})
      returning id`;
    id = row.id;
  } catch (e) {
    // Two people saving the same counterparty at once: the unique index decides, the loser sees the duplicate.
    if ((e as { code?: string }).code === "23505") {
      const again = await findDuplicates(ctx, { gstin: gstin ?? undefined, pan, mobile: input.mobile });
      if (again.length) throw duplicateError(again);
    }
    throw e;
  }

  await audit(ctx, {
    action: "counterparty.created",
    entity: "counterparty",
    entityId: id,
    after: { type: input.type, legalName: input.legalName, gstin, mobile: maskMobile(input.mobile), upi: upi?.status ?? "not_checked" },
  });
  return { id };
}

function stateCodeFor(stateName: string): string | null {
  const wanted = stateName.trim().toLowerCase();
  const hit = Object.entries(GST_STATES).find(([, name]) => name.toLowerCase() === wanted);
  return hit ? hit[0] : null;
}

// ---------------------------------------------------------------- profile (S07)

export interface CounterpartyProfile {
  id: string;
  type: CounterpartyType;
  legalName: string;
  tradeName: string | null;
  gstin: string | null;
  gstStatus: string | null;
  pan: string | null;
  cin: string | null;
  udyam: string | null;
  contactName: string;
  mobile: string;
  whatsapp: string | null;
  email: string | null;
  address: { line: string; city: string; state: string; pincode: string };
  stateName: string | null;
  creditDays: number | null;
  interestRate: number | null;
  tags: string[];
  notes: string | null;
  upi: { status: UpiStatus; name: string | null; checkedAt: string | null };
  status: "active" | "archived";
  archivedAt: string | null;
  createdAt: string;
}

export async function getCounterparty(ctx: Ctx, id: string): Promise<CounterpartyProfile> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("This counterparty");
  const [r] = await sql()<{
    id: string; type: CounterpartyType; legal_name: string; trade_name: string | null; gstin: string | null; gst_status: string | null;
    pan_masked: string | null; cin: string | null; udyam: string | null; contact_name: string; mobile_masked: string;
    whatsapp_masked: string | null; email_masked: string | null; address: CounterpartyProfile["address"]; state_code: string | null;
    credit_days: number | null; interest_rate_bp: number | null; tags: string[]; notes: string | null; upi_status: UpiStatus;
    upi_name: string | null; upi_checked_at: Date | null; status: "active" | "archived"; archived_at: Date | null; created_at: Date;
  }[]>`
    select id, type, legal_name, trade_name, gstin, gst_status, pan_masked, cin, udyam, contact_name, mobile_masked,
           whatsapp_masked, email_masked, address, state_code, credit_days, interest_rate_bp, tags, notes, upi_status,
           upi_name, upi_checked_at, status, archived_at, created_at
      from public.counterparties where id = ${id} and org_id = ${ctx.orgId}`;
  if (!r) throw notFound("This counterparty");
  return {
    id: r.id, type: r.type, legalName: r.legal_name, tradeName: r.trade_name, gstin: r.gstin, gstStatus: r.gst_status,
    pan: r.pan_masked, cin: r.cin, udyam: r.udyam, contactName: r.contact_name, mobile: r.mobile_masked,
    whatsapp: r.whatsapp_masked, email: r.email_masked, address: r.address,
    stateName: r.state_code ? GST_STATES[r.state_code] ?? null : null, creditDays: r.credit_days,
    interestRate: bpToRate(r.interest_rate_bp), tags: r.tags, notes: r.notes,
    upi: { status: r.upi_status, name: r.upi_name, checkedAt: r.upi_checked_at?.toISOString() ?? null },
    status: r.status, archivedAt: r.archived_at?.toISOString() ?? null, createdAt: r.created_at.toISOString(),
  };
}

/** Full contact details for the S07 edit form, the one place mobile numbers are not masked (PRD S05 rule). */
export async function getContactForEdit(ctx: Ctx, id: string) {
  const [r] = await sql()<{ contact_name: string; mobile_ciphertext: string; whatsapp_ciphertext: string | null; email_ciphertext: string | null; address: CounterpartyProfile["address"]; credit_days: number | null; interest_rate_bp: number | null; tags: string[]; notes: string | null }[]>`
    select contact_name, mobile_ciphertext, whatsapp_ciphertext, email_ciphertext, address, credit_days, interest_rate_bp, tags, notes
      from public.counterparties where id = ${id} and org_id = ${ctx.orgId}`;
  if (!r) throw notFound("This counterparty");
  return {
    contactName: r.contact_name,
    mobile: decryptField(r.mobile_ciphertext, "counterparties.mobile"),
    whatsapp: r.whatsapp_ciphertext ? decryptField(r.whatsapp_ciphertext, "counterparties.whatsapp") : "",
    email: r.email_ciphertext ? decryptField(r.email_ciphertext, "counterparties.email") : "",
    address: r.address,
    creditDays: r.credit_days,
    interestRate: bpToRate(r.interest_rate_bp),
    tags: r.tags,
    notes: r.notes ?? "",
  };
}

// ---------------------------------------------------------------- edit, archive, restore (S07, FR-CP-08)

export async function updateCounterparty(ctx: Ctx, id: string, patch: z.output<typeof updateCounterpartySchema>) {
  const before = await getCounterparty(ctx, id);
  if (before.status === "archived") throw new AppError("conflict", "Restore this counterparty before editing it.");
  if (patch.mobile) {
    const dupes = await findDuplicates(ctx, { mobile: patch.mobile }, id);
    if (dupes.length) throw duplicateError(dupes);
  }
  const db = sql();
  const set: Record<string, unknown> = {};
  const changed: Record<string, unknown> = {};
  const was: Record<string, unknown> = {};
  if (patch.contactName !== undefined && patch.contactName !== before.contactName) {
    set.contact_name = patch.contactName; changed.contactName = patch.contactName; was.contactName = before.contactName;
  }
  if (patch.mobile !== undefined) {
    const masked = maskMobile(patch.mobile);
    const mobileHash = blindIndex(patch.mobile, "mobile");
    const upi = await latestUpiCheck(ctx.orgId, mobileHash);
    Object.assign(set, {
      mobile_hash: mobileHash, mobile_ciphertext: enc.mobile(patch.mobile), mobile_masked: masked,
      // A new number has to be checked again (FR-CP-03).
      upi_status: upi?.status ?? "not_checked", upi_name: upi?.upi_name ?? null, upi_checked_at: upi?.checked_at ?? null, upi_confirmed_by: null,
    });
    if (masked !== before.mobile) { changed.mobile = masked; was.mobile = before.mobile; }
  }
  if (patch.whatsapp !== undefined) {
    Object.assign(set, {
      whatsapp_ciphertext: patch.whatsapp ? enc.whatsapp(patch.whatsapp) : null,
      whatsapp_masked: patch.whatsapp ? maskMobile(patch.whatsapp) : null,
    });
    changed.whatsapp = patch.whatsapp ? maskMobile(patch.whatsapp) : null; was.whatsapp = before.whatsapp;
  }
  if (patch.email !== undefined) {
    Object.assign(set, {
      email_ciphertext: patch.email ? enc.email(patch.email.toLowerCase()) : null,
      email_masked: patch.email ? maskEmail(patch.email) : null,
    });
    changed.email = patch.email ? maskEmail(patch.email) : null; was.email = before.email;
  }
  if (patch.address !== undefined) {
    Object.assign(set, { address: db.json(patch.address as JSONValue), city: patch.address.city });
    changed.address = patch.address; was.address = before.address;
  }
  if (patch.creditDays !== undefined) { set.credit_days = patch.creditDays; changed.creditDays = patch.creditDays; was.creditDays = before.creditDays; }
  if (patch.interestRate !== undefined) {
    set.interest_rate_bp = rateToBp(patch.interestRate); changed.interestRate = patch.interestRate; was.interestRate = before.interestRate;
  }
  if (patch.tags !== undefined) { set.tags = patch.tags; changed.tags = patch.tags; was.tags = before.tags; }
  if (patch.notes !== undefined) { set.notes = patch.notes || null; changed.notes = patch.notes ? "updated" : "cleared"; }
  if (!Object.keys(set).length) return { id };

  try {
    await db`update public.counterparties set ${db(set as Record<string, never>)} where id = ${id} and org_id = ${ctx.orgId}`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      const again = await findDuplicates(ctx, { mobile: patch.mobile }, id);
      if (again.length) throw duplicateError(again);
    }
    throw e;
  }
  await audit(ctx, { action: "counterparty.updated", entity: "counterparty", entityId: id, before: was, after: changed });
  return { id };
}

export async function setArchived(ctx: Ctx, id: string, archived: boolean) {
  const [r] = await sql()<{ id: string }[]>`
    update public.counterparties
       set status = ${archived ? "archived" : "active"}::public.counterparty_status,
           archived_at = ${archived ? sql()`now()` : null}, archived_by = ${archived ? ctx.user.id : null}
     where id = ${id} and org_id = ${ctx.orgId} and status = ${archived ? "active" : "archived"}::public.counterparty_status
     returning id`;
  if (!r) {
    await getCounterparty(ctx, id); // 404 for someone else's or a missing counterparty
    return { id, unchanged: true };
  }
  await audit(ctx, { action: archived ? "counterparty.archived" : "counterparty.restored", entity: "counterparty", entityId: id });
  return { id };
}

/** Re-runs the UPI lookup for a saved counterparty's mobile and stores the result. */
export async function recheckUpi(ctx: Ctx, id: string) {
  const [r] = await sql()<{ mobile_ciphertext: string }[]>`
    select mobile_ciphertext from public.counterparties where id = ${id} and org_id = ${ctx.orgId} and status = 'active'`;
  if (!r) throw notFound("This counterparty");
  const result = await checkUpi(ctx, decryptField(r.mobile_ciphertext, "counterparties.mobile"));
  await sql()`
    update public.counterparties set upi_status = ${result.status}::public.upi_status, upi_name = ${result.name},
           upi_checked_at = ${result.checkedAt}, upi_confirmed_by = null
     where id = ${id} and org_id = ${ctx.orgId}`;
  await audit(ctx, { action: "counterparty.upi_checked", entity: "counterparty", entityId: id, after: { status: result.status } });
  return result;
}

/** Manual alternative to the UPI lookup: the user sent ₹1 by UPI and saw it reach the right account (S06 marker 4). */
export async function confirmUpiManually(ctx: Ctx, id: string) {
  const [r] = await sql()<{ id: string }[]>`
    update public.counterparties set upi_status = 'manual_confirmed', upi_checked_at = now(), upi_confirmed_by = ${ctx.user.id}
     where id = ${id} and org_id = ${ctx.orgId} and status = 'active' returning id`;
  if (!r) throw notFound("This counterparty");
  await audit(ctx, { action: "counterparty.upi_confirmed_manually", entity: "counterparty", entityId: id });
  return { id };
}

// ---------------------------------------------------------------- activity (S07 Activity tab)

export interface ActivityItem {
  id: string;
  action: string;
  actor: string | null;
  at: string;
  changes: Record<string, unknown> | null;
}

export async function counterpartyActivity(ctx: Ctx, id: string): Promise<ActivityItem[]> {
  const rows = await sql()<{ id: string; action: string; actor_type: string; actor: string | null; at: Date; after: Record<string, unknown> | null }[]>`
    select a.id::text, a.action, a.actor_type::text, p.full_name as actor, a.at, a.after
      from public.audit_log a
      left join public.user_profiles p on a.actor_type = 'user' and p.id::text = a.actor_id
     where a.org_id = ${ctx.orgId} and a.entity = 'counterparty' and a.entity_id = ${id}
     order by a.at desc limit 100`;
  return rows.map((r) => ({ id: r.id, action: r.action, actor: r.actor ?? (r.actor_type === "system" ? "Chaanbean" : null), at: r.at.toISOString(), changes: r.after }));
}
