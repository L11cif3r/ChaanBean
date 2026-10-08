// End-to-end tests of the Company Check service against the real database, with mock providers.
// Run with: RUN_DB_TESTS=1 npx vitest run src/lib/company-check
// Creates two throw-away organisations and deletes them (and the MOCK companies) afterwards.

import "dotenv/config";
import crypto from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { RequestContext } from "../errors";
import { AppError } from "../errors";
import { MOCK_FIXTURES, createMockProviders } from "../providers/mock";
import { setProvidersForTesting } from "../providers";
import * as svc from "../service";

const TEST_USER_ID = "00000000-0000-4000-8000-00000000c0c1";
const TEST_EMAIL = "company-check-test@chaanbean.invalid";
const fx = (k: string) => MOCK_FIXTURES.find((f) => f.key === k)!;
const FAST = { retries: 0, backoffMs: [1] };

let orgA = "";
let orgB = "";
const ctx = (org: string, role: RequestContext["role"] = "OWNER"): RequestContext => ({
  userId: TEST_USER_ID, organisationId: org, role, correlationId: crypto.randomUUID(),
});
const key = () => crypto.randomUUID();

async function makeOrg(name: string, topUpPaise: bigint) {
  const org = await prisma.organisations.create({ data: { legal_name: name, kyc_status: "VERIFIED" } });
  await prisma.organisation_members.create({ data: { organisation_id: org.id, user_id: TEST_USER_ID, role: "OWNER" } });
  await prisma.subscriptions.create({
    data: { organisation_id: org.id, plan_code: "TEST", status: "ACTIVE", current_period_end: new Date(Date.now() + 30 * 86_400_000) },
  });
  if (topUpPaise > 0n)
    await prisma.wallet_ledger.create({
      data: { organisation_id: org.id, entry_type: "TOPUP", amount_paise: topUpPaise, balance_after_paise: 0n, gateway_payment_id: `test-${org.id}` },
    });
  return org.id;
}

async function cleanupMockData() {
  await prisma.companies.deleteMany({ where: { is_test: true } });
  await prisma.directors.deleteMany({ where: { din: { startsWith: "900000" } } });
}

const balance = async (org: string) => (await prisma.wallets.findUnique({ where: { organisation_id: org } }))?.balance_paise ?? 0n;

async function runFresh(org: string, body: Record<string, unknown>, opts = FAST) {
  const { check } = await svc.startCheck(ctx(org), { purpose: "NEW_BUYER", consent_confirmed: true, ...body }, key());
  await svc.runCheck(check.id, opts);
  return svc.getCheckReport(ctx(org), check.id);
}

beforeAll(async () => {
  setProvidersForTesting(null);
  await prisma.$executeRawUnsafe(
    `INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
     VALUES ($1::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, now(), now())
     ON CONFLICT (id) DO NOTHING`,
    TEST_USER_ID, TEST_EMAIL,
  );
  await prisma.app_users.upsert({ where: { id: TEST_USER_ID }, create: { id: TEST_USER_ID, email: TEST_EMAIL, full_name: "Company Check Test" }, update: {} });
  await cleanupMockData();
  orgA = await makeOrg("ZZ TEST Company Check Org A", 1_000_000n); // ₹10,000
  orgB = await makeOrg("ZZ TEST Company Check Org B", 0n);
});

afterAll(async () => {
  setProvidersForTesting(null);
  await prisma.outbox_events.deleteMany({ where: { organisation_id: { in: [orgA, orgB] } } });
  await prisma.organisations.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await cleanupMockData();
});

describe("search", () => {
  it("TC-01 finds a company by a valid GSTIN", async () => {
    const r = await svc.searchCompanies(ctx(orgA), fx("A").taxpayer.gstin);
    expect(r.detected).toBe("GSTIN");
    expect(r.results).toHaveLength(1);
    expect(r.results[0].legal_name).toContain("MOCK Growing");
  });

  it("TC-02 rejects a GSTIN with a wrong checksum without calling a provider", async () => {
    const bad = fx("A").taxpayer.gstin.slice(0, 14) + (fx("A").taxpayer.gstin[14] === "A" ? "B" : "A");
    await expect(svc.searchCompanies(ctx(orgA), bad)).rejects.toMatchObject({ code: "INVALID_IDENTIFIER" });
  });

  it("finds companies by name", async () => {
    const r = await svc.searchCompanies(ctx(orgA), "MOCK Stable");
    expect(r.results.map((x) => x.cin)).toContain(fx("C").master!.cin);
  });
});

