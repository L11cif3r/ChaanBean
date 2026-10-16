import { z } from "zod";
import { ALERT_MAX_PAISE } from "@/lib/billing";
import { rupeesToPaise, toJsonSafe } from "@/lib/money";
import { updateBillingSettings } from "@/server/billing/service";
import { route } from "@/server/http";

// S19: auto-renew on or off (FR-BIL-08) and the low-balance alert amount (₹0 to ₹1,00,000; null turns it off).
const alertMessage = "Enter an amount between ₹0 and ₹1,00,000.";
const body = z.object({
  autoRenew: z.boolean().optional(),
  alertAmount: z.number(alertMessage).int(alertMessage).min(0, alertMessage).max(Number(ALERT_MAX_PAISE / 100n), alertMessage).nullable().optional(),
});

export const PATCH = route({ capability: "billing.manage", body }, async ({ ctx, body }) =>
  toJsonSafe(
    await updateBillingSettings({ ...ctx, user: ctx.user!, orgId: ctx.orgId! }, {
      autoRenew: body.autoRenew,
      alertPaise: body.alertAmount === undefined ? undefined : body.alertAmount === null ? null : rupeesToPaise(body.alertAmount),
    }),
  ),
);
