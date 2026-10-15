import { audit } from "@/server/audit";
import { clearSessionCookies } from "@/server/auth/session";
import { route } from "@/server/http";
import { userClient } from "@/server/supabase/server";

// Signs out everywhere: every session of this user ends (FR-AUTH-04 "sign out ends all tokens").
export const POST = route({ auth: "public" }, async ({ ctx }) => {
  const supabase = await userClient();
  if (ctx.user) {
    await audit({ ...ctx, orgId: null }, { orgId: null, action: "auth.signed_out", entity: "user", entityId: ctx.user.id });
  }
  await supabase.auth.signOut({ scope: "global" });
  await clearSessionCookies();
  return { signedOut: true };
});
