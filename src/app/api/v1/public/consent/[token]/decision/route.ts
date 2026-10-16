import { z } from "zod";
import { route } from "@/server/http";
import { tokenOf, visitor } from "@/server/consent/routes";
import { approveConsent, declineConsent } from "@/server/consent/service";

// S10 marker 6: approve (after the OTP, GST access and the consent box) or decline with one tap.
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.").optional();
const body = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    agree: z.literal(true, "Please tick to give consent."),
    companyPan: z.string().max(10).optional(),
    incorporatedOn: date,
    personalPan: z.string().max(10).optional(),
    birthDate: date,
  }),
  z.object({ decision: z.literal("DECLINE") }),
]);

export const POST = route({ auth: "public", body }, async ({ ctx, body, params }) => {
  if (body.decision === "DECLINE") return declineConsent(tokenOf(params), visitor(ctx));
  return approveConsent(tokenOf(params), {
    agree: body.agree, companyPan: body.companyPan, incorporatedOn: body.incorporatedOn, personalPan: body.personalPan, birthDate: body.birthDate,
  }, visitor(ctx));
});
