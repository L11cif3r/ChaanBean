import { z } from "zod";
import { updateRows } from "@/server/bulk/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// FR-BK-03: pick a company for a row, or tick and untick rows, before confirming.
const body = z.object({ changes: z.array(z.object({ rowId: z.uuid(), included: z.boolean().optional(), pick: z.string().max(40).optional(), gstin: z.string().max(20).optional() })).min(1).max(100) });

export const PATCH = route({ capability: "check.run", body }, async ({ ctx, params, body }) => updateRows(orgCtx(ctx), String(params.id), body.changes));
