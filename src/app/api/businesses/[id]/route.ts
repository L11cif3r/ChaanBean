import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await prisma.businessProfile.findUnique({
      where: { id },
      include: {
        identifiers: true,
        sourceRecords: { orderBy: { fetchedAt: "desc" } },
        financialDocuments: { orderBy: { uploadedAt: "desc" } },
        yearSummaries: { orderBy: { fiscalYear: "asc" } },
        consistencyChecks: true,
        riskSignals: true,
        riskFlag: true,
        creditRec: true,
        courtCases: { orderBy: { createdAt: "desc" } },
        verificationTasks: true,
        manualReviews: { where: { status: "OPEN" }, orderBy: { createdAt: "desc" } },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const cookieHeader = _req.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const tenantId = _req.headers.get("x-tenant-id") || (match ? match[1] : undefined);
    if (tenantId && business.createdBy && business.createdBy !== tenantId) {
      return NextResponse.json({ error: "Forbidden: Cross-tenant access denied." }, { status: 403 });
    }

    return NextResponse.json({ business });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.businessProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const tenantId = req.headers.get("x-tenant-id") || (match ? match[1] : undefined);
    if (tenantId && existing.createdBy && existing.createdBy !== tenantId) {
      return NextResponse.json({ error: "Forbidden: Cross-tenant access denied." }, { status: 403 });
    }

    const body = await req.json();

    const allowedFields = [
      "companyName", "gstin", "cin", "pan", "udyamNo", "phone",
      "registeredAddr", "enterpriseType", "industryCode", "primaryActivity",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const updated = await prisma.businessProfile.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, business: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
