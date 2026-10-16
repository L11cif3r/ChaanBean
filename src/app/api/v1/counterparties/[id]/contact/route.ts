import { getContactForEdit } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S07 edit form: the only place full mobile numbers are shown (PRD S05 states and rules).
export const GET = route({ capability: "counterparty.manage" }, async ({ ctx, params }) => getContactForEdit(orgCtx(ctx), String(params.id)));
