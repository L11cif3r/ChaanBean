import "server-only";
import { cookies } from "next/headers";
import { jwtSessionId, readSession, SESSION_COOKIE, sessionCookieOptions, signSession, type SessionCookie } from "@/lib/session-cookie";
import { ACTIVE_ORG_COOKIE } from "@/server/context";
import { serverEnv } from "@/server/env";

const ORG_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 400 * 24 * 3600 };

/** Issues the cb_sess cookie right after Supabase has created a session. */
export async function issueSessionCookie(accessToken: string, opts: { trusted: boolean; strict: boolean }) {
  const ids = jwtSessionId(accessToken);
  if (!ids) throw new Error("Supabase session token has no session id");
  const now = Date.now();
  const payload: SessionCookie = { sid: ids.sid, uid: ids.uid, st: now, tr: opts.trusted, ls: now, sx: opts.strict };
  (await cookies()).set(SESSION_COOKIE, signSession(payload, serverEnv().SESSION_COOKIE_SECRET), sessionCookieOptions(payload));
}

/** Rewrites the strict-idle flag when the active organisation (and so the role) changes. */
export async function updateSessionStrictness(strict: boolean) {
  const store = await cookies();
  const secret = serverEnv().SESSION_COOKIE_SECRET;
  const current = readSession(store.get(SESSION_COOKIE)?.value, secret);
  if (!current || current.sx === strict) return;
  const next = { ...current, sx: strict, ls: Date.now() };
  store.set(SESSION_COOKIE, signSession(next, secret), sessionCookieOptions(next));
}

export async function setActiveOrg(orgId: string) {
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, ORG_COOKIE_OPTIONS);
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ACTIVE_ORG_COOKIE);
}
