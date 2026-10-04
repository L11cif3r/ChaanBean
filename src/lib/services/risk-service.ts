import { prisma } from "@/lib/db";
import { getReportBundle } from "@/lib/verification-gateway";
import { BUNDLE_REPORT_TYPES } from "@/lib/verification-gateway/types";
import { computeRiskScore } from "@/lib/risk-scoring/engine";
import { computeRecommendedCreditLimit, computeRecommendedTenor } from "@/lib/credit-decision/engine";

export async function refreshBuyerRiskFlag(buyerId: string, peerDefaults?: number) {
  const buyer = await prisma.buyerDebtor.findUnique({ where: { id: buyerId } });
  if (!buyer) throw new Error("Buyer not found");

  // Check peer defaults in Trust Hub if not passed explicitly
  let defaultsCount = peerDefaults ?? 0;
  if (peerDefaults === undefined) {
    const filters: { debtorGstin?: string; debtorPan?: string }[] = [];
    if (buyer.gstin) filters.push({ debtorGstin: buyer.gstin });
    if (buyer.pan) filters.push({ debtorPan: buyer.pan });

    if (filters.length > 0) {
      defaultsCount = await prisma.communityDefault.count({
        where: { OR: filters },
      });
    }
  }

  const subjectId = buyer.gstin ?? buyer.pan ?? buyer.id;
  const reports = await getReportBundle({
    subjectType: "business",
    subjectId,
    reportTypes: BUNDLE_REPORT_TYPES,
    requestedBy: buyer.companyId,
  });

  const completedReports = reports.filter((r) => r.status !== "failed");
  const result = computeRiskScore(completedReports, { peerReportedDefaults: defaultsCount });
  const recommendedLimit = computeRecommendedCreditLimit(result.flag, completedReports);
  const recommendedTenor = computeRecommendedTenor(result.flag, completedReports);

  const riskFlag = await prisma.riskFlag.create({
    data: {
      buyerId,
      flag: result.flag,
      compositeScore: result.compositeScore,
      signalBreakdown: JSON.stringify(result.signals),
      recommendedLimit,
      recommendedTenor,
    },
  });

  const account = await prisma.creditAccount.findFirst({ where: { buyerId } });
  if (account && result.flag !== "red") {
    await prisma.creditAccount.update({
      where: { id: account.id },
      data: {
        creditLimit: recommendedLimit,
        tenorDays: recommendedTenor,
      },
    });
  }

  return { ...result, recommendedLimit, recommendedTenor, riskFlagId: riskFlag.id };
}

export async function getLatestRiskFlag(buyerId: string) {
  return prisma.riskFlag.findFirst({
    where: { buyerId },
    orderBy: { computedAt: "desc" },
  });
}

export function parseMobileNumbers(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
