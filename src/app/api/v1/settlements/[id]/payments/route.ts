import { z } from "zod";
import { PAYMENT_MODES } from "@/lib/transactions";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { recordSettlementPayment } from "@/server/settlements/service";

// FR-ES-05: record money received; it fills the instalments in date order.
const body = z.object({
  amountPaise: z.number().int().positive("Enter an amount."),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid payment date."),
  mode: z.enum(PAYMENT_MODES, "Choose how it was paid."),
  reference: z.string().trim().max(40).optional(),
  notify: z.boolean().default(false),
});

export const POST = route({ capability: "payment.record", body }, async ({ ctx, params, body }) => recordSettlementPayment(orgCtx(ctx), String(params.id), body));
