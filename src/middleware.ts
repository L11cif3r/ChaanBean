import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If opening the platform at root "/" without active subscription or session, redirect to /subscription
  if (pathname === "/") {
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
  matcher: ["/"],
};
