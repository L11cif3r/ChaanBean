import { resendConsent } from "@/server/consent/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v3 15: send the consent link again (at most once an hour; the 72 hours do not restart).
export const POST = route({ capability: "check.run" }, async ({ ctx, params }) =>
  resendConsent(orgCtx(ctx), String(params.id), String(params.cid)),
);
