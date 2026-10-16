import { z } from "zod";
import { findDuplicates } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S06: flag a duplicate GSTIN, PAN or mobile before save (FR-CP-04).
const body = z.object({ gstin: z.string().max(20).optional(), pan: z.string().max(12).optional(), mobile: z.string().max(16).optional() });

export const POST = route({ capability: "counterparty.manage", body }, async ({ ctx, body }) => ({
  matches: await findDuplicates(orgCtx(ctx), body),
}));
