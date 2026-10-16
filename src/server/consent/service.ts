import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { JSONValue } from "postgres";
import type { CwCode } from "@/lib/checks";
import {
  CONSENT_RULES, ageOn, needsCompanyBureau, needsGst, needsPersonalBureau, type ConsentChannel, type ConsentPurpose,
  type ConsentStatus, type ConsentSummary,
} from "@/lib/consent";
import { formatDateTimeIst, istDate } from "@/lib/dates";
import { maskEmail, maskMobile } from "@/lib/mask";
import { isValidPan, normaliseIdentifier, panFromGstin, isIndividualPan } from "@/lib/validators";
import { audit, systemActor } from "@/server/audit";
import { reverseHold } from "@/server/billing/charge";
import { blindIndex, decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { serverEnv } from "@/server/env";
import { AppError, notFound } from "@/server/errors";
import { enqueue } from "@/server/jobs/runner";
import { queueMessage } from "@/server/outbox";
import { gspProvider, type GspError } from "@/server/providers/gsp";
import { otpSender } from "@/server/providers/otp";
import type { ConsentAccess } from "@/server/providers/checks";
import type { RequestContext } from "@/server/context";

// Buyer consent (PRD v2.0 section 5; v1.0 5.4, S09, S10, FR-CON-01–07).
// The requester's "Yes, run search" creates one consent request for the GST turnover and CIBIL items. The buyer
// gets a single-purpose link (72 hours) by the channels the requester chose, sees who is asking and why, verifies the
// mobile the requester entered by OTP, gives GST portal access and bureau details as needed, and approves or
// declines. Approval starts the waiting checks; a "no", expiry or withdrawal cancels them and releases the held units.
// Every step is written to the consent record (app_private.consent_events) with time, IP, device and OTP reference.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string };

/** Who is acting on the public consent page. */
export interface Visitor {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const codeHash = (consentId: string, code: string) =>
  crypto.createHmac("sha256", serverEnv().SESSION_COOKIE_SECRET).update(`consent-otp:${consentId}:${code}`).digest("hex");
const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const SCOPE_WORDS: Record<string, string> = {
  CW_GST_TURNOVER_4Y: "GST turnover you filed in the last 4 years",
  CW_GST_TURNOVER_CY: "GST turnover you filed this year",
  CW_CIBIL_COMPANY: "Company credit report (CIBIL)",
  CW_CIBIL_PERSONAL: "Personal credit report (CIBIL) of the owner",
};

export const PURPOSE_WORDS: Record<ConsentPurpose, string> = {
  supply_on_credit: "Credit evaluation for supply of goods on credit",
  advance_against_order: "Advance against an order",
  loan: "Loan",
  review_existing: "Review of existing credit",
};

interface ConsentRow {
  id: string; org_id: string; counterparty_id: string; check_request_id: string; scope: string[]; purpose: ConsentPurpose;
  channels: ConsentChannel[]; mobile_ciphertext: string; mobile_masked: string; status: ConsentStatus; token_ciphertext: string;
  link_base: string; expires_at: Date; reminded_at: Date | null; approved_at: Date | null; declined_at: Date | null;
  withdrawn_at: Date | null; visible_until: Date | null; created_by: string | null; created_at: Date;
  subject_kind: "buyer" | "person"; subject_name: string | null;
}

const cols = () => sql()`id, org_id, counterparty_id, check_request_id, scope, purpose, channels, mobile_ciphertext, mobile_masked,
  status, token_ciphertext, link_base, expires_at, reminded_at, approved_at, declined_at, withdrawn_at, visible_until,
  created_by, created_at, subject_kind, subject_name`;

async function byToken(token: string): Promise<ConsentRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [c] = await sql()<ConsentRow[]>`select ${cols()} from public.consent_requests where token_hash = ${hashToken(token)}`;
  if (!c) return null;
  if (c.status === "pending" && c.expires_at <= new Date()) {
    await expireConsent(c.id);
    return (await sql()<ConsentRow[]>`select ${cols()} from public.consent_requests where id = ${c.id}`)[0] ?? null;
  }
  return c;
}

async function mustByToken(token: string) {
  const c = await byToken(token);
  if (!c) throw notFound("This link");
  return c;
}

async function recordEvent(
  c: Pick<ConsentRow, "id" | "org_id" | "scope" | "purpose">,
  kind: string,
  who: Partial<Visitor>,
  extra: { otpRef?: string | null; expiresAt?: Date | null; detail?: Record<string, unknown> } = {},
) {
  await sql()`
    insert into app_private.consent_events (consent_id, org_id, kind, ip, user_agent, otp_ref, scope, purpose, expires_at, detail)
    values (${c.id}, ${c.org_id}, ${kind}, ${who.ip ?? null}::inet, ${who.userAgent?.slice(0, 400) ?? null}, ${extra.otpRef ?? null},
            ${c.scope}, ${c.purpose}, ${extra.expiresAt ?? null}, ${sql().json((extra.detail ?? {}) as JSONValue)})`;
}

const buyerActor = (c: ConsentRow, who: Visitor) => ({
  requestId: who.requestId, ip: who.ip, userAgent: who.userAgent, orgId: c.org_id, user: null,
  actorType: "counterparty" as const, actorId: `consent:${c.id}`,
});

// ---------------------------------------------------------------- the device that passed the OTP

const VERIFIED_COOKIE = "cb_cv";
const mac = (body: string) => crypto.createHmac("sha256", serverEnv().SESSION_COOKIE_SECRET).update(`consent-device:${body}`).digest("base64url");

async function markVerified(consentId: string) {
  const body = Buffer.from(JSON.stringify({ c: consentId, at: Date.now() })).toString("base64url");
  (await cookies()).set(VERIFIED_COOKIE, `${body}.${mac(body)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: CONSENT_RULES.verifiedMs / 1000,
  });
}

async function isVerified(consentId: string) {
  const raw = (await cookies()).get(VERIFIED_COOKIE)?.value;
  const [body, sig] = raw?.split(".") ?? [];
  if (!body || !sig || !safeEqual(sig, mac(body))) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { c: string; at: number };
    return p.c === consentId && Date.now() - p.at < CONSENT_RULES.verifiedMs;
  } catch {
    return false;
  }
}

async function requireVerified(c: ConsentRow) {
  if (!(await isVerified(c.id))) throw new AppError("unauthenticated", "Please verify your mobile with the OTP first.");
}

// ---------------------------------------------------------------- requester side (S08 popup, S09 rules)

/** Consents for a buyer, newest first, for the reuse and limit rules. */
export async function consentHistory(orgId: string, counterpartyId: string, mobile10?: string): Promise<(ConsentSummary & { createdAt: Date })[]> {
  const byMobile = mobile10 ? sql()`and c.mobile_hash = ${blindIndex(mobile10, "mobile")}` : sql()``;
  const rows = await sql()<{ id: string; status: ConsentStatus; scope: string[]; approved_at: Date | null; declined_at: Date | null; created_at: Date; gst_token_expires_at: Date | null }[]>`
    select c.id, c.status, c.scope, c.approved_at, c.declined_at, c.created_at, p.gst_token_expires_at
      from public.consent_requests c left join app_private.consent_private p on p.consent_id = c.id
     where c.org_id = ${orgId} and c.counterparty_id = ${counterpartyId} and c.created_at > now() - interval '31 days' ${byMobile}
     order by c.created_at desc`;
  return rows.map((r) => ({
    id: r.id, status: r.status, scope: r.scope, approvedAt: r.approved_at, declinedAt: r.declined_at,
    gstAccessUntil: r.gst_token_expires_at, createdAt: r.created_at,
  }));
}

interface CounterpartyContacts {
  id: string; legal_name: string; mobile_ciphertext: string; mobile_masked: string; whatsapp_ciphertext: string | null;
  whatsapp_masked: string | null; email_ciphertext: string | null; email_masked: string | null;
}

export async function counterpartyContacts(orgId: string, counterpartyId: string) {
  const [cp] = await sql()<CounterpartyContacts[]>`
    select id, legal_name, mobile_ciphertext, mobile_masked, whatsapp_ciphertext, whatsapp_masked, email_ciphertext, email_masked
      from public.counterparties where id = ${counterpartyId} and org_id = ${orgId}`;
  if (!cp) throw notFound("This counterparty");
  return cp;
}

/** What buyers see as the requester (v3 section 13: display name and contact mobile). */
async function requesterOf(orgId: string, createdBy: string | null) {
  const [r] = await sql()<{ name: string; contact_mobile: string | null; user_phone: string | null; contact_name: string | null }[]>`
    select coalesce(o.display_name, o.legal_name) as name, o.contact_mobile, u.phone as user_phone, p.full_name as contact_name
      from public.organisations o
      left join auth.users u on u.id = ${createdBy}::uuid
      left join public.user_profiles p on p.id = ${createdBy}::uuid
     where o.id = ${orgId}`;
  return { name: r.name, phone: r.contact_mobile ?? r.user_phone, contactName: r.contact_name };
}

function linkMessage(org: string, scope: string[], link: string, reminder: boolean, expiresAt: Date, kind: "buyer" | "person") {
  const what = kind === "person" ? "your personal credit report (CIBIL)" : "your business credit";
  const items = scope.map((s) => SCOPE_WORDS[s] ?? s).join(", ");
  return reminder
    ? `Reminder: ${org} is waiting for your reply on Chaanbean. They asked to see: ${items}. The link works until ${formatDateTimeIst(expiresAt)}: ${link}`
    : `${org} wants to check ${what} on Chaanbean. They asked to see: ${items}. See the details and say yes or no within 72 hours: ${link}`;
}

async function sendLink(c: ConsentRow, reminder: boolean) {
  const [requester, [buyer]] = await Promise.all([
    requesterOf(c.org_id, c.created_by),
    sql()<Pick<CounterpartyContacts, "whatsapp_ciphertext" | "email_ciphertext">[]>`
      select whatsapp_ciphertext, email_ciphertext from public.counterparties where id = ${c.counterparty_id}`,
  ]);
  const org = { legal_name: requester.name };
  // A separate person (personal CIBIL) is reached on their own mobile only.
  const cp = c.subject_kind === "buyer" ? buyer : null;
  const link = `${c.link_base}/c/${decryptField(c.token_ciphertext, "consent.token")}`;
  const body = linkMessage(org.legal_name, c.scope, link, reminder, c.expires_at, c.subject_kind);
  const template = reminder ? "consent_reminder" : "consent_request";
  const mobile = decryptField(c.mobile_ciphertext, "consent.mobile");
  const messages = c.channels.flatMap((channel): { channel: ConsentChannel; recipientMasked: string; subject?: string }[] => {
    if (channel === "sms") return [{ channel, recipientMasked: maskMobile(mobile) }];
    if (channel === "whatsapp") {
      const wa = cp?.whatsapp_ciphertext ? decryptField(cp.whatsapp_ciphertext, "counterparties.whatsapp") : mobile;
      return [{ channel, recipientMasked: maskMobile(wa) }];
    }
    if (channel === "email" && cp?.email_ciphertext) {
      const email = decryptField(cp.email_ciphertext, "counterparties.email");
      const subject = reminder ? `Reminder: ${org.legal_name} is waiting for your consent` : `${org.legal_name} asks for your consent to check your business credit`;
      return [{ channel, recipientMasked: maskEmail(email), subject }];
    }
    return [];
  });
  await Promise.all(messages.map((m) => queueMessage({ orgId: c.org_id, template, body, ...m })));
}

/** Creates and sends the consent request for the waiting items of a check request (S09 marker 7). */
export async function createConsent(
  ctx: Ctx,
  input: {
    checkRequestId: string; counterpartyId: string; scope: CwCode[]; purpose: ConsentPurpose; channels: ConsentChannel[]; origin: string;
    /** Who is asked: the buyer's contact, or the person whose personal CIBIL is asked for (v3 6.2). */
    subject: { kind: "buyer" | "person"; name: string; mobile10: string; expected: { pan: string; birthDate: string } | null };
  },
) {
  const cp = await counterpartyContacts(ctx.orgId, input.counterpartyId);
  if (input.subject.kind === "buyer" && input.channels.includes("email") && !cp.email_ciphertext) {
    throw new AppError("validation_failed", "This buyer has no email on file.", { channels: "This buyer has no email on file. Choose SMS or WhatsApp." });
  }
  if (!input.channels.length) throw new AppError("validation_failed", "Choose SMS or WhatsApp for the person.", { channels: "Choose SMS or WhatsApp." });
  const mobile = input.subject.mobile10;
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + CONSENT_RULES.linkMs);
  const [c] = await sql()<ConsentRow[]>`
    insert into public.consent_requests
      (org_id, counterparty_id, check_request_id, scope, purpose, channels, mobile_hash, mobile_ciphertext, mobile_masked,
       token_hash, token_ciphertext, link_base, expires_at, created_by, subject_kind, subject_name)
    values (${ctx.orgId}, ${cp.id}, ${input.checkRequestId}, ${input.scope}, ${input.purpose}, ${[...new Set(input.channels)]},
            ${blindIndex(mobile, "mobile")},
            ${encryptField(mobile, "consent.mobile")}, ${maskMobile(mobile)}, ${hashToken(token)}, ${encryptField(token, "consent.token")},
            ${input.origin.replace(/\/$/, "")}, ${expiresAt}, ${ctx.user.id}, ${input.subject.kind}, ${input.subject.name})
    returning ${cols()}`;
  if (input.subject.expected) {
    await sql()`
      insert into app_private.consent_private (consent_id, subject_ciphertext)
      values (${c.id}, ${encryptField(JSON.stringify(input.subject.expected), "consent.subject")})`;
  }
  await Promise.all([
    recordEvent(c, "sent", ctx, { expiresAt, detail: { channels: c.channels } }),
    sendLink(c, false),
    enqueue("consent.remind", { consentId: c.id }, { orgId: ctx.orgId, runAt: new Date(Date.now() + CONSENT_RULES.reminderMs), dedupeKey: `consent.remind:${c.id}` }),
    enqueue("consent.expire", { consentId: c.id }, { orgId: ctx.orgId, runAt: expiresAt, dedupeKey: `consent.expire:${c.id}` }),
    audit(ctx, {
      action: "consent.requested", entity: "consent_request", entityId: c.id,
      after: { counterpartyId: cp.id, scope: c.scope, purpose: c.purpose, channels: c.channels, expiresAt: expiresAt.toISOString() },
    }),
  ]);
  return c;
}

// ---------------------------------------------------------------- what happens to the checks

const CANCEL_TEXT: Record<"declined" | "expired" | "withdrawn", { code: string; message: string }> = {
  declined: { code: "CONSENT_DECLINED", message: "The buyer said no. Not charged." },
  expired: { code: "CONSENT_EXPIRED", message: "The buyer did not reply in 72 hours. Not charged." },
  withdrawn: { code: "CONSENT_WITHDRAWN", message: "The buyer withdrew consent before this check ran. Not charged." },
};

/** Cancels every check still waiting on this consent and gives back what was held. */
async function cancelWaiting(c: ConsentRow, why: keyof typeof CANCEL_TEXT, requestId: string) {
  const text = CANCEL_TEXT[why];
  const items = await sql()<{ id: string; hold_id: string | null; request_id: string }[]>`
    update public.check_items set status = 'cancelled', charged = false, error_code = ${text.code}, error_message = ${text.message}, fetched_at = now()
     where consent_id = ${c.id} and status in ('waiting_consent', 'ready', 'queued')
     returning id, hold_id, request_id`;
  for (const i of items) if (i.hold_id) await reverseHold(c.org_id, i.hold_id, text.message, "system", requestId);
  const touched = await sql()<{ request_id: string }[]>`select distinct request_id from public.check_items where consent_id = ${c.id}`;
  const { refreshReport } = await import("@/server/checks/service");
  for (const r of touched) await refreshReport(r.request_id);
}

async function startWaiting(c: ConsentRow) {
  const items = await sql()<{ id: string; run_mode: "together" | "manual" }[]>`
    select i.id, r.run_mode from public.check_items i join public.check_requests r on r.id = i.request_id
     where i.consent_id = ${c.id} and i.status = 'waiting_consent'`;
  for (const i of items) {
    if (i.run_mode === "together") {
      const [moved] = await sql()`update public.check_items set status = 'queued' where id = ${i.id} and status = 'waiting_consent' returning id`;
      if (moved) await enqueue("checks.run_item", { itemId: i.id }, { orgId: c.org_id, dedupeKey: `checks.run_item:${i.id}` });
    } else {
      await sql()`update public.check_items set status = 'ready' where id = ${i.id} and status = 'waiting_consent'`;
    }
  }
}

/** Job consent.expire (and on first look after 72 hours): no reply, so the request ends and nothing is charged. */
export async function expireConsent(consentId: string) {
  const [c] = await sql()<ConsentRow[]>`
    update public.consent_requests set status = 'expired', expired_at = now()
     where id = ${consentId} and status = 'pending' and expires_at <= now() returning ${cols()}`;
  if (!c) return false;
  const who = systemActor(`consent-expire:${c.id}`, c.org_id);
  await recordEvent(c, "expired", {});
  await cancelWaiting(c, "expired", who.requestId);
  await audit(who, { action: "consent.expired", entity: "consent_request", entityId: c.id });
  return true;
}

/** Job consent.remind: one reminder 24 hours after sending, only while the buyer has not answered (FR-CON-07). */
export async function remindConsent(consentId: string) {
  const [c] = await sql()<ConsentRow[]>`
    update public.consent_requests set reminded_at = now()
     where id = ${consentId} and status = 'pending' and reminded_at is null and expires_at > now() returning ${cols()}`;
  if (!c) return false;
  await sendLink(c, true);
  await recordEvent(c, "reminded", {}, { expiresAt: c.expires_at });
  return true;
}

/** The requester sends the link again (v3 15). At most once an hour; the 72 hours do not restart. */
export async function resendConsent(ctx: Ctx, requestId: string, consentId: string) {
  const [c] = await sql()<ConsentRow[]>`
    select ${cols()} from public.consent_requests
     where id = ${consentId} and org_id = ${ctx.orgId}
       and id in (select consent_id from public.check_items where request_id = ${requestId})`;
  if (!c) throw notFound("This consent request");
  if (c.status !== "pending" || c.expires_at <= new Date()) throw new AppError("conflict", "This request is no longer waiting for an answer.");
  const [recent] = await sql()`
    select 1 from app_private.consent_events
     where consent_id = ${c.id} and kind in ('sent', 'reminded') and at > now() - interval '1 hour' limit 1`;
  if (recent) throw new AppError("rate_limited", "The link was sent less than an hour ago. Please try again later.");
  await sendLink(c, true);
  await recordEvent(c, "reminded", ctx, { expiresAt: c.expires_at, detail: { by: "requester" } });
  await audit(ctx, { action: "consent.resent", entity: "consent_request", entityId: c.id });
  return { sent: true };
}

/** For a consent check about to run: is the consent still good, and what the buyer gave. */
export async function consentAccessFor(consentId: string): Promise<{ status: ConsentStatus; access: ConsentAccess }> {
  const [r] = await sql()<{ status: ConsentStatus; gst_token_ciphertext: string | null; gst_token_expires_at: Date | null; bureau_ciphertext: string | null }[]>`
    select c.status, p.gst_token_ciphertext, p.gst_token_expires_at, p.bureau_ciphertext
      from public.consent_requests c left join app_private.consent_private p on p.consent_id = c.id where c.id = ${consentId}`;
  if (!r) return { status: "withdrawn", access: emptyAccess() };
  const bureau = r.bureau_ciphertext ? (JSON.parse(decryptField(r.bureau_ciphertext, "consent.bureau")) as Partial<ConsentAccess>) : {};
  const tokenLive = r.gst_token_ciphertext && r.gst_token_expires_at && r.gst_token_expires_at > new Date();
  return {
    status: r.status,
    access: {
      gstToken: tokenLive ? decryptField(r.gst_token_ciphertext!, "consent.gst_token") : null,
      companyPan: bureau.companyPan ?? null,
      incorporatedOn: bureau.incorporatedOn ?? null,
      personalPan: bureau.personalPan ?? null,
      birthDate: bureau.birthDate ?? null,
    },
  };
}

const emptyAccess = (): ConsentAccess => ({ gstToken: null, companyPan: null, incorporatedOn: null, personalPan: null, birthDate: null });

/** FR-CON-04 "access logged": every use of what the buyer gave is written to the consent record. */
export async function logDataFetched(consentId: string, code: string, ok: boolean) {
  const [c] = await sql()<ConsentRow[]>`select ${cols()} from public.consent_requests where id = ${consentId}`;
  if (c) await recordEvent(c, "data_fetched", {}, { detail: { item: code, ok } });
}

// ---------------------------------------------------------------- S10: the buyer's page

export interface ConsentPageView {
  status: ConsentStatus;
  /** "person": the owner or director asked only for their personal CIBIL. */
  subjectKind: "buyer" | "person";
  subjectName: string | null;
  requester: { name: string; contactName: string | null; contactPhone: string | null };
  buyerName: string;
  purpose: ConsentPurpose;
  scope: string[];
  mobileMasked: string;
  expiresAt: string;
  approvedAt: string | null;
  declinedAt: string | null;
  withdrawnAt: string | null;
  visibleUntil: string | null;
  needs: { gst: boolean; companyBureau: boolean; personalBureau: boolean };
  /** PAN on the requester's record, masked, so the buyer knows which one is meant. */
  panHint: { company: string | null; personal: string | null };
  verified: boolean;
  gstVerified: boolean;
  testMode: boolean;
}

const formatPhone = (phone: string | null) => {
  const d = phone?.replace(/\D/g, "").slice(-10);
  return d && d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : null;
};

export async function consentPage(token: string, who: Visitor): Promise<ConsentPageView | null> {
  const c = await byToken(token);
  if (!c) return null;
  const db = sql();
  const [[info], [priv], opened, requester] = await Promise.all([
    db<{ buyer_name: string; type: string; gstin: string | null; pan_ciphertext: string | null }[]>`
      select cp.legal_name as buyer_name, cp.type::text as type, cp.gstin, cp.pan_ciphertext
        from public.counterparties cp where cp.id = ${c.counterparty_id}`,
    db<{ gst_verified_at: Date | null; subject_ciphertext: string | null }[]>`
      select gst_verified_at, subject_ciphertext from app_private.consent_private where consent_id = ${c.id}`,
    db`select 1 from app_private.consent_events where consent_id = ${c.id} and kind = 'opened' limit 1`,
    requesterOf(c.org_id, c.created_by),
  ]);
  if (!opened.length) await recordEvent(c, "opened", who);
  const pan = info.pan_ciphertext ? decryptField(info.pan_ciphertext, "counterparties.pan") : info.gstin ? panFromGstin(info.gstin) : null;
  const expected = priv?.subject_ciphertext ? (JSON.parse(decryptField(priv.subject_ciphertext, "consent.subject")) as { pan: string }) : null;
  const mask = (p: string) => `${p.slice(0, 5)}••••${p.slice(-1)}`;
  return {
    status: c.status,
    subjectKind: c.subject_kind,
    subjectName: c.subject_name,
    requester: { name: requester.name, contactName: requester.contactName, contactPhone: formatPhone(requester.phone) },
    buyerName: info.buyer_name,
    purpose: c.purpose,
    scope: c.scope,
    mobileMasked: c.mobile_masked,
    expiresAt: c.expires_at.toISOString(),
    approvedAt: c.approved_at?.toISOString() ?? null,
    declinedAt: c.declined_at?.toISOString() ?? null,
    withdrawnAt: c.withdrawn_at?.toISOString() ?? null,
    visibleUntil: c.visible_until?.toISOString() ?? null,
    needs: { gst: needsGst(c.scope), companyBureau: needsCompanyBureau(c.scope), personalBureau: needsPersonalBureau(c.scope) },
    panHint: {
      company: pan && info.type !== "individual" ? mask(pan) : null,
      personal: expected?.pan ? mask(expected.pan) : null,
    },
    verified: await isVerified(c.id),
    gstVerified: Boolean(priv?.gst_verified_at),
    testMode: otpSender().isMock,
  };
}

function assertOpen(c: ConsentRow, allowed: ConsentStatus[]) {
  if (allowed.includes(c.status)) return;
  const msg: Record<ConsentStatus, string> = {
    pending: "This request is still waiting for your answer.",
    approved: "You have already said yes to this request.",
    declined: "You said no to this request.",
    expired: "This request has expired.",
    withdrawn: "You have withdrawn this consent.",
  };
  throw new AppError("conflict", msg[c.status]);
}

/** S10 marker 3: OTP to the mobile the requester entered. Also used before a withdrawal. */
export async function sendConsentOtp(token: string) {
  const c = await mustByToken(token);
  assertOpen(c, ["pending", "approved"]);
  const db = sql();
  const sends = await db<{ sent_at: Date }[]>`
    select sent_at from app_private.consent_otps
     where consent_id = ${c.id} and kind = 'mobile' and sent_at > now() - interval '1 hour' order by sent_at`;
  const last = sends.at(-1)?.sent_at;
  if (last && Date.now() - last.getTime() < CONSENT_RULES.resendAfterMs) {
    throw new AppError("rate_limited", "Please wait a few seconds before asking for a new code.");
  }
  if (sends.length >= CONSENT_RULES.otpSendsPerHour) {
    const at = new Date(sends[sends.length - CONSENT_RULES.otpSendsPerHour].sent_at.getTime() + 3600_000);
    throw new AppError("rate_limited", `Too many codes asked for. Try again after ${formatDateTimeIst(at)}.`);
  }
  const requester = await requesterOf(c.org_id, c.created_by);
  const sent = await otpSender().send({ mobile10: decryptField(c.mobile_ciphertext, "consent.mobile"), purpose: "consent", requester: requester.name });
  const expiresAt = new Date(Date.now() + CONSENT_RULES.otpMs);
  await db`
    insert into app_private.consent_otps (consent_id, kind, code_hash, ref, expires_at)
    values (${c.id}, 'mobile', ${codeHash(c.id, sent.code)}, ${sent.ref}, ${expiresAt})`;
  return { sentTo: c.mobile_masked, expiresAt: expiresAt.toISOString(), resendAfterSeconds: CONSENT_RULES.resendAfterMs / 1000 };
}

export async function verifyConsentOtp(token: string, code: string, who: Visitor) {
  const c = await mustByToken(token);
  assertOpen(c, ["pending", "approved"]);
  const db = sql();
  const [otp] = await db<{ id: string; code_hash: string; ref: string; expires_at: Date; attempts: number }[]>`
    select id, code_hash, ref, expires_at, attempts from app_private.consent_otps
     where consent_id = ${c.id} and kind = 'mobile' and verified_at is null order by sent_at desc limit 1`;
  if (!otp || otp.expires_at <= new Date()) throw new AppError("validation_failed", "This code has expired.", { otp: "This code has expired. Send a new one." });
  if (otp.attempts >= CONSENT_RULES.otpAttempts) throw new AppError("validation_failed", "Too many wrong codes.", { otp: "Too many wrong codes. Send a new one." });
  if (!safeEqual(otp.code_hash, codeHash(c.id, code))) {
    const [{ attempts }] = await db<{ attempts: number }[]>`update app_private.consent_otps set attempts = attempts + 1 where id = ${otp.id} returning attempts`;
    const left = CONSENT_RULES.otpAttempts - attempts;
    throw new AppError("validation_failed", "The OTP is incorrect.", {
      otp: left > 0 ? `The OTP is incorrect. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Send a new one.",
    });
  }
  await db`update app_private.consent_otps set verified_at = now() where id = ${otp.id}`;
  await recordEvent(c, "otp_verified", who, { otpRef: otp.ref });
  await markVerified(c.id);
  return { verified: true };
}

