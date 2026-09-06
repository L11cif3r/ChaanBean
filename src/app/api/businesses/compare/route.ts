import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { businessIds } = await req.json();
    if (!Array.isArray(businessIds) || businessIds.length < 2 || businessIds.length > 3) {
      return NextResponse.json({ error: "Provide 2 or 3 business IDs to compare" }, { status: 400 });
    }

    const businesses = await prisma.businessProfile.findMany({
      where: { id: { in: businessIds } },
      include: {
        yearSummaries: { orderBy: { fiscalYear: "asc" } },
        riskFlag: true,
        creditRec: true,
        riskSignals: true,
        _count: { select: { financialDocuments: true, courtCases: true } },
      },
    });

    return NextResponse.json({ businesses });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
