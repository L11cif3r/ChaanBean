// Call Automation engine: scheduler, dispatch, provider-status application and reconciliation.
//
// Concurrency model
//  * Lock order is always schedule row -> case row (see service.ts), so actions and the scheduler can't deadlock.
//  * The scheduler claims a due schedule with FOR UPDATE SKIP LOCKED, creates the attempt row (unique
//    idempotency key per slot) and advances next_call_at in ONE transaction, then calls the provider AFTER
//    commit. A crash between the two leaves a QUEUED/INITIATED attempt that is reconciled, never re-dialled.
//  * Before dialling, the case is re-read, so a payment/dispute/pause that commits after the claim still wins.

import { prisma } from "@/lib/db";
import { addEvent, tx, type Db } from "./db";
import { decryptPhone } from "./pii";
import {
  MAX_CONSECUTIVE_FAILURES,
  PROVIDER_RETRY_DELAY_MIN,
  dayAfterPromiseStart,
  istDateString,
  isWithinCallingHours,
  nextEligibleTime,
  nextSlotAfter,
  type Frequency,
} from "./policy";
import { getProviderByName, getProvider, type VoiceProvider } from "./providers";
import { signAttempt } from "./signing";
import { canTransition, isTerminal, type AttemptStatus } from "./status";

const MIN = 60_000;

// --------------------------------------------------------------------------------------- status application

export interface StatusUpdate {
  status: AttemptStatus;
  durationSeconds?: number;
  actor: "PROVIDER" | "SYSTEM";
  at?: Date;
}

/**
 * Applies a provider-reported status to an attempt. Idempotent and order-safe: duplicates, replays and
 * out-of-order callbacks are ignored (terminal states are final, status only moves forward).
 */
export async function applyAttemptStatus(attemptId: string, u: StatusUpdate): Promise<{ applied: boolean }> {
  const now = u.at ?? new Date();
  return tx(async (t) => {
    const rows = await t.$queryRaw<
      { organisation_id: string; case_id: string; schedule_id: string | null; status: AttemptStatus }[]
    >`SELECT organisation_id::text, case_id::text, schedule_id::text, status::text AS status
      FROM call_attempts WHERE id = ${attemptId}::uuid FOR UPDATE`;
    const a = rows[0];
    if (!a || !canTransition(a.status, u.status)) return { applied: false };

    const terminal = isTerminal(u.status);
    await t.$executeRaw`
      UPDATE call_attempts SET
        status = ${u.status}::ca_attempt_status,
        accepted_at = COALESCE(accepted_at, ${now}::timestamptz),
        answered_at = CASE WHEN ${u.status} IN ('ANSWERED','COMPLETED') THEN COALESCE(answered_at, ${now}::timestamptz) ELSE answered_at END,
        completed_at = CASE WHEN ${terminal} THEN ${now}::timestamptz ELSE completed_at END,
        duration_seconds = COALESCE(${u.durationSeconds ?? null}::int, duration_seconds),
        failure_reason = CASE WHEN ${u.status} = 'FAILED' THEN COALESCE(failure_reason, 'PROVIDER_REPORTED_FAILED') ELSE failure_reason END
      WHERE id = ${attemptId}::uuid`;

    await addEvent(t, {
      organisationId: a.organisation_id,
      caseId: a.case_id,
      attemptId,
      type: `CALL_${u.status}`,
      actor: u.actor,
      at: now,
      metadata: u.durationSeconds != null ? { duration_seconds: u.durationSeconds } : {},
    });

    // The last permitted attempt has finished: the schedule is complete.
    if (terminal && a.schedule_id) {
      await t.$executeRaw`
        UPDATE call_schedules SET state = 'COMPLETED', stop_reason = 'MAX_ATTEMPTS', updated_at = now()
        WHERE id = ${a.schedule_id}::uuid AND state = 'ACTIVE' AND attempt_count >= max_attempts AND next_call_at IS NULL`;
    }
    return { applied: true };
  });
}

