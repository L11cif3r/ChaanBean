import { requireContext } from "@/lib/company-check/auth";
import { errorResponse, ok, readJson } from "@/lib/company-check/http";
import { recordDecision } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";

// POST /api/v1/company-checks/{id}/decision  (PRD §14 #9)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireContext(req);
    const { id } = await params;
    return ok(await recordDecision(ctx, id, await readJson(req)), 201);
  } catch (e) {
    return errorResponse(e);
  }
}
