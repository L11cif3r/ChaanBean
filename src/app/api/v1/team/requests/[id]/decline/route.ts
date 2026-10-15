import { route } from "@/server/http";
import { declineAccessRequest } from "@/server/team/service";

export const POST = route({ capability: "team.manage" }, async ({ ctx, params }) => {
  await declineAccessRequest({ ...ctx, user: ctx.user!, orgId: ctx.orgId!, role: ctx.role! }, String(params.id));
  return { declined: true };
});