// ------------------------------------------------------------------------------------------------ dispatch

interface DispatchRow {
  id: string;
  organisation_id: string;
  case_id: string;
  schedule_id: string | null;
  trigger: "SCHEDULED" | "MANUAL";
  status: AttemptStatus;
  idempotency_key: string;
  case_status: string;
  authority: string;
  debtor_name: string;
  debtor_phone_enc: Buffer;
  amount: string;
  due_date: string;
  language: "en" | "hi";
  schedule_state: string | null;
}

export type DispatchOutcome = "accepted" | "rejected" | "unconfirmed" | "suppressed" | "skipped";

async function releaseSlot(t: Db, a: DispatchRow, reason: string, now: Date) {
  await t.$executeRaw`
    UPDATE call_attempts SET status = 'FAILED', failure_reason = ${reason}, completed_at = ${now}::timestamptz
    WHERE id = ${a.id}::uuid AND status = 'QUEUED'`;
  // A suppressed slot never reached the debtor, so it must not consume the attempt budget.
  if (a.schedule_id) {
    await t.$executeRaw`UPDATE call_schedules SET attempt_count = GREATEST(attempt_count - 1, 0) WHERE id = ${a.schedule_id}::uuid`;
  }
  await addEvent(t, {
    organisationId: a.organisation_id, caseId: a.case_id, attemptId: a.id,
    type: "CALL_SUPPRESSED", actor: "SYSTEM", at: now, metadata: { reason },
  });
}

