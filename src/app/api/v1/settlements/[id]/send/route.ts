import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { sendSettlement } from "@/server/settlements/service";

// S17 marker 5: send to the debtor for OTP acceptance (1 E-Settlement unit on first send; revisions are free).
const body = z.object({
  channels: z.array(z.enum(["sms", "whatsapp", "email"])).min(1, "Choose at least one channel.").max(3),
  linkValidDays: z.number().int().min(1).max(15).default(7),
  confirmed: z.literal(true, "Please confirm the details."),
});

export const POST = route({ capability: "settlement.manage", body }, async ({ req, ctx, params, body }) =>
  sendSettlement(orgCtx(ctx), String(params.id), body, new URL(req.url).origin),
);