describe("running checks", () => {
  it("TC-10 all providers fail: FAILED and automatic refund", async () => {
    const before = await balance(orgA);
    setProvidersForTesting(createMockProviders({ fail: { getTaxpayer: "ERROR", getGstinsByPan: "ERROR", getFilingStatus: "ERROR" } }));
    const r = await runFresh(orgA, { buyer_gstin: fx("D").taxpayer.gstin });
    setProvidersForTesting(null);
    expect(r.status).toBe("FAILED");
    expect(r.charge_status).toBe("REFUNDED");
    expect(await balance(orgA)).toBe(before);
  });

  it("TC-04 growing company: ₹1.25 crore, LOW, HIGH confidence, charged once", async () => {
    const before = await balance(orgA);
    const r = await runFresh(orgA, { cin: fx("A").master!.cin, credit_requested_paise: 5_00_00_000_00 });
    expect(r.status).toBe("COMPLETED");
    expect(r.assessment!.recommended_limit_paise).toBe(1_25_00_000_00n);
    expect(r.assessment!.risk_band).toBe("LOW");
    expect(r.assessment!.confidence).toBe("HIGH");
    expect(r.assessment!.exceeds_limit).toBe(true);
    expect(Number(r.assessment!.exceed_ratio)).toBe(4);
    expect(before - (await balance(orgA))).toBe(59_000n); // ₹500 + 18% GST
    expect(r.company!.company_financials).toHaveLength(4);
    expect(r.company!.company_directors).toHaveLength(2);
    expect(r.company).not.toHaveProperty("pan_hash");
  });

  it("TC-11 same idempotency key twice: one check, one debit", async () => {
    const before = await balance(orgA);
    const k = key();
    const body = { cin: fx("A").master!.cin, purpose: "NEW_BUYER", consent_confirmed: true };
    const first = await svc.startCheck(ctx(orgA), body, k);
    const second = await svc.startCheck(ctx(orgA), body, k);
    expect(second.check.id).toBe(first.check.id);
    expect(second.replayed).toBe(true);
    expect(before - (await balance(orgA))).toBe(59_000n);
    await svc.runCheck(first.check.id, FAST);
  });

  it("TC-09 financials provider times out: PARTIAL, other sections still shown", async () => {
    setProvidersForTesting(createMockProviders({ fail: { getFinancials: "TIMEOUT" } }));
    const r = await runFresh(orgA, { cin: fx("C").master!.cin }, { retries: 1, backoffMs: [5] });
    setProvidersForTesting(null);
    expect(r.status).toBe("PARTIAL");
    expect(r.sections.find((s) => s.section === "FINANCIALS")!.status).toBe("SOURCE_ERROR");
    expect(r.sections.find((s) => s.section === "MCA_MASTER")!.status).toBe("SUCCESS");
    expect(r.assessment!.risk_band).toBe("INSUFFICIENT_DATA");
    const calls = await prisma.provider_calls.count({ where: { company_check_id: r.id, operation: "getFinancials" } });
    expect(calls).toBe(2); // 1 try + 1 retry
  });

  it("TC-06 stable company: ₹70 lakh", async () => {
    const r = await runFresh(orgA, { cin: fx("C").master!.cin, credit_requested_paise: 70_00_000_00 });
    expect(r.status).toBe("COMPLETED");
    expect(r.assessment!.recommended_limit_paise).toBe(70_00_000_00n);
  });

  it("TC-05 declining company asking ₹50 lakh: ₹4,000 and 1,250× the limit", async () => {
    const r = await runFresh(orgA, { cin: fx("B").master!.cin, credit_requested_paise: 50_00_000_00 });
    expect(r.assessment!.recommended_limit_paise).toBe(4_000_00n);
    expect(Number(r.assessment!.exceed_ratio)).toBe(1250);
  });

  it("TC-07 struck-off company: hard stop, limit 0, VERY_HIGH", async () => {
    const r = await runFresh(orgA, { cin: fx("E").master!.cin });
    expect(r.assessment!.hard_stops).toEqual(expect.arrayContaining(["MCA_STRIKE_OFF", "ALL_GSTIN_CANCELLED"]));
    expect(r.assessment!.recommended_limit_paise).toBe(0n);
    expect(r.assessment!.risk_band).toBe("VERY_HIGH");
  });

  it("TC-08 proprietorship (GST only): INSUFFICIENT_DATA, MCA sections not available", async () => {
    const r = await runFresh(orgA, { buyer_gstin: fx("D").taxpayer.gstin });
    expect(r.status).toBe("COMPLETED");
    expect(r.company!.entity_type).toBe("PROPRIETORSHIP");
    expect(r.sections.find((s) => s.section === "FINANCIALS")!.status).toBe("NOT_AVAILABLE");
    expect(r.assessment!.risk_band).toBe("INSUFFICIENT_DATA");
    expect(r.assessment!.recommended_limit_paise).toBeNull();
  });

  it("TC-12 balance too low: 402 and no check created", async () => {
    const before = await prisma.company_checks.count({ where: { organisation_id: orgB } });
    await expect(
      svc.startCheck(ctx(orgB), { cin: fx("A").master!.cin, purpose: "NEW_BUYER", consent_confirmed: true }, key()),
    ).rejects.toMatchObject({ status: 402, code: "INSUFFICIENT_BALANCE" });
    expect(await prisma.company_checks.count({ where: { organisation_id: orgB } })).toBe(before);
  });

  it("TC-13 re-open within 30 days is free", async () => {
    const before = await balance(orgA);
    const company = await prisma.companies.findUniqueOrThrow({ where: { cin: fx("C").master!.cin } });
    const { check } = await svc.startCheck(
      ctx(orgA), { company_id: company.id, purpose: "PERIODIC_REVIEW", consent_confirmed: true, reuse_previous: true }, key(),
    );
    expect(check.charge_status).toBe("FREE_REOPEN");
    expect(await balance(orgA)).toBe(before);
  });
});

