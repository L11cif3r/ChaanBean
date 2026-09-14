import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCollectionsOverview } from "@/lib/services/collections-engine";
import { getCompanyMonitoringSummary } from "@/lib/services/monitoring-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const [monitoring, collections, cases, advisors, buyers] = await Promise.all([
      getCompanyMonitoringSummary(company.id),
      getCollectionsOverview(company.id),
      prisma.arbitrationCase.findMany({
        include: { assignedAdvisor: true, creditAccount: { include: { buyer: true } } },
      }),
      prisma.legalAdvisor.findMany(),
      prisma.buyerDebtor.findMany({
        where: { companyId: company.id },
        include: { riskFlags: { take: 1, orderBy: { computedAt: "desc" } } },
      }),
    ]);

    const totalRecovered = collections.reconciliations.reduce((acc, r) => acc + r.amountPaid, 0);
    const totalClaimAmount = cases.reduce((acc, c) => acc + c.totalClaimAmount, 0);

    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        companyName: company.name,
        currency: "INR",
      },
      portfolioOverview: {
        totalDebtors: buyers.length,
        totalCreditExposure: monitoring.totalExposure,
        totalOverdue: monitoring.totalOverdue,
        creditUtilizationPct: monitoring.overallUtilizationPct,
        accountsOnCreditHold: monitoring.accountsOnHoldCount,
      },
      collectionsPerformance: {
        totalOutstanding: collections.ageing.totalOutstanding,
        ageingCurrent: collections.ageing.current,
        ageing1to30: collections.ageing.bucket1to30,
        ageing31to60: collections.ageing.bucket31to60,
        ageing61to90: collections.ageing.bucket61to90,
        ageing90Plus: collections.ageing.bucket90Plus,
        pendingPromisesAmount: collections.summary.promisesPendingAmount,
        totalReconciledPayments: totalRecovered,
      },
      legalRecovery: {
        activeArbitrationCases: cases.filter((c) => c.status !== "closed").length,
        totalArbitrationClaims: totalClaimAmount,
        onboardedLegalAdvisors: advisors.length,
        averageAdvisorSuccessRate: advisors.length > 0 ? (advisors.reduce((acc, a) => acc + a.successRate, 0) / advisors.length).toFixed(1) : "0.0",
      },
      debtorDetails: monitoring.accounts.map((acc) => ({
        name: acc.buyerName,
        outstanding: acc.totalOutstanding,
        overdue: acc.overdueAmount,
        limit: acc.creditLimit,
        utilizationPct: `${acc.utilizationPct}%`,
        status: acc.overdueStatus,
        holdActive: acc.creditHoldActive ? "YES" : "NO",
      })),
    };

    if (format === "csv") {
      const header = "Debtor Name,Outstanding (INR),Overdue (INR),Credit Limit (INR),Utilization %,Status,Credit Hold\n";
      const rows = report.debtorDetails
        .map(
          (d) =>
            `"${d.name}",${d.outstanding},${d.overdue},${d.limit},"${d.utilizationPct}","${d.status}","${d.holdActive}"`
        )
        .join("\n");
      return new Response(header + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="chaanbean_management_report_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("[api/reports/management] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate management report" }, { status: 500 });
  }
}
