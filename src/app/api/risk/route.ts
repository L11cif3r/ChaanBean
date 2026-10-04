import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const tenantId = req.headers.get("x-tenant-id") || (match ? decodeURIComponent(match[1]) : undefined);

    const body = await req.json();
    const { buyerId, peerReportedDefaults } = body as {
      buyerId: string;
      peerReportedDefaults?: number;
    };

    if (!buyerId) {
      return NextResponse.json({ error: "buyerId required" }, { status: 400 });
    }

    const buyer = await prisma.buyerDebtor.findUnique({ where: { id: buyerId } });
    if (!buyer) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    if (tenantId && buyer.companyId !== tenantId) {
      return NextResponse.json({ error: "Forbidden: Buyer belongs to another tenant" }, { status: 403 });
    }

    const result = await refreshBuyerRiskFlag(buyerId, peerReportedDefaults ?? 0);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute risk score" },
      { status: 500 }
    );
  }
}