const GSP_MESSAGES: Record<GspError, string> = {
  API_ACCESS_OFF: "API access is not turned on for this GST username. On the GST portal open My Profile, then Manage API Access, choose Yes, and try again.",
  USER_NOT_FOUND: "The GST portal does not know this username. Enter it exactly as you use it to log in.",
  INVALID_OTP: "GST portal did not accept this OTP. Check API access is enabled and try again.",
  OTP_EXPIRED: "This GST portal OTP has expired. Ask for a new one.",
  PROVIDER_DOWN: "The GST portal is not answering right now. Please try again in a few minutes.",
};

/** S10 marker 4: the buyer's GST username; GSTN then sends its own OTP. */
export async function requestGstOtp(token: string, username: string) {
  const c = await mustByToken(token);
  assertOpen(c, ["pending"]);
  await requireVerified(c);
  if (!needsGst(c.scope)) throw new AppError("bad_request", "GST data is not part of this request.");
  const name = username.trim();
  if (!/^[A-Za-z0-9._@-]{3,60}$/.test(name)) {
    throw new AppError("validation_failed", "Enter your GST portal username.", { gstUsername: "Enter your GST portal username." });
  }
  const db = sql();
  const [cp] = await db<{ gstin: string | null }[]>`select gstin from public.counterparties where id = ${c.counterparty_id}`;
  if (!cp?.gstin) throw new AppError("conflict", "This business has no GSTIN on the request.");
  const recent = await db<{ n: number }[]>`
    select count(*)::int as n from app_private.consent_otps where consent_id = ${c.id} and kind = 'gstn' and sent_at > now() - interval '1 hour'`;
  if (recent[0].n >= CONSENT_RULES.otpSendsPerHour) throw new AppError("rate_limited", "Too many GST portal codes asked for. Please try again in an hour.");
  const res = await gspProvider().requestOtp({ gstin: cp.gstin, username: name });
  if (!res.ok) {
    throw new AppError(res.error === "PROVIDER_DOWN" ? "unavailable" : "validation_failed", GSP_MESSAGES[res.error],
      res.error === "PROVIDER_DOWN" ? undefined : { gstUsername: GSP_MESSAGES[res.error] });
  }
  await db`
    insert into app_private.consent_otps (consent_id, kind, ref, expires_at)
    values (${c.id}, 'gstn', ${res.ref}, now() + interval '10 minutes')`;
  await db`
    insert into app_private.consent_private (consent_id, gst_username_ciphertext) values (${c.id}, ${encryptField(name, "consent.gst_username")})
    on conflict (consent_id) do update set gst_username_ciphertext = excluded.gst_username_ciphertext, updated_at = now()`;
  return { sent: true };
}

