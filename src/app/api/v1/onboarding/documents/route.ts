import { AppError } from "@/server/errors";
import { route } from "@/server/http";
import { storeOnboardingDocument } from "@/server/onboarding/service";

// S02 manual review: upload a GST certificate or PAN card (PDF, JPG or PNG, up to 10 MB; FR-ORG-04).
export const POST = route({ auth: "user" }, async ({ ctx, req }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new AppError("validation_failed", "Please choose a file.", { file: "Choose a PDF, JPG or PNG file." });
  return storeOnboardingDocument({ ...ctx, user: ctx.user! }, file);
});
