import { z } from "zod";
import { CONSENT_CHANNELS, CONSENT_PURPOSES } from "@/lib/consent";
import { startDeep } from "@/server/bulk/service";
import { idempotencyKey } from "@/server/checks/schemas";
import { orgCtx } from "@/server/counterparties/routes";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";

// 14.2: start the deep checks of the selected rows (one cancel window).
const body = z.object({
  rowIds: z.array(z.uuid()).min(1).max(1000),
  codes: z.array(z.string().max(40)).min(1).max(20),
  consent: z.object({ purpose: z.enum(CONSENT_PURPOSES), channels: z.array(z.enum(CONSENT_CHANNELS)).min(1).max(3) }).optional(),
});
export const POST = route({ capability: "check.run", body }, async ({ req, ctx, params, body }) => {
  const key = idempotencyKey(req);
  if (!key) throw new AppError("bad_request", "Missing Idempotency-Key.");
  return startDeep(orgCtx(ctx), String(params.id), body, new URL(req.url).origin, key);
});
