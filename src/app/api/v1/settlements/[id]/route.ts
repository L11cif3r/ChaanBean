import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { getSettlement, updateSettlement } from "@/server/settlements/service";

// Settlement detail; editing is allowed in Draft and after a counter-proposal.
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => getSettlement(orgCtx(ctx), String(params.id)));

export const PATCH = route({ capability: "settlement.manage", body: z.unknown() }, async ({ ctx, params, body }) =>
  updateSettlement(orgCtx(ctx), String(params.id), body),
);
