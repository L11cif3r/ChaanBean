import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const doc = await prisma.financialDocument.findUnique({
      where: { id: docId },
      include: { extractions: true, business: true },
    });
    if (!doc || doc.businessId !== id) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const cookieHeader = _req.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const tenantId = _req.headers.get("x-tenant-id") || (match ? match[1] : undefined);
    if (tenantId && doc.business.createdBy && doc.business.createdBy !== tenantId) {
      return NextResponse.json({ error: "Forbidden: Cross-tenant access denied." }, { status: 403 });
    }

    return NextResponse.json({ document: doc });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
