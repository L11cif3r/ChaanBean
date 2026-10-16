import { z } from "zod";
import { gstFetch } from "@/server/counterparties/service";
import { route } from "@/server/http";

// S06 marker 2: GSTIN plus Fetch fills legal name, PAN and address (FR-CP-02).
const body = z.object({ gstin: z.string().max(20) });

export const POST = route({ capability: "counterparty.manage", body }, async ({ body }) => gstFetch(body.gstin));
