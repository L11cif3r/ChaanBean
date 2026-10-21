import "server-only";
import crypto from "node:crypto";
import type { JSONValue } from "postgres";
import { maskEmail, maskMobile } from "@/lib/mask";
import { isValidGstin, isValidPan, normaliseIdentifier, panFromGstin, panHolderType } from "@/lib/validators";
import { audit } from "@/server/audit";
import { blindIndex, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError } from "@/server/errors";
import { enqueue } from "@/server/jobs/runner";
import { queueMessage } from "@/server/outbox";
import { identityProvider, type GstTaxpayer, type PanResult } from "@/server/providers/identity";
import { CONSTITUTION_BY_PAN_TYPE, GST_STATES } from "@/server/providers/identity/states";
import type { RequestContext } from "@/server/context";

// Business verification and organisation creation (PRD S02, FR-ORG-01–05).

export const LEGAL_VERSIONS = { terms: "v0.1-draft", privacy: "v0.1-draft", authority: "v1" } as const;

export type GstLookupState = "active" | "cancelled" | "suspended" | "not_found" | "provider_unavailable" | "already_registered";

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]> };

export async function lookupGstin(ctx: Ctx, raw: string) {
  const gstin = normaliseIdentifier(raw);
  if (!isValidGstin(gstin)) throw new AppError("validation_failed", "Please check the GSTIN.", { gstin: "This GSTIN is not valid. Check and try again." });

  const [existing] = await sql()`select id from public.organisations where gstin = ${gstin}`;
  if (existing) return { state: "already_registered" as const, gstin };

  const provider = identityProvider();
  const result = await provider.searchGstin(gstin);
  const state: GstLookupState =
    result.status === "not_available" || result.status === "failed"
      ? "provider_unavailable"
      : result.status === "no_data"
        ? "not_found"
        : result.data!.status === "Active"
          ? "active"
          : result.data!.status === "Cancelled"
            ? "cancelled"
            : "suspended";

  const [row] = await sql()<{ id: string }[]>`
    insert into app_private.identity_lookups (kind, identifier, status, result, provider, requested_by)
    values ('gstin', ${gstin}, ${state}, ${result.data ? sql().json(result.data as unknown as JSONValue) : null}::jsonb,
            ${result.provider}, ${ctx.user.id})
    returning id`;
  return { state, gstin, lookupId: row.id, details: result.data ?? null, sampleData: provider.isMock };
}

export async function verifyPan(ctx: Ctx, rawPan: string, name: string) {
  const pan = normaliseIdentifier(rawPan);
  if (!isValidPan(pan)) throw new AppError("validation_failed", "Please check the PAN.", { pan: "This PAN is not valid." });
  const [existing] = await sql()`select id from public.organisations where pan_hash = ${blindIndex(pan, "pan")} and gstin is null`;
  if (existing) return { state: "already_registered" as const };

  const provider = identityProvider();
  const result = await provider.verifyPan(pan, name);
  if (result.status === "no_data") {
    throw new AppError("validation_failed", "Please check the PAN.", { pan: "PAN not found at source. Check the PAN and try again." });
  }
  if (result.status !== "success" || !result.data) {
    throw new AppError("unavailable", "PAN verification is not available right now. Please try again in a few minutes.");
  }
  if (!result.data.nameMatches) {
    throw new AppError("validation_failed", "Please check the name.", { panName: "The name does not match the PAN records." });
  }
  const [row] = await sql()<{ id: string }[]>`
    insert into app_private.identity_lookups (kind, identifier, status, result, provider, requested_by)
    values ('pan', ${pan}, 'verified', ${sql().json(result.data as unknown as JSONValue)}::jsonb, ${result.provider}, ${ctx.user.id})
    returning id`;
  return { state: "verified" as const, lookupId: row.id, details: result.data, sampleData: provider.isMock };
}

// ---------------------------------------------------------------- documents for manual review

