import { getReport } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S11: one credit report, polled while its checks are still running.
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => getReport(orgCtx(ctx), String(params.id)));
