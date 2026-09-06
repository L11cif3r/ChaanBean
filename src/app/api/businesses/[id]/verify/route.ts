import { NextResponse } from "next/server";
import { runBusinessVerification } from "@/lib/services/business/verification-orchestrator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    runBusinessVerification(id).catch(console.error);
    return NextResponse.json({ success: true, message: "Verification re-initiated" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
