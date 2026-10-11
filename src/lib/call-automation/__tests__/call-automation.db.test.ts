// DB-backed acceptance tests (Call Automation guide §15). Run against a LOCAL throwaway database only:
//   RUN_DB_TESTS=1 npx vitest run src/lib/call-automation/__tests__/call-automation.db.test.ts
import "dotenv/config";
import crypto from "crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AppError, type RequestContext } from "../../company-check/errors";
import { applyAttemptStatus, dispatchAttempt, reconcileOpenAttempts, runDueSchedules } from "../engine";
import { istInstant } from "../policy";
import { mockProvider } from "../providers/mock";
import type { VoiceProvider } from "../providers/types";
import {
  applyAction, configureAutomation, controlAutomation, createCase, getCaseDetail, listCases, manualCall,
} from "../service";

const ist = (y: number, m: number, d: number, h: number, mi = 0) => istInstant(y, m, d, h, mi);
const T0 = ist(2026, 3, 10, 11); // 11:00 IST: inside calling hours
const DAY = 86_400_000;

async function mkCtx(role: RequestContext["role"] = "OWNER"): Promise<RequestContext> {
  const organisationId = crypto.randomUUID();
  await prisma.$executeRaw`INSERT INTO organisations (id, legal_name, kyc_status) VALUES (${organisationId}::uuid, 'test org', 'VERIFIED')`;
  return { userId: crypto.randomUUID(), organisationId, role, correlationId: "t" };
}

async function mkCase(ctx: RequestContext, lastDigit = 0, opts: { confirm?: boolean; max?: number; freq?: "DAILY" | "EVERY_2_DAYS" | "WEEKLY"; automate?: boolean } = {}) {
  const phone = `9876${Math.floor(Math.random() * 90 + 10)}${Math.floor(Math.random() * 90 + 10)}${lastDigit}`.slice(0, 9) + lastDigit;
  const c = await createCase(ctx, { debtor_name: "Acme Traders", debtor_phone: phone, amount_due_paise: 1_250_000, due_date: "2026-02-01" });
  if (opts.confirm !== false) await applyAction(ctx, c.id, { action: "CONFIRM_CONTACT_AUTHORITY" });
  if (opts.automate !== false && opts.confirm !== false) await configureAutomation(ctx, c.id, { frequency: opts.freq ?? "DAILY", max_attempts: opts.max ?? 3 }, T0);
  return c.id;
}

const attempts = (caseId: string) =>
  prisma.$queryRaw<{ id: string; status: string; trigger: string; failure_reason: string | null; answered_at: Date | null; completed_at: Date | null; accepted_at: Date | null }[]>`
    SELECT id::text, status::text, trigger::text, failure_reason, answered_at, completed_at, accepted_at FROM call_attempts WHERE case_id = ${caseId}::uuid ORDER BY created_at`;
const schedule = async (caseId: string) =>
  (await prisma.$queryRaw<{ state: string; attempt_count: number; next_call_at: Date | null; stop_reason: string | null; consecutive_failures: number }[]>`
    SELECT state::text, attempt_count, next_call_at, stop_reason, consecutive_failures FROM call_schedules WHERE case_id = ${caseId}::uuid`)[0];