export async function verifyGstOtp(token: string, otpCode: string, who: Visitor) {
  const c = await mustByToken(token);
  assertOpen(c, ["pending"]);
  await requireVerified(c);
  const db = sql();
  const [otp] = await db<{ id: string; ref: string; expires_at: Date; attempts: number }[]>`
    select id, ref, expires_at, attempts from app_private.consent_otps
     where consent_id = ${c.id} and kind = 'gstn' and verified_at is null order by sent_at desc limit 1`;
  const [priv] = await db<{ gst_username_ciphertext: string | null }[]>`select gst_username_ciphertext from app_private.consent_private where consent_id = ${c.id}`;
  const [cp] = await db<{ gstin: string }[]>`select gstin from public.counterparties where id = ${c.counterparty_id}`;
  if (!otp || !priv?.gst_username_ciphertext) throw new AppError("conflict", "Enter your GST username and ask for the GST portal OTP first.");
  if (otp.expires_at <= new Date()) throw new AppError("validation_failed", GSP_MESSAGES.OTP_EXPIRED, { gstOtp: GSP_MESSAGES.OTP_EXPIRED });
  if (otp.attempts >= CONSENT_RULES.otpAttempts) throw new AppError("validation_failed", "Too many wrong codes.", { gstOtp: "Too many wrong codes. Ask the GST portal for a new OTP." });
  const res = await gspProvider().verifyOtp({ gstin: cp.gstin, username: decryptField(priv.gst_username_ciphertext, "consent.gst_username"), ref: otp.ref, otp: otpCode });
  if (!res.ok) {
    await db`update app_private.consent_otps set attempts = attempts + 1 where id = ${otp.id}`;
    throw new AppError(res.error === "PROVIDER_DOWN" ? "unavailable" : "validation_failed", GSP_MESSAGES[res.error], { gstOtp: GSP_MESSAGES[res.error] });
  }
  await db`update app_private.consent_otps set verified_at = now() where id = ${otp.id}`;
  await db`
    update app_private.consent_private
       set gst_token_ciphertext = ${encryptField(res.token, "consent.gst_token")}, gst_token_expires_at = ${res.expiresAt},
           gst_verified_at = now(), updated_at = now()
     where consent_id = ${c.id}`;
  await recordEvent(c, "gst_verified", who, { otpRef: otp.ref, expiresAt: res.expiresAt });
  return { verified: true };
}

