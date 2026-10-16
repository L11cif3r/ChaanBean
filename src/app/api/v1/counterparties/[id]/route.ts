import { updateCounterpartySchema } from "@/lib/counterparties";
import { getCounterparty, updateCounterparty } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S07: one counterparty (every role) and the inline edit of contact details, defaults, tags and notes.
export const GET = route({ capability: "dashboard.view" }, async ({ ctx, params }) => getCounterparty(orgCtx(ctx), String(params.id)));

export const PATCH = route({ capability: "counterparty.manage", body: updateCounterpartySchema }, async ({ ctx, params, body }) =>
  updateCounterparty(orgCtx(ctx), String(params.id), body),
);
