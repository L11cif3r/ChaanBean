import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const logs = await prisma.bizAuditLog.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ auditLogs: logs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
