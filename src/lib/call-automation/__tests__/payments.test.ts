// Payments, invoice sync, signed events, CSRF, cron auth, and deploy wiring (Call Automation).
// DB-backed groups: RUN_DB_TESTS=1 npx vitest run src/lib/call-automation/__tests__/payments.test.ts (LOCAL db only).
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { RequestContext } from "../../company-check/errors";
import { assertSameOrigin } from "../route";
import { signPaymentEvent, verifyPaymentEvent } from "../signing";
import {
  applyAction, configureAutomation, createCase, getCaseDetail, recordPaymentEvent, syncInvoice, updateAutomation, controlAutomation,
} from "../service";
import { runDueSchedules } from "../engine";
import { istInstant } from "../policy";

const SECRET = "payment-secret-0123456789";

describe("signed payment events", () => {
  const prev = process.env.COLLECT_PAYMENT_WEBHOOK_SECRET;
  beforeAll(() => { process.env.COLLECT_PAYMENT_WEBHOOK_SECRET = SECRET; });
  afterAll(() => { process.env.COLLECT_PAYMENT_WEBHOOK_SECRET = prev; });
  const now = 1_800_000_000;
  const body = '{"a":1}';
  const sig = () => signPaymentEvent(String(now), body);

  it("accepts a fresh valid signature", () => expect(verifyPaymentEvent(String(now), sig(), body, now + 10)).toBe(true));
  it("rejects a tampered body", () => expect(verifyPaymentEvent(String(now), sig(), '{"a":2}', now)).toBe(false));
  it("rejects a stale timestamp", () => expect(verifyPaymentEvent(String(now), sig(), body, now + 301)).toBe(false));
  it("rejects missing headers", () => expect(verifyPaymentEvent(null, null, body, now)).toBe(false));
  it("fails closed with no / short secret", () => {
    const s = sig();
    process.env.COLLECT_PAYMENT_WEBHOOK_SECRET = "short";
    expect(verifyPaymentEvent(String(now), s, body, now)).toBe(false);
    delete process.env.COLLECT_PAYMENT_WEBHOOK_SECRET;
    expect(verifyPaymentEvent(String(now), s, body, now)).toBe(false);
    process.env.COLLECT_PAYMENT_WEBHOOK_SECRET = SECRET;
  });
});

describe("assertSameOrigin", () => {
  const mk = (h: Record<string, string>, method = "POST") => new Request("http://localhost:3000/api/collect/cases", { method, headers: h });
  it("allows no Origin and a matching Origin", () => {
    expect(() => assertSameOrigin(mk({ host: "app.example.com" }))).not.toThrow();
    expect(() => assertSameOrigin(mk({ host: "app.example.com", origin: "https://app.example.com" }))).not.toThrow();
  });
  it("blocks a foreign Origin", () => {
    expect(() => assertSameOrigin(mk({ host: "app.example.com", origin: "https://evil.example" }))).toThrow(/cross-site/i);
  });
  it("honours x-forwarded-host", () => {
    expect(() => assertSameOrigin(mk({ host: "internal", "x-forwarded-host": "app.example.com", origin: "https://app.example.com" }))).not.toThrow();
  });
});

describe("deploy wiring", () => {
  it("vercel.json cron points at an existing route", () => {
    const v = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"));
    const cron = v.crons.find((c: { path: string }) => c.path === "/api/cron/collect-scheduler");
    expect(cron).toBeTruthy();
    expect(fs.existsSync(path.join(process.cwd(), "src/app/api/cron/collect-scheduler/route.ts"))).toBe(true);
  });
  it("cron route fails closed without the bearer secret", async () => {
    process.env.CRON_SECRET = "cron-secret-0123456789";
    const { GET } = await import("@/app/api/cron/collect-scheduler/route");
    expect((await GET(new Request("http://x/api"))).status).toBe(401);
    expect((await GET(new Request("http://x/api", { headers: { authorization: "Bearer wrong-secret-0123456789" } }))).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await GET(new Request("http://x/api", { headers: { authorization: "Bearer anything" } }))).status).toBe(401);
  });
});

