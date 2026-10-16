import { z } from "zod";
import { PLAN_CODES, TOPUP_MAX_PAISE, TOPUP_MIN_PAISE } from "@/lib/billing";
import { rupeesToPaise } from "@/lib/money";
import { startCheckout } from "@/server/billing/service";
import { route } from "@/server/http";

// S03 marker 6 (Pay) and S19 "Add money": creates a payment order and returns the gateway's checkout page.
const returnTo = z.enum(["signup", "change", "billing"]).default("billing");
const amountMessage = "Enter an amount between ₹1,000 and ₹5,00,000.";

const body = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("plan"), plan: z.enum(PLAN_CODES, "Select a plan to continue."), returnTo }),
  z.object({
    purpose: z.literal("topup"),
    amount: z
      .number(amountMessage)
      .int(amountMessage)
      .min(Number(TOPUP_MIN_PAISE / 100n), amountMessage)
      .max(Number(TOPUP_MAX_PAISE / 100n), amountMessage),
    returnTo,
  }),
]);

export const POST = route({ capability: "billing.manage", body }, async ({ ctx, body, req }) => {
  const input = body.purpose === "plan" ? { purpose: "plan" as const, plan: body.plan } : { purpose: "topup" as const, amountPaise: rupeesToPaise(body.amount) };
  return startCheckout({ ...ctx, user: ctx.user!, orgId: ctx.orgId! }, input, body.returnTo, new URL(req.url).origin);
});
