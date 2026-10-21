import { z } from "zod";
import { REJECT_REASONS } from "@/lib/transactions";
import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { decideAgreement } from "@/server/transactions/public";
import { visitor } from "@/server/transactions/routes";

// v3 15.3: accept with the OTP and the acknowledgement, ask for changes (comment), or reject (reason optional).
const body = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("ACCEPT"),
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
    acknowledged: z.literal(true, "Please tick to confirm."),
    acceptedName: z.string().trim().max(120).optional(),
  }),
  z.object({ decision: z.literal("CHANGES"), comment: z.string().trim().min(10, "Tell us what should change.").max(1000) }),
  z.object({ decision: z.literal("REJECT"), reason: z.enum(REJECT_REASONS).optional(), comment: z.string().trim().max(1000).optional() }),
]);

export const POST = route({ auth: "public", body }, async ({ ctx, body, params }) => decideAgreement(tokenOf(params), body, visitor(ctx)));
