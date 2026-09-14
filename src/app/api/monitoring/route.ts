import { NextResponse } from "next/server";
import {
  getCompanyMonitoringSummary,
  setCreditHold,
  revokeCreditHold,
  updateAlertStatus,
} from "@/lib/services/monitoring-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || undefined;
    const summary = await getCompanyMonitoringSummary(companyId);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("[api/monitoring] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch monitoring summary" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "hold") {
      const result = await setCreditHold(body.creditAccountId, body.reason, body.placedBy);
      return NextResponse.json(result);
    }

    if (action === "revoke_hold") {
      const result = await revokeCreditHold(body.creditAccountId, body.revokedBy);
      return NextResponse.json(result);
    }

    if (action === "update_alert") {
      const result = await updateAlertStatus(body.alertId, body.status, body.actorName);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[api/monitoring] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process monitoring action" }, { status: 500 });
  }
}
