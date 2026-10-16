import { z } from "zod";
import { confirmUpiManually, recheckUpi } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// FR-CP-03 on a saved counterparty: run the UPI lookup again, or record the manual "₹1 by UPI" confirmation.
const body = z.object({ action: z.enum(["recheck", "confirm"]) });

export const POST = route({ capability: "counterparty.manage", body }, async ({ ctx, params, body }) =>
  body.action === "recheck" ? recheckUpi(orgCtx(ctx), String(params.id)) : confirmUpiManually(orgCtx(ctx), String(params.id)),
);
