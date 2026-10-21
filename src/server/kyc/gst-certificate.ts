import "server-only";
import crypto from "node:crypto";
import { isValidGstin } from "@/lib/validators";
import { audit } from "@/server/audit";
import { sql } from "@/server/db/sql";
import { AppError } from "@/server/errors";
import { textDoc } from "@/server/pdf/kit";
import { MOCK, primary } from "@/server/providers/registry";
import { evidenceStore } from "@/server/storage";
import type { RequestContext } from "@/server/context";

// GSTN Registration Certificate through API Setu (GSTN collection, v1.0.1): the business's own GST certificate.
//   1. POST {base}/mof/gst/srv/govtapiext/v1.0/rc/initiate  (header action: INITIATE) {gstin, legalName, emailId_pas}
//      → GSTN sends an OTP to the primary authorised signatory's registered email and mobile; returns txnId.
//   2. POST …/rc/validate (header action: VALIDATE) {gstin, otp, txnId} → certificate details and rcPdf (Base64 PDF).
// Request bodies must be encrypted and Base64 encoded. The scheme and key come from API Setu with the subscription
// (GSTN_ENCRYPTION_ENABLED, GSTN_ENCRYPTION_KEY); until they are in, a live call refuses plainly. The API runs on the
// UAT server (GSTN_RC_BASE_URL, default https://beta.api-setu.in). Provider "gst_certificate": mock (OTP 123456) or apisetu.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };
const env = (...k: string[]) => k.map((x) => process.env[x]?.replace(/^["']|["']$/g, "").trim()).find(Boolean) ?? "";
export const MOCK_RC_OTP = "123456";
const live = () => primary("gst_certificate") !== MOCK;

function encode(body: object): string {
  if (env("GSTN_ENCRYPTION_ENABLED") === "true") {
    if (!env("GSTN_ENCRYPTION_KEY")) throw new AppError("unavailable", "GST certificate: GSTN_ENCRYPTION_KEY is not set.");
    // The encryption scheme is in API Setu's onboarding pack for this API; write it here when it arrives.
    throw new AppError("unavailable", "GST certificate: the GSTN encryption scheme is not set up yet.");
  }
  return Buffer.from(JSON.stringify(body)).toString("base64");
}

async function call(path: "initiate" | "validate", body: object) {
  const base = (env("GSTN_RC_BASE_URL") || "https://beta.api-setu.in").replace(/\/$/, "");
  const res = await fetch(`${base}/mof/gst/srv/govtapiext/v1.0/rc/${path}`, {
    method: "POST",
    headers: {
      "X-APISETU-CLIENTID": env("GSTN_CLIENT_ID", "APISETU_CLIENT_ID"), "X-APISETU-APIKEY": env("GSTN_API_KEY", "APISETU_API_KEY"),
      action: path === "initiate" ? "INITIATE" : "VALIDATE", "content-type": "application/json", accept: "application/json",
    },
    body: JSON.stringify({ data: encode(body) }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res) throw new AppError("unavailable", "The GST network did not answer. Please try again.");
  const json = (await res.json().catch(() => null)) as { status_cd?: string; data?: Record<string, unknown>; error?: { message?: string } } | null;
  if (!res.ok || json?.status_cd !== "1") throw new AppError(res.status >= 500 ? "unavailable" : "validation_failed", json?.error?.message ?? `The GST network answered ${res.status}.`);
  return json.data ?? {};
}

async function orgGst(ctx: Ctx) {
  const [o] = await sql()<{ gstin: string | null; legal_name: string; gst_certificate_at: Date | null }[]>`
    select gstin, legal_name, gst_certificate_at from public.organisations where id = ${ctx.orgId}`;
  if (!o?.gstin || !isValidGstin(o.gstin)) throw new AppError("validation_failed", "Your business has no GSTIN on file.");
  return o;
}

export async function gstCertificateStatus(orgId: string) {
  const [o] = await sql()<{ gstin: string | null; gst_certificate_at: Date | null }[]>`select gstin, gst_certificate_at from public.organisations where id = ${orgId}`;
  return { hasGstin: Boolean(o?.gstin), savedAt: o?.gst_certificate_at?.toISOString() ?? null, testMode: !live() };
}

export async function initiateGstCertificate(ctx: Ctx, email: string) {
  const o = await orgGst(ctx);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new AppError("validation_failed", "Enter the signatory's email.", { email: "Enter a valid email." });
  const txnId = live()
    ? String((await call("initiate", { gstin: o.gstin, legalName: o.legal_name, emailId_pas: email.trim() })).txnId ?? "")
    : `mock-${crypto.randomBytes(8).toString("hex")}`;
  if (!txnId) throw new AppError("unavailable", "The GST network did not start the OTP. Please try again.");
  await audit(ctx, { action: "gst_certificate.otp_sent", entity: "organisation", entityId: ctx.orgId });
  return { txnId, testMode: !live() };
}

export async function validateGstCertificate(ctx: Ctx, txnId: string, otp: string) {
  const o = await orgGst(ctx);
  if (!/^\d{6}$/.test(otp)) throw new AppError("validation_failed", "Enter the 6-digit OTP.", { otp: "Enter the 6-digit OTP." });
  let pdfBytes: Uint8Array;
  if (live()) {
    const data = await call("validate", { gstin: o.gstin, otp, txnId });
    const b64 = String(data.rcPdf ?? "");
    if (!b64) throw new AppError("unavailable", "The certificate did not come back. Please try again.");
    pdfBytes = new Uint8Array(Buffer.from(b64, "base64"));
  } else {
    if (otp !== MOCK_RC_OTP || !txnId.startsWith("mock-")) throw new AppError("validation_failed", "The OTP is not correct.", { otp: "The OTP is not correct." });
    const doc = await textDoc({ title: "GST Registration Certificate (test)", reference: o.gstin!, generatedAt: new Date(), watermark: "SAMPLE" });
    doc.heading("GST Registration Certificate (test data)");
    doc.rows([["GSTIN", o.gstin!], ["Legal name", o.legal_name], ["Source", "Test stand-in for the GSTN Registration Certificate API"]]);
    pdfBytes = await doc.save();
  }
  const ref = await evidenceStore.putOnce(`uploads/gst-certificate/${ctx.orgId}/${Date.now()}.pdf`, pdfBytes, "application/pdf");
  await sql()`update public.organisations set gst_certificate_ref = ${ref}, gst_certificate_at = now() where id = ${ctx.orgId}`;
  await audit(ctx, { action: "gst_certificate.saved", entity: "organisation", entityId: ctx.orgId, after: { test: !live() } });
  return gstCertificateStatus(ctx.orgId);
}

export async function gstCertificatePdf(ctx: Ctx) {
  const [o] = await sql()<{ gst_certificate_ref: string | null; gstin: string | null }[]>`select gst_certificate_ref, gstin from public.organisations where id = ${ctx.orgId}`;
  if (!o?.gst_certificate_ref) throw new AppError("not_found", "No GST certificate saved yet.");
  return { bytes: await evidenceStore.get(o.gst_certificate_ref), name: `gst-certificate-${o.gstin ?? "business"}.pdf` };
}
