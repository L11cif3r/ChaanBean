import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { can, type Capability, type Role } from "@/lib/permissions";
import { userClient } from "@/server/supabase/server";
import { forbidden, unauthenticated } from "@/server/errors";

export const ACTIVE_ORG_COOKIE = "cb_org";

export interface Membership {
  orgId: string;
  role: Role;
}

export interface RequestContext {
  /** Shown to the user on errors so support can find the request. */
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  user: { id: string; phone: string | null; email: string | null } | null;
  /** The organisation this request acts in (PRD FR-AUTH-05: a person can belong to several). */
  orgId: string | null;
  role: Role | null;
  memberships: Membership[];
}

export function newRequestId(): string {
  return `CB-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function clientIp(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || null;
  return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

/**
 * Who is calling and in which organisation. The user is taken from the verified Supabase session (JWT signature
 * checked by getClaims); memberships are read through row-level security, so they can only be the user's own.
 */
export const getContext = cache(async function getContext(): Promise<RequestContext> {
  const h = await headers();
  const base = {
    requestId: h.get("x-request-id") ?? newRequestId(),
    ip: clientIp(h),
    userAgent: h.get("user-agent")?.slice(0, 400) ?? null,
  };

  const supabase = await userClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { ...base, user: null, orgId: null, role: null, memberships: [] };

  const { data: rows, error } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", claims.sub)
    .eq("status", "active")
    .order("created_at");
  if (error) throw error;

  const memberships: Membership[] = (rows ?? []).map((r) => ({ orgId: r.org_id, role: r.role }));
  const wanted = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.orgId === wanted) ?? memberships[0] ?? null;

  return {
    ...base,
    user: {
      id: claims.sub,
      phone: typeof claims.phone === "string" && claims.phone ? claims.phone : null,
      email: typeof claims.email === "string" && claims.email ? claims.email : null,
    },
    orgId: active?.orgId ?? null,
    role: active?.role ?? null,
    memberships,
  };
});

export function requireUser(ctx: RequestContext): asserts ctx is RequestContext & { user: NonNullable<RequestContext["user"]> } {
  if (!ctx.user) throw unauthenticated();
}

/** Server-side enforcement of the PRD 4.3 matrix (FR-USR-02). Row-level security enforces the same rules again. */
export function requireCapability(
  ctx: RequestContext,
  capability: Capability,
): asserts ctx is RequestContext & { user: NonNullable<RequestContext["user"]>; orgId: string; role: Role } {
  requireUser(ctx);
  if (!ctx.orgId || !can(ctx.role, capability)) throw forbidden();
}
