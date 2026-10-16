import { z } from "zod";
import { runOne } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// "I will run each one myself": start one check after its own cost popup (v3 FR-CW-05).
const body = z.object({ quoteId: z.uuid("Check the cost again before running.") });

export const POST = route({ capability: "check.run", body }, async ({ ctx, params, body }) =>
  runOne(orgCtx(ctx), String(params.id), String(params.code), body.quoteId),
);
