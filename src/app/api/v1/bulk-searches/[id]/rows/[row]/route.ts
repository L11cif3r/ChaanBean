import { z } from "zod";
import { updateRows } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// 14.2: pick a candidate, untick, or add a GSTIN for one row.
const body = z.object({ included: z.boolean().optional(), pick: z.string().max(40).optional(), gstin: z.string().max(20).optional() });
export const PATCH = route({ capability: "check.run", body }, async ({ ctx, params, body }) =>
  updateRows(orgCtx(ctx), String(params.id), [{ rowId: String(params.row), ...body }]),
);
