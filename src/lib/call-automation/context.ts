// Request context for Call Automation routes. Production path = Feature 1's verified Supabase session +
// organisation membership (requireContext), unchanged. A local-only bypass exists so the feature can be run
// without Supabase credentials; it is impossible to enable in production and the organisation comes from the
// server environment, never from the request.

import crypto from "crypto";
import { requireContext } from "../company-check/auth";
import { AppError, type RequestContext } from "../company-check/errors";

export function devAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.NODE_ENV === "development" || env.NODE_ENV === "test") && env.COLLECT_DEV_AUTH === "1";
}

export async function getContext(req: Request): Promise<RequestContext> {
  if (devAuthEnabled()) {
    const organisationId = process.env.COLLECT_DEV_ORGANISATION_ID;
    const userId = process.env.COLLECT_DEV_USER_ID;
    if (!organisationId || !userId) {
      throw new AppError(500, "DEV_AUTH_MISCONFIGURED", "COLLECT_DEV_ORGANISATION_ID and COLLECT_DEV_USER_ID are required.");
    }
    const role = process.env.COLLECT_DEV_ROLE === "READ_ONLY" ? "READ_ONLY" : "OWNER";
    return { userId, organisationId, role, correlationId: crypto.randomUUID(), userAgent: req.headers.get("user-agent") ?? undefined };
  }
  return requireContext(req);
}
