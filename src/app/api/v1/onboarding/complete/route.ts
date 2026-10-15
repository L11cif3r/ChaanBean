import { route } from "@/server/http";
import { setActiveOrg, updateSessionStrictness } from "@/server/auth/session";
import { completeOnboarding } from "@/server/onboarding/service";
import { completeSchema } from "@/server/onboarding/schemas";

// S02: create the organisation with the signed-in user as Owner (FR-ORG-01–05).
export const POST = route({ auth: "user", body: completeSchema }, async ({ ctx, body, req }) => {
  const result = await completeOnboarding({ ...ctx, user: ctx.user! }, body, new URL(req.url).origin);
  await setActiveOrg(result.orgId);
  await updateSessionStrictness(true); // the new Owner gets the 60-minute idle rule
  return { ...result, next: result.status === "active" ? "/signup/plan" : "/dashboard" };
});