export interface ApproveInput {
  agree: true;
  companyPan?: string;
  incorporatedOn?: string;
  personalPan?: string;
  birthDate?: string;
}

/** S10 marker 6: approve after the OTP, GST access (when asked) and the consent box. */
export async function approveConsent(token: string, input: ApproveInput, who: Visitor) {
  const c = await mustByToken(token);
  assertOpen(c, ["pending"]);
  await requireVerified(c);
  const db = sql();
  const [priv] = await db<{ gst_verified_at: Date | null }[]>`select gst_verified_at from app_private.consent_private where consent_id = ${c.id}`;
  if (needsGst(c.scope) && !priv?.gst_verified_at) {
    throw new AppError("validation_failed", "Please finish the GST portal step first.", { gstOtp: "Please finish the GST portal step first." });
  }
  const bureau = await bureauDetails(c, input);
  const [done] = await db<ConsentRow[]>`
    update public.consent_requests set status = 'approved', approved_at = now(), visible_until = now() + ${`${CONSENT_RULES.visibleMs / 1000} seconds`}::interval
     where id = ${c.id} and status = 'pending' and expires_at > now() returning ${cols()}`;
  if (!done) throw new AppError("conflict", "This request is no longer open.");
  if (bureau) {
    await db`
      insert into app_private.consent_private (consent_id, bureau_ciphertext) values (${c.id}, ${encryptField(JSON.stringify(bureau), "consent.bureau")})
      on conflict (consent_id) do update set bureau_ciphertext = excluded.bureau_ciphertext, updated_at = now()`;
  }
  const [otp] = await db<{ ref: string }[]>`
    select ref from app_private.consent_otps where consent_id = ${c.id} and kind = 'mobile' and verified_at is not null order by verified_at desc limit 1`;
  await recordEvent(done, "approved", who, { otpRef: otp?.ref ?? null, expiresAt: done.visible_until, detail: { consentText: "v0.1-draft" } });
  await audit(buyerActor(done, who), {
    action: "consent.approved", entity: "consent_request", entityId: c.id,
    after: { scope: done.scope, purpose: done.purpose, visibleUntil: done.visible_until?.toISOString() },
  });
  await startWaiting(done);
  const { refreshReport } = await import("@/server/checks/service");
  await refreshReport(done.check_request_id);
  return { status: "approved" as const };
}

