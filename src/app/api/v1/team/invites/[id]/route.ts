import { route } from "@/server/http";
import { revokeInvite } from "@/server/team/service";

export const DELETE = route({ capability: "team.manage" }, async ({ ctx, params }) => {
  await revokeInvite({ ...ctx, user: ctx.user!, orgId: ctx.orgId!, role: ctx.role! }, String(params.id));
  return { revoked: true };
});
