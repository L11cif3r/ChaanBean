import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { debtorName, debtorGstin, debtorPan, amountDefaulted, defaultDate, notes } = body;

    if (!debtorName || !amountDefaulted) {
      return NextResponse.json({ error: "Debtor name and amount defaulted are required" }, { status: 400 });
    }

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: "No company account active" }, { status: 400 });
    }

    const record = await prisma.communityDefault.create({
      data: {
        reportingCompanyId: company.id,
        debtorName,
        debtorGstin: debtorGstin || null,
        debtorPan: debtorPan || null,
        amountDefaulted: parseFloat(amountDefaulted),
        defaultDate: defaultDate ? new Date(defaultDate) : new Date(),
        notes: notes || "Peer-reported commercial default via Trust Hub network",
        verified: true,
      },
    });

    // Check if debtor exists in our buyers list; if so, re-evaluate their risk flag (forces Red signal!)
    const matchingBuyers = await prisma.buyerDebtor.findMany({
      where: {
        OR: [
          debtorGstin ? { gstin: debtorGstin } : {},
          debtorPan ? { pan: debtorPan } : {},
          { name: { contains: debtorName } },
        ],
      },
    });

    for (const b of matchingBuyers) {
      await refreshBuyerRiskFlag(b.id, 1); // 1 peer default forces hard Red flag!
    }

    return NextResponse.json({
      success: true,
      message: `Community default of ₹${parseFloat(amountDefaulted).toLocaleString("en-IN")} published to Trust Hub. Associated risk flags updated.`,
      defaultId: record.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to report community default" },
      { status: 500 }
    );
  }
}
