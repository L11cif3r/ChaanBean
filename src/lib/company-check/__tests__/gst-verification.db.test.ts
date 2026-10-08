// GST verification by OTP, end to end against the real database with the mock API Setu provider.
// Run with: DATABASE_URL=$DIRECT_URL RUN_DB_TESTS=1 npx vitest run src/lib/company-check

import "dotenv/config";
import crypto from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { RequestContext } from "../errors";
import * as gst from "../gst-verification";
import { MOCK_FIXTURES } from "../providers/mock";
import { MOCK_GST_OTP } from "../providers/gst-rc";
import { setGstRcProviderForTesting, setProvidersForTesting } from "../providers";
import * as svc from "../service";

const USER = "00000000-0000-4000-8000-00000000c0c2";
const EMAIL = "gst-otp-test@chaanbean.invalid";
const A = MOCK_FIXTURES.find((f) => f.key === "A")!;
const C = MOCK_FIXTURES.find((f) => f.key === "C")!;
let org = "";
let other = "";
let checkA = "";
let checkC = "";
const ctx = (o: string, role: RequestContext["role"] = "OWNER"): RequestContext => ({ userId: USER, organisationId: o, role, correlationId: crypto.randomUUID() });

async function makeOrg(name: string) {
  const o = await prisma.organisations.create({ data: { legal_name: name, kyc_status: "VERIFIED" } });
  await prisma.organisation_members.create({ data: { organisation_id: o.id, user_id: USER, role: "OWNER" } });
  await prisma.subscriptions.create({ data: { organisation_id: o.id, plan_code: "TEST", status: "ACTIVE", current_period_end: new Date(Date.now() + 86_400_000) } });
  await prisma.wallet_ledger.create({ data: { organisation_id: o.id, entry_type: "TOPUP", amount_paise: 500_000n, balance_after_paise: 0n, gateway_payment_id: `test-${o.id}` } });
  return o.id;
}

async function completedCheck(o: string, cin: string) {
  const { check } = await svc.startCheck(ctx(o), { cin, purpose: "NEW_BUYER", consent_confirmed: true }, crypto.randomUUID());
  await svc.runCheck(check.id, { retries: 0, backoffMs: [1] });
  return check.id;
}

beforeAll(async () => {
  setProvidersForTesting(null);
  setGstRcProviderForTesting(null);
  await prisma.$executeRawUnsafe(
    `INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
     VALUES ($1::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,now(),now()) ON CONFLICT (id) DO NOTHING`,
    USER, EMAIL,
  );
  await prisma.app_users.upsert({ where: { id: USER }, create: { id: USER, email: EMAIL }, update: {} });
  await prisma.companies.deleteMany({ where: { is_test: true } });
  org = await makeOrg("ZZ TEST GST OTP Org");
  other = await makeOrg("ZZ TEST GST OTP Other Org");
  checkA = await completedCheck(org, A.master!.cin!);
  checkC = await completedCheck(org, C.master!.cin!);
});

afterAll(async () => {
  setGstRcProviderForTesting(null);
  await prisma.outbox_events.deleteMany({ where: { organisation_id: { in: [org, other] } } });
  await prisma.organisations.deleteMany({ where: { id: { in: [org, other] } } });
  await prisma.companies.deleteMany({ where: { is_test: true } });
  await prisma.directors.deleteMany({ where: { din: { startsWith: "900000" } } });
  await prisma.$executeRawUnsafe(`DELETE FROM auth.users WHERE id = $1::uuid`, USER);
});

const start = (check: string, over: Record<string, unknown> = {}, c = ctx(org)) =>
  gst.startGstVerification(c, check, { gstin: A.taxpayer.gstin, legal_name: A.taxpayer.legalName, signatory_email: "ravi.sharma@example.in", ...over });

