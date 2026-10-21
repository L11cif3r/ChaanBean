import { screenQuote, startScreen } from "@/server/bulk/service";
import { idempotencyKey } from "@/server/checks/schemas";
import { orgCtx } from "@/server/counterparties/routes";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";

// v4 7.1 step 1: the quick screen's cost popup (GET) and "Yes, run" (POST), with one cancel window for all rows.
export const GET = route({ capability: "check.run" }, async ({ ctx, params }) => screenQuote(orgCtx(ctx), String(params.id)));

export const POST = route({ capability: "check.run" }, async ({ req, ctx, params }) => {
  const key = idempotencyKey(req);
  if (!key) throw new AppError("bad_request", "Missing Idempotency-Key.");
  return startScreen(orgCtx(ctx), String(params.id), new URL(req.url).origin, key);
});
