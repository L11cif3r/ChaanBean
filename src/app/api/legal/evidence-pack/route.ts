import { NextResponse } from "next/server";
import { generateEvidenceBundle } from "@/lib/services/legal-advisor-service";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    const packs = await prisma.legalEvidencePack.findMany({
      where: caseId ? { arbitrationCaseId: caseId } : {},
      orderBy: { certifiedAt: "desc" },
    });

    return NextResponse.json(packs);
  } catch (error: any) {
    console.error("[api/legal/evidence-pack] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch evidence packs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pack = await generateEvidenceBundle({
      creditAccountId: body.creditAccountId,
      arbitrationCaseId: body.arbitrationCaseId,
      title: body.title,
      documents: body.documents || [],
      generatedBy: body.generatedBy,
    });

    return NextResponse.json(pack);
  } catch (error: any) {
    console.error("[api/legal/evidence-pack] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate evidence pack" }, { status: 500 });
  }
}
