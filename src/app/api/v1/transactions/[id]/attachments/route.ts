import { AppError } from "@/server/errors";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { addAttachment } from "@/server/transactions/service";

// GST bill, delivery challan or contract (PDF, JPG, PNG; 10 MB; 5 files).
export const POST = route({ capability: "transaction.manage" }, async ({ req, ctx, params }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new AppError("validation_failed", "Choose a file.", { file: "Choose a file." });
  return addAttachment(orgCtx(ctx), String(params.id), file);
});
