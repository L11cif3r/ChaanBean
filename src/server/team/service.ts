import "server-only";
import crypto from "node:crypto";
import { maskEmail, maskMobile } from "@/lib/mask";
import { normaliseMobile } from "@/lib/validators";
import type { Role } from "@/lib/permissions";
import { audit } from "@/server/audit";
import { blindIndex, decryptField, encryptField } from "@/server/crypto";
import { sql } from "@/server/db/sql";
import { AppError } from "@/server/errors";
import { queueMessage } from "@/server/outbox";
import type { RequestContext } from "@/server/context";

// Team and roles (PRD S18, FR-USR-01): invite by mobile, roles, seats, deactivation, access requests.

type Ctx = RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string; role: Role };

export const INVITE_DAYS = 7;
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Database errors raised by the team functions, mapped to messages for the user. */
const MESSAGES: Record<string, [ConstructorParameters<typeof AppError>[0], string]> = {
  INVITE_NOT_FOUND: ["not_found", "This invitation was not found."],
  INVITE_NOT_PENDING: ["conflict", "This invitation has already been used or was withdrawn."],
  INVITE_EXPIRED: ["conflict", "This invitation has expired. Ask for a new one."],
  INVITE_WRONG_MOBILE: ["forbidden", "This invitation is for a different mobile number. Sign in with the number it was sent to."],
  ALREADY_MEMBER: ["conflict", "You are already a member of this organisation."],
  NO_SEATS: ["conflict", "All seats on the plan are in use. Upgrade the plan or deactivate a user first."],
  FORBIDDEN: ["forbidden", "You do not have permission to do this."],
  MEMBER_NOT_FOUND: ["not_found", "This user was not found."],
  OWNER_PROTECTED: ["conflict", "The Owner cannot be changed or deactivated."],
  SELF_CHANGE: ["conflict", "You cannot change your own role or access."],
  USE_OWNERSHIP_TRANSFER: ["bad_request", "Ownership can only be moved with an ownership transfer."],
};

export function mapTeamError(e: unknown): never {
  const message = e instanceof Error ? e.message : "";
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  if (key) {
    const [code, text] = MESSAGES[key];
    throw new AppError(code, text);
  }
  throw e;
}

export async function seatUsage(orgId: string) {
  const [row] = await sql()<{ seat_limit: number; active: number; pending: number }[]>`
    select o.seat_limit,
           (select count(*)::int from public.memberships m where m.org_id = o.id and m.status = 'active') as active,
           (select count(*)::int from public.invitations i where i.org_id = o.id and i.status = 'pending' and i.expires_at > now()) as pending
      from public.organisations o where o.id = ${orgId}`;
  return { limit: row.seat_limit, used: row.active + row.pending, active: row.active, pending: row.pending };
}

export async function listTeam(ctx: Ctx) {
  const members = await sql()<{
    id: string; user_id: string; role: Role; status: string; full_name: string | null; email: string | null; phone: string | null; last_sign_in_at: Date | null;
  }[]>`
    select m.id, m.user_id, m.role::text as role, m.status::text as status, p.full_name, p.email, u.phone, u.last_sign_in_at
      from public.memberships m
      join auth.users u on u.id = m.user_id
      left join public.user_profiles p on p.id = m.user_id
     where m.org_id = ${ctx.orgId} and m.status <> 'invited'
     order by (m.role = 'owner') desc, m.created_at`;
  const invites = await sql()<{ id: string; full_name: string; role: Role; mobile_masked: string; email_masked: string | null; expires_at: Date; expired: boolean }[]>`
    select id, full_name, role::text as role, mobile_masked, email_masked, expires_at, expires_at <= now() as expired
      from public.invitations where org_id = ${ctx.orgId} and status = 'pending' order by created_at desc`;
  const requests = await sql()<{ id: string; requester_name: string | null; phone: string | null; created_at: Date }[]>`
    select r.id, r.requester_name, u.phone, r.created_at
      from public.access_requests r join auth.users u on u.id = r.requester_id
     where r.org_id = ${ctx.orgId} and r.status = 'pending' order by r.created_at`;
  return {
    seats: await seatUsage(ctx.orgId),
    members: members.map((m) => ({
      id: m.id,
      name: m.full_name ?? "",
      mobile: m.phone ? maskMobile(m.phone) : "",
      email: m.email ?? "",
      role: m.role,
      status: m.status,
      lastActive: m.last_sign_in_at?.toISOString() ?? null,
      isYou: m.user_id === ctx.user.id,
    })),
    invites: invites.map((i) => ({
      id: i.id, name: i.full_name, role: i.role, mobile: i.mobile_masked, email: i.email_masked, expiresAt: i.expires_at.toISOString(), expired: i.expired,
    })),
    requests: requests.map((r) => ({
      id: r.id, name: r.requester_name ?? "", mobile: r.phone ? maskMobile(r.phone) : "", requestedAt: r.created_at.toISOString(),
    })),
  };
}

