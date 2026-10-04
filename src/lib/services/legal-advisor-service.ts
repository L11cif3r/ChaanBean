import { prisma } from "@/lib/db";

export async function getLegalAdvisors(filter?: { jurisdiction?: string; specialization?: string }) {
  const where: any = { status: "verified" };
  if (filter?.specialization) {
    where.specialization = { contains: filter.specialization };
  }
  if (filter?.jurisdiction) {
    where.jurisdiction = { contains: filter.jurisdiction };
  }

  return await prisma.legalAdvisor.findMany({
    where,
    include: {
      cases: { select: { id: true, caseNumber: true, status: true, totalClaimAmount: true } },
      feeLedgers: true,
    },
    orderBy: { successRate: "desc" },
  });
}

export async function matchAdvisorForCase(caseId: string) {
  const arbitrationCase = await prisma.arbitrationCase.findUnique({
    where: { id: caseId },
    include: {
      creditAccount: {
        include: {
          buyer: true,
        },
      },
    },
  });

  if (!arbitrationCase) {
    throw new Error("Case not found");
  }

  // Get all verified advisors
  const advisors = await prisma.legalAdvisor.findMany({
    where: { status: "verified" },
  });

  if (advisors.length === 0) return null;

  // Rank advisors by specialization match, case load, and success rate
  const scored = advisors.map((adv) => {
    let score = adv.successRate;
    // Lower active case load gives higher priority
    score -= adv.activeCasesCount * 2;

    if (adv.specialization.includes("MSMED") && arbitrationCase.statutoryBasis.includes("MSMED")) {
      score += 20;
    }
    if (adv.specialization.includes("Section 138")) {
      score += 15;
    }

    return { advisor: adv, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.advisor || advisors[0];
}

export async function generateEvidenceBundle(params: {
  creditAccountId: string;
  arbitrationCaseId?: string;
  title: string;
  documents: Array<{ type: string; ref: string; notes?: string; amount?: number }>;
  generatedBy?: string;
}) {
  return await prisma.legalEvidencePack.create({
    data: {
      creditAccountId: params.creditAccountId,
      arbitrationCaseId: params.arbitrationCaseId,
      title: params.title,
      bundleUrl: `/evidence/BUNDLE-${Date.now()}.pdf`,
      status: "certified",
      generatedBy: params.generatedBy || "ChaanBean Evidence Engine",
      documentsList: JSON.stringify(params.documents),
    },
  });
}

export async function recordLegalFee(params: {
  arbitrationCaseId: string;
  advisorId: string;
  feeType: string;
  amount: number;
  paymentStatus?: string;
  transactionRef?: string;
}) {
  return await prisma.legalFeeLedger.create({
    data: {
      arbitrationCaseId: params.arbitrationCaseId,
      advisorId: params.advisorId,
      feeType: params.feeType,
      amount: params.amount,
      paymentStatus: params.paymentStatus || "escrowed",
      transactionRef: params.transactionRef || `TXN-ESCROW-${Date.now().toString().slice(-6)}`,
    },
  });
}
