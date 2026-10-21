import { screenQuote } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// 14.2: the quick screen's cost (POST, as in the PRD; GET on /api/v1/bulk/{id}/screen does the same).
export const POST = route({ capability: "check.run" }, async ({ ctx, params }) => screenQuote(orgCtx(ctx), String(params.id)));
