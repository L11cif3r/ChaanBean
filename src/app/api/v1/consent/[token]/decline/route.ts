import { route } from "@/server/http";
import { tokenOf, visitor } from "@/server/consent/routes";
import { declineConsent } from "@/server/consent/service";

// S10: declining is one tap (the page asks once to confirm). No reason is asked.
export const POST = route({ auth: "public" }, async ({ ctx, params }) => declineConsent(tokenOf(params), visitor(ctx)));
