import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [riskFlag, signals] = await Promise.all([
      prisma.bizRiskFlag.findUnique({ where: { businessId: id } }),
      prisma.bizRiskSignal.findMany({ where: { businessId: id }, orderBy: { weight: "desc" } }),
    ]);
    return NextResponse.json({ riskFlag, signals });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
