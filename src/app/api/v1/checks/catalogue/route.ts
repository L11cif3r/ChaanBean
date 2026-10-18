import { z } from "zod";
import { caseDefaults, checkCatalogue } from "@/server/checks/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// v3 15: the checks that can run for one counterparty on a tab, with price, plan units left and any recent result.
// Case Check also gets the search form pre-filled from the counterparty (S12 marker 1).
const query = z.object({
  counterparty: z.uuid("Choose a counterparty."),
  tab: z.enum(["CREDIT_WORTHINESS", "CASE_CHECK"]).default("CREDIT_WORTHINESS"),
});

export const GET = route({ capability: "check.run", query }, async ({ ctx, query }) => {
  const c = orgCtx(ctx);
  if (query.tab === "CASE_CHECK") {
    const [catalogue, defaults] = await Promise.all([checkCatalogue(c, query.counterparty, "case_check"), caseDefaults(c, query.counterparty)]);
    return { ...catalogue, defaults };
  }
  return checkCatalogue(c, query.counterparty);
});
