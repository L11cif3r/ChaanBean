import { z } from "zod";
import { setActiveOrg, updateSessionStrictness } from "@/server/auth/session";
import { route } from "@/server/http";
import { acceptInvite } from "@/server/team/service";

// Accept an invitation as the signed-in user; the invited mobile must match the signed-in phone.
const body = z.object({ token: z.string().min(20).max(100) });

export const POST = route({ auth: "user", body }, async ({ ctx, body }) => {
  const joined = await acceptInvite({ ...ctx, user: ctx.user! }, body.token);
  await setActiveOrg(joined.org_id);
  await updateSessionStrictness(joined.role === "admin");
  return { orgId: joined.org_id, role: joined.role, next: "/dashboard" };
});
