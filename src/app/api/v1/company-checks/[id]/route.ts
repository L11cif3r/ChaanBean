import { requireContext } from "@/lib/company-check/auth";
import { errorResponse, ok } from "@/lib/company-check/http";
import { getCheckReport } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";

// GET /api/v1/company-checks/{id}  (PRD §14 #5) — progress while running, full report when done
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireContext(req);
    const { id } = await params;
    return ok(await getCheckReport(ctx, id));
  } catch (e) {
    return errorResponse(e);
  }
}
