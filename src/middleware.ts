import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Root route always forwards to intro animation
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/intro", request.url));
  }

  // 2. Strict redirection of all extraneous features into the 4 Core Boxes:
  // - AI Credit Check (/background-check)
  // - AI Business Security (/business-check)
  // - Payment Automation (/payment-recovery)
  // - Legal Infrastructure (/arbitration)

  // Redirect Dashboard to AI Credit Check
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/background-check", request.url));
  }

  // Redirect Debtors & Portfolio to AI Business Security
  if (pathname === "/debtors" || pathname.startsWith("/debtors/")) {
    return NextResponse.redirect(new URL("/business-check", request.url));
  }

  // Redirect Monitoring & Continuous Radar to AI Business Security
  if (pathname === "/monitoring" || pathname.startsWith("/monitoring/")) {
    return NextResponse.redirect(new URL("/business-check", request.url));
  }

  // Redirect Collections Desk to Payment Automation
  if (pathname === "/collections" || pathname.startsWith("/collections/")) {
    return NextResponse.redirect(new URL("/payment-recovery", request.url));
  }

  // Redirect Find Someone / Skip-Tracing to AI Credit Check
  if (pathname === "/find-someone" || pathname.startsWith("/find-someone/")) {
    return NextResponse.redirect(new URL("/background-check", request.url));
  }

  // Redirect Vendor Registration to AI Credit Check
  if (pathname === "/vendors" || pathname.startsWith("/vendors/")) {
    return NextResponse.redirect(new URL("/background-check", request.url));
  }

  // Redirect Trust Network to AI Credit Check
  if (pathname === "/trust-hub" || pathname.startsWith("/trust-hub/")) {
    return NextResponse.redirect(new URL("/background-check", request.url));
  }

  // Redirect Legal Network to Legal Infrastructure
  if (pathname === "/legal-advisors" || pathname.startsWith("/legal-advisors/")) {
    return NextResponse.redirect(new URL("/arbitration", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/dashboard",
    "/debtors/:path*",
    "/debtors",
    "/monitoring/:path*",
    "/monitoring",
    "/collections/:path*",
    "/collections",
    "/find-someone/:path*",
    "/find-someone",
    "/vendors/:path*",
    "/vendors",
    "/trust-hub/:path*",
    "/trust-hub",
    "/legal-advisors/:path*",
    "/legal-advisors",
  ],
};
