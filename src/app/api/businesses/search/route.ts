import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const flag = searchParams.get("flag");

    const businesses = await prisma.businessProfile.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { companyName: { contains: q } },
                  { gstin: { contains: q } },
                  { cin: { contains: q } },
                  { pan: { contains: q } },
                ],
              }
            : {},
          flag ? { riskFlag: { flag: flag.toUpperCase() } } : {},
        ],
      },
      include: { riskFlag: true },
      orderBy: { companyName: "asc" },
      take: 20,
    });

    return NextResponse.json({ businesses });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
