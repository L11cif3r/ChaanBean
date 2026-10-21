import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { fileResponse } from "@/server/transactions/routes";
import { attachmentBytes } from "@/server/transactions/service";

export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => {
  const f = await attachmentBytes(orgCtx(ctx).orgId, String(params.id), String(params.aid));
  return fileResponse(f.bytes, f.name, f.type);
});
