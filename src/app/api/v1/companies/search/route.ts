import { requireContext } from "@/lib/company-check/auth";
import { errorResponse, ok } from "@/lib/company-check/http";
import { searchCompanies } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";

// GET /api/v1/companies/search?q=  (PRD §14 #1) — free
export async function GET(req: Request) {
  try {
    const ctx = await requireContext(req);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    return ok(await searchCompanies(ctx, q));
  } catch (e) {
    return errorResponse(e);
  }
}
