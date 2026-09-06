import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const company = await prisma.company.findFirst();
  if (!company) return NextResponse.json({ vendors: [] });

  const vendors = await prisma.vendor.findMany({
    where: { companyId: company.id },
    orderBy: { onboardingDate: "desc" },
  });

  return NextResponse.json({ vendors });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyId: explicitCompanyId,
      name,
      pan,
      gstin,
      cin,
      category = "Raw Materials",
      turnoverRange = "₹1.5Cr–5Cr",
      directorName,
      phone,
      vendors, // bulk onboarding array
    } = body;

    let company = null;
    if (explicitCompanyId) {
      company = await prisma.company.findUnique({ where: { id: explicitCompanyId } });
    }
    if (!company) {
      company = await prisma.company.findFirst();
    }
    if (!company) {
      return NextResponse.json({ error: "No active company account found." }, { status: 400 });
    }

    // 1. Handle Bulk Onboarding
    if (Array.isArray(vendors) && vendors.length > 0) {
      const createdVendors = [];
      let baseCount = await prisma.vendor.count({ where: { companyId: company.id } });

      for (const v of vendors) {
        if (!v.name) continue;
        baseCount++;
        const vendorTrustId = `VTID-${3000 + baseCount}`;
        const idHash = (v.name + (v.pan || "") + (v.gstin || "")).split("").reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0);
        const score = 82 + (idHash % 16);

        const created = await prisma.vendor.create({
          data: {
            companyId: company.id,
            name: v.name,
            vendorTrustId,
            pan: v.pan ? v.pan.toUpperCase() : null,
            gstin: v.gstin ? v.gstin.toUpperCase() : null,
            cin: v.cin ? v.cin.toUpperCase() : null,
            category: v.category || "General Supplies",
            turnoverRange: v.turnoverRange || "₹1Cr–5Cr",
            trustScore: score,
            status: "active",
            kycStatus: "verified",
            directorDetails: JSON.stringify([{ name: v.directorName || "Authorized Signatory", phone: v.phone || "—" }]),
          },
        });
        createdVendors.push(created);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully onboarded ${createdVendors.length} vendors with Trust IDs assigned.`,
        vendors: createdVendors,
      });
    }

    // 2. Handle Single Registration
    if (!name) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
    }

    const count = await prisma.vendor.count({ where: { companyId: company.id } });
    const vendorTrustId = `VTID-${2000 + count + 1}`;
    const score = pan && gstin ? 92 : 84;

    const vendor = await prisma.vendor.create({
      data: {
        companyId: company.id,
        name,
        vendorTrustId,
        pan: pan ? pan.toUpperCase() : null,
        gstin: gstin ? gstin.toUpperCase() : null,
        cin: cin ? cin.toUpperCase() : null,
        category,
        turnoverRange,
        trustScore: score,
        status: "active",
        kycStatus: "verified",
        directorDetails: JSON.stringify([{ name: directorName || "Managing Director", phone: phone || "" }]),
      },
    });

    return NextResponse.json({
      success: true,
      trustId: vendor.vendorTrustId,
      id: vendor.id,
      vendor,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register vendor" },
      { status: 500 }
    );
  }
}
