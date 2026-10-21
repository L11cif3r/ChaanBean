import { route } from "@/server/http";
import { tokenOf } from "@/server/consent/routes";
import { agreementPdfFor } from "@/server/transactions/public";
import { fileResponse, visitor } from "@/server/transactions/routes";

// S15 marker 3: the full agreement (viewing is logged), or the sealed copy once accepted.
export const GET = route({ auth: "public" }, async ({ ctx, params }) => {
  const pdf = await agreementPdfFor(tokenOf(params), visitor(ctx));
  return fileResponse(pdf.bytes, pdf.name, "application/pdf");
});
