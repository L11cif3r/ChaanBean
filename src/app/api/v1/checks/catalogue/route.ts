import { z } from "zod";
import { checkCatalogue } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S08: the checks that can run for one counterparty, with price, plan units left and any recent result (FR-CW-06).
const query = z.object({ counterparty: z.uuid("Choose a counterparty.") });

export const GET = route({ capability: "check.run", query }, async ({ ctx, query }) => checkCatalogue(orgCtx(ctx), query.counterparty));
