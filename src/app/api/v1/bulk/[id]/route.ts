import { getBulk } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v4 sections 6 and 7: a multiple search with its rows, matches, screen results and deep checks.
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => getBulk(orgCtx(ctx), String(params.id)));
