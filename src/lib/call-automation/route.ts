import { NextResponse } from "next/server";
import { errorResponse, readJson } from "../company-check/http";
import { toJsonSafe } from "../company-check/money";
import { AppError, type RequestContext } from "../company-check/errors";
import { getContext } from "./context";

/**
 * Browser-session requests that change state must come from our own origin. Cookie-authenticated JSON POSTs are
 * otherwise exposed to cross-site request forgery. Requests with no Origin header (server-to-server, curl,
 * Bearer clients) are not browser-driven and are authenticated by their token, so they pass.
 */
export function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError(403, "BAD_ORIGIN", "Cross-site requests are not allowed.");
  }
  if (!host || originHost !== host) throw new AppError(403, "BAD_ORIGIN", "Cross-site requests are not allowed.");
}

/** Wraps a route body: same-origin check, verified context, shared v1 error shape. */
export async function handle(
  req: Request,
  fn: (ctx: RequestContext, body: () => Promise<unknown>) => Promise<unknown>,
  status = 200,
) {
  let correlationId: string | undefined;
  try {
    assertSameOrigin(req);
    const ctx = await getContext(req);
    correlationId = ctx.correlationId;
    const out = await fn(ctx, () => readJson(req));
    return NextResponse.json(toJsonSafe(out), { status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e, correlationId);
  }
}
