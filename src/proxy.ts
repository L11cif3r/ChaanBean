import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  evaluateSession,
  LIMITS,
  readSession,
  safeNext,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  type SessionState,
} from "@/lib/session-cookie";

// Runs before every page and API request (Next.js 16 "proxy", formerly middleware).
// 1. Gives each request an id that appears in logs, audit rows and error messages.
// 2. Refreshes the Supabase session and enforces Chaanbean's session rules (PRD S01, FR-AUTH-04): 12 hours, 30 days on
//    a trusted device, 60 minutes idle for Owners and Admins. A session that breaks a rule is signed out.
// 3. Sends signed-out visitors of app pages to /login, and signed-in visitors of /login onwards.
// 4. Keeps the ops console on its own host (PRD S21) once ADMIN_HOST is set.

// Pages that need a signed-in user. Everything else (external pages, legal pages, invites, the API) checks its own
// access.
const PROTECTED = ["/dashboard", "/counterparties", "/checks", "/reports", "/cases", "/transactions", "/settlements", "/account", "/settings", "/signup"];
const isProtected = (path: string) => PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

function requestId() {
  return `CB-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

/** A redirect that keeps the cookies (sign-out deletions, refreshed tokens) set on `from`. */
function redirectWith(from: NextResponse, url: URL) {
  const res = NextResponse.redirect(url);
  for (const c of from.cookies.getAll()) res.cookies.set(c);
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const adminHost = process.env.ADMIN_HOST;
  const host = request.headers.get("host")?.split(":")[0];
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (adminHost && (isAdminPath ? host !== adminHost : host === adminHost && !pathname.startsWith("/_next"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const id = request.headers.get("x-request-id")?.match(/^CB-[A-Z0-9]{10}$/)?.[0] ?? requestId();
  const forwarded = new Headers(request.headers);
  forwarded.set("x-request-id", id);

  let response = NextResponse.next({ request: { headers: forwarded } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: forwarded } });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
          for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
        },
      },
    },
  );
  // Refreshes an expiring session. Do not remove: without it, sessions silently expire on server-rendered pages.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const secret = process.env.SESSION_COOKIE_SECRET ?? "";
  let signedIn = Boolean(claims?.sub);
  let ended: SessionState | "invalid" | null = null;

  if (signedIn) {
    const sess = readSession(request.cookies.get(SESSION_COOKIE)?.value, secret);
    const now = Date.now();
    const state: SessionState | "invalid" =
      !sess || sess.uid !== claims!.sub || sess.sid !== claims!.session_id ? "invalid" : evaluateSession(sess, now);
    if (state === "ok") {
      if (now - sess!.ls > LIMITS.touchEveryMs) {
        const touched = { ...sess!, ls: now };
        request.cookies.set(SESSION_COOKIE, signSession(touched, secret));
        response.cookies.set(SESSION_COOKIE, signSession(touched, secret), sessionCookieOptions(touched));
      }
    } else {
      // The Supabase session is still valid but breaks Chaanbean's rules: end it.
      await supabase.auth.signOut({ scope: "local" });
      request.cookies.delete(SESSION_COOKIE);
      response.cookies.delete(SESSION_COOKIE);
      signedIn = false;
      ended = state;
    }
  }

  if (!signedIn && isProtected(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    if (ended === "idle") url.searchParams.set("reason", "idle");
    else if (ended) url.searchParams.set("reason", "expired");
    return redirectWith(response, url);
  }
  if (signedIn && pathname === "/login") {
    return redirectWith(response, new URL(safeNext(request.nextUrl.searchParams.get("next")) ?? "/dashboard", request.url));
  }

  response.headers.set("x-request-id", id);
  return response;
}

export const config = {
  // Everything except static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)"],
};
