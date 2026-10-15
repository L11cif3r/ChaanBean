import { z } from "zod";
import { route } from "@/server/http";
import { lookupGstin } from "@/server/onboarding/service";

// S02 marker 4: look up a GSTIN. Format and checksum are checked before any provider call (FR-ORG-01).
const body = z.object({ gstin: z.string().trim().min(1, "This GSTIN is not valid. Check and try again.").max(20) });

export const POST = route({ auth: "user", body }, async ({ ctx, body }) => lookupGstin({ ...ctx, user: ctx.user! }, body.gstin));
