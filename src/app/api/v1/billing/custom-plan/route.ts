import { z } from "zod";
import { normaliseMobile } from "@/lib/validators";
import { requestCustomPlan } from "@/server/billing/service";
import { route } from "@/server/http";
import { fullName } from "@/server/onboarding/schemas";

// S03 marker 4: "Need Something Different? Get a custom plan tailored to your specific needs."
const body = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80, "Enter a name.").pipe(fullName),
  mobile: z.string().refine((v) => normaliseMobile(v) !== null, "Enter a valid mobile number."),
  expectedChecks: z.number("Enter a number.").int("Enter a whole number.").min(0, "Enter a number.").max(1_000_000, "Enter a smaller number.").nullable(),
  message: z.string().trim().max(1000, "Keep the message under 1,000 characters.").nullable(),
});

export const POST = route({ capability: "billing.manage", body }, async ({ ctx, body }) =>
  requestCustomPlan({ ...ctx, user: ctx.user!, orgId: ctx.orgId! }, { ...body, message: body.message || null }),
);
