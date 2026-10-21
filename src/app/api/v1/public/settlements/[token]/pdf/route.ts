import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { settlementPdfFor } from "@/server/settlements/public";
import { fileResponse, visitor } from "@/server/transactions/routes";

// The full settlement (viewing is logged), or the sealed copy once accepted.
export const GET = route({ auth: "public" }, async ({ ctx, params }) => {
  const pdf = await settlementPdfFor(tokenOf(params), visitor(ctx));
  return fileResponse(pdf.bytes, pdf.name, "application/pdf");
});
