import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveMcaManualEntry } from "@/lib/services/business/mca-adapter";
import { saveGstManualEntry } from "@/lib/services/business/gst-adapter";
import { saveUdyamManualEntry } from "@/lib/services/business/udyam-adapter";
import { saveCourtCaseManualEntry } from "@/lib/services/business/ecourts-adapter";
import { rerunAnalysis } from "@/lib/services/business/verification-orchestrator";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    const biz = await prisma.businessProfile.findUnique({ where: { id: businessId } });
    if (!biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const tenantId = req.headers.get("x-tenant-id") || (match ? match[1] : undefined);
    if (tenantId && biz.createdBy && biz.createdBy !== tenantId) {
      return NextResponse.json({ error: "Forbidden: Cross-tenant access denied." }, { status: 403 });
    }

    const body = await req.json();
    const { type, payload, actor } = body;

    if (!type || !payload) {
      return NextResponse.json({ error: "type and payload required" }, { status: 400 });
    }

    let resultId: string | string[] | undefined;

    switch (type) {
      case "MCA":
        resultId = await saveMcaManualEntry({ businessId, payload, actor });
        break;
      case "GST":
        resultId = await saveGstManualEntry({ businessId, payload, actor });
        break;
      case "UDYAM":
        resultId = await saveUdyamManualEntry({ businessId, payload, actor });
        break;
      case "ECOURTS":
        resultId = await saveCourtCaseManualEntry({ businessId, cases: payload, actor });
        break;
      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    // Re-run analysis after new data
    rerunAnalysis(businessId).catch(console.error);

    return NextResponse.json({ success: true, id: resultId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
