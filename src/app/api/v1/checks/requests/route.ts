import { startChecks } from "@/server/checks/service";
import { idempotencyKey, startSchema } from "@/server/checks/schemas";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v3 15.1 "Yes, run search": confirms the quote, holds units and starts the checks. Checks that need a yes wait for
// it; the consent requests go out on the chosen channels.
export const POST = route({ capability: "check.run", body: startSchema }, async ({ req, ctx, body }) =>
  startChecks(orgCtx(ctx), body, new URL(req.url).origin, idempotencyKey(req)),
);