describe("decisions, re-assessment and isolation", () => {
  let checkId = "";
  beforeAll(async () => {
    const latest = await prisma.company_checks.findFirstOrThrow({
      where: { organisation_id: orgA, companies: { cin: fx("A").master!.cin }, status: "COMPLETED" },
      orderBy: { created_at: "desc" },
    });
    checkId = latest.id;
  });

  it("editing the requested amount creates a new assessment without a charge", async () => {
    const before = await balance(orgA);
    const a = await svc.reassess(ctx(orgA), checkId, { requested_amount_paise: 1_00_00_000_00 });
    expect(a.exceeds_limit).toBe(false);
    expect(await balance(orgA)).toBe(before);
  });

  it("TC-14 finance user cannot approve above the limit; owner can, with a reason", async () => {
    const above = { decision: "APPROVED_AS_REQUESTED", approved_amount_paise: 2_00_00_000_00 };
    await expect(svc.recordDecision(ctx(orgA, "FINANCE"), checkId, above)).rejects.toMatchObject({ code: "OWNER_APPROVAL_REQUIRED" });
    await expect(svc.recordDecision(ctx(orgA, "OWNER"), checkId, above)).rejects.toMatchObject({ code: "OVERRIDE_REASON_REQUIRED" });
    const d = await svc.recordDecision(ctx(orgA, "OWNER"), checkId, { ...above, override_reason: "20-year customer, bank guarantee held" });
    expect(d.decision).toBe("APPROVED_AS_REQUESTED");
    const within = await svc.recordDecision(ctx(orgA, "FINANCE"), checkId, { decision: "APPROVED_REDUCED", approved_amount_paise: 50_00_000_00 });
    expect(within.override_reason).toBeNull();
  });

  it("TC-15 another organisation gets 404, not 403", async () => {
    const err = await svc.getCheckReport(ctx(orgB), checkId).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(404);
  });

  it("read-only users cannot run checks", async () => {
    await expect(
      svc.startCheck(ctx(orgA, "READ_ONLY"), { cin: fx("A").master!.cin, purpose: "NEW_BUYER", consent_confirmed: true }, key()),
    ).rejects.toMatchObject({ code: "ROLE_FORBIDDEN" });
  });

  it("history lists the organisation's checks only", async () => {
    const a = await svc.listChecks(ctx(orgA), {});
    const b = await svc.listChecks(ctx(orgB), {});
    expect(a.total).toBeGreaterThan(5);
    expect(b.total).toBe(0);
  });
});
