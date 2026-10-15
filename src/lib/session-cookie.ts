import crypto from "node:crypto";

// The cb_sess cookie carries Chaanbean's own session rules on top of the Supabase session (PRD S01, FR-AUTH-04):
// 12 hours, or 30 days on a trusted device, and sign-out after 60 minutes idle for Owners and Admins.
// It is HMAC-signed, so it cannot be edited, and bound to the Supabase session id, so it cannot be reused.
// Shared by src/proxy.ts (which enforces it on every request) and the sign-in routes (which issue it).

export const SESSION_COOKIE = "cb_sess";

export const LIMITS = {
  untrustedMs: 12 * 60 * 60_000,
  trustedMs: 30 * 24 * 60 * 60_000,
  idleMs: 60 * 60_000,
  /** How often the last-seen time is rewritten, to avoid a Set-Cookie on every request. */
  touchEveryMs: 60_000,
} as const;

export interface SessionCookie {
  /** Supabase session id (JWT claim session_id). */
  sid: string;
  /** User id. */
  uid: string;
  /** Signed in at (ms). */
  st: number;
  /** Trusted device. */
  tr: boolean;
  /** Last seen (ms). */
  ls: number;
  /** Strict idle rule: the user is Owner or Admin of the active organisation. */
  sx: boolean;
}

export type SessionState = "ok" | "expired" | "idle";

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const mac = (body: string, secret: string) => crypto.createHmac("sha256", secret).update(body).digest("base64url");

export function signSession(p: SessionCookie, secret: string): string {
  const body = b64(JSON.stringify(p));
  return `${body}.${mac(body, secret)}`;
}

export function readSession(token: string | undefined, secret: string): SessionCookie | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionCookie;
    return typeof p.sid === "string" && typeof p.uid === "string" && typeof p.st === "number" && typeof p.ls === "number" ? p : null;
  } catch {
    return null;
  }
}

export function evaluateSession(p: SessionCookie, now: number): SessionState {
  if (now - p.st > (p.tr ? LIMITS.trustedMs : LIMITS.untrustedMs)) return "expired";
  if (p.sx && now - p.ls > LIMITS.idleMs) return "idle";
  return "ok";
}

export function sessionCookieOptions(p: SessionCookie) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil((p.tr ? LIMITS.trustedMs : LIMITS.untrustedMs) / 1000),
  };
}

/** Reads session_id and sub from a JWT without verifying it (only for a token Supabase has just issued to us). */
export function jwtSessionId(accessToken: string): { sid: string; uid: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.session_id === "string" && typeof payload.sub === "string" ? { sid: payload.session_id, uid: payload.sub } : null;
  } catch {
    return null;
  }
}

/** Only same-site paths are allowed as a post-sign-in destination. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/api") || next.startsWith("/login")) return null;
  return next;
}
