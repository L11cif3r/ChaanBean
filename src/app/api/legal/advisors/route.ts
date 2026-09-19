import { NextResponse } from "next/server";
import { getLegalAdvisors, matchAdvisorForCase, recordLegalFee } from "@/lib/services/legal-advisor-service";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jurisdiction = searchParams.get("jurisdiction") || undefined;
    const specialization = searchParams.get("specialization") || undefined;

    const advisors = await getLegalAdvisors({ jurisdiction, specialization });
    return NextResponse.json(advisors);
  } catch (error: any) {
    console.error("[api/legal/advisors] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch legal advisors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "match") {
      const bestAdvisor = await matchAdvisorForCase(body.caseId);
      return NextResponse.json({ matchedAdvisor: bestAdvisor });
    }

    if (action === "assign") {
      const updatedCase = await prisma.arbitrationCase.update({
        where: { id: body.caseId },
        data: {
          assignedAdvisorId: body.advisorId,
          status: "hearing_scheduled",
        },
        include: { assignedAdvisor: true },
      });
      return NextResponse.json(updatedCase);
    }

    if (action === "record_fee") {
      const fee = await recordLegalFee({
        arbitrationCaseId: body.caseId,
        advisorId: body.advisorId,
        feeType: body.feeType,
        amount: parseFloat(body.amount),
        paymentStatus: body.paymentStatus,
        transactionRef: body.transactionRef,
      });
      return NextResponse.json(fee);
    }

    if (action === "create_advisor") {
      const advisor = await prisma.legalAdvisor.create({
        data: {
          name: body.name,
          firmName: body.firmName,
          barCouncilNo: body.barCouncilNo,
          specialization: body.specialization,
          jurisdiction: body.jurisdiction,
          contactEmail: body.contactEmail,
          phone: body.phone,
          status: "verified",
        },
      });
      return NextResponse.json(advisor);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[api/legal/advisors] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process advisor action" }, { status: 500 });
  }
}
