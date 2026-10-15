import { z } from "zod";
import { setActiveOrg, updateSessionStrictness } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { route } from "@/server/http";

// FR-AUTH-05: switch the active organisation. Only organisations the user is an active member of.
const body = z.object({ orgId: z.uuid() });

export const POST = route({ auth: "user", body }, async ({ ctx, body }) => {
  const membership = ctx.memberships.find((m) => m.orgId === body.orgId);
  if (!membership) throw new AppError("forbidden", "You are not a member of this organisation.");
  await setActiveOrg(body.orgId);
  await updateSessionStrictness(membership.role === "owner" || membership.role === "admin");
  return { orgId: body.orgId, role: membership.role };
});
