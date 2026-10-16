import { z } from "zod";
import { quoteChecks } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// PRD v2.0 Figure 5: what will be deducted before the search runs.
const body = z.object({ counterpartyId: z.uuid(), items: z.array(z.string().max(40)).max(20) });

export const POST = route({ capability: "check.run", body }, async ({ ctx, body }) => quoteChecks(orgCtx(ctx), body.counterpartyId, body.items));
