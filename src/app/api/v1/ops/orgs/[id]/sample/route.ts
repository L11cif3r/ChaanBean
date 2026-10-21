import { z } from "zod";
import { route } from "@/server/http";
import { requireOps } from "@/server/ops";
import { setSampleMode } from "@/server/ops-service";

// Ops: sample data mode for one organisation (v4 FR-MK-01). Off for real customers.
const body = z.object({ on: z.boolean() });
export const POST = route({ body }, async ({ params, body }) => setSampleMode(await requireOps(), String(params.id), body.on));
