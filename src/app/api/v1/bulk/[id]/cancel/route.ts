import { cancelBulk } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// FR-PAY-02: cancel inside the window. Nothing is held or run.
export const POST = route({ capability: "check.run" }, async ({ ctx, params }) => cancelBulk(orgCtx(ctx), String(params.id)));
