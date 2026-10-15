import { z } from "zod";
import { normaliseMobile } from "@/lib/validators";
import { route } from "@/server/http";
import { inviteUser } from "@/server/team/service";
import { fullName, workEmail } from "@/server/onboarding/schemas";

// S18 marker 4: invite a user (FR-USR-01). Seats are checked against the plan.
const body = z.object({
  fullName: z.string().trim().min(2, "Enter a name.").max(80, "Enter a name.").pipe(fullName),
  mobile: z.string().refine((v) => normaliseMobile(v) !== null, "Enter a valid mobile number."),
  email: workEmail.or(z.email("Enter a valid email.")),
  role: z.enum(["admin", "member", "viewer"], "Select a role."),
});

export const POST = route({ capability: "team.manage", body }, async ({ ctx, body, req }) =>
  inviteUser({ ...ctx, user: ctx.user!, orgId: ctx.orgId!, role: ctx.role! }, body, new URL(req.url).origin),
);
