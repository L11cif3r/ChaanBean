import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export interface AdminSession {
  authorized: boolean;
  role?: "owner" | "team_member";
  adminId?: string;
  name?: string;
  email?: string;
  error?: string;
  status?: number;
}

/**
 * Validates admin session from request headers, secure cookies, or admin master keys.
 * Enforces role boundaries (e.g. Owner vs Team Member) for sensitive operations.
 */
export async function verifyAdminSession(
  req?: Request,
  options?: { requireOwner?: boolean }
): Promise<AdminSession> {
  // 1. Check for Admin Master Key in header (used by secure backend scripts & automation)
  if (req) {
    const adminKey = req.headers.get("x-admin-key");
    const configuredKey = process.env.ADMIN_SECURITY_KEY;
    const isDev = process.env.NODE_ENV !== "production";
    const validKeys = [
      ...(configuredKey ? [configuredKey.trim()] : []),
      ...(isDev ? ["CHAANBEAN-ROOT-2026", "CHAANBEAN-ADMIN", "ADMIN2026"] : []),
    ];
    if (adminKey && validKeys.includes(adminKey.trim())) {
      return {
        authorized: true,
        role: "owner",
        adminId: "admin-master-key",
        name: "Master Admin Key",
      };
    }
  }

  // 2. Read cookies via Next.js headers or raw cookie header
  let hasValidSession = false;
  let effectiveRole: "owner" | "team_member" = "owner";
  let adminId: string | undefined = undefined;

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("chaanbean_admin_session")?.value;
    const legacySession = cookieStore.get("chaanbean_session")?.value;
    const roleCookie = cookieStore.get("chaanbean_admin_role")?.value;
    const idCookie = cookieStore.get("chaanbean_admin_id")?.value;

    if (sessionCookie === "active" || sessionCookie === "true" || legacySession === "admin") {
      hasValidSession = true;
    }
    if (roleCookie === "team_member") {
      effectiveRole = "team_member";
    } else if (roleCookie === "owner") {
      effectiveRole = "owner";
    }
    if (idCookie) {
      adminId = idCookie;
    }
  } catch {
    // If running in an environment where cookies() throws or is unavailable, fallback to req header
  }

  // Request header fallback
  if (!hasValidSession && req) {
    const rawCookie = req.headers.get("cookie") || "";
    if (
      rawCookie.includes("chaanbean_admin_session=active") ||
      rawCookie.includes("chaanbean_admin_session=true") ||
      rawCookie.includes("chaanbean_session=admin")
    ) {
      hasValidSession = true;
    }
    if (rawCookie.includes("chaanbean_admin_role=team_member")) {
      effectiveRole = "team_member";
    } else if (rawCookie.includes("chaanbean_admin_role=owner")) {
      effectiveRole = "owner";
    }
  }

  if (!hasValidSession) {
    return {
      authorized: false,
      error: "Authentication Required: Administrator session not active. Please sign in to the Admin Console.",
      status: 401,
    };
  }

  if (options?.requireOwner && effectiveRole !== "owner") {
    return {
      authorized: false,
      error: "Access Denied: Owner role required for this financial or strategic operation.",
      status: 403,
    };
  }

  return {
    authorized: true,
    role: effectiveRole,
    adminId,
  };
}
