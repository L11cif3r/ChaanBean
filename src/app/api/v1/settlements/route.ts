import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { createSettlement, listSettlements } from "@/server/settlements/service";

// v3 15: list E-Settlements, and create one (S17). The body is checked by settlementSchema in the service.
const query = z.object({ counterparty: z.uuid().optional(), transaction: z.uuid().optional() });

export const GET = route({ capability: "report.view", query }, async ({ ctx, query }) =>
  listSettlements(orgCtx(ctx), { counterpartyId: query.counterparty, transactionId: query.transaction }),
);

export const POST = route({ capability: "settlement.manage", body: z.unknown() }, async ({ ctx, body }) => createSettlement(orgCtx(ctx), body));
