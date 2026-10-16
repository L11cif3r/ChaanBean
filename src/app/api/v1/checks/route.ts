import { z } from "zod";
import { CONSENT_CHANNELS, CONSENT_PURPOSES } from "@/lib/consent";
import { startChecks } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// "Yes, run search": holds units and starts every selected check, or prepares them to run one by one. Checks that
// need the buyer's yes wait for it; the consent request goes out on the chosen channels (S09).
const body = z.object({
  counterpartyId: z.uuid(),
  items: z.array(z.string().max(40)).min(1, "Select at least one check.").max(20),
  mode: z.enum(["together", "manual"]).default("together"),
  consent: z
    .object({
      purpose: z.enum(CONSENT_PURPOSES, "Select a purpose."),
      channels: z.array(z.enum(CONSENT_CHANNELS)).min(1, "Choose at least one way to send the request.").max(3),
    })
    .optional(),
});

export const POST = route({ capability: "check.run", body }, async ({ req, ctx, body }) =>
  startChecks(orgCtx(ctx), body, new URL(req.url).origin),
);
