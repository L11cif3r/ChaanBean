import { route } from "@/server/http";
import { resendInvite } from "@/server/team/service";

export const POST = route({ capability: "team.manage" }, async ({ ctx, params, req }) => {
  await resendInvite({ ...ctx, user: ctx.user!, orgId: ctx.orgId!, role: ctx.role! }, String(params.id), new URL(req.url).origin);
  return { resent: true };
});
