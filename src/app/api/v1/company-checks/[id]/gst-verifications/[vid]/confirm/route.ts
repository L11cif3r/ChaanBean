import { requireContext } from "@/lib/company-check/auth";
import { confirmGstVerification } from "@/lib/company-check/gst-verification";
import { errorResponse, ok, readJson } from "@/lib/company-check/http";

export const dynamic = "force-dynamic";

// POST /api/v1/company-checks/{id}/gst-verifications/{vid}/confirm — { otp } shared by the buyer
export async function POST(req: Request, { params }: { params: Promise<{ id: string; vid: string }> }) {
  try {
    const ctx = await requireContext(req);
    const { id, vid } = await params;
    return ok(await confirmGstVerification(ctx, id, vid, await readJson(req)));
  } catch (e) {
    return errorResponse(e);
  }
}
