import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always display the subscription page first when opening the platform at root "/"
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/subscription", request.url));
  }

  // Protect /dashboard and ensure active subscription or session
  if (pathname.startsWith("/dashboard")) {
    const subCookie = request.cookies.get("chaanbean_subscription");
    const sessionCookie = request.cookies.get("chaanbean_session");

    const isSubscribed = subCookie?.value === "active";
    const isLoggedIn = sessionCookie?.value === "client" || sessionCookie?.value === "admin";

    if (!isSubscribed && !isLoggedIn) {
      return NextResponse.redirect(new URL("/subscription", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
