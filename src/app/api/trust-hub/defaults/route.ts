import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pan = searchParams.get("pan");
    const gstin = searchParams.get("gstin");
    const name = searchParams.get("name");

    const where: any = {};
    if (pan) where.debtorPan = pan.trim().toUpperCase();
    if (gstin) where.debtorGstin = gstin.trim().toUpperCase();
    if (name) where.debtorName = { contains: name.trim() };

    const defaults = await prisma.communityDefault.findMany({
      where,
      orderBy: { defaultDate: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      count: defaults.length,
      defaults,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch community defaults" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const company = await resolveTenantCompany(req);

    if (!company) {
      return NextResponse.json({ error: "No company account active" }, { status: 400 });
    }

    const body = await req.json();
    const { debtorName, debtorGstin, debtorPan, amountDefaulted, defaultDate, notes } = body;

    if (!debtorName || !amountDefaulted) {
      return NextResponse.json({ error: "Debtor name and amount defaulted are required" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amountDefaulted);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "amountDefaulted must be a positive number greater than 0" },
        { status: 400 }
      );
    }

    const record = await prisma.communityDefault.create({
      data: {
        reportingCompanyId: company.id,
        debtorName,
        debtorGstin: debtorGstin || null,
        debtorPan: debtorPan || null,
        amountDefaulted: parsedAmount,
        defaultDate: defaultDate ? new Date(defaultDate) : new Date(),
        notes: notes || "Peer-reported commercial default via Trust Network",
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

    if (matchingBuyers.length > 0) {
      Promise.all(matchingBuyers.map((b) => refreshBuyerRiskFlag(b.id, 1))).catch((err) =>
        console.warn("Background buyer risk flag refresh deferred:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Community default of ₹${parseFloat(amountDefaulted).toLocaleString("en-IN")} published to Trust Network. Associated risk flags updated.`,
      defaultId: record.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to report community default" },
      { status: 500 }
    );
  }
}
