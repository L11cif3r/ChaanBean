import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { sendQuote } from "@/server/transactions/service";

// v3 15: what sending costs (the wallet price; resending after a change request is free).
const body = z.object({ transactionId: z.uuid() });

export const POST = route({ capability: "transaction.manage", body }, async ({ ctx, body }) => sendQuote(orgCtx(ctx), body.transactionId));
