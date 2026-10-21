import { orgCtx } from "@/server/counterparties/routes";
import { evidencePack } from "@/server/evidence/pack";
import { route } from "@/server/http";
import { fileResponse } from "@/server/transactions/routes";

// FR-BS-09: evidence pack ZIP for a sealed E-Settlement.
export const GET = route({ capability: "report.export" }, async ({ ctx, params }) => {
  const pack = await evidencePack(orgCtx(ctx), "settlement", String(params.id));
  return fileResponse(pack.bytes, pack.name, "application/zip", false);
});
