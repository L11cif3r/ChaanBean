import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { cancelSettlement } from "@/server/settlements/service";

// Withdraw before acceptance; before the link is opened the unit comes back.
export const POST = route({ capability: "settlement.manage" }, async ({ ctx, params }) => cancelSettlement(orgCtx(ctx), String(params.id)));
