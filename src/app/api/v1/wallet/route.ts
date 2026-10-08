import { requireContext } from "@/lib/company-check/auth";
import { forbidden } from "@/lib/company-check/errors";
import { errorResponse, ok } from "@/lib/company-check/http";
import { getWallet } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";

// GET /api/v1/wallet  (PRD §14 #13) — owner only
export async function GET(req: Request) {
  try {
    const ctx = await requireContext(req);
    if (ctx.role !== "OWNER") throw forbidden("ROLE_FORBIDDEN", "Only the account owner can see the wallet.");
    return ok(await getWallet(ctx));
  } catch (e) {
    return errorResponse(e);
  }
}
