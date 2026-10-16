import { setArchived } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// FR-CP-08: archived counterparties are hidden from pickers but keep their history.
export const POST = route({ capability: "counterparty.manage" }, async ({ ctx, params }) => setArchived(orgCtx(ctx), String(params.id), true));
