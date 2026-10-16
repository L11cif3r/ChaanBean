import { z } from "zod";
import { toJsonSafe } from "@/lib/money";
import { orderStatus } from "@/server/billing/service";
import { notFound } from "@/server/errors";
import { route } from "@/server/http";

// S03 "We are confirming your payment": the browser polls this until the gateway's webhook has been applied.
export const GET = route({ capability: "billing.manage" }, async ({ ctx, params }) => {
  const id = z.uuid().safeParse(params.id);
  if (!id.success) throw notFound("This payment");
  return toJsonSafe(await orderStatus(ctx.orgId!, id.data));
});
