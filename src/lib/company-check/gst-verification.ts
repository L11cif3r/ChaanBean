// Optional step on a Company Check report: verify the buyer's GSTIN with an OTP sent to their
// primary authorised signatory (API Setu GSTN Registration Certificate API).
//
// Limits protect the buyer from OTP spam and the OTP from guessing:
//   - at most MAX_SENDS_PER_DAY OTPs per check per 24 h
//   - at most MAX_OTP_ATTEMPTS wrong OTPs per send; then the verification fails and a new OTP is needed
//   - an OTP send expires after OTP_VALIDITY_MIN minutes

import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError, badRequest, forbidden, notFound, type RequestContext } from "./errors";
import { isValidGstin, panFromGstin } from "./identifiers";
import { hashPii, panHash } from "./pan-crypto";
import { getGstRcProvider } from "./providers";
import type { GstRcErrorCode } from "./providers/gst-rc";

export const MAX_SENDS_PER_DAY = 3;
export const MAX_OTP_ATTEMPTS = 5;
export const OTP_VALIDITY_MIN = 10;

const STATUS_FOR_ERROR: Record<GstRcErrorCode, number> = {
  DETAILS_MISMATCH: 422,
  OTP_INCORRECT: 422,
  OTP_EXPIRED: 410,
  RATE_LIMITED: 429,
  AUTH_ERROR: 503,
  TIMEOUT: 504,
  ERROR: 502,
};

