import { requireContext } from "@/lib/company-check/auth";
import { getGstCertificate } from "@/lib/company-check/gst-verification";
import { errorResponse } from "@/lib/company-check/http";

export const dynamic = "force-dynamic";

// GET /api/v1/company-checks/{id}/gst-verifications/{vid}/certificate — official GST registration certificate (PDF)
export async function GET(req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  try {
    const ctx = await requireContext(req);
    const { id, vid } = await params;
    const { gstin, pdf } = await getGstCertificate(ctx, id, vid);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="GST-Registration-Certificate-${gstin}.pdf"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
