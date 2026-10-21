import { confirmBulk } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// FR-BK-04: confirmed rows become buyers (free).
export const POST = route({ capability: "check.run" }, async ({ ctx, params }) => confirmBulk(orgCtx(ctx), String(params.id)));