export function maskEmail(email: string): string {
  const [user, domain] = email.trim().toLowerCase().split("@");
  if (!user || !domain) return "***";
  return `${user[0]}${"*".repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

const normaliseName = (s: string) =>
  s.toUpperCase().replace(/\bPVT\.?\b/g, "PRIVATE").replace(/\bLTD\.?\b/g, "LIMITED").replace(/[^A-Z0-9]/g, "");

async function audit(ctx: RequestContext, action: string, entityId: string, metadata: Record<string, unknown>) {
  await prisma.audit_events.create({
    data: {
      organisation_id: ctx.organisationId, actor_type: "USER", actor_id: ctx.userId, action,
      entity_type: "gst_verification", entity_id: entityId, correlation_id: ctx.correlationId,
      ip: ctx.ip ?? null, user_agent: ctx.userAgent ?? null, metadata: JSON.parse(JSON.stringify(metadata)),
    },
  });
}

async function ownCheck(ctx: RequestContext, checkId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(checkId)) throw notFound("Check");
  const check = await prisma.company_checks.findFirst({ where: { id: checkId, organisation_id: ctx.organisationId } });
  if (!check) throw notFound("Check");
  return check;
}

/** Public view: never includes the transaction id, the email hash or the PDF bytes. */
function view(v: Awaited<ReturnType<typeof prisma.gst_verifications.findFirstOrThrow>>) {
  return {
    id: v.id,
    gstin: v.gstin,
    status: v.status,
    signatory_email: v.signatory_email_masked,
    otp_sent_at: v.otp_sent_at,
    expires_at: v.expires_at,
    attempts_left: v.status === "OTP_SENT" ? Math.max(MAX_OTP_ATTEMPTS - v.otp_attempts, 0) : 0,
    verified_at: v.verified_at,
    legal_name: v.legal_name,
    trade_name: v.trade_name,
    constitution: v.constitution,
    name_matches_company: v.name_matches_company,
    certificate_available: !!v.certificate_sha256,
    certificate_sha256: v.certificate_sha256,
    error_code: v.error_code,
    source: v.provider,
  };
}

// ======================================================================= step 1: send OTP

export const StartGstVerificationInput = z.object({
  gstin: z.string().trim().toUpperCase().refine(isValidGstin, "This GSTIN is not valid. Check the 15 characters."),
  legal_name: z.string().trim().min(2, "Enter the buyer's legal name exactly as registered for GST.").max(200),
  signatory_email: z.string().trim().toLowerCase().email("Enter the email of the buyer's primary authorised signatory."),
});

export async function startGstVerification(ctx: RequestContext, checkId: string, rawInput: unknown) {
  if (ctx.role === "READ_ONLY") throw forbidden("ROLE_FORBIDDEN", "Your role can view checks only.");
  const input = StartGstVerificationInput.parse(rawInput);
  const check = await ownCheck(ctx, checkId);
  if (!["COMPLETED", "PARTIAL"].includes(check.status) || !check.company_id) {
    throw new AppError(409, "CHECK_NOT_READY", "Wait for the report to finish before verifying GST.");
  }

  // The GSTIN must belong to the company that was checked (same PAN), when we know its PAN.
  const company = await prisma.companies.findUniqueOrThrow({ where: { id: check.company_id }, select: { pan_hash: true, legal_name: true } });
  if (company.pan_hash && company.pan_hash !== panHash(panFromGstin(input.gstin))) {
    throw badRequest("GSTIN_BELONGS_TO_ANOTHER_BUSINESS", "This GSTIN belongs to a different business (different PAN) from the company you checked.");
  }

  const since = new Date(Date.now() - 24 * 3600_000);
  const sentToday = await prisma.gst_verifications.count({ where: { company_check_id: check.id, created_at: { gt: since } } });
  if (sentToday >= MAX_SENDS_PER_DAY) {
    throw new AppError(429, "TOO_MANY_OTP_REQUESTS", `An OTP can be sent at most ${MAX_SENDS_PER_DAY} times a day for one check. Try again tomorrow.`);
  }

  // Only one live OTP per check: older pending ones are closed.
  await prisma.gst_verifications.updateMany({ where: { company_check_id: check.id, status: "OTP_SENT" }, data: { status: "EXPIRED" } });

  const provider = getGstRcProvider();
  const r = await provider.initiate({ gstin: input.gstin, legalName: input.legal_name, signatoryEmail: input.signatory_email });
  const base = {
    organisation_id: ctx.organisationId,
    company_check_id: check.id,
    gstin: input.gstin,
    legal_name_entered: input.legal_name,
    signatory_email_masked: maskEmail(input.signatory_email),
    signatory_email_hash: hashPii(input.signatory_email),
    provider: provider.name,
    initiated_by: ctx.userId,
  };

  if (!r.ok) {
    const row = await prisma.gst_verifications.create({ data: { ...base, status: "FAILED", error_code: r.providerCode ? `${r.code}:${r.providerCode}` : r.code } });
    await audit(ctx, "gst_verification.otp_failed", row.id, { check_id: check.id, gstin: input.gstin, code: r.code });
    throw new AppError(STATUS_FOR_ERROR[r.code], r.code, r.message, { verification_id: row.id });
  }

  const now = new Date();
  const row = await prisma.gst_verifications.create({
    data: { ...base, status: "OTP_SENT", txn_id: r.data.txnId, otp_sent_at: now, expires_at: new Date(now.getTime() + OTP_VALIDITY_MIN * 60_000) },
  });
  await audit(ctx, "gst_verification.otp_sent", row.id, { check_id: check.id, gstin: input.gstin });
  return view(row);
}

// ======================================================================= step 2: confirm OTP

export const ConfirmGstVerificationInput = z.object({
  otp: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit OTP the buyer received."),
});

export async function confirmGstVerification(ctx: RequestContext, checkId: string, verificationId: string, rawInput: unknown) {
  if (ctx.role === "READ_ONLY") throw forbidden("ROLE_FORBIDDEN", "Your role can view checks only.");
  const { otp } = ConfirmGstVerificationInput.parse(rawInput);
  const check = await ownCheck(ctx, checkId);
  if (!/^[0-9a-f-]{36}$/i.test(verificationId)) throw notFound("Verification");
  const v = await prisma.gst_verifications.findFirst({ where: { id: verificationId, company_check_id: check.id, organisation_id: ctx.organisationId } });
  if (!v) throw notFound("Verification");
  if (v.status === "VERIFIED") return view(v);
  if (v.status !== "OTP_SENT" || !v.txn_id) throw new AppError(409, "OTP_NOT_ACTIVE", "This OTP is no longer active. Send a new one.");
  if (v.expires_at && v.expires_at < new Date()) {
    await prisma.gst_verifications.update({ where: { id: v.id }, data: { status: "EXPIRED" } });
    throw new AppError(410, "OTP_EXPIRED", "This OTP has expired. Send a new one.");
  }

  // Count the attempt before calling out, atomically, so parallel requests can't exceed the limit.
  const claimed = await prisma.gst_verifications.updateMany({
    where: { id: v.id, status: "OTP_SENT", otp_attempts: { lt: MAX_OTP_ATTEMPTS } },
    data: { otp_attempts: { increment: 1 } },
  });
  if (claimed.count === 0) throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many wrong OTPs. Send a new one.");

  const r = await getGstRcProvider().validate({ gstin: v.gstin, otp, txnId: v.txn_id });
  if (!r.ok) {
    const fresh = await prisma.gst_verifications.findUniqueOrThrow({ where: { id: v.id } });
    const used = fresh.otp_attempts >= MAX_OTP_ATTEMPTS;
    const terminal = r.code === "OTP_EXPIRED" || (r.code === "OTP_INCORRECT" && used);
    await prisma.gst_verifications.update({
      where: { id: v.id },
      data: terminal ? { status: r.code === "OTP_EXPIRED" ? "EXPIRED" : "FAILED", error_code: r.code } : { error_code: r.code },
    });
    await audit(ctx, "gst_verification.otp_rejected", v.id, { check_id: check.id, code: r.code, attempt: fresh.otp_attempts });
    const left = Math.max(MAX_OTP_ATTEMPTS - fresh.otp_attempts, 0);
    const message = r.code === "OTP_INCORRECT" ? (left > 0 ? `The OTP is incorrect. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong OTPs. Send a new one.") : r.message;
    throw new AppError(STATUS_FOR_ERROR[r.code], r.code, message, { attempts_left: left });
  }

  const company = await prisma.companies.findUnique({ where: { id: check.company_id! }, select: { legal_name: true } });
  const updated = await prisma.gst_verifications.update({
    where: { id: v.id },
    data: {
      status: "VERIFIED",
      verified_at: new Date(),
      legal_name: r.data.legalName || null,
      trade_name: r.data.tradeName || null,
      constitution: r.data.constitution || null,
      name_matches_company: company && r.data.legalName ? normaliseName(company.legal_name) === normaliseName(r.data.legalName) : null,
      certificate_pdf: new Uint8Array(r.data.pdf),
      certificate_sha256: crypto.createHash("sha256").update(r.data.pdf).digest("hex"),
      txn_id: null, // single-use; no reason to keep it
      error_code: null,
    },
  });
  await audit(ctx, "gst_verification.verified", v.id, { check_id: check.id, gstin: v.gstin, name_matches_company: updated.name_matches_company });
  return view(updated);
}

// ======================================================================= read

export async function listGstVerifications(ctx: RequestContext, checkId: string) {
  const check = await ownCheck(ctx, checkId);
  const rows = await prisma.gst_verifications.findMany({ where: { company_check_id: check.id }, orderBy: { created_at: "desc" } });
  return rows.map(view);
}

export async function getGstCertificate(ctx: RequestContext, checkId: string, verificationId: string) {
  const check = await ownCheck(ctx, checkId);
  if (!/^[0-9a-f-]{36}$/i.test(verificationId)) throw notFound("Certificate");
  const v = await prisma.gst_verifications.findFirst({
    where: { id: verificationId, company_check_id: check.id, organisation_id: ctx.organisationId, status: "VERIFIED" },
    select: { gstin: true, certificate_pdf: true },
  });
  if (!v?.certificate_pdf) throw notFound("Certificate");
  await audit(ctx, "gst_verification.certificate_downloaded", verificationId, { check_id: check.id });
  return { gstin: v.gstin, pdf: Buffer.from(v.certificate_pdf) };
}
