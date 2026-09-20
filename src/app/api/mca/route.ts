import { NextResponse } from "next/server";
import {
  fetchLiveMcaCompanyData,
  syncMcaLiveRecordToBusiness,
  getMcaApiKey,
} from "@/lib/services/business/mca-adapter";

export const dynamic = "force-dynamic";

/**
 * GET /api/mca?cin=U... or ?companyName=...
 * Returns real-time MCA21 company master data from data.gov.in
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cin = searchParams.get("cin");
    const companyName = searchParams.get("companyName");
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 5;

    if (!cin && !companyName) {
      return NextResponse.json(
        { error: "Either 'cin' or 'companyName' query parameter is required." },
        { status: 400 }
      );
    }

    const result = await fetchLiveMcaCompanyData({
      cin,
      companyName,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mca
 * Actions:
 *   - "search": Look up live MCA records
 *   - "sync_business": Fetch and persist live MCA data directly into a BusinessProfile
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "search", cin, companyName, businessId, actor } = body;

    if (action === "sync_business") {
      if (!businessId) {
        return NextResponse.json(
          { error: "businessId is required to sync MCA data." },
          { status: 400 }
        );
      }

      const syncRes = await syncMcaLiveRecordToBusiness({
        businessId,
        cin,
        companyName,
        actor: actor || "USER_MCA_SYNC",
      });

      if (!syncRes.success) {
        return NextResponse.json(
          { error: syncRes.error || "Failed to sync MCA data." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Business profile successfully authenticated and updated with official MCA21 master data.",
        record: syncRes.record,
        sourceRecordId: syncRes.sourceRecordId,
      });
    }

    // Default search
    const result = await fetchLiveMcaCompanyData({ cin, companyName });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
