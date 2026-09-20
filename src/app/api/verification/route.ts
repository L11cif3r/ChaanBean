import { NextResponse } from "next/server";
import { getReportBundle } from "@/lib/verification-gateway";
import type { ReportType, SubjectType } from "@/lib/verification-gateway/types";
import { prisma } from "@/lib/db";
import { throttle } from "@/lib/redis";
import { getFeaturePrice } from "@/lib/pricing/pricing-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      subjectType = "business",
      subjectId,
      subjectName,
      reportTypes,
      companyId: explicitCompanyId,
      forceRefresh = false,
    } = body as {
      subjectType: SubjectType;
      subjectId: string;
      subjectName?: string;
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

    const cleanSubjectId = subjectId.trim();

    // Check existing reports in UserReportLibrary to prevent double billing
    const existingLibraryItems = company
      ? await prisma.userReportLibrary.findMany({
          where: {
            companyId: company.id,
            subjectId: cleanSubjectId,
            reportType: { in: reportTypes },
          },
        })
      : [];

    const ownedReportTypes = new Set(existingLibraryItems.map((item) => item.reportType));

    // Calculate total cost for reports not yet purchased
    let totalCost = 0;
    const billedTypes: { type: ReportType; cost: number }[] = [];

    for (const rt of reportTypes) {
      if (ownedReportTypes.has(rt)) {
        // Already purchased in library - ₹0 repeat cost
        billedTypes.push({ type: rt, cost: 0 });
      } else {
        const dynamicPrice = getFeaturePrice(rt);
        const cost = typeof dynamicPrice === "number" && dynamicPrice >= 0 ? dynamicPrice : 50;
        totalCost += cost;
        billedTypes.push({ type: rt, cost });
      }
    }

    // Verify company has sufficient wallet balance for unpurchased features
    if (company && totalCost > 0 && company.walletBalance < totalCost) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Total required: ₹${totalCost.toLocaleString(
            "en-IN"
          )}, current balance: ₹${company.walletBalance.toLocaleString("en-IN")}.`,
          insufficientBalance: true,
          required: totalCost,
          currentBalance: company.walletBalance,
        },
        { status: 402 }
      );
    }

    const allowed = await throttle(`verify:${company?.id ?? "anon"}`, 120);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again." }, { status: 429 });
    }

    // Parallel Fan-out across all requested report types
    const reports = await getReportBundle({
      subjectType,
      subjectId: cleanSubjectId,
      reportTypes,
      requestedBy: company?.id,
      forceRefresh,
    });

    // Debit Wallet and save to UserReportLibrary
    let newBalance = company?.walletBalance ?? 0;
    if (company) {
      if (totalCost > 0) {
        const updated = await prisma.company.update({
          where: { id: company.id },
          data: {
            walletBalance: { decrement: totalCost },
            lastActiveAt: new Date(),
          },
        });
        newBalance = updated.walletBalance;

        // Record in WalletUsageLedger
        for (const item of billedTypes) {
          if (item.cost > 0) {
            await prisma.walletUsageLedger.upsert({
              where: { companyId_reportType: { companyId: company.id, reportType: item.type } },
              create: {
                companyId: company.id,
                reportType: item.type,
                timesUsed: 1,
                available: 99,
                cost: item.cost,
              },
              update: {
                timesUsed: { increment: 1 },
                available: { decrement: 1 },
              },
            });
          }
        }
      }

      // Auto-save every generated report to UserReportLibrary
      for (const rep of reports) {
        const costItem = billedTypes.find((b) => b.type === rep.reportType);
        const feePaid = costItem ? costItem.cost : 0;
        const resolvedSubjectName =
          subjectName || (rep.data as any)?.legalName || (rep.data as any)?.tradeName || cleanSubjectId;

        const title = rep.reportType
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const existing = await prisma.userReportLibrary.findFirst({
          where: {
            companyId: company.id,
            subjectId: cleanSubjectId,
            reportType: rep.reportType,
          },
        });

        if (existing) {
          await prisma.userReportLibrary.update({
            where: { id: existing.id },
            data: {
              reportData: JSON.stringify(rep),
              reportTitle: title,
              costPaid: existing.costPaid || feePaid,
            },
          });
        } else {
          await prisma.userReportLibrary.create({
            data: {
              companyId: company.id,
              subjectId: cleanSubjectId,
              subjectName: resolvedSubjectName,
              subjectType,
              reportType: rep.reportType,
              reportTitle: title,
              costPaid: feePaid,
              reportData: JSON.stringify(rep),
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      subjectId: cleanSubjectId,
      subjectType,
      reportCount: reports.length,
      reports,
      totalDeducted: totalCost,
      newWalletBalance: newBalance,
      savedToLibrary: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification gateway error" },
      { status: 500 }
    );
  }
}
