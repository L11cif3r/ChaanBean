import { requireContext } from "@/lib/company-check/auth";
import { errorResponse, ok } from "@/lib/company-check/http";
import { getCompanyCard } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";

// GET /api/v1/companies/{id}  (PRD §14 #2) — identity card, no paid data
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireContext(req);
    const { id } = await params;
    return ok(await getCompanyCard(ctx, id));
  } catch (e) {
    return errorResponse(e);
  }
}
