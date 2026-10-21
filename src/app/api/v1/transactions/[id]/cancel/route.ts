import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { cancelTransaction } from "@/server/transactions/service";

// Cancel before acceptance; before the link is opened the unit comes back (v3 8.6).
export const POST = route({ capability: "transaction.manage" }, async ({ ctx, params }) => cancelTransaction(orgCtx(ctx), String(params.id)));
