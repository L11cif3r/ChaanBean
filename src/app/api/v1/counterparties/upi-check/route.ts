import { z } from "zod";
import { checkUpi } from "@/server/counterparties/service";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";

// S06 marker 4: bank-linked mobile check before save (FR-CP-03). The result is kept server-side and attached on save.
const body = z.object({ mobile: z.string().max(16) });

export const POST = route({ capability: "counterparty.manage", body }, async ({ ctx, body }) => checkUpi(orgCtx(ctx), body.mobile));
