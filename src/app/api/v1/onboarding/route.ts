import { requireUserId } from "@/lib/company-check/auth";
import { errorResponse, ok, readJson } from "@/lib/company-check/http";
import { createOrganisationForUser } from "@/lib/company-check/service";

export const dynamic = "force-dynamic";

// POST /api/v1/onboarding — first sign-in creates the user's organisation (KYC PENDING)
export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    return ok(await createOrganisationForUser(userId, await readJson(req)), 201);
  } catch (e) {
    return errorResponse(e);
  }
}
