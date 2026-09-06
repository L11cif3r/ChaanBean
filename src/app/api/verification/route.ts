import { NextResponse } from "next/server";
import { getReportBundle, getReport } from "@/lib/verification-gateway";
import type { ReportType, SubjectType } from "@/lib/verification-gateway/types";
import { prisma } from "@/lib/db";
import { throttle } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      subjectType = "business",
      subjectId,
      reportTypes,
      companyId: explicitCompanyId,
      forceRefresh = false,
    } = body as {
      subjectType: SubjectType;
      subjectId: string;
      reportTypes: ReportType[];
      companyId?: string;
      forceRefresh?: boolean;
    };

    if (!subjectId || !reportTypes?.length) {
      return NextResponse.json({ error: "subjectId and reportTypes are required" }, { status: 400 });
    }

    let company = null;
    if (explicitCompanyId) {
      company = await prisma.company.findUnique({ where: { id: explicitCompanyId } });
    }
    if (!company) {
      company = await prisma.company.findFirst();
    }

    const allowed = await throttle(`verify:${company?.id ?? "anon"}`, 120);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again." }, { status: 429 });
    }

    // Parallel Fan-out across all requested report types
    const reports = await getReportBundle({
      subjectType,
      subjectId: subjectId.trim(),
      reportTypes,
      requestedBy: company?.id,
      forceRefresh,
    });

    // Debit Wallet and record in WalletUsageLedger
    if (company) {
      let totalCost = 0;
      for (const rt of reportTypes) {
        const ledgerItem = await prisma.walletUsageLedger.findFirst({
          where: { companyId: company.id, reportType: rt },
        });
        const cost = ledgerItem?.cost || 50;
        totalCost += cost;

        await prisma.walletUsageLedger.upsert({
          where: { companyId_reportType: { companyId: company.id, reportType: rt } },
          create: {
            companyId: company.id,
            reportType: rt,
            timesUsed: 1,
            available: 99,
            cost,
          },
          update: {
            timesUsed: { increment: 1 },
            available: { decrement: 1 },
          },
        });
      }

      await prisma.company.update({
        where: { id: company.id },
        data: {
          walletBalance: { decrement: totalCost },
          lastActiveAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      subjectId,
      subjectType,
      reportCount: reports.length,
      reports,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification gateway error" },
      { status: 500 }
    );
  }
}
