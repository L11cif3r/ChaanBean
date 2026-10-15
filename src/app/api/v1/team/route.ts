import { route } from "@/server/http";
import { listTeam } from "@/server/team/service";

// S18: members, pending invitations, access requests and seats (Owner and Admin).
export const GET = route({ capability: "team.manage" }, async ({ ctx }) =>
  listTeam({ ...ctx, user: ctx.user!, orgId: ctx.orgId!, role: ctx.role! }),
);