async function bureauDetails(c: ConsentRow, input: ApproveInput) {
  const company = needsCompanyBureau(c.scope);
  const personal = needsPersonalBureau(c.scope);
  if (!company && !personal) return null;
  const [cp] = await sql()<{ type: string; gstin: string | null; pan_ciphertext: string | null }[]>`
    select type::text as type, gstin, pan_ciphertext from public.counterparties where id = ${c.counterparty_id}`;
  const recordPan = cp.pan_ciphertext ? decryptField(cp.pan_ciphertext, "counterparties.pan") : cp.gstin ? panFromGstin(cp.gstin) : null;
  const today = istDate(new Date());
  const fields: Record<string, string> = {};
  const out: Partial<ConsentAccess> = {};
  const validDate = (d?: string) => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && d <= today && d >= "1900-01-01");

  if (company) {
    const pan = normaliseIdentifier(input.companyPan ?? "");
    if (!isValidPan(pan)) fields.companyPan = "Enter the company PAN.";
    else if (recordPan && cp.type !== "individual" && pan !== recordPan) fields.companyPan = "This PAN does not match the one on the request. Please contact the business that sent it.";
    if (!validDate(input.incorporatedOn)) fields.incorporatedOn = "Enter a valid date.";
    out.companyPan = pan;
    out.incorporatedOn = input.incorporatedOn ?? null;
  }
  if (personal) {
    const pan = normaliseIdentifier(input.personalPan ?? "");
    const [priv] = await sql()<{ subject_ciphertext: string | null }[]>`select subject_ciphertext from app_private.consent_private where consent_id = ${c.id}`;
    const expected = priv?.subject_ciphertext ? (JSON.parse(decryptField(priv.subject_ciphertext, "consent.subject")) as { pan: string; birthDate: string }) : null;
    const mismatch = "This does not match the details on the request. Please contact the business that sent it.";
    if (!isValidPan(pan) || !isIndividualPan(pan)) fields.personalPan = "Enter a personal PAN (the fourth letter is P).";
    else if (expected && pan !== expected.pan) fields.personalPan = mismatch;
    else if (!expected && recordPan && cp.type === "individual" && pan !== recordPan) fields.personalPan = mismatch;
    if (!validDate(input.birthDate)) fields.birthDate = "Enter a valid date.";
    else if (expected && input.birthDate !== expected.birthDate) fields.birthDate = mismatch;
    else if (ageOn(input.birthDate!, today) < 18) fields.birthDate = "The person must be 18 or older.";
    out.personalPan = pan;
    out.birthDate = input.birthDate ?? null;
  }
  if (Object.keys(fields).length) throw new AppError("validation_failed", "Please check the highlighted fields.", fields);
  return out;
}

