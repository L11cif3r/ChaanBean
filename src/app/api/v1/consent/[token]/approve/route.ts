import { z } from "zod";
import { route } from "@/server/http";
import { tokenOf, visitor } from "@/server/consent/routes";
import { approveConsent } from "@/server/consent/service";

// S10 marker 6: approve, with the consent box ticked and the bureau details when CIBIL is asked.
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.").optional();
const body = z.object({
  agree: z.literal(true, "Please tick to give consent."),
  companyPan: z.string().max(10).optional(),
  incorporatedOn: date,
  personalPan: z.string().max(10).optional(),
  birthDate: date,
});

export const POST = route({ auth: "public", body }, async ({ ctx, body, params }) => approveConsent(tokenOf(params), body, visitor(ctx)));
