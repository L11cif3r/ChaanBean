import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { cancelChecks } from "@/server/checks/service";

// v4 FR-PAY-03: cancel inside the cancel window (before start_at). Nothing is held, so nothing comes back.
export const POST = route({ capability: "check.run" }, async ({ ctx, params }) => cancelChecks(orgCtx(ctx), String(params.id)));
