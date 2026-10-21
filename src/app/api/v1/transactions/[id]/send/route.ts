import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { sendTransaction } from "@/server/transactions/service";

// S14 marker 5: send for acceptance on the chosen channels.
const body = z.object({
  channels: z.array(z.enum(["sms", "whatsapp", "email"])).min(1, "Choose at least one channel.").max(3),
  linkValidDays: z.number().int().min(1).max(15).default(7),
  confirmed: z.literal(true, "Please confirm the details."),
});

export const POST = route({ capability: "transaction.manage", body }, async ({ req, ctx, params, body }) =>
  sendTransaction(orgCtx(ctx), String(params.id), body, new URL(req.url).origin),
);
