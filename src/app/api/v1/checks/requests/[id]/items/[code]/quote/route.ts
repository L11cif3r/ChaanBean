import { quoteOne } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// The cost popup for one check of a one-by-one request (v3 FR-CW-05).
export const POST = route({ capability: "check.run" }, async ({ ctx, params }) => quoteOne(orgCtx(ctx), String(params.id), String(params.code)));
