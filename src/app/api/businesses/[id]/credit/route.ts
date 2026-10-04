import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creditRec = await prisma.creditRecommendation.findUnique({ where: { businessId: id } });
    return NextResponse.json({ creditRecommendation: creditRec });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