const ALLOWED: { type: string; ext: string; magic: number[] }[] = [
  { type: "application/pdf", ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  { type: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Stores a GST certificate or PAN card for manual review. The type is checked from the file's bytes, not its name. */
export async function storeOnboardingDocument(ctx: Ctx, file: File) {
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("validation_failed", "File too large.", { file: "File type or size not allowed." });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = ALLOWED.find((a) => a.magic.every((b, i) => bytes[i] === b));
  if (!kind) throw new AppError("validation_failed", "File type not allowed.", { file: "File type or size not allowed." });
  const path = `onboarding/${ctx.user.id}/${crypto.randomUUID()}.${kind.ext}`;
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");
  await sql()`
    insert into app_private.stored_objects (bucket, path, content_type, bytes, sha256)
    values ('uploads', ${path}, ${kind.type}, ${Buffer.from(bytes)}, ${sha})`;
  return { documentRef: `uploads/${path}`, name: file.name.slice(0, 120) };
}

// ---------------------------------------------------------------- create the organisation

export interface ProfileInput {
  fullName: string;
  designation: string;
  workEmail: string;
}

export interface ManualDetails {
  legalName: string;
  addressLine: string;
  city: string;
  pincode: string;
}

export interface CompleteInput {
  method: "gstin" | "pan";
  lookupId: string;
  businessName?: string;
  manual?: ManualDetails;
  documentRef?: string;
  documentName?: string;
  profile: ProfileInput;
}

async function loadLookup(ctx: Ctx, id: string) {
  const [row] = await sql()<{ kind: string; identifier: string; status: string; result: unknown; expired: boolean }[]>`
    select kind, identifier, status, result, expires_at < now() as expired
      from app_private.identity_lookups where id = ${id} and requested_by = ${ctx.user.id}`;
  if (!row) throw new AppError("not_found", "This verification was not found. Please look up the business again.");
  if (row.expired) throw new AppError("conflict", "This verification has expired. Please look up the business again.");
  return row;
}

export async function completeOnboarding(ctx: Ctx, input: CompleteInput, origin: string) {
  const lookup = await loadLookup(ctx, input.lookupId);
  if (lookup.kind !== input.method) throw new AppError("bad_request", "The verification does not match the chosen method.");

  let org: {
    legalName: string; tradeName: string | null; gstin: string | null; pan: string; constitution: string | null;
    stateCode: string | null; address: Record<string, string> | null;
    verification: "gstin_verified" | "pan_verified" | "manual_review" | "unverified";
    status: "active" | "pending_verification";
  };
  let review: { reason: string } | null = null;
  let retryVerification = false;

  if (input.method === "gstin") {
    const gstin = lookup.identifier;
    const pan = panFromGstin(gstin);
    const details = lookup.result as GstTaxpayer | null;
    const state = lookup.status as GstLookupState;
    if (state === "active" && details) {
      org = {
        legalName: details.legalName, tradeName: details.tradeName, gstin, pan, constitution: details.constitution,
        stateCode: details.stateCode, address: details.address, verification: "gstin_verified", status: "active",
      };
    } else if ((state === "cancelled" || state === "suspended" || state === "not_found")) {
      if (!input.documentRef?.startsWith(`uploads/onboarding/${ctx.user.id}/`)) {
        throw new AppError("validation_failed", "Please upload a document.", { file: "Upload your GST certificate for manual review." });
      }
      const legalName = details?.legalName ?? input.manual?.legalName;
      if (!legalName) throw new AppError("validation_failed", "Please enter the legal name.", { legalName: "Enter the legal name." });
      org = {
        legalName, tradeName: details?.tradeName ?? null, gstin, pan, constitution: details?.constitution ?? null,
        stateCode: gstin.slice(0, 2), address: details?.address ?? manualAddress(input.manual, gstin.slice(0, 2)),
        verification: "manual_review", status: "pending_verification",
      };
      review = { reason: state === "not_found" ? "gstin_not_found" : `gstin_${state}` };
    } else if (state === "provider_unavailable") {
      if (!input.manual) throw new AppError("validation_failed", "Please enter the business details.", { legalName: "Enter the legal name." });
      const stateCode = gstin.slice(0, 2);
      org = {
        legalName: input.manual.legalName, tradeName: null, gstin, pan, constitution: CONSTITUTION_BY_PAN_TYPE[panHolderType(pan) ?? ""] ?? null,
        stateCode, address: manualAddress(input.manual, stateCode), verification: "unverified", status: "pending_verification",
      };
      retryVerification = true;
    } else {
      throw new AppError("conflict", "This business already has an account. Ask its Owner to invite you.");
    }
  } else {
    const details = lookup.result as PanResult;
    if (!input.businessName || !input.manual) {
      throw new AppError("validation_failed", "Please enter the business details.", { businessName: "Enter the legal name." });
    }
    org = {
      legalName: input.businessName, tradeName: null, gstin: null, pan: details.pan, constitution: details.holderType,
      stateCode: null, address: manualAddress(input.manual, null), verification: "pan_verified", status: "active",
    };
  }

  let orgId: string;
  try {
    const [row] = await sql()<{ id: string }[]>`
      select app_private.create_organisation(
        ${ctx.user.id}::uuid, ${org.legalName}, ${org.tradeName}, ${org.gstin}, ${blindIndex(org.pan, "pan")},
        ${encryptField(org.pan, "organisations.pan")}, ${org.constitution}, ${org.stateCode},
        ${org.address ? sql().json(org.address) : null}::jsonb, ${input.method},
        ${org.verification}::public.org_verification, ${org.status}::public.org_status,
        ${input.profile.fullName}, ${input.profile.designation}, ${input.profile.workEmail.toLowerCase()},
        ${LEGAL_VERSIONS.terms}, ${LEGAL_VERSIONS.privacy}, ${LEGAL_VERSIONS.authority},
        ${ctx.ip}::inet, ${ctx.userAgent}, ${ctx.requestId}
      ) as id`;
    orgId = row.id;
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/GSTIN_ALREADY_REGISTERED|PAN_ALREADY_REGISTERED|organisations_gstin_key/.test(message)) {
      throw new AppError("conflict", "This business already has an account. Ask its Owner to invite you.");
    }
    throw e;
  }

  if (review) {
    await sql()`
      insert into public.manual_reviews (org_id, submitted_by, reason, document_ref, document_name)
      values (${orgId}, ${ctx.user.id}, ${review.reason}, ${input.documentRef!}, ${input.documentName ?? null})`;
    await audit({ ...ctx, orgId }, { action: "organisation.manual_review_requested", entity: "organisation", entityId: orgId, after: review });
  }
  if (retryVerification) {
    await enqueue("onboarding.verify_gstin", { orgId, gstin: org.gstin! }, { orgId, maxAttempts: 10, dedupeKey: `verify-gstin-${orgId}` });
  }
  await sendEmailVerification(ctx.user.id, input.profile.workEmail, orgId, origin);

  return { orgId, status: org.status, verification: org.verification };
}

function manualAddress(m: ManualDetails | undefined, stateCode: string | null) {
  if (!m) return null;
  return { line: m.addressLine, city: m.city, state: stateCode ? GST_STATES[stateCode] ?? "" : "", pincode: m.pincode };
}

// ---------------------------------------------------------------- work email verification (S02 marker 6)

const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function sendEmailVerification(userId: string, email: string, orgId: string | null, origin: string) {
  const token = crypto.randomBytes(24).toString("base64url");
  await sql()`
    insert into app_private.email_verifications (token_hash, user_id, email, expires_at)
    values (${tokenHash(token)}, ${userId}, ${email.toLowerCase()}, now() + interval '7 days')`;
  await queueMessage({
    orgId,
    channel: "email",
    recipientMasked: maskEmail(email),
    to: email,
    template: "email_verification",
    subject: "Confirm your work email for Chaanbean",
    body: `Confirm your work email for Chaanbean: ${origin}/verify-email?token=${token}\nThe link is valid for 7 days.`,
  });
}

export async function confirmEmail(token: string) {
  const [row] = await sql()<{ user_id: string; email: string }[]>`
    update app_private.email_verifications set verified_at = now()
     where token_hash = ${tokenHash(token)} and verified_at is null and expires_at > now()
    returning user_id, email`;
  if (!row) throw new AppError("not_found", "This link has expired or was already used.");
  await sql()`update public.user_profiles set email_verified_at = now() where id = ${row.user_id} and email = ${row.email}`;
  return { email: maskEmail(row.email) };
}

// ---------------------------------------------------------------- request access to an existing organisation

export async function requestAccess(ctx: Ctx, rawGstin: string, requesterName: string) {
  const gstin = normaliseIdentifier(rawGstin);
  const [org] = await sql()<{ id: string; legal_name: string }[]>`select id, legal_name from public.organisations where gstin = ${gstin}`;
  if (!org) throw new AppError("not_found", "No business with this GSTIN is registered.");
  const rows = await sql()`
    insert into public.access_requests (org_id, requester_id, requester_name)
    values (${org.id}, ${ctx.user.id}, ${requesterName})
    on conflict (org_id, requester_id) where status = 'pending' do nothing
    returning id`;
  if (rows.length) {
    const owners = await sql()<{ email: string | null; phone: string | null }[]>`
      select p.email, u.phone from public.memberships m
        join auth.users u on u.id = m.user_id
        left join public.user_profiles p on p.id = m.user_id
       where m.org_id = ${org.id} and m.status = 'active' and m.role in ('owner', 'admin')`;
    const who = `${requesterName}${ctx.user.phone ? ` (${maskMobile(ctx.user.phone)})` : ""}`;
    for (const o of owners) {
      await queueMessage({
        orgId: org.id,
        channel: o.email ? "email" : "sms",
        recipientMasked: o.email ? maskEmail(o.email) : maskMobile(o.phone ?? ""),
        to: o.email ?? o.phone?.slice(-10) ?? undefined,
        template: "access_request",
        subject: `${requesterName} asked to join ${org.legal_name} on Chaanbean`,
        body: `${who} asked to join ${org.legal_name} on Chaanbean. Open Team and roles to invite them or decline.`,
      });
    }
    await audit({ ...ctx, orgId: org.id }, { action: "organisation.access_requested", entity: "organisation", entityId: org.id, after: { requester: ctx.user.id } });
  }
  return { requested: true };
}
