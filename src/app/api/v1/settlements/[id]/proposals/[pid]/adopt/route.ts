import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { adoptProposal } from "@/server/settlements/service";

// "Accept proposal": the debtor's amount and dates become the terms and go back for OTP acceptance (free).
export const POST = route({ capability: "settlement.manage" }, async ({ req, ctx, params }) =>
  adoptProposal(orgCtx(ctx), String(params.id), String(params.pid), new URL(req.url).origin),
);