/** S10: declining is one tap (with one confirmation on the page). No reason is asked. */
export async function declineConsent(token: string, who: Visitor) {
  const c = await mustByToken(token);
  assertOpen(c, ["pending"]);
  const [done] = await sql()<ConsentRow[]>`
    update public.consent_requests set status = 'declined', declined_at = now() where id = ${c.id} and status = 'pending' returning ${cols()}`;
  if (!done) throw new AppError("conflict", "This request is no longer open.");
  await recordEvent(done, "declined", who);
  await audit(buyerActor(done, who), { action: "consent.declined", entity: "consent_request", entityId: c.id });
  await cancelWaiting(done, "declined", who.requestId);
  return { status: "declined" as const };
}

/** S10 / FR-CON-06: withdraw after the OTP. Fetched data stays stored but leaves the requester's view at once. */
export async function withdrawConsent(token: string, who: Visitor) {
  const c = await mustByToken(token);
  assertOpen(c, ["approved"]);
  await requireVerified(c);
  const [done] = await sql()<ConsentRow[]>`
    update public.consent_requests set status = 'withdrawn', withdrawn_at = now() where id = ${c.id} and status = 'approved' returning ${cols()}`;
  if (!done) throw new AppError("conflict", "This consent is no longer active.");
  await recordEvent(done, "withdrawn", who);
  await audit(buyerActor(done, who), { action: "consent.withdrawn", entity: "consent_request", entityId: c.id });
  await cancelWaiting(done, "withdrawn", who.requestId);
  return { status: "withdrawn" as const };
}

