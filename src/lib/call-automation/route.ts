import { NextResponse } from "next/server";
import { errorResponse, readJson } from "../company-check/http";
import { toJsonSafe } from "../company-check/money";
import type { RequestContext } from "../company-check/errors";
import { getContext } from "./context";

/** Wraps a route body: resolves the verified context, maps errors to the shared v1 error shape. */
export async function handle(
  req: Request,
  fn: (ctx: RequestContext, body: () => Promise<unknown>) => Promise<unknown>,
  status = 200,
) {
  let correlationId: string | undefined;
  try {
    const ctx = await getContext(req);
    correlationId = ctx.correlationId;
    const out = await fn(ctx, () => readJson(req));
    return NextResponse.json(toJsonSafe(out), { status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e, correlationId);
  }
}
