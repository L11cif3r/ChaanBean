import { requireContext } from "@/lib/company-check/auth";
import { errorResponse, ok } from "@/lib/company-check/http";
import { currentPrice } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";

// GET /api/v1/pricing/company-check  (PRD §14 #3)
export async function GET(req: Request) {
  try {
    await requireContext(req);
    return ok(await currentPrice());
  } catch (e) {
    return errorResponse(e);
  }
}
