import { orgCtx } from "@/server/counterparties/routes";
import { evidencePack } from "@/server/evidence/pack";
import { route } from "@/server/http";
import { fileResponse } from "@/server/transactions/routes";

// v3 15 GET /transactions/{id}/evidence (FR-BS-09): sealed PDF, attachments, acceptance certificate, activity log and
// the section 63 draft, in one ZIP.
export const GET = route({ capability: "report.export" }, async ({ ctx, params }) => {
  const pack = await evidencePack(orgCtx(ctx), "transaction", String(params.id));
  return fileResponse(pack.bytes, pack.name, "application/zip", false);
});