export async function dispatchAttempt(attemptId: string, provider: VoiceProvider, now = new Date()): Promise<DispatchOutcome> {
  const rows = await prisma.$queryRaw<DispatchRow[]>`
    SELECT a.id::text, a.organisation_id::text, a.case_id::text, a.schedule_id::text, a.trigger::text AS trigger,
           a.status::text AS status, a.idempotency_key,
           c.status::text AS case_status, c.contact_authority::text AS authority, c.debtor_name, c.debtor_phone_enc,
           c.amount_due_paise::text AS amount, c.due_date::text AS due_date, c.language,
           s.state::text AS schedule_state
    FROM call_attempts a
    JOIN collection_cases c ON c.id = a.case_id
    LEFT JOIN call_schedules s ON s.id = a.schedule_id
    WHERE a.id = ${attemptId}::uuid`;
  const a = rows[0];
  if (!a || a.status !== "QUEUED") return "skipped";

  // Re-validate immediately before dialling (payment / dispute / pause may have committed after the claim).
  let suppress: string | null = null;
  if (a.case_status !== "ACTIVE") suppress = `SUPPRESSED_CASE_${a.case_status}`;
  else if (a.authority !== "CONFIRMED") suppress = "SUPPRESSED_CONTACT_AUTHORITY";
  else if (a.trigger === "SCHEDULED" && a.schedule_state !== "ACTIVE") suppress = "SUPPRESSED_SCHEDULE_NOT_ACTIVE";
  else if (!isWithinCallingHours(now)) suppress = "SUPPRESSED_OUTSIDE_CALLING_HOURS";
  if (suppress) {
    await releaseSlot(prisma, a, suppress, now);
    return "suppressed";
  }

  const claimed = await prisma.$executeRaw`
    UPDATE call_attempts SET status = 'INITIATED', initiated_at = ${now}::timestamptz
    WHERE id = ${a.id}::uuid AND status = 'QUEUED'`;
  if (claimed === 0) return "skipped";

  let callbackUrl: string | null = null;
  try {
    const base = process.env.COLLECT_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (base) callbackUrl = `${base}/api/webhooks/exotel/call-status?attempt=${a.id}&sig=${signAttempt(a.id)}`;
  } catch {
    callbackUrl = null;
  }

  let result;
  try {
    result = await provider.initiateCall({
      attemptId: a.id,
      caseId: a.case_id,
      organisationId: a.organisation_id,
      toPhone: decryptPhone(a.debtor_phone_enc),
      debtorName: a.debtor_name,
      amountDuePaise: Number(a.amount),
      dueDate: a.due_date,
      language: a.language,
      idempotencyKey: a.idempotency_key,
      callbackUrl,
    });
  } catch {
    // Timeout / network error: the provider may or may not have accepted. We cannot tell, so we do NOT retry
    // this slot (risk of a duplicate call to a debtor); reconciliation closes it out.
    await prisma.$executeRaw`UPDATE call_attempts SET failure_reason = 'NO_PROVIDER_RESPONSE' WHERE id = ${a.id}::uuid`;
    await addEvent(prisma, {
      organisationId: a.organisation_id, caseId: a.case_id, attemptId: a.id,
      type: "CALL_REQUEST_UNCONFIRMED", actor: "SYSTEM", at: now,
    });
    return "unconfirmed";
  }

  if (result.accepted && result.providerCallId) {
    await prisma.$executeRaw`
      UPDATE call_attempts SET provider_call_id = ${result.providerCallId}, accepted_at = ${now}::timestamptz
      WHERE id = ${a.id}::uuid`;
    await addEvent(prisma, {
      organisationId: a.organisation_id, caseId: a.case_id, attemptId: a.id,
      type: "CALL_ACCEPTED", actor: "PROVIDER", at: now,
    });
    if (a.schedule_id) {
      await prisma.$executeRaw`UPDATE call_schedules SET consecutive_failures = 0 WHERE id = ${a.schedule_id}::uuid`;
    }
    return "accepted";
  }

  // Provider rejected: no call was placed. Record it honestly, give the attempt back, retry later (bounded).
  await tx(async (t) => {
    await t.$executeRaw`
      UPDATE call_attempts SET status = 'FAILED', failure_reason = ${result.failureReason ?? "PROVIDER_REJECTED"},
             completed_at = ${now}::timestamptz WHERE id = ${a.id}::uuid`;
    await addEvent(t, {
      organisationId: a.organisation_id, caseId: a.case_id, attemptId: a.id,
      type: "CALL_REJECTED", actor: "PROVIDER", at: now, metadata: { reason: result.failureReason ?? "PROVIDER_REJECTED" },
    });
    if (a.schedule_id) {
      const retryAt = nextEligibleTime(new Date(now.getTime() + PROVIDER_RETRY_DELAY_MIN * MIN));
      await t.$executeRaw`
        UPDATE call_schedules SET
          attempt_count = GREATEST(attempt_count - 1, 0),
          consecutive_failures = consecutive_failures + 1,
          state = CASE WHEN state = 'ACTIVE' AND consecutive_failures + 1 >= ${MAX_CONSECUTIVE_FAILURES} THEN 'PAUSED'::ca_schedule_state ELSE state END,
          stop_reason = CASE WHEN state = 'ACTIVE' AND consecutive_failures + 1 >= ${MAX_CONSECUTIVE_FAILURES} THEN 'PROVIDER_FAILURES' ELSE stop_reason END,
          next_call_at = CASE WHEN state = 'ACTIVE' AND consecutive_failures + 1 < ${MAX_CONSECUTIVE_FAILURES} THEN ${retryAt}::timestamptz ELSE next_call_at END,
          updated_at = now()
        WHERE id = ${a.schedule_id}::uuid`;
    }
  });
  return "rejected";
}

// ---------------------------------------------------------------------------------------------- scheduler

export interface SchedulerReport {
  claimed: number;
  dispatched: Record<DispatchOutcome, number>;
  deferred: number;
  stopped: number;
  providerReady: boolean;
  reason?: string;
}

interface ClaimResult {
  kind: "none" | "attempt" | "deferred" | "stopped";
  attemptId?: string;
}

