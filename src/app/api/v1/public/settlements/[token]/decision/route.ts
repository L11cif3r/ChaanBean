import { z } from "zod";
import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { decideSettlement } from "@/server/settlements/public";
import { visitor } from "@/server/transactions/routes";

// FR-ES-03: accept with the OTP and the acknowledgement, reject, or propose another amount or other dates.
const row = z.object({ dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."), amountPaise: z.number().int().positive("Enter an amount.") });
const body = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("ACCEPT"),
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
    acknowledged: z.literal(true, "Please tick to confirm."),
    acceptedName: z.string().trim().max(120).optional(),
  }),
  z.object({
    decision: z.literal("COUNTER"),
    amountPaise: z.number().int().positive("Enter the amount you can pay."),
    mode: z.enum(["full", "instalments"]),
    fullDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.").optional(),
    instalments: z.array(row).max(24).default([]),
    comment: z.string().trim().max(1000).default(""),
  }),
  z.object({ decision: z.literal("REJECT"), comment: z.string().trim().max(1000).optional() }),
]);

export const POST = route({ auth: "public", body }, async ({ ctx, body, params }) => decideSettlement(tokenOf(params), body, visitor(ctx)));
