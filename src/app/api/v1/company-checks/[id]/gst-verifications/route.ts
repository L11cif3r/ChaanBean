import { requireContext } from "@/lib/company-check/auth";
import { listGstVerifications, startGstVerification } from "@/lib/company-check/gst-verification";
import { errorResponse, ok, readJson } from "@/lib/company-check/http";

export const dynamic = "force-dynamic";

// POST /api/v1/company-checks/{id}/gst-verifications — send an OTP to the buyer's primary authorised signatory
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireContext(req);
    const { id } = await params;
    return ok(await startGstVerification(ctx, id, await readJson(req)), 201);
  } catch (e) {
    return errorResponse(e);
  }
}

// GET /api/v1/company-checks/{id}/gst-verifications — verification history for this check
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireContext(req);
    const { id } = await params;
    return ok(await listGstVerifications(ctx, id));
  } catch (e) {
    return errorResponse(e);
  }
}