async function claimOne(provider: VoiceProvider, now: Date): Promise<ClaimResult> {
  return tx(async (t): Promise<ClaimResult> => {
    const due = await t.$queryRaw<
      { id: string; case_id: string; organisation_id: string; frequency: Frequency; next_call_at: Date; max_attempts: number; attempt_count: number }[]
    >`SELECT id::text, case_id::text, organisation_id::text, frequency::text AS frequency, next_call_at, max_attempts, attempt_count
      FROM call_schedules
      WHERE state = 'ACTIVE' AND next_call_at IS NOT NULL AND next_call_at <= ${now}::timestamptz
      ORDER BY next_call_at LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    const s = due[0];
    if (!s) return { kind: "none" };

    // Reload case state under the schedule lock.
    const cs = await t.$queryRaw<
      { status: string; authority: string; promised_pay_date: string | null }[]
    >`SELECT status::text, contact_authority::text AS authority, promised_pay_date::text FROM collection_cases
      WHERE id = ${s.case_id}::uuid FOR SHARE`;
    const c = cs[0];

    const stop = async (state: "COMPLETED" | "PAUSED", reason: string) => {
      await t.$executeRaw`
        UPDATE call_schedules SET state = ${state}::ca_schedule_state, stop_reason = ${reason}, next_call_at = NULL, updated_at = now()
        WHERE id = ${s.id}::uuid`;
      await addEvent(t, { organisationId: s.organisation_id, caseId: s.case_id, type: "AUTOMATION_STOPPED", actor: "SYSTEM", at: now, metadata: { reason } });
      return { kind: "stopped" as const };
    };

    if (!c) return stop("COMPLETED", "CASE_MISSING");
    if (c.status === "PAID") return stop("COMPLETED", "PAID");
    if (c.status === "CLOSED") return stop("COMPLETED", "CLOSED");
    if (c.status === "DISPUTED") return stop("PAUSED", "DISPUTED");
    if (c.status !== "ACTIVE") return stop("PAUSED", `CASE_${c.status}`);
    if (c.authority !== "CONFIRMED") return stop("PAUSED", "CONTACT_AUTHORITY_NOT_CONFIRMED");
    if (s.attempt_count >= s.max_attempts) return stop("COMPLETED", "MAX_ATTEMPTS");

    const defer = async (to: Date, reason: string) => {
      await t.$executeRaw`UPDATE call_schedules SET next_call_at = ${to}::timestamptz, updated_at = now() WHERE id = ${s.id}::uuid`;
      await addEvent(t, { organisationId: s.organisation_id, caseId: s.case_id, type: "CALL_DEFERRED", actor: "SYSTEM", at: now, metadata: { reason, until: to.toISOString() } });
      return { kind: "deferred" as const };
    };

    // Outside calling hours: save the next eligible time, never "skip and forget".
    if (!isWithinCallingHours(now)) return defer(nextEligibleTime(now), "OUTSIDE_CALLING_HOURS");

    // Debtor promised to pay on a future date: wait until the day after it.
    if (c.promised_pay_date && c.promised_pay_date >= istDateString(now)) {
      const resume = nextEligibleTime(dayAfterPromiseStart(c.promised_pay_date));
      if (resume.getTime() > now.getTime()) return defer(resume, "PROMISE_TO_PAY");
    }

    const slot = new Date(s.next_call_at);
    const key = `${s.id}:${slot.toISOString()}`;
    const willBeLast = s.attempt_count + 1 >= s.max_attempts;
    const next = willBeLast ? null : nextSlotAfter(slot, s.frequency, now);

    const ins = await t.$queryRaw<{ id: string }[]>`
      INSERT INTO call_attempts (organisation_id, case_id, schedule_id, trigger, provider, idempotency_key, status, scheduled_for)
      VALUES (${s.organisation_id}::uuid, ${s.case_id}::uuid, ${s.id}::uuid, 'SCHEDULED', ${provider.name}::ca_provider, ${key}, 'QUEUED', ${slot}::timestamptz)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id::text`;
    const fresh = ins[0];

    await t.$executeRaw`
      UPDATE call_schedules SET
        next_call_at = ${next}::timestamptz,
        attempt_count = attempt_count + ${fresh ? 1 : 0},
        last_attempt_at = ${now}::timestamptz,
        updated_at = now()
      WHERE id = ${s.id}::uuid`;
    if (!fresh) return { kind: "deferred" }; // slot already produced an attempt; just advanced the cursor

    await addEvent(t, { organisationId: s.organisation_id, caseId: s.case_id, attemptId: fresh.id, type: "CALL_REQUESTED", actor: "SYSTEM", at: now, metadata: { trigger: "SCHEDULED" } });
    return { kind: "attempt", attemptId: fresh.id };
  });
}

/** One scheduler tick. Safe to run concurrently from several workers/processes. */
export async function runDueSchedules(now = new Date(), provider: VoiceProvider = getProvider(), limit = 50): Promise<SchedulerReport> {
  const report: SchedulerReport = {
    claimed: 0, deferred: 0, stopped: 0, providerReady: true,
    dispatched: { accepted: 0, rejected: 0, unconfirmed: 0, suppressed: 0, skipped: 0 },
  };
  const ready = provider.isReady();
  if (!ready.ready) {
    // Missing credentials => safe failure: claim nothing, place nothing, leave schedules due.
    return { ...report, providerReady: false, reason: ready.reason };
  }
  for (let i = 0; i < limit; i++) {
    const r = await claimOne(provider, now);
    if (r.kind === "none") break;
    if (r.kind === "deferred") report.deferred++;
    else if (r.kind === "stopped") report.stopped++;
    else if (r.attemptId) {
      report.claimed++;
      report.dispatched[await dispatchAttempt(r.attemptId, provider, now)]++;
    }
  }
  return report;
}

// ------------------------------------------------------------------------------------------ reconciliation

export interface ReconcileOptions {
  minAgeSeconds?: number;
  caseId?: string;
  organisationId?: string;
  /** Attempts with no provider id after this long are closed out as FAILED (we can never learn the outcome). */
  unconfirmedAfterMinutes?: number;
}

/** Pulls status from the provider for attempts whose callback never arrived. */
export async function reconcileOpenAttempts(now = new Date(), o: ReconcileOptions = {}): Promise<{ checked: number; updated: number }> {
  const cutoff = new Date(now.getTime() - (o.minAgeSeconds ?? 30) * 1000);
  const open = await prisma.$queryRaw<{ id: string; provider: string; provider_call_id: string | null; created_at: Date }[]>`
    SELECT id::text, provider::text AS provider, provider_call_id, created_at FROM call_attempts
    WHERE status IN ('INITIATED','ANSWERED') AND created_at <= ${cutoff}::timestamptz
      AND (${o.caseId ?? null}::uuid IS NULL OR case_id = ${o.caseId ?? null}::uuid)
      AND (${o.organisationId ?? null}::uuid IS NULL OR organisation_id = ${o.organisationId ?? null}::uuid)
    ORDER BY created_at LIMIT 200`;
  let updated = 0;
  const staleMs = (o.unconfirmedAfterMinutes ?? 10) * MIN;
  for (const a of open) {
    if (!a.provider_call_id) {
      if (now.getTime() - new Date(a.created_at).getTime() >= staleMs) {
        const r = await applyAttemptStatus(a.id, { status: "FAILED", actor: "SYSTEM", at: now });
        if (r.applied) {
          await prisma.$executeRaw`UPDATE call_attempts SET failure_reason = 'NO_PROVIDER_RESPONSE' WHERE id = ${a.id}::uuid`;
          updated++;
        }
      }
      continue;
    }
    const p = getProviderByName(a.provider);
    if (!p) continue;
    try {
      const s = await p.getCallStatus(a.provider_call_id);
      if (s && (await applyAttemptStatus(a.id, { status: s.status, durationSeconds: s.durationSeconds, actor: "PROVIDER", at: now })).applied) updated++;
    } catch {
      // Provider status API unavailable: leave the attempt open and try again on the next pass.
    }
  }
  return { checked: open.length, updated };
}

