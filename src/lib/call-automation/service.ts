// Call Automation application service: cases, automation controls, actions, manual calls and read models.
// Tenancy: every function takes the verified RequestContext and filters by ctx.organisationId. A case id from
// another organisation is indistinguishable from a missing one (404), so ids cannot be probed across tenants.

import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError, badRequest, forbidden, notFound, type RequestContext } from "../company-check/errors";
import { addEvent, num, tx, type Db } from "./db";
import { dispatchAttempt, reconcileOpenAttempts } from "./engine";
import { encryptPhone, last4, normalizeIndianMobile } from "./pii";
import {
  DEFAULT_MAX_ATTEMPTS,
  FREQUENCIES,
  MANUAL_CALL_MIN_GAP_MIN,
  MAX_ATTEMPTS_CAP,
  MIN_ATTEMPTS,
  dayAfterPromiseStart,
  istDateString,
  isWithinCallingHours,
  nextEligibleTime,
} from "./policy";
import { getProvider } from "./providers";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

// ------------------------------------------------------------------------------------------------ schemas

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

export const createCaseSchema = z.object({
  debtor_name: z.string().trim().min(1, "Enter the debtor's name.").max(200),
  debtor_phone: z.string().trim().min(1, "Enter a phone number."),
  amount_due_paise: z.number().int("Amount must be in whole paise.").positive("Amount must be greater than zero.").max(10_000_000_000_00),
  due_date: dateStr,
  language: z.enum(["en", "hi"]).default("en"),
  invoice_id: z.string().trim().max(100).optional(),
});

export const automationSchema = z.object({
  frequency: z.enum(FREQUENCIES),
  max_attempts: z.number().int().min(MIN_ATTEMPTS).max(MAX_ATTEMPTS_CAP).default(DEFAULT_MAX_ATTEMPTS),
});

export const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CONFIRM_CONTACT_AUTHORITY") }),
  z.object({ action: z.literal("WITHDRAW_CONTACT_AUTHORITY") }),
  z.object({ action: z.literal("RECORD_PAYMENT") }),
  z.object({ action: z.literal("RAISE_DISPUTE") }),
  z.object({ action: z.literal("RESOLVE_DISPUTE") }),
  z.object({
    action: z.literal("RECORD_PROMISE"),
    promised_date: dateStr,
    promised_amount_paise: z.number().int().positive().optional(),
  }),
  z.object({ action: z.literal("CLOSE") }),
]);
export type CaseAction = z.infer<typeof actionSchema>;

// -------------------------------------------------------------------------------------------------- gates

const assertCanWrite = (ctx: RequestContext) => {
  if (ctx.role === "READ_ONLY") throw forbidden("ROLE_FORBIDDEN", "Your role can view collection cases but not change them.");
};

const isValidDate = (s: string) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

// --------------------------------------------------------------------------------------------- read models

export interface CaseSummary {
  id: string;
  invoice_id: string | null;
  debtor_name: string;
  phone_last4: string;
  amount_due_paise: number;
  due_date: string;
  days_overdue: number;
  language: string;
  status: string;
  contact_authority: string;
  promised_pay_date: string | null;
  promised_amount_paise: number | null;
  created_at: Date;
  automation: null | {
    state: string;
    frequency: string;
    next_call_at: Date | null;
    max_attempts: number;
    attempt_count: number;
    stop_reason: string | null;
    last_attempt_at: Date | null;
  };
  last_attempt: null | { status: string; created_at: Date };
}

const CASE_SELECT = `
  c.id::text AS id, c.invoice_id, c.debtor_name, c.debtor_phone_last4 AS phone_last4,
  c.amount_due_paise::text AS amount_due_paise, c.due_date::text AS due_date, c.language,
  c.status::text AS status, c.contact_authority::text AS contact_authority,
  c.promised_pay_date::text AS promised_pay_date, c.promised_amount_paise::text AS promised_amount_paise,
  c.created_at,
  s.state::text AS s_state, s.frequency::text AS s_frequency, s.next_call_at AS s_next, s.max_attempts AS s_max,
  s.attempt_count AS s_count, s.stop_reason AS s_stop, s.last_attempt_at AS s_last,
  la.status::text AS la_status, la.created_at AS la_at`;

type CaseRowRaw = Record<string, unknown>;

