import { getReport } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v3 15: status of a request's items (the same view as its report).
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => getReport(orgCtx(ctx), String(params.id)));
