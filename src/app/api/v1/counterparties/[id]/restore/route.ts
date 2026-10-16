import { setArchived } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S07: Restore from the archived banner (FR-CP-08).
export const POST = route({ capability: "counterparty.manage" }, async ({ ctx, params }) => setArchived(orgCtx(ctx), String(params.id), false));
