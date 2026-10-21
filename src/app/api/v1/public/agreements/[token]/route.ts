import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { AppError } from "@/server/errors";
import { agreementPage } from "@/server/transactions/public";
import { visitor } from "@/server/transactions/routes";

// v3 15: the agreement page data (S15). Opening it marks the agreement Viewed.
export const GET = route({ auth: "public" }, async ({ ctx, params }) => {
  const view = await agreementPage(tokenOf(params), visitor(ctx));
  if (!view) throw new AppError("not_found", "This link is not valid.");
  return view;
});
