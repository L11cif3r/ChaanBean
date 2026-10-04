import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runBusinessVerification } from "@/lib/services/business/verification-orchestrator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await prisma.businessProfile.findUnique({ where: { id } });
    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }
    runBusinessVerification(id).catch(console.error);
    return NextResponse.json({ success: true, message: "Verification re-initiated" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
