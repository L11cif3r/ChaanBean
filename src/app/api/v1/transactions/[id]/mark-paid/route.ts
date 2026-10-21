import { z } from "zod";
import { PAYMENT_MODES } from "@/lib/transactions";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { markPaid } from "@/server/transactions/service";

// S16 "Mark fully paid": records everything due on that date.
const body = z.object({
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid payment date."),
  mode: z.enum(PAYMENT_MODES, "Choose how it was paid."),
  reference: z.string().trim().max(40).optional(),
});

export const POST = route({ capability: "payment.record", body }, async ({ ctx, params, body }) => markPaid(orgCtx(ctx), String(params.id), body));
