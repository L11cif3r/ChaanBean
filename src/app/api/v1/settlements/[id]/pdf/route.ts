import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { previewSettlementPdf } from "@/server/settlements/service";
import { fileResponse } from "@/server/transactions/routes";

// The settlement as the debtor will see it, or the sealed copy once accepted.
export const GET = route({ capability: "report.view" }, async ({ ctx, params }) => {
  const pdf = await previewSettlementPdf(orgCtx(ctx), String(params.id));
  return fileResponse(pdf.bytes, pdf.name, "application/pdf");
});
