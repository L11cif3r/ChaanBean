import { z } from "zod";
import { route } from "@/server/http";
import { requireOps } from "@/server/ops";
import { opsStartMcaImport } from "@/server/ops-service";

// Ops: import (or refresh) one state of the MCA master data into the search copy (v4 2.3, 14.3).
const body = z.object({ state: z.string().trim().min(2).max(60) });
export const POST = route({ body }, async ({ body }) => opsStartMcaImport(await requireOps(), body.state));
