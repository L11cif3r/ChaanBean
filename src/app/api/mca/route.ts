import { NextResponse } from "next/server";
import {
  fetchLiveMcaCompanyData,
  syncMcaLiveRecordToBusiness,
  vetMcaDin,
  deriveMcaDirectorsFromCompany,
  getMcaApiKey,
} from "@/lib/services/business/mca-adapter";

export const dynamic = "force-dynamic";

/**
 * GET /api/mca?cin=U... or ?companyName=... or ?din=0...
 * Returns real-time MCA21 company master data & DIN vetting from data.gov.in
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cin = searchParams.get("cin");
    const companyName = searchParams.get("companyName");
    const din = searchParams.get("din");
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 5;

    // 1. Direct DIN Vetting lookup
    if (din) {
      const vetting = vetMcaDin(din);
      return NextResponse.json({
        success: true,
        source: "Ministry of Corporate Affairs (MCA21 Portal / data.gov.in)",
        dinVetting: vetting,
      });
    }

    if (!cin && !companyName) {
      return NextResponse.json(
        { error: "Either 'cin', 'companyName', or 'din' query parameter is required." },
        { status: 400 }
      );
    }

    const result = await fetchLiveMcaCompanyData({
      cin,
      companyName,
      limit,
    });

    // Enrich with statutory directors for matched records
    const enrichedRecords = result.records.map(record => ({
      ...record,
      directors: deriveMcaDirectorsFromCompany(record),
    }));

    return NextResponse.json({
      ...result,
      records: enrichedRecords,
    });
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
 *   - "search": Look up live MCA records & directors
 *   - "vet_din": Instant statutory DIN vetting check
 *   - "sync_business": Fetch and persist live MCA data directly into a BusinessProfile
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "search", cin, companyName, din, businessId, actor } = body;

    // 1. DIN Vetting action
    if (action === "vet_din" || din) {
      const vetting = vetMcaDin(din || cin);
      return NextResponse.json({
        success: true,
        source: "Ministry of Corporate Affairs (MCA21 Portal / data.gov.in)",
        dinVetting: vetting,
      });
    }

    // 2. Business profile synchronization
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

      const recordWithDirectors = syncRes.record
        ? {
            ...syncRes.record,
            directors: deriveMcaDirectorsFromCompany(syncRes.record),
          }
        : undefined;

      return NextResponse.json({
        success: true,
        message: "Business profile successfully authenticated and updated with official MCA21 master data.",
        record: recordWithDirectors,
        sourceRecordId: syncRes.sourceRecordId,
      });
    }

    // 3. Search action
    const result = await fetchLiveMcaCompanyData({ cin, companyName });
    const enrichedRecords = result.records.map(record => ({
      ...record,
      directors: deriveMcaDirectorsFromCompany(record),
    }));

    return NextResponse.json({
      ...result,
      records: enrichedRecords,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
