import { route } from "@/server/http";
import { tokenOf, visitor } from "@/server/consent/routes";
import { withdrawConsent } from "@/server/consent/service";

// S10 / v3 FR-CON-08: withdraw from the same link, after the OTP.
export const POST = route({ auth: "public" }, async ({ ctx, params }) => withdrawConsent(tokenOf(params), visitor(ctx)));