const T0 = istInstant(2026, 3, 10, 11);
async function mkCtx(role: RequestContext["role"] = "OWNER"): Promise<RequestContext> {
  const organisationId = crypto.randomUUID();
  await prisma.$executeRaw`INSERT INTO organisations (id, legal_name, kyc_status) VALUES (${organisationId}::uuid, 'test org', 'VERIFIED')`;
  return { userId: crypto.randomUUID(), organisationId, role, correlationId: "t" };
}
const inv = (o: Record<string, unknown> = {}) => ({
  invoice_id: `INV-${crypto.randomUUID().slice(0, 8)}`, debtor_name: "Acme", debtor_phone: "9876543210",
  outstanding_paise: 100_000, due_date: "2026-02-01", ...o,
});
async function mkActive(ctx: RequestContext, amount = 100_000) {
  const c = await createCase(ctx, { debtor_name: "Acme", debtor_phone: "9876543210", amount_due_paise: amount, due_date: "2026-02-01" });
  await applyAction(ctx, c.id, { action: "CONFIRM_CONTACT_AUTHORITY" });
  await configureAutomation(ctx, c.id, { frequency: "DAILY", max_attempts: 3 }, T0);
  return c.id;
}
const queued = (id: string) =>
  prisma.$queryRaw<{ status: string; failure_reason: string | null }[]>`SELECT status::text, failure_reason FROM call_attempts WHERE case_id = ${id}::uuid`;

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("payments & invoice sync (DB)", () => {
  beforeAll(() => {
    process.env.COLLECT_PII_KEY = Buffer.alloc(32, 9).toString("base64");
    process.env.COLLECT_WEBHOOK_SECRET = "db-test-secret-0123456789";
    process.env.CALL_PROVIDER = "mock";
  });
  beforeEach(async () => {
    await prisma.$executeRaw`UPDATE call_schedules SET state = 'COMPLETED', next_call_at = NULL WHERE next_call_at < '2026-04-01'`;
  });
  afterAll(async () => {
    await prisma.$executeRaw`UPDATE call_schedules SET state = 'COMPLETED', next_call_at = NULL WHERE organisation_id IN (SELECT id FROM organisations WHERE legal_name = 'test org')`;
  });

  it("partial payment reduces the balance and keeps automation running; full payment stops it", async () => {
    const ctx = await mkCtx();
    const id = await mkActive(ctx);
    await applyAction(ctx, id, { action: "RECORD_PAYMENT", amount_paise: 40_000, payment_ref: "p1" });
    let d = await getCaseDetail(ctx, id);
    expect(d.case.amount_due_paise).toBe(60_000);
    expect(d.case.amount_original_paise).toBe(100_000);
    expect(d.case.status).toBe("ACTIVE");
    expect(d.case.automation?.state).toBe("ACTIVE");
    await applyAction(ctx, id, { action: "RECORD_PAYMENT", payment_ref: "p2" });
    d = await getCaseDetail(ctx, id);
    expect(d.case.status).toBe("PAID");
    expect(d.case.automation).toMatchObject({ state: "COMPLETED", stop_reason: "PAID" });
    expect(d.payments.map((p) => p.amount_paise).sort()).toEqual([40_000, 60_000]);
  });

  it("payment_ref is idempotent and over-payment is rejected", async () => {
    const ctx = await mkCtx();
    const id = await mkActive(ctx);
    await applyAction(ctx, id, { action: "RECORD_PAYMENT", amount_paise: 10_000, payment_ref: "same" });
    await applyAction(ctx, id, { action: "RECORD_PAYMENT", amount_paise: 10_000, payment_ref: "same" }).catch(() => undefined);
    expect((await getCaseDetail(ctx, id)).case.amount_due_paise).toBe(90_000);
    await expect(applyAction(ctx, id, { action: "RECORD_PAYMENT", amount_paise: 999_999, payment_ref: "big" })).rejects.toMatchObject({ code: "PAYMENT_EXCEEDS_DUE" });
  });

  it("full payment cancels queued calls", async () => {
    const ctx = await mkCtx();
    const id = await mkActive(ctx);
    await prisma.$executeRaw`INSERT INTO call_attempts (organisation_id, case_id, schedule_id, trigger, provider, idempotency_key, status)
      SELECT organisation_id, case_id, id, 'SCHEDULED', 'MOCK', ${"q:" + id}, 'QUEUED' FROM call_schedules WHERE case_id = ${id}::uuid`;
    await applyAction(ctx, id, { action: "RECORD_PAYMENT", payment_ref: "full" });
    const rows = await queued(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "FAILED", failure_reason: "SUPPRESSED_CASE_PAID" });
  });

  it("syncInvoice: create, idempotent, amount up, amount down = payment, zero = paid, closed ignored", async () => {
    const ctx = await mkCtx();
    const i = inv();
    expect((await syncInvoice(ctx.organisationId, ctx.userId, i)).action).toBe("CREATED");
    expect((await syncInvoice(ctx.organisationId, ctx.userId, i)).action).toBe("UNCHANGED");
    expect((await syncInvoice(ctx.organisationId, ctx.userId, { ...i, outstanding_paise: 120_000 })).action).toBe("UPDATED");
    expect((await syncInvoice(ctx.organisationId, ctx.userId, { ...i, outstanding_paise: 70_000 })).action).toBe("PAYMENT_APPLIED");
    expect((await syncInvoice(ctx.organisationId, ctx.userId, { ...i, outstanding_paise: 0 })).action).toBe("PAYMENT_APPLIED");
    expect((await syncInvoice(ctx.organisationId, ctx.userId, { ...i, outstanding_paise: 50_000 })).action).toBe("IGNORED");
  });

  it("syncInvoice validates input and rejects a cross-tenant leak", async () => {
    const a = await mkCtx();
    const b = await mkCtx();
    await expect(syncInvoice(a.organisationId, a.userId, { invoice_id: "x" })).rejects.toBeTruthy();
    const i = inv();
    await syncInvoice(a.organisationId, a.userId, i);
    expect((await syncInvoice(b.organisationId, b.userId, i)).action).toBe("CREATED"); // same invoice id in another org is independent
  });

  it("createCase maps a duplicate invoice to 409", async () => {
    const ctx = await mkCtx();
    const base = { debtor_name: "A", debtor_phone: "9876543210", amount_due_paise: 1000, due_date: "2026-02-01", invoice_id: "DUP-1" };
    await createCase(ctx, base);
    await expect(createCase(ctx, base)).rejects.toMatchObject({ status: 409, code: "INVOICE_ALREADY_TRACKED" });
  });

  it("recordPaymentEvent: matched, replay, unmatched, cross-tenant", async () => {
    const a = await mkCtx();
    const b = await mkCtx();
    const i = inv();
    await syncInvoice(a.organisationId, a.userId, i);
    const ev = { invoice_id: i.invoice_id, payment_ref: "gw-1", amount_paise: 30_000 };
    expect((await recordPaymentEvent(a.organisationId, ev)).matched).toBe(true);
    await recordPaymentEvent(a.organisationId, ev);
    const d = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM collection_payments WHERE organisation_id = ${a.organisationId}::uuid AND payment_ref = 'gw-1'`;
    expect(d[0].n).toBe(1);
    expect((await recordPaymentEvent(a.organisationId, { ...ev, invoice_id: "nope", payment_ref: "gw-2" })).matched).toBe(false);
    expect((await recordPaymentEvent(b.organisationId, { ...ev, payment_ref: "gw-3" })).matched).toBe(false);
  });

  it("updateAutomation changes settings without resuming a paused schedule", async () => {
    const ctx = await mkCtx();
    const id = await mkActive(ctx);
    await controlAutomation(ctx, id, "PAUSE", T0);
    await updateAutomation(ctx, id, { frequency: "WEEKLY", max_attempts: 5 });
    const a = (await getCaseDetail(ctx, id)).case.automation;
    expect(a).toMatchObject({ state: "PAUSED", frequency: "WEEKLY", max_attempts: 5 });
  });

  it("viewers cannot sync invoices", async () => {
    const { syncInvoiceAs } = await import("../service");
    const v = await mkCtx("READ_ONLY");
    await expect(syncInvoiceAs(v, inv())).rejects.toMatchObject({ status: 403 });
  });
});