describe("GST verification by OTP", () => {
  it("rejects a GSTIN that belongs to a different PAN than the checked company", async () => {
    await expect(start(checkA, { gstin: C.taxpayer.gstin, legal_name: C.taxpayer.legalName })).rejects.toMatchObject({ code: "GSTIN_BELONGS_TO_ANOTHER_BUSINESS" });
  });

  it("reports wrong details from the GST network and records the failure", async () => {
    await expect(start(checkA, { legal_name: "Some Other Name Pvt Ltd" })).rejects.toMatchObject({ status: 422, code: "DETAILS_MISMATCH" });
    const rows = await gst.listGstVerifications(ctx(org), checkA);
    expect(rows[0]).toMatchObject({ status: "FAILED", error_code: "DETAILS_MISMATCH" });
  });

  it("sends the OTP, counts wrong attempts, then verifies with the right OTP", async () => {
    const sent = await start(checkA);
    expect(sent).toMatchObject({ status: "OTP_SENT", signatory_email: "r**********@example.in", attempts_left: 5 });
    expect(sent).not.toHaveProperty("txn_id");

    await expect(gst.confirmGstVerification(ctx(org), checkA, sent.id, { otp: "111111" })).rejects.toMatchObject({
      code: "OTP_INCORRECT", message: "The OTP is incorrect. 4 attempts left.",
    });
    await expect(gst.confirmGstVerification(ctx(org), checkA, sent.id, { otp: "12ab" })).rejects.toMatchObject({ name: "ZodError" });

    const ok = await gst.confirmGstVerification(ctx(org), checkA, sent.id, { otp: MOCK_GST_OTP });
    expect(ok).toMatchObject({ status: "VERIFIED", legal_name: A.taxpayer.legalName, name_matches_company: true, certificate_available: true });

    const row = await prisma.gst_verifications.findUniqueOrThrow({ where: { id: sent.id } });
    expect(row.txn_id).toBeNull(); // single-use, not kept
    const cert = await gst.getGstCertificate(ctx(org), checkA, sent.id);
    expect(cert.pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(crypto.createHash("sha256").update(cert.pdf).digest("hex")).toBe(row.certificate_sha256);

    const report = await svc.getCheckReport(ctx(org), checkA);
    expect(report.gst_verifications.find((v) => v.id === sent.id)).toMatchObject({ status: "VERIFIED", gstin: A.taxpayer.gstin });
    expect(JSON.stringify(report, (_k, v) => (typeof v === "bigint" ? String(v) : v))).not.toContain("certificate_pdf");
  });

  it("locks the OTP after 5 wrong attempts", async () => {
    const sent = await start(checkA);
    for (let i = 0; i < 4; i++) await gst.confirmGstVerification(ctx(org), checkA, sent.id, { otp: "000000" }).catch(() => {});
    await expect(gst.confirmGstVerification(ctx(org), checkA, sent.id, { otp: "000000" })).rejects.toMatchObject({ message: "Too many wrong OTPs. Send a new one." });
    await expect(gst.confirmGstVerification(ctx(org), checkA, sent.id, { otp: MOCK_GST_OTP })).rejects.toMatchObject({ code: "OTP_NOT_ACTIVE" });
  });

  it("closes an older pending OTP when a new one is sent, and limits sends to 3 a day per check", async () => {
    // checkA already has 3 sends today (1 failed, 2 sent)
    await expect(start(checkA)).rejects.toMatchObject({ status: 429, code: "TOO_MANY_OTP_REQUESTS" });

    const first = await start(checkC, { gstin: C.taxpayer.gstin, legal_name: C.taxpayer.legalName });
    const second = await start(checkC, { gstin: C.taxpayer.gstin, legal_name: C.taxpayer.legalName });
    expect((await prisma.gst_verifications.findUniqueOrThrow({ where: { id: first.id } })).status).toBe("EXPIRED");
    await expect(gst.confirmGstVerification(ctx(org), checkC, first.id, { otp: MOCK_GST_OTP })).rejects.toMatchObject({ code: "OTP_NOT_ACTIVE" });
    expect((await gst.confirmGstVerification(ctx(org), checkC, second.id, { otp: MOCK_GST_OTP })).status).toBe("VERIFIED");
  });

  it("expires an OTP after its validity window", async () => {
    const tmp = await completedCheck(org, C.master!.cin!);
    const sent = await start(tmp, { gstin: C.taxpayer.gstin, legal_name: C.taxpayer.legalName });
    await prisma.gst_verifications.update({ where: { id: sent.id }, data: { expires_at: new Date(Date.now() - 1000) } });
    await expect(gst.confirmGstVerification(ctx(org), tmp, sent.id, { otp: MOCK_GST_OTP })).rejects.toMatchObject({ status: 410, code: "OTP_EXPIRED" });
  });

  it("blocks read-only users and hides everything from other organisations", async () => {
    await expect(start(checkA, {}, ctx(org, "READ_ONLY"))).rejects.toMatchObject({ code: "ROLE_FORBIDDEN" });
    await expect(gst.listGstVerifications(ctx(other), checkA)).rejects.toMatchObject({ status: 404 });
    const verified = (await gst.listGstVerifications(ctx(org), checkA)).find((v) => v.status === "VERIFIED")!;
    await expect(gst.getGstCertificate(ctx(other), checkA, verified.id)).rejects.toMatchObject({ status: 404 });
  });
});
