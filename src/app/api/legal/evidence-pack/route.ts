import { NextResponse } from "next/server";
import { generateEvidenceBundle } from "@/lib/services/legal-advisor-service";
import { prisma } from "@/lib/db";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

export async function GET(request: Request) {
  try {
    const company = await resolveTenantCompany(request);

    if (!company) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    const packs = await prisma.legalEvidencePack.findMany({
      where: {
        creditAccount: {
          buyer: {
            companyId: company.id,
          },
        },
        ...(caseId ? { arbitrationCaseId: caseId } : {}),
      },
      include: {
        creditAccount: {
          include: { buyer: true },
        },
      },
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
    const company = await resolveTenantCompany(request);

    if (!company) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.creditAccountId) {
      return NextResponse.json({ error: "creditAccountId is required" }, { status: 400 });
    }

    const account = await prisma.creditAccount.findUnique({
      where: { id: body.creditAccountId },
      include: { buyer: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
    }

    if (account.buyer.companyId !== company.id) {
      return NextResponse.json({ error: "Forbidden: Cross-tenant access denied." }, { status: 403 });
    }

    const pack = await generateEvidenceBundle({
      creditAccountId: body.creditAccountId,
      arbitrationCaseId: body.arbitrationCaseId,
      title: body.title || `Evidence Bundle - ${account.buyer.name}`,
      documents: body.documents || [],
      generatedBy: body.generatedBy || "Legal Desk",
    });

    return NextResponse.json(pack);
  } catch (error: any) {
    console.error("[api/legal/evidence-pack] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate evidence pack" }, { status: 500 });
  }
}
