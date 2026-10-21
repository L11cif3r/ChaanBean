import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { getTransaction, updateDraft } from "@/server/transactions/service";

// S16 detail; editing is allowed in Draft and after a change request.
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => getTransaction(orgCtx(ctx), String(params.id)));

export const PATCH = route({ capability: "transaction.manage", body: z.unknown() }, async ({ ctx, params, body }) =>
  updateDraft(orgCtx(ctx), String(params.id), body),
);
