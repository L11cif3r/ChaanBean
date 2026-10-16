import { route } from "@/server/http";
import { tokenOf, visitor } from "@/server/consent/routes";
import { consentPage } from "@/server/consent/service";
import { AppError } from "@/server/errors";

// v3 15: what the consent page shows (S10).
export const GET = route({ auth: "public" }, async ({ ctx, params }) => {
  const view = await consentPage(tokenOf(params), visitor(ctx));
  if (!view) throw new AppError("not_found", "This link is not valid.");
  return view;
});
