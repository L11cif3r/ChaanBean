import { z } from "zod";
import { route } from "@/server/http";
import { verifyDocument } from "@/server/transactions/verify";

// v3 15 / S22: verify a sealed document by reference, and by the SHA-256 the browser worked out from the PDF.
const query = z.object({ sha256: z.string().toLowerCase().optional() });

export const GET = route({ auth: "public", query }, async ({ ctx, params, query }) =>
  verifyDocument(String(params.reference), query.sha256 ?? null, ctx.ip),
);