function toSummary(r: CaseRowRaw, now = new Date()): CaseSummary {
  const due = String(r.due_date);
  const overdue = Math.floor((Date.parse(`${istDateString(now)}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / DAY);
  return {
    id: String(r.id),
    invoice_id: (r.invoice_id as string | null) ?? null,
    debtor_name: String(r.debtor_name),
    phone_last4: String(r.phone_last4),
    amount_due_paise: Number(r.amount_due_paise),
    due_date: due,
    days_overdue: Math.max(0, overdue),
    language: String(r.language),
    status: String(r.status),
    contact_authority: String(r.contact_authority),
    promised_pay_date: (r.promised_pay_date as string | null) ?? null,
    promised_amount_paise: num(r.promised_amount_paise),
    created_at: r.created_at as Date,
    automation: r.s_state
      ? {
          state: String(r.s_state),
          frequency: String(r.s_frequency),
          next_call_at: (r.s_next as Date | null) ?? null,
          max_attempts: Number(r.s_max),
          attempt_count: Number(r.s_count),
          stop_reason: (r.s_stop as string | null) ?? null,
          last_attempt_at: (r.s_last as Date | null) ?? null,
        }
      : null,
    last_attempt: r.la_status ? { status: String(r.la_status), created_at: r.la_at as Date } : null,
  };
}

const FROM = `
  FROM collection_cases c
  LEFT JOIN call_schedules s ON s.case_id = c.id
  LEFT JOIN LATERAL (SELECT status, created_at FROM call_attempts WHERE case_id = c.id ORDER BY created_at DESC LIMIT 1) la ON true`;

export async function listCases(ctx: RequestContext, opts: { status?: string; limit?: number } = {}) {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 100));
  const status = opts.status && ["ACTIVE", "PAUSED", "PAID", "DISPUTED", "CLOSED"].includes(opts.status) ? opts.status : null;
  const rows = await prisma.$queryRawUnsafe<CaseRowRaw[]>(
    `SELECT ${CASE_SELECT} ${FROM}
     WHERE c.organisation_id = $1::uuid AND ($2::text IS NULL OR c.status::text = $2)
     ORDER BY c.created_at DESC LIMIT ${limit}`,
    ctx.organisationId,
    status,
  );
  return rows.map((r) => toSummary(r));
}

async function loadSummary(db: Db, organisationId: string, id: string): Promise<CaseSummary | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await (db as typeof prisma).$queryRawUnsafe<CaseRowRaw[]>(
    `SELECT ${CASE_SELECT} ${FROM} WHERE c.organisation_id = $1::uuid AND c.id = $2::uuid`,
    organisationId,
    id,
  );
  return rows[0] ? toSummary(rows[0]) : null;
}

export async function getCaseDetail(ctx: RequestContext, id: string) {
  const summary = await loadSummary(prisma, ctx.organisationId, id);
  if (!summary) throw notFound("Case");
  const attempts = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT id::text, trigger::text AS trigger, provider::text AS provider, status::text AS status, scheduled_for,
           initiated_at, accepted_at, answered_at, completed_at, duration_seconds, failure_reason, created_at
    FROM call_attempts WHERE case_id = ${id}::uuid AND organisation_id = ${ctx.organisationId}::uuid
    ORDER BY created_at DESC LIMIT 50`;
  const events = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT id::text, event_type, actor_type, occurred_at, metadata, attempt_id::text AS attempt_id
    FROM collection_events WHERE case_id = ${id}::uuid AND organisation_id = ${ctx.organisationId}::uuid
    ORDER BY occurred_at DESC, id DESC LIMIT 100`;
  const provider = getProvider();
  return { case: summary, attempts, events, provider: { name: provider.name, ...provider.isReady() } };
}

// ------------------------------------------------------------------------------------------------ commands

export async function createCase(ctx: RequestContext, input: unknown) {
  assertCanWrite(ctx);
  const d = createCaseSchema.parse(input);
  const phone = normalizeIndianMobile(d.debtor_phone);
  if (!phone) throw badRequest("INVALID_PHONE", "Enter a valid 10-digit Indian mobile number.");
  if (!isValidDate(d.due_date)) throw badRequest("INVALID_DATE", "Enter a valid due date.");

  const created = await tx(async (t) => {
    const rows = await t.$queryRaw<{ id: string }[]>`
      INSERT INTO collection_cases (organisation_id, invoice_id, debtor_name, debtor_phone_enc, debtor_phone_last4,
                                    amount_due_paise, due_date, language, created_by)
      VALUES (${ctx.organisationId}::uuid, ${d.invoice_id ?? null}, ${d.debtor_name}, ${encryptPhone(phone)}, ${last4(phone)},
              ${d.amount_due_paise}::bigint, ${d.due_date}::date, ${d.language}, ${ctx.userId}::uuid)
      RETURNING id::text`;
    await addEvent(t, { organisationId: ctx.organisationId, caseId: rows[0].id, type: "CASE_CREATED", actor: "USER", actorId: ctx.userId });
    return rows[0].id;
  });
  return (await loadSummary(prisma, ctx.organisationId, created))!;
}

/** Locks schedule then case (global lock order) and returns current state; 404 for another tenant's id. */
async function lockCase(t: Db, ctx: RequestContext, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Case");
  await t.$queryRaw`SELECT id FROM call_schedules WHERE case_id = ${id}::uuid AND organisation_id = ${ctx.organisationId}::uuid FOR UPDATE`;
  const rows = await t.$queryRaw<{ status: string; authority: string; promised_pay_date: string | null }[]>`
    SELECT status::text, contact_authority::text AS authority, promised_pay_date::text
    FROM collection_cases WHERE id = ${id}::uuid AND organisation_id = ${ctx.organisationId}::uuid FOR UPDATE`;
  if (!rows[0]) throw notFound("Case");
  return rows[0];
}

export async function configureAutomation(ctx: RequestContext, id: string, input: unknown, now = new Date()) {
  assertCanWrite(ctx);
  const d = automationSchema.parse(input);
  await tx(async (t) => {
    const c = await lockCase(t, ctx, id);
    if (c.status !== "ACTIVE") throw badRequest("CASE_NOT_ACTIVE", `Automation can't be enabled on a ${c.status.toLowerCase()} case.`);
    if (c.authority !== "CONFIRMED") {
      throw badRequest("CONTACT_AUTHORITY_REQUIRED", "Confirm you are authorised to contact this person before enabling automation.");
    }
    const existing = await t.$queryRaw<{ attempt_count: number }[]>`SELECT attempt_count FROM call_schedules WHERE case_id = ${id}::uuid`;
    if (existing[0] && d.max_attempts < existing[0].attempt_count) {
      throw badRequest("MAX_ATTEMPTS_TOO_LOW", `${existing[0].attempt_count} attempts have already been made.`);
    }
    const first = nextEligibleTime(now);
    await t.$executeRaw`
      INSERT INTO call_schedules (case_id, organisation_id, frequency, max_attempts, state, next_call_at, created_by)
      VALUES (${id}::uuid, ${ctx.organisationId}::uuid, ${d.frequency}::ca_frequency, ${d.max_attempts}, 'ACTIVE', ${first}::timestamptz, ${ctx.userId}::uuid)
      ON CONFLICT (case_id) DO UPDATE SET
        frequency = EXCLUDED.frequency, max_attempts = EXCLUDED.max_attempts, state = 'ACTIVE', stop_reason = NULL,
        consecutive_failures = 0,
        next_call_at = CASE WHEN call_schedules.attempt_count >= EXCLUDED.max_attempts THEN NULL
                            ELSE COALESCE(GREATEST(call_schedules.next_call_at, ${first}::timestamptz), ${first}::timestamptz) END,
        updated_at = now()`;
    await addEvent(t, { organisationId: ctx.organisationId, caseId: id, type: "AUTOMATION_CONFIGURED", actor: "USER", actorId: ctx.userId, metadata: { frequency: d.frequency, max_attempts: d.max_attempts } });
  });
  return (await loadSummary(prisma, ctx.organisationId, id))!;
}

export async function controlAutomation(ctx: RequestContext, id: string, op: "PAUSE" | "RESUME" | "STOP", now = new Date()) {
  assertCanWrite(ctx);
  await tx(async (t) => {
    const c = await lockCase(t, ctx, id);
    const sch = await t.$queryRaw<{ state: string; attempt_count: number; max_attempts: number; next_call_at: Date | null }[]>`
      SELECT state::text, attempt_count, max_attempts, next_call_at FROM call_schedules WHERE case_id = ${id}::uuid`;
    const s = sch[0];
    if (!s) throw badRequest("NO_AUTOMATION", "Automation hasn't been set up for this case.");

    if (op === "PAUSE") {
      if (s.state !== "ACTIVE") throw badRequest("NOT_ACTIVE", "Automation isn't running.");
      await t.$executeRaw`UPDATE call_schedules SET state = 'PAUSED', stop_reason = 'PAUSED_BY_USER', updated_at = now() WHERE case_id = ${id}::uuid`;
      await addEvent(t, { organisationId: ctx.organisationId, caseId: id, type: "AUTOMATION_PAUSED", actor: "USER", actorId: ctx.userId });
    } else if (op === "RESUME") {
      if (s.state !== "PAUSED") throw badRequest("NOT_PAUSED", "Automation isn't paused.");
      if (c.status !== "ACTIVE") throw badRequest("CASE_NOT_ACTIVE", `Can't resume on a ${c.status.toLowerCase()} case.`);
      if (c.authority !== "CONFIRMED") throw badRequest("CONTACT_AUTHORITY_REQUIRED", "Contact authority must be confirmed to resume.");
      if (s.attempt_count >= s.max_attempts) throw badRequest("MAX_ATTEMPTS_REACHED", "The attempt limit has been reached. Raise it in the automation settings.");
      const at = nextEligibleTime(s.next_call_at && s.next_call_at > now ? s.next_call_at : now);
      await t.$executeRaw`UPDATE call_schedules SET state = 'ACTIVE', stop_reason = NULL, consecutive_failures = 0, next_call_at = ${at}::timestamptz, updated_at = now() WHERE case_id = ${id}::uuid`;
      await addEvent(t, { organisationId: ctx.organisationId, caseId: id, type: "AUTOMATION_RESUMED", actor: "USER", actorId: ctx.userId });
    } else {
      if (s.state === "COMPLETED") throw badRequest("ALREADY_STOPPED", "Automation has already stopped.");
      await t.$executeRaw`UPDATE call_schedules SET state = 'COMPLETED', stop_reason = 'STOPPED_BY_USER', next_call_at = NULL, updated_at = now() WHERE case_id = ${id}::uuid`;
      await addEvent(t, { organisationId: ctx.organisationId, caseId: id, type: "AUTOMATION_STOPPED", actor: "USER", actorId: ctx.userId, metadata: { reason: "STOPPED_BY_USER" } });
    }
  });
  return (await loadSummary(prisma, ctx.organisationId, id))!;
}

export async function applyAction(ctx: RequestContext, id: string, input: unknown, now = new Date()) {
  assertCanWrite(ctx);
  const a = actionSchema.parse(input);
  await tx(async (t) => {
    const c = await lockCase(t, ctx, id);
    const stopSchedule = (state: "COMPLETED" | "PAUSED", reason: string) => t.$executeRaw`
      UPDATE call_schedules SET state = ${state}::ca_schedule_state, stop_reason = ${reason}, next_call_at = NULL, updated_at = now()
      WHERE case_id = ${id}::uuid AND state <> 'COMPLETED'`;
    const log = (type: string, metadata: Record<string, unknown> = {}) =>
      addEvent(t, { organisationId: ctx.organisationId, caseId: id, type, actor: "USER", actorId: ctx.userId, at: now, metadata });
    const requireOpen = () => {
      if (c.status === "PAID" || c.status === "CLOSED") throw badRequest("CASE_CLOSED", `This case is already ${c.status.toLowerCase()}.`);
    };

    switch (a.action) {
      case "CONFIRM_CONTACT_AUTHORITY":
        requireOpen();
        await t.$executeRaw`UPDATE collection_cases SET contact_authority = 'CONFIRMED', contact_authority_changed_at = now(), contact_authority_changed_by = ${ctx.userId}::uuid, updated_at = now() WHERE id = ${id}::uuid`;
        await log("CONTACT_AUTHORITY_CONFIRMED");
        break;
      case "WITHDRAW_CONTACT_AUTHORITY":
        await t.$executeRaw`UPDATE collection_cases SET contact_authority = 'WITHDRAWN', contact_authority_changed_at = now(), contact_authority_changed_by = ${ctx.userId}::uuid, updated_at = now() WHERE id = ${id}::uuid`;
        await stopSchedule("PAUSED", "CONTACT_WITHDRAWN");
        await log("CONTACT_AUTHORITY_WITHDRAWN");
        break;
      case "RECORD_PAYMENT":
        requireOpen();
        await t.$executeRaw`UPDATE collection_cases SET status = 'PAID', closed_at = now(), updated_at = now() WHERE id = ${id}::uuid`;
        await stopSchedule("COMPLETED", "PAID");
        await log("PAYMENT_RECORDED");
        break;
      case "RAISE_DISPUTE":
        requireOpen();
        await t.$executeRaw`UPDATE collection_cases SET status = 'DISPUTED', updated_at = now() WHERE id = ${id}::uuid`;
        await stopSchedule("PAUSED", "DISPUTED");
        await log("DISPUTE_RAISED");
        break;
      case "RESOLVE_DISPUTE":
        if (c.status !== "DISPUTED") throw badRequest("NOT_DISPUTED", "This case isn't disputed.");
        // Calls do NOT restart on their own: the user resumes automation deliberately.
        await t.$executeRaw`UPDATE collection_cases SET status = 'ACTIVE', updated_at = now() WHERE id = ${id}::uuid`;
        await log("DISPUTE_RESOLVED");
        break;
      case "RECORD_PROMISE": {
        requireOpen();
        if (!isValidDate(a.promised_date)) throw badRequest("INVALID_DATE", "Enter a valid date.");
        const today = istDateString(now);
        const max = istDateString(new Date(now.getTime() + 90 * DAY));
        if (a.promised_date < today) throw badRequest("PROMISE_IN_PAST", "The promised date can't be in the past.");
        if (a.promised_date > max) throw badRequest("PROMISE_TOO_FAR", "The promised date must be within 90 days.");
        await t.$executeRaw`UPDATE collection_cases SET promised_pay_date = ${a.promised_date}::date, promised_amount_paise = ${a.promised_amount_paise ?? null}::bigint, updated_at = now() WHERE id = ${id}::uuid`;
        // Don't call before the promised day has passed.
        const resume = nextEligibleTime(dayAfterPromiseStart(a.promised_date));
        await t.$executeRaw`UPDATE call_schedules SET next_call_at = ${resume}::timestamptz, updated_at = now() WHERE case_id = ${id}::uuid AND state = 'ACTIVE' AND attempt_count < max_attempts`;
        await log("PROMISE_RECORDED", { promised_date: a.promised_date });
        break;
      }
      case "CLOSE":
        requireOpen();
        await t.$executeRaw`UPDATE collection_cases SET status = 'CLOSED', closed_at = now(), updated_at = now() WHERE id = ${id}::uuid`;
        await stopSchedule("COMPLETED", "CLOSED");
        await log("CASE_CLOSED");
        break;
    }
  });
  return (await loadSummary(prisma, ctx.organisationId, id))!;
}

/** User-initiated call. Same eligibility rules as the scheduler; does not consume the automation budget. */
export async function manualCall(ctx: RequestContext, id: string, clientKey: string | null, now = new Date()) {
  assertCanWrite(ctx);
  const provider = getProvider();
  const ready = provider.isReady();
  if (!ready.ready) throw new AppError(503, "PROVIDER_NOT_READY", ready.reason ?? "Calling isn't configured.");
  if (!isWithinCallingHours(now)) throw badRequest("OUTSIDE_CALLING_HOURS", "Calls can only be placed between 9:00 am and 6:00 pm IST.");

  const key = `manual:${id}:${clientKey?.slice(0, 64) || now.getTime()}`;
  const attemptId = await tx(async (t) => {
    const c = await lockCase(t, ctx, id);
    if (c.status !== "ACTIVE") throw badRequest("CASE_NOT_ACTIVE", `Can't call on a ${c.status.toLowerCase()} case.`);
    if (c.authority !== "CONFIRMED") throw badRequest("CONTACT_AUTHORITY_REQUIRED", "Confirm you are authorised to contact this person first.");
    const dup = await t.$queryRaw<{ id: string }[]>`SELECT id::text FROM call_attempts WHERE idempotency_key = ${key}`;
    if (dup[0]) return null; // same client key: already handled, don't dial twice
    const recent = await t.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM call_attempts WHERE case_id = ${id}::uuid AND trigger = 'MANUAL'
        AND created_at > ${new Date(now.getTime() - MANUAL_CALL_MIN_GAP_MIN * MIN)}::timestamptz`;
    if (Number(recent[0].n) > 0) throw new AppError(429, "CALL_TOO_SOON", `Wait ${MANUAL_CALL_MIN_GAP_MIN} minutes between manual calls to the same person.`);
    const ins = await t.$queryRaw<{ id: string }[]>`
      INSERT INTO call_attempts (organisation_id, case_id, trigger, provider, idempotency_key, status, scheduled_for)
      VALUES (${ctx.organisationId}::uuid, ${id}::uuid, 'MANUAL', ${provider.name}::ca_provider, ${key}, 'QUEUED', ${now}::timestamptz)
      RETURNING id::text`;
    await addEvent(t, { organisationId: ctx.organisationId, caseId: id, attemptId: ins[0].id, type: "CALL_REQUESTED", actor: "USER", actorId: ctx.userId, at: now, metadata: { trigger: "MANUAL" } });
    return ins[0].id;
  });
  if (!attemptId) return { outcome: "duplicate" as const };
  const outcome = await dispatchAttempt(attemptId, provider, now);
  return { outcome, attempt_id: attemptId };
}

/** Pulls the latest provider status for a case's open attempts (callbacks can be late or lost). */
export async function syncCase(ctx: RequestContext, id: string, now = new Date()) {
  const own = await loadSummary(prisma, ctx.organisationId, id);
  if (!own) throw notFound("Case");
  return reconcileOpenAttempts(now, { caseId: id, organisationId: ctx.organisationId, minAgeSeconds: 3 });
}
