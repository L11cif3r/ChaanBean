import { z } from "zod";
import { route } from "@/server/http";
import { requestAccess } from "@/server/onboarding/service";
import { fullName } from "@/server/onboarding/schemas";

// S02: "This business already has an account. Ask its Owner to invite you." with a request-access option (FR-ORG-03).
const body = z.object({ gstin: z.string().trim().length(15), name: fullName });

export const POST = route({ auth: "user", body }, async ({ ctx, body }) => requestAccess({ ...ctx, user: ctx.user! }, body.gstin, body.name));
