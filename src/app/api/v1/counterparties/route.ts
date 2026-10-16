import { createCounterpartySchema } from "@/lib/counterparties";
import { createCounterparty, listCounterparties } from "@/server/counterparties/service";
import { listQuery, orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S05: list and search counterparties (every role). S06: add one (Owner, Admin, Member).
export const GET = route({ capability: "dashboard.view", query: listQuery }, async ({ ctx, query }) => listCounterparties(orgCtx(ctx), query));

export const POST = route({ capability: "counterparty.manage", body: createCounterpartySchema }, async ({ ctx, body }) =>
  createCounterparty(orgCtx(ctx), body),
);
