import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";

export async function GET() {
  const company = await prisma.company.findFirst();
  if (!company) {
    return NextResponse.json({ buyers: [] });
  }

  const buyers = await prisma.buyerDebtor.findMany({
    where: { companyId: company.id },
    include: {
      creditAccounts: true,
      riskFlags: { orderBy: { computedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ buyers });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      pan,
      gstin,
      mobile,
      language = "en",
      email,
      address,
      initialAmount = 0,
      overdueDays = 0,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Buyer name is required" }, { status: 400 });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: "No active company profile" }, { status: 400 });
    }

    const mobileArray = Array.isArray(mobile) ? mobile : [mobile || "9876543210"];

    const buyer = await prisma.buyerDebtor.create({
      data: {
        companyId: company.id,
        name,
        pan: pan ? pan.toUpperCase() : null,
        gstin: gstin ? gstin.toUpperCase() : null,
        mobileNumbers: JSON.stringify(mobileArray),
        language,
        email: email || null,
        address: address || null,
      },
    });

    const dueDate = new Date(Date.now() - (parseInt(overdueDays) || 0) * 86400000);
    const outstanding = isNaN(parseFloat(initialAmount)) ? 0 : Math.max(0, parseFloat(initialAmount));

    await prisma.creditAccount.create({
      data: {
        buyerId: buyer.id,
        outstandingAmount: outstanding,
        creditLimit: 0,
        dueDate,
        overdueStatus: overdueDays > 30 ? "overdue" : overdueDays > 0 ? "due" : "current",
      },
    });

    // Run parallel verification fan-out and compute risk flag immediately
    const riskResult = await refreshBuyerRiskFlag(buyer.id);

    return NextResponse.json({
      success: true,
      message: `Buyer created. Parallel verification completed with ${riskResult.flag.toUpperCase()} risk flag.`,
      buyer,
      riskFlag: riskResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create buyer" },
      { status: 500 }
    );
  }
}
