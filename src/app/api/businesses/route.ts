import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runBusinessVerification } from "@/lib/services/business/verification-orchestrator";
import { logAuditEvent } from "@/lib/services/business/audit-logger";
import { z } from "zod";

const CreateBusinessSchema = z.object({
  companyName: z.string().min(2, "Company name required"),
  gstin: z.string().optional().nullable(),
  cin: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  udyamNo: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let createdBy = searchParams.get("createdBy");
    if (!createdBy) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
      if (match) createdBy = decodeURIComponent(match[1]);
    }
    const flag = searchParams.get("flag");

    const where: Record<string, unknown> = {};
    if (createdBy) where.createdBy = createdBy;

    const businesses = await prisma.businessProfile.findMany({
      where,
      include: {
        riskFlag: true,
        yearSummaries: { orderBy: { fiscalYear: "desc" }, take: 1 },
        _count: { select: { financialDocuments: true, courtCases: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by flag if requested
    const filtered = flag
      ? businesses.filter(b => b.riskFlag?.flag === flag.toUpperCase())
      : businesses;

    return NextResponse.json({ businesses: filtered });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check for duplicate GSTIN
    if (data.gstin) {
      const existing = await prisma.businessProfile.findFirst({ where: { gstin: data.gstin } });
      if (existing) {
        return NextResponse.json(
          { error: `A business with GSTIN ${data.gstin} already exists.`, existingId: existing.id },
          { status: 409 }
        );
      }
    }

    const company = await prisma.company.findFirst();
    const checkFee = 299;
    if (company && company.walletBalance < checkFee) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. AI Business Security Check costs ₹${checkFee}, but current balance is ₹${company.walletBalance.toLocaleString(
            "en-IN"
          )}.`,
          insufficientBalance: true,
          required: checkFee,
          currentBalance: company.walletBalance,
        },
        { status: 402 }
      );
    }

    // Create business profile
    const business = await prisma.businessProfile.create({
      data: {
        companyName: data.companyName,
        gstin: data.gstin || null,
        cin: data.cin || null,
        pan: data.pan || null,
        udyamNo: data.udyamNo || null,
        phone: data.phone || null,
        createdBy: data.createdBy || null,
        overallStatus: "PENDING",
      },
    });

    // Store identifiers
    const idEntries = [
      { type: "GSTIN", val: data.gstin },
      { type: "CIN", val: data.cin },
      { type: "PAN", val: data.pan },
      { type: "UDYAM", val: data.udyamNo },
      { type: "PHONE", val: data.phone },
    ].filter(e => e.val);

    for (const entry of idEntries) {
      await prisma.businessIdentifier.create({
        data: {
          businessId: business.id,
          identifierType: entry.type,
          value: entry.val!,
          sourceStatus: "USER_PROVIDED",
        },
      });
    }

    await logAuditEvent({
      businessId: business.id,
      eventType: "PROFILE_CREATED",
      actor: data.createdBy || "user",
      description: `Business profile created for "${data.companyName}"`,
      metadata: { identifiers: idEntries.map(e => e.type) },
    });

    // Kick off verification orchestrator (non-blocking)
    runBusinessVerification(business.id).catch(console.error);

    // Debit fee from wallet & record in UserReportLibrary
    if (company) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          walletBalance: { decrement: checkFee },
          lastActiveAt: new Date(),
        },
      });

      await prisma.walletUsageLedger.upsert({
        where: { companyId_reportType: { companyId: company.id, reportType: "business_security_check" } },
        create: {
          companyId: company.id,
          reportType: "business_security_check",
          timesUsed: 1,
          available: 99,
          cost: checkFee,
        },
        update: {
          timesUsed: { increment: 1 },
          available: { decrement: 1 },
        },
      });

      await prisma.userReportLibrary.create({
        data: {
          companyId: company.id,
          subjectId: data.gstin || data.pan || data.cin || business.id,
          subjectName: data.companyName,
          subjectType: "business",
          reportType: "ai_business_security",
          reportTitle: "AI Business Security & Credit Underwriting",
          costPaid: checkFee,
          reportData: JSON.stringify({
            businessId: business.id,
            companyName: data.companyName,
            gstin: data.gstin,
            pan: data.pan,
            cin: data.cin,
          }),
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, business, feeDeducted: checkFee }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