const reconcile = () => reconcileOpenAttempts(new Date(), { minAgeSeconds: 0 });

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("Call Automation (DB)", () => {
  beforeAll(() => {
    process.env.COLLECT_PII_KEY = Buffer.alloc(32, 9).toString("base64");
    process.env.COLLECT_WEBHOOK_SECRET = "db-test-secret-0123456789";
    process.env.CALL_PROVIDER = "mock";
  });
  beforeEach(async () => {
    // Other tests' leftovers must not be picked up by the global scheduler.
    await prisma.$executeRaw`UPDATE call_schedules SET state = 'COMPLETED', next_call_at = NULL WHERE next_call_at < '2026-04-01'`;
  });
  afterAll(async () => {
    // Don't leave due schedules (encrypted with the test key) for a developer's running scheduler.
    await prisma.$executeRaw`UPDATE call_schedules SET state = 'COMPLETED', next_call_at = NULL WHERE organisation_id IN (SELECT id FROM organisations WHERE legal_name = 'test org')`;
  });

  it("TC1/2: valid case persists encrypted phone + automation; list/detail are masked", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx);
    const row = (await prisma.$queryRaw<{ enc: Buffer; l4: string }[]>`SELECT debtor_phone_enc AS enc, debtor_phone_last4 AS l4 FROM collection_cases WHERE id = ${id}::uuid`)[0];
    expect(row.enc.toString("utf8")).not.toMatch(/9876/);
    const detail = await getCaseDetail(ctx, id);
    expect(JSON.stringify(detail)).not.toMatch(/\+91\d{10}/);
    expect(detail.case.automation).toMatchObject({ state: "ACTIVE", frequency: "DAILY", attempt_count: 0 });
    expect((await listCases(ctx)).map((c) => c.id)).toContain(id);
  });

  it("rejects invalid phone/amount and unconfirmed authority", async () => {
    const ctx = await mkCtx();
    await expect(createCase(ctx, { debtor_name: "x", debtor_phone: "12345", amount_due_paise: 100, due_date: "2026-02-01" })).rejects.toMatchObject({ code: "INVALID_PHONE" });
    await expect(createCase(ctx, { debtor_name: "x", debtor_phone: "9876543210", amount_due_paise: 0, due_date: "2026-02-01" })).rejects.toBeTruthy();
    const id = await mkCase(ctx, 0, { confirm: false });
    await expect(configureAutomation(ctx, id, { frequency: "DAILY", max_attempts: 3 })).rejects.toMatchObject({ code: "CONTACT_AUTHORITY_REQUIRED" });
  });

  it("happy path: accepted -> reconciled to completed; accepted/answered/completed are distinct", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0);
    const rep = await runDueSchedules(T0);
    expect(rep.dispatched.accepted).toBeGreaterThanOrEqual(1);
    let [a] = await attempts(id);
    expect(a).toMatchObject({ status: "INITIATED", trigger: "SCHEDULED" });
    expect(a.accepted_at).not.toBeNull();
    expect(a.answered_at).toBeNull(); // accepted is NOT answered
    expect(a.completed_at).toBeNull();
    await reconcile();
    [a] = await attempts(id);
    expect(a.status).toBe("COMPLETED");
    expect(a.answered_at).not.toBeNull();
    const s = await schedule(id);
    expect(s.attempt_count).toBe(1);
    expect(s.next_call_at!.getTime()).toBe(T0.getTime() + DAY);
  });

  it("TC3: outside calling hours defers to the next eligible time and places no call", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0);
    const night = ist(2026, 3, 10, 21, 30);
    await runDueSchedules(night);
    expect(await attempts(id)).toHaveLength(0);
    expect((await schedule(id)).next_call_at!.toISOString()).toBe(ist(2026, 3, 11, 9).toISOString());
  });

  it("TC4/payment: recording payment stops calls", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx);
    await applyAction(ctx, id, { action: "RECORD_PAYMENT" }, T0);
    await runDueSchedules(T0);
    expect(await attempts(id)).toHaveLength(0);
    expect(await schedule(id)).toMatchObject({ state: "COMPLETED", stop_reason: "PAID" });
    await expect(configureAutomation(ctx, id, { frequency: "DAILY", max_attempts: 3 })).rejects.toMatchObject({ code: "CASE_NOT_ACTIVE" });
  });

  it("TC5: paused automation is skipped; resume continues", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx);
    await controlAutomation(ctx, id, "PAUSE", T0);
    await runDueSchedules(T0);
    expect(await attempts(id)).toHaveLength(0);
    await controlAutomation(ctx, id, "RESUME", T0);
    await runDueSchedules(T0);
    expect(await attempts(id)).toHaveLength(1);
  });

  it("dispute stops calls and does not auto-restart on resolution", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx);
    await applyAction(ctx, id, { action: "RAISE_DISPUTE" }, T0);
    await runDueSchedules(T0);
    expect(await attempts(id)).toHaveLength(0);
    await applyAction(ctx, id, { action: "RESOLVE_DISPUTE" }, T0);
    await runDueSchedules(T0);
    expect(await attempts(id)).toHaveLength(0); // still paused until a human resumes
    expect((await schedule(id)).state).toBe("PAUSED");
  });

  it("TC6: attempt limit is enforced and schedule completes", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 5, { max: 2 }); // phone ends 5 => NO_ANSWER
    await runDueSchedules(T0); await reconcile();
    await runDueSchedules(new Date(T0.getTime() + DAY)); await reconcile();
    await runDueSchedules(new Date(T0.getTime() + 2 * DAY)); await reconcile();
    expect(await attempts(id)).toHaveLength(2);
    expect(await schedule(id)).toMatchObject({ state: "COMPLETED", stop_reason: "MAX_ATTEMPTS", attempt_count: 2 });
  });

  it("TC7: provider rejection is recorded, attempt budget returned, retried later, paused after repeated failures", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 9); // phone ends 9 => mock rejects
    await runDueSchedules(T0);
    const [a] = await attempts(id);
    expect(a).toMatchObject({ status: "FAILED", failure_reason: "MOCK_PROVIDER_REJECTED" });
    let s = await schedule(id);
    expect(s).toMatchObject({ attempt_count: 0, consecutive_failures: 1, state: "ACTIVE" });
    expect(s.next_call_at!.getTime()).toBeGreaterThan(T0.getTime());
    await runDueSchedules(new Date(s.next_call_at!.getTime()));
    s = await schedule(id);
    await runDueSchedules(new Date(s.next_call_at!.getTime()));
    s = await schedule(id);
    expect(s).toMatchObject({ state: "PAUSED", stop_reason: "PROVIDER_FAILURES", consecutive_failures: 3 });
    expect(await attempts(id)).toHaveLength(3);
  });

  it("TC8: concurrent schedulers produce exactly one attempt", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0);
    await Promise.all(Array.from({ length: 6 }, () => runDueSchedules(T0)));
    expect(await attempts(id)).toHaveLength(1);
    expect((await schedule(id)).attempt_count).toBe(1);
  });

  it("TC9/10: duplicate and out-of-order callbacks are idempotent; missing callback reconciled", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0);
    await runDueSchedules(T0);
    const [a] = await attempts(id);
    expect((await applyAttemptStatus(a.id, { status: "ANSWERED", actor: "PROVIDER" })).applied).toBe(true);
    expect((await applyAttemptStatus(a.id, { status: "COMPLETED", durationSeconds: 30, actor: "PROVIDER" })).applied).toBe(true);
    expect((await applyAttemptStatus(a.id, { status: "COMPLETED", actor: "PROVIDER" })).applied).toBe(false); // duplicate
    expect((await applyAttemptStatus(a.id, { status: "ANSWERED", actor: "PROVIDER" })).applied).toBe(false); // late/out of order
    const ev = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM collection_events WHERE attempt_id = ${a.id}::uuid AND event_type = 'CALL_COMPLETED'`;
    expect(Number(ev[0].n)).toBe(1);

    const id2 = await mkCase(ctx, 0);
    await runDueSchedules(T0); // callback never arrives for this one
    expect((await attempts(id2))[0].status).toBe("INITIATED");
    await reconcile();
    expect((await attempts(id2))[0].status).toBe("COMPLETED");
  });

  it("TC11: cross-tenant access is denied as not-found", async () => {
    const a = await mkCtx(); const b = await mkCtx();
    const id = await mkCase(a);
    await expect(getCaseDetail(b, id)).rejects.toMatchObject({ status: 404 });
    await expect(applyAction(b, id, { action: "RECORD_PAYMENT" })).rejects.toMatchObject({ status: 404 });
    await expect(controlAutomation(b, id, "PAUSE")).rejects.toMatchObject({ status: 404 });
    await expect(manualCall(b, id, null, T0)).rejects.toBeInstanceOf(AppError);
    expect((await listCases(b)).map((c) => c.id)).not.toContain(id);
    expect((await schedule(id)).state).toBe("ACTIVE");
  });

  it("TC12: missing provider credentials fail safely - nothing claimed, nothing dialled", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0);
    const notReady: VoiceProvider = { ...mockProvider, isReady: () => ({ ready: false, reason: "Missing configuration" }), initiateCall: async () => { throw new Error("must not be called"); } };
    const rep = await runDueSchedules(T0, notReady);
    expect(rep).toMatchObject({ providerReady: false, claimed: 0 });
    expect(await attempts(id)).toHaveLength(0);
    expect((await schedule(id)).attempt_count).toBe(0);
  });

  it("TC14: payment racing the scheduler never leaves a live attempt after payment", async () => {
    for (let i = 0; i < 5; i++) {
      const ctx = await mkCtx();
      const id = await mkCase(ctx, 0);
      await Promise.all([runDueSchedules(T0), applyAction(ctx, id, { action: "RECORD_PAYMENT" }, T0)]);
      await runDueSchedules(T0);
      const list = await attempts(id);
      expect(list.length).toBeLessThanOrEqual(1);
      expect(list.filter((x) => x.status === "QUEUED")).toHaveLength(0);
      expect(await schedule(id)).toMatchObject({ state: "COMPLETED" });
    }
  });

  it("a payment committed between claim and dial suppresses the call and returns the budget", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0);
    const ins = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO call_attempts (organisation_id, case_id, schedule_id, trigger, provider, idempotency_key, status)
      SELECT organisation_id, case_id, id, 'SCHEDULED', 'MOCK', ${"race:" + id}, 'QUEUED' FROM call_schedules WHERE case_id = ${id}::uuid RETURNING id::text`;
    await prisma.$executeRaw`UPDATE call_schedules SET attempt_count = 1 WHERE case_id = ${id}::uuid`;
    await applyAction(ctx, id, { action: "RECORD_PAYMENT" }, T0);
    // Payment cancels the queued call outright and returns the budget.
    expect((await attempts(id))[0]).toMatchObject({ status: "FAILED", failure_reason: "SUPPRESSED_CASE_PAID" });
    expect((await schedule(id)).attempt_count).toBe(0);
    // Defence in depth: if a claim raced past the cancellation, the pre-dial re-check still suppresses it.
    await prisma.$executeRaw`UPDATE call_attempts SET status = 'QUEUED', failure_reason = NULL WHERE id = ${ins[0].id}::uuid`;
    await prisma.$executeRaw`UPDATE call_schedules SET attempt_count = 1 WHERE case_id = ${id}::uuid`;
    const spy: VoiceProvider = { ...mockProvider, initiateCall: async () => { throw new Error("must not dial"); } };
    expect(await dispatchAttempt(ins[0].id, spy, T0)).toBe("suppressed");
    expect((await attempts(id))[0]).toMatchObject({ status: "FAILED", failure_reason: "SUPPRESSED_CASE_PAID" });
    expect((await schedule(id)).attempt_count).toBe(0);
  });

  it("promise-to-pay defers calls until the day after the promised date", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0);
    await applyAction(ctx, id, { action: "RECORD_PROMISE", promised_date: "2026-03-15" }, T0);
    expect((await schedule(id)).next_call_at!.toISOString()).toBe(ist(2026, 3, 16, 9).toISOString());
    await runDueSchedules(new Date(T0.getTime() + DAY));
    expect(await attempts(id)).toHaveLength(0);
    await expect(applyAction(ctx, id, { action: "RECORD_PROMISE", promised_date: "2026-03-01" }, T0)).rejects.toMatchObject({ code: "PROMISE_IN_PAST" });
  });

  it("manual call: guarded by hours, authority, spacing and idempotency; READ_ONLY cannot act", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx, 0, { automate: false });
    await expect(manualCall(ctx, id, "k1", ist(2026, 3, 10, 22))).rejects.toMatchObject({ code: "OUTSIDE_CALLING_HOURS" });
    const r = await manualCall(ctx, id, "k1", T0);
    expect(r).toMatchObject({ outcome: "accepted" });
    expect(await manualCall(ctx, id, "k1", T0)).toEqual({ outcome: "duplicate" });
    await expect(manualCall(ctx, id, "k2", T0)).rejects.toMatchObject({ code: "CALL_TOO_SOON" });
    expect(await attempts(id)).toHaveLength(1);
    const ro = { ...ctx, role: "READ_ONLY" as const };
    await expect(applyAction(ro, id, { action: "RECORD_PAYMENT" })).rejects.toMatchObject({ code: "ROLE_FORBIDDEN" });
    const unconfirmed = await mkCase(ctx, 0, { confirm: false });
    await expect(manualCall(ctx, unconfirmed, "k3", T0)).rejects.toMatchObject({ code: "CONTACT_AUTHORITY_REQUIRED" });
  });

  it("collection_events is append-only", async () => {
    const ctx = await mkCtx();
    const id = await mkCase(ctx);
    await expect(prisma.$executeRaw`UPDATE collection_events SET event_type = 'x' WHERE case_id = ${id}::uuid`).rejects.toBeTruthy();
  });
});
