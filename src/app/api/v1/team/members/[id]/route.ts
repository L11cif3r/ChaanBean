import { z } from "zod";
import { route } from "@/server/http";
import { updateMember } from "@/server/team/service";

// S18 marker 3: change a role or deactivate. The database refuses changes to the Owner and to yourself.
const body = z
  .object({ role: z.enum(["admin", "member", "viewer"]).optional(), status: z.enum(["active", "deactivated"]).optional() })
  .refine((v) => v.role || v.status, "Nothing to change.");

export const PATCH = route({ capability: "team.manage", body }, async ({ ctx, params, body }) => {
  await updateMember({ ...ctx, user: ctx.user!, orgId: ctx.orgId!, role: ctx.role! }, String(params.id), body);
  return { updated: true };
});
