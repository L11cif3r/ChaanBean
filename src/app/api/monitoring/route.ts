import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCompanyMonitoringSummary,
  setCreditHold,
  revokeCreditHold,
  updateAlertStatus,
} from "@/lib/services/monitoring-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const authTenantId = request.headers.get("x-tenant-id") || (match ? decodeURIComponent(match[1]) : undefined);
    const companyId = authTenantId || searchParams.get("companyId") || undefined;
    const summary = await getCompanyMonitoringSummary(companyId);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("[api/monitoring] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch monitoring summary" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const authTenantId = request.headers.get("x-tenant-id") || (match ? decodeURIComponent(match[1]) : undefined);

    const body = await request.json();
    const { action } = body;

    // Verify tenant ownership of creditAccount if provided
    if (body.creditAccountId) {
      const account = await prisma.creditAccount.findUnique({
        where: { id: body.creditAccountId },
        include: { buyer: true },
      });
      if (!account) {
        return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
      }
      if (authTenantId && account.buyer.companyId !== authTenantId) {
        return NextResponse.json({ error: "Forbidden: Account belongs to another tenant" }, { status: 403 });
      }
    }

    if (action === "hold") {
      const result = await setCreditHold(body.creditAccountId, body.reason || "Underwriter review", body.placedBy);
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
