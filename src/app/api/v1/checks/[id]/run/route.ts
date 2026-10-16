import { z } from "zod";
import { runOne } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// "I will run each one myself": start one check of the request.
const body = z.object({ code: z.string().max(40) });

export const POST = route({ capability: "check.run", body }, async ({ ctx, params, body }) => runOne(orgCtx(ctx), String(params.id), body.code));
