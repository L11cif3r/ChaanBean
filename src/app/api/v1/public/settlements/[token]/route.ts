import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { AppError } from "@/server/errors";
import { settlementPage } from "@/server/settlements/public";
import { visitor } from "@/server/transactions/routes";

// The settlement page data for the debtor. Opening it marks the settlement Viewed.
export const GET = route({ auth: "public" }, async ({ ctx, params }) => {
  const view = await settlementPage(tokenOf(params), visitor(ctx));
  if (!view) throw new AppError("not_found", "This link is not valid.");
  return view;
});