// ---------------------------------------------------------------- report side

export interface ConsentOnReport {
  id: string;
  status: ConsentStatus;
  scope: string[];
  channels: ConsentChannel[];
  purpose: ConsentPurpose;
  mobileMasked: string;
  sentAt: string;
  expiresAt: string;
  remindedAt: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  withdrawnAt: string | null;
  visibleUntil: string | null;
  /** Asked for an earlier report and used again (S09). */
  reused: boolean;
  subjectKind: "buyer" | "person";
  subjectName: string | null;
}

export async function consentsForRequest(orgId: string, requestId: string): Promise<ConsentOnReport[]> {
  const rows = await sql()<(Omit<ConsentRow, "token_ciphertext" | "mobile_ciphertext" | "link_base"> & { check_request_id: string })[]>`
    select c.id, c.status, c.scope, c.channels, c.purpose, c.mobile_masked, c.created_at, c.expires_at, c.reminded_at, c.approved_at,
           c.declined_at, c.withdrawn_at, c.visible_until, c.check_request_id, c.subject_kind, c.subject_name
      from public.consent_requests c
     where c.org_id = ${orgId}
       and c.id in (select consent_id from public.check_items where request_id = ${requestId} and consent_id is not null)
     order by c.created_at`;
  return rows.map((c) => ({
    id: c.id, status: c.status, scope: c.scope, channels: c.channels, purpose: c.purpose, mobileMasked: c.mobile_masked,
    sentAt: c.created_at.toISOString(), expiresAt: c.expires_at.toISOString(), remindedAt: c.reminded_at?.toISOString() ?? null,
    approvedAt: c.approved_at?.toISOString() ?? null, declinedAt: c.declined_at?.toISOString() ?? null,
    withdrawnAt: c.withdrawn_at?.toISOString() ?? null, visibleUntil: c.visible_until?.toISOString() ?? null,
    reused: c.check_request_id !== requestId,
    subjectKind: c.subject_kind,
    subjectName: c.subject_name,
  }));
}
