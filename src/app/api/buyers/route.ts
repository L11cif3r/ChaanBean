import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

export async function GET(req: Request) {
  const company = await resolveTenantCompany(req);

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

    const company = await resolveTenantCompany(req);

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

    const numOverdueDays = Math.max(0, parseInt(String(overdueDays), 10) || 0);
    const dueDate = new Date(Date.now() - numOverdueDays * 86400000);
    const outstanding = isNaN(parseFloat(String(initialAmount))) ? 0 : Math.max(0, parseFloat(String(initialAmount)));

    await prisma.creditAccount.create({
      data: {
        buyerId: buyer.id,
        outstandingAmount: outstanding,
        creditLimit: 0,
        dueDate,
        overdueStatus: numOverdueDays > 30 ? "overdue" : numOverdueDays > 0 ? "due" : "current",
      },
    });

    // Decouple heavy risk flag calculation into non-blocking background task
    refreshBuyerRiskFlag(buyer.id).catch((riskErr) => {
      console.warn("Buyer created, background risk refresh deferred:", riskErr);
    });

    return NextResponse.json({
      success: true,
      message: "Buyer created successfully. Background verification and risk scoring initiated.",
      buyer,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create buyer" },
      { status: 500 }
    );
  }
}
