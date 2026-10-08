// Request authentication for the v1 API (PRD §5.3): Supabase Auth session → organisation membership.
// The organisation is derived from the verified user, never from the request body.

import crypto from "crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";
import { AppError, type RequestContext } from "./errors";

function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AppError(500, "AUTH_NOT_CONFIGURED", "Sign-in is not configured on the server.");
  return { url, key };
}

/** Verifies the Supabase access token (Bearer header, else the session cookies) with Supabase Auth. */
async function verifiedUserId(req: Request): Promise<string> {
  const { url, key } = supabaseEnv();
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.getUser(bearer);
    if (error || !data.user) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
    return data.user.id;
  }
  const store = await cookies();
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Route handlers that already started streaming can't set cookies; the refresh happens next request.
        }
      },
    },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
  return data.user.id;
}

export async function requireContext(req: Request): Promise<RequestContext> {
  const userId = await verifiedUserId(req);
  const memberships = await prisma.organisation_members.findMany({
    where: { user_id: userId, status: "ACTIVE" },
    select: { organisation_id: true, role: true },
  });
  if (memberships.length === 0) throw new AppError(403, "ONBOARDING_REQUIRED", "Create or join an organisation first.");
  // A user in several organisations picks one with X-Organisation-Id; it must be one of their memberships.
  const requested = req.headers.get("x-organisation-id");
  const m = requested ? memberships.find((x) => x.organisation_id === requested) : memberships[0];
  if (!m) throw new AppError(403, "NOT_A_MEMBER", "You are not a member of that organisation.");
  return {
    userId,
    organisationId: m.organisation_id,
    role: m.role,
    correlationId: crypto.randomUUID(),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

/** For onboarding: a signed-in user who may not belong to an organisation yet. */
export async function requireUserId(req: Request) {
  return verifiedUserId(req);
}