export interface InviteInput {
  fullName: string;
  mobile: string;
  email: string;
  role: "admin" | "member" | "viewer";
}

async function sendInvite(ctx: Ctx, invitationId: string, token: string, origin: string) {
  const [inv] = await sql()<{ full_name: string; role: string; mobile_ciphertext: string; email_ciphertext: string | null; legal_name: string }[]>`
    select i.full_name, i.role::text, i.mobile_ciphertext, i.email_ciphertext, o.legal_name
      from public.invitations i join public.organisations o on o.id = i.org_id where i.id = ${invitationId}`;
  const link = `${origin}/invite/${token}`;
  const mobile = decryptField(inv.mobile_ciphertext, "invitations.mobile");
  const body = `${inv.legal_name} invited you to Chaanbean as ${inv.role}. Accept within ${INVITE_DAYS} days: ${link}`;
  await queueMessage({ orgId: ctx.orgId, channel: "sms", recipientMasked: maskMobile(mobile), to: mobile, template: "user_invited", body });
  if (inv.email_ciphertext) {
    const email = decryptField(inv.email_ciphertext, "invitations.email");
    await queueMessage({
      orgId: ctx.orgId, channel: "email", recipientMasked: maskEmail(email), to: email, template: "user_invited",
      subject: `${inv.legal_name} invited you to Chaanbean`, body,
    });
  }
}

export async function inviteUser(ctx: Ctx, input: InviteInput, origin: string) {
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw new AppError("validation_failed", "Please check the mobile.", { mobile: "Enter a valid mobile number." });
  const mobileHash = blindIndex(mobile, "mobile");

  const [active] = await sql()`
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
     where m.org_id = ${ctx.orgId} and m.status = 'active' and right(u.phone, 10) = ${mobile}`;
  if (active) throw new AppError("validation_failed", "This mobile is already a user.", { mobile: "This mobile is already a user." });

  const seats = await seatUsage(ctx.orgId);
  if (seats.used >= seats.limit) throw new AppError("conflict", "All seats on the plan are in use. Upgrade the plan or deactivate a user first.");

  const token = crypto.randomBytes(24).toString("base64url");
  let id: string;
  try {
    const [row] = await sql()<{ id: string }[]>`
      insert into public.invitations (org_id, full_name, role, mobile_hash, mobile_ciphertext, mobile_masked, email_ciphertext, email_masked,
                                      token_hash, expires_at, invited_by)
      values (${ctx.orgId}, ${input.fullName}, ${input.role}::public.member_role, ${mobileHash}, ${encryptField(mobile, "invitations.mobile")},
              ${maskMobile(mobile)}, ${encryptField(input.email.toLowerCase(), "invitations.email")}, ${maskEmail(input.email)},
              ${hashToken(token)}, now() + ${`${INVITE_DAYS} days`}::interval, ${ctx.user.id})
      returning id`;
    id = row.id;
  } catch (e) {
    if (e instanceof Error && e.message.includes("invitations_one_pending")) {
      throw new AppError("conflict", "This mobile already has a pending invitation. Resend it instead.");
    }
    throw e;
  }
  await sendInvite(ctx, id, token, origin);
  await audit(ctx, { action: "member.invited", entity: "invitation", entityId: id, after: { role: input.role, mobile: maskMobile(mobile) } });
  return { id };
}

