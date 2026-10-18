import { getCaseCheck } from "@/server/cases/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S12 results for one Case Check, polled while the searches run (court search can take up to 2 minutes).
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => getCaseCheck(orgCtx(ctx), String(params.id)));
