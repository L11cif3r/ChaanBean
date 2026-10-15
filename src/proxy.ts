import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every page and API request (Next.js 16 "proxy", formerly middleware).
// 1. Gives each request an id that appears in logs, audit rows and error messages.
// 2. Refreshes the Supabase session cookie so server code always sees a valid session.
// 3. Keeps the ops console on its own host (PRD S21: admin.chaanbean.in) once ADMIN_HOST is set.

function requestId() {
  return `CB-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export async function proxy(request: NextRequest) {
  const adminHost = process.env.ADMIN_HOST;
  const host = request.headers.get("host")?.split(":")[0];
  const isAdminPath = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  if (adminHost && (isAdminPath ? host !== adminHost : host === adminHost && !request.nextUrl.pathname.startsWith("/_next"))) {
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
  await supabase.auth.getClaims();

  response.headers.set("x-request-id", id);
  return response;
}

export const config = {
  // Everything except static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff2?)$).*)"],
};
