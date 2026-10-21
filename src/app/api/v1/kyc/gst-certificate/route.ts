import { z } from "zod";
import { orgCtx } from "@/server/counterparties/routes";
import { route } from "@/server/http";
import { gstCertificatePdf, initiateGstCertificate, validateGstCertificate } from "@/server/kyc/gst-certificate";

// The business's own GST registration certificate (GSTN on API Setu): OTP to the authorised signatory, then the PDF.
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("initiate"), email: z.string().max(120) }),
  z.object({ action: z.literal("validate"), txnId: z.string().min(4).max(80), otp: z.string().max(8) }),
]);

export const POST = route({ capability: "billing.manage", body }, async ({ ctx, body }) =>
  body.action === "initiate" ? initiateGstCertificate(orgCtx(ctx), body.email) : validateGstCertificate(orgCtx(ctx), body.txnId, body.otp),
);

export const GET = route({ capability: "billing.manage" }, async ({ ctx }) => {
  const { bytes, name } = await gstCertificatePdf(orgCtx(ctx));
  return new Response(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
});
