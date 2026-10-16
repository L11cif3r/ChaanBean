import { z } from "zod";
import { quoteChecks } from "@/server/checks/service";
import { personSchema } from "@/server/checks/schemas";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v3 FR-BIL-03 / Figure 5: what will be deducted before the search runs. The quote is valid 10 minutes.
const body = z.object({ counterpartyId: z.uuid(), items: z.array(z.string().max(40)).max(20), person: personSchema.optional() });

export const POST = route({ capability: "check.run", body }, async ({ ctx, body }) =>
  quoteChecks(orgCtx(ctx), body.counterpartyId, body.items, body.person),
);
