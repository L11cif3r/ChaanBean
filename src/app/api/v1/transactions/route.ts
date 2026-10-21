import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { createDraft, listTransactions } from "@/server/transactions/service";

// v3 15: list agreements, and create a draft (S13). The body is checked by draftSchema in the service.
const query = z.object({ status: z.string().max(30).optional(), counterparty: z.uuid().optional() });

export const GET = route({ capability: "report.view", query }, async ({ ctx, query }) =>
  listTransactions(orgCtx(ctx), { status: query.status, counterpartyId: query.counterparty }),
);

export const POST = route({ capability: "transaction.manage", body: z.unknown() }, async ({ ctx, body }) => createDraft(orgCtx(ctx), body));
