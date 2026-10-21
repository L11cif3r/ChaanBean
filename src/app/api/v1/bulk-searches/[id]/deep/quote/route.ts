import { z } from "zod";
import { deepQuote } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// 14.2: one cost for the deep checks of the selected rows.
const body = z.object({ rowIds: z.array(z.uuid()).min(1).max(1000), codes: z.array(z.string().max(40)).min(1).max(20) });
export const POST = route({ capability: "check.run", body }, async ({ ctx, params, body }) => deepQuote(orgCtx(ctx), String(params.id), body.rowIds, body.codes));