/** New link and a fresh 7-day expiry. */
export async function resendInvite(ctx: Ctx, id: string, origin: string) {
  const token = crypto.randomBytes(24).toString("base64url");
  const rows = await sql()`
    update public.invitations set token_hash = ${hashToken(token)}, expires_at = now() + ${`${INVITE_DAYS} days`}::interval
     where id = ${id} and org_id = ${ctx.orgId} and status = 'pending' returning id`;
  if (!rows.length) throw new AppError("not_found", "This invitation was not found.");
  await sendInvite(ctx, id, token, origin);
  await audit(ctx, { action: "member.invite_resent", entity: "invitation", entityId: id });
}

export async function revokeInvite(ctx: Ctx, id: string) {
  const rows = await sql()`
    update public.invitations set status = 'revoked' where id = ${id} and org_id = ${ctx.orgId} and status = 'pending' returning id`;
  if (!rows.length) throw new AppError("not_found", "This invitation was not found.");
  await audit(ctx, { action: "member.invite_revoked", entity: "invitation", entityId: id });
}

export async function updateMember(ctx: Ctx, membershipId: string, change: { role?: Role; status?: "active" | "deactivated" }) {
  try {
    await sql()`
      select app_private.set_member(${ctx.orgId}::uuid, ${membershipId}::uuid, ${ctx.user.id}::uuid,
        ${change.role ?? null}::public.member_role, ${change.status ?? null}::public.member_status,
        ${ctx.ip}::inet, ${ctx.userAgent}, ${ctx.requestId})`;
  } catch (e) {
    mapTeamError(e);
  }
}

export async function declineAccessRequest(ctx: Ctx, id: string) {
  const rows = await sql()`
    update public.access_requests set status = 'declined', decided_by = ${ctx.user.id}, decided_at = now()
     where id = ${id} and org_id = ${ctx.orgId} and status = 'pending' returning id`;
  if (!rows.length) throw new AppError("not_found", "This request was not found.");
  await audit(ctx, { action: "organisation.access_declined", entity: "access_request", entityId: id });
}

// ---------------------------------------------------------------- invite links (public page and acceptance)

export async function inviteByToken(token: string) {
  const [row] = await sql()<{ id: string; status: string; expired: boolean; role: string; full_name: string; mobile_masked: string; legal_name: string; inviter: string | null }[]>`
    select i.id, i.status::text, i.expires_at <= now() as expired, i.role::text, i.full_name, i.mobile_masked, o.legal_name,
           p.full_name as inviter
      from public.invitations i
      join public.organisations o on o.id = i.org_id
      left join public.user_profiles p on p.id = i.invited_by
     where i.token_hash = ${hashToken(token)}`;
  return row ?? null;
}

export async function acceptInvite(ctx: RequestContext & { user: NonNullable<RequestContext["user"]> }, token: string) {
  const phone = ctx.user.phone ? normaliseMobile(ctx.user.phone) : null;
  if (!phone) throw new AppError("forbidden", "Sign in with the mobile number the invitation was sent to.");
  try {
    const [row] = await sql()<{ org_id: string; role: Role }[]>`
      select * from app_private.accept_invitation(${hashToken(token)}, ${ctx.user.id}::uuid, ${blindIndex(phone, "mobile")},
        ${ctx.ip}::inet, ${ctx.userAgent}, ${ctx.requestId})`;
    return row;
  } catch (e) {
    mapTeamError(e);
  }
}
