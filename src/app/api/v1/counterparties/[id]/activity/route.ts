import { counterpartyActivity, getCounterparty } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S07 Activity tab: every change to the counterparty, from the audit log.
export const GET = route({ capability: "dashboard.view" }, async ({ ctx, params }) => {
  const c = orgCtx(ctx);
  await getCounterparty(c, String(params.id));
  return { items: await counterpartyActivity(c, String(params.id)) };
});
