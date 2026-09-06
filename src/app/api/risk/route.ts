import { NextResponse } from "next/server";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";

export async function POST(req: Request) {
  const body = await req.json();
  const { buyerId, peerReportedDefaults } = body as {
    buyerId: string;
    peerReportedDefaults?: number;
  };

  if (!buyerId) {
    return NextResponse.json({ error: "buyerId required" }, { status: 400 });
  }

  const result = await refreshBuyerRiskFlag(buyerId, peerReportedDefaults ?? 0);
  return NextResponse.json({ result });
}
