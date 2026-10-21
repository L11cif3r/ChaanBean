import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { fileResponse } from "@/server/transactions/routes";
import { previewPdf } from "@/server/transactions/service";

// S14 marker 1: the agreement as the counterparty will see it, or the sealed copy once accepted.
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => {
  const pdf = await previewPdf(orgCtx(ctx), String(params.id));
  return fileResponse(pdf.bytes, pdf.name, "application/pdf");
});
