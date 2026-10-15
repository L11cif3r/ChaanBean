import { z } from "zod";
import { route } from "@/server/http";
import { confirmEmail } from "@/server/onboarding/service";

// S02 marker 6: confirm a work email from the link. The token is the credential, so no sign-in is needed.
const body = z.object({ token: z.string().min(20).max(100) });

export const POST = route({ auth: "public", body }, async ({ body }) => confirmEmail(body.token));
