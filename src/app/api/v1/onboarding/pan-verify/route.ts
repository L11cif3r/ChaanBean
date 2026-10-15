import { z } from "zod";
import { route } from "@/server/http";
import { verifyPan } from "@/server/onboarding/service";
import { fullName } from "@/server/onboarding/schemas";

// S02 PAN path for businesses without GST (FR-ORG-02).
const body = z.object({ pan: z.string().trim().min(1, "This PAN is not valid.").max(12), panName: fullName });

export const POST = route({ auth: "user", body }, async ({ ctx, body }) => verifyPan({ ...ctx, user: ctx.user! }, body.pan, body.panName));
