import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { resendToCounterparty } from "@/server/transactions/service";

// S16 "Resend copy to counterparty": the link again (or the sealed copy once accepted).
export const POST = route({ capability: "transaction.manage" }, async ({ ctx, params }) => resendToCounterparty(orgCtx(ctx), String(params.id)));
