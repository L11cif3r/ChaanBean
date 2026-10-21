import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { resendSettlement } from "@/server/settlements/service";

// The link again while the debtor decides, or the sealed copy after. Once an hour.
export const POST = route({ capability: "settlement.manage" }, async ({ ctx, params }) => resendSettlement(orgCtx(ctx), String(params.id)));
