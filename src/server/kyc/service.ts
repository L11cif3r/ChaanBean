import "server-only";
import crypto from "node:crypto";
import { audit } from "@/server/audit";
import { sql } from "@/server/db/sql";
import { AppError } from "@/server/errors";
import { MOCK, primary } from "@/server/providers/registry";
import { refuse } from "@/server/providers/slots";
import type { RequestContext } from "@/server/context";

// KYC of the person who signs up (PRD v4.0 11.2, C16): DigiLocker, Aadhaar or PAN shared by consent, through the
// API Setu / DigiLocker partner route. We keep the name as per the document, the document type, a masked number and
// the time, never a full Aadhaar number. Whether KYC blocks the portal is still open (Q8), so it is a banner for now.
//
// Provider "kyc": mock (a test DigiLocker page inside the portal) or the "digilocker" slot (keys DIGILOCKER_CLIENT_ID,
// DIGILOCKER_CLIENT_SECRET, DIGILOCKER_REDIRECT_URI), written when the partner access is set up.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };
export type KycMethod = "digilocker_aadhaar" | "digilocker_pan";
export type KycStatus = "not_started" | "pending" | "verified" | "failed";

const STATE_MS = 15 * 60_000;
const secret = () => process.env.SESSION_SECRET ?? process.env.FIELD_ENCRYPTION_KEY ?? "dev-kyc-state";

/** A signed, short-lived state for the DigiLocker round trip (no table needed). */
export function signState(p: { orgId: string; userId: string; method: KycMethod; exp: number }) {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(`kyc:${body}`).digest("base64url");
  return `${body}.${mac}`;
}

export function readState(state: string, now = Date.now()) {
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const want = crypto.createHmac("sha256", secret()).update(`kyc:${body}`).digest("base64url");
  if (want.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { orgId: string; userId: string; method: KycMethod; exp: number };
  return p.exp > now ? p : null;
}

export const maskDoc = (method: KycMethod, number: string) => {
  const digits = number.replace(/\s/g, "").toUpperCase();
  return method === "digilocker_aadhaar" ? `XXXX XXXX ${digits.slice(-4)}` : `${digits.slice(0, 2)}XXXXX${digits.slice(-3)}`;
};

export async function kycStatus(orgId: string) {
  const [o] = await sql()<{ kyc_status: KycStatus; kyc_method: KycMethod | null; kyc_name: string | null; kyc_doc_masked: string | null; kyc_verified_at: Date | null }[]>`
    select kyc_status, kyc_method, kyc_name, kyc_doc_masked, kyc_verified_at from public.organisations where id = ${orgId}`;
  return {
    status: o?.kyc_status ?? "not_started", method: o?.kyc_method ?? null, name: o?.kyc_name ?? null, docMasked: o?.kyc_doc_masked ?? null,
    verifiedAt: o?.kyc_verified_at?.toISOString() ?? null, testMode: primary("kyc") === MOCK,
  };
}

/** Start: where to send the person (DigiLocker's consent page, or the test page). */
export async function startKyc(ctx: Ctx, method: KycMethod) {
  const state = signState({ orgId: ctx.orgId, userId: ctx.user.id, method, exp: Date.now() + STATE_MS });
  await sql()`update public.organisations set kyc_status = 'pending', kyc_method = ${method} where id = ${ctx.orgId} and kyc_status <> 'verified'`;
  if (primary("kyc") === MOCK) return { redirect: `/account/kyc/test?state=${encodeURIComponent(state)}` };
  return refuse(primary("kyc"), "DigiLocker KYC");
}

/** Back from DigiLocker (or the test page): record the result on the organisation. */
export async function completeKyc(ctx: Ctx, state: string, result: { approved: boolean }) {
  const p = readState(state);
  if (!p || p.orgId !== ctx.orgId || p.userId !== ctx.user.id) throw new AppError("validation_failed", "This KYC link has expired. Please start again.");
  if (primary("kyc") !== MOCK) refuse(primary("kyc"), "DigiLocker KYC");
  if (!result.approved) {
    await sql()`update public.organisations set kyc_status = 'failed' where id = ${ctx.orgId} and kyc_status <> 'verified'`;
    await audit(ctx, { action: "kyc.failed", entity: "organisation", entityId: ctx.orgId, after: { method: p.method } });
    return kycStatus(ctx.orgId);
  }
  // Test data: the signed-in person's name and a made-up document number, masked as a real one would be.
  const [u] = await sql()<{ full_name: string | null }[]>`select full_name from public.user_profiles where id = ${ctx.user.id}`;
  const name = (u?.full_name ?? "Test user").slice(0, 120);
  const masked = maskDoc(p.method, p.method === "digilocker_aadhaar" ? "999941057058" : "ABCPE1234F");
  await sql()`
    update public.organisations set kyc_status = 'verified', kyc_method = ${p.method}, kyc_name = ${name}, kyc_doc_masked = ${masked},
           kyc_verified_at = now(), kyc_user_id = ${ctx.user.id}
     where id = ${ctx.orgId}`;
  await audit(ctx, { action: "kyc.verified", entity: "organisation", entityId: ctx.orgId, after: { method: p.method, doc: masked, test: true } });
  return kycStatus(ctx.orgId);
}
