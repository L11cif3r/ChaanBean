import { prisma } from "@/lib/db";

export async function logAiDecision(params: {
  companyId: string;
  module: string;
  promptHash: string;
  modelUsed?: string;
  confidenceScore: number;
  decisionSummary: string;
  rawResponse?: string | object;
  flaggedForHumanReview?: boolean;
}) {
  const isFlagged = params.flaggedForHumanReview || params.confidenceScore < 0.85;

  return await prisma.aiDecisionLog.create({
    data: {
      companyId: params.companyId,
      module: params.module,
      promptHash: params.promptHash,
      modelUsed: params.modelUsed || "gemini-2.0-flash",
      confidenceScore: params.confidenceScore,
      flaggedForHumanReview: isFlagged,
      decisionSummary: params.decisionSummary,
      rawResponse: typeof params.rawResponse === "object" ? JSON.stringify(params.rawResponse) : params.rawResponse,
    },
  });
}

export async function reviewAiDecision(params: {
  decisionId: string;
  reviewedBy: string;
  action: "accepted" | "overridden";
  notes?: string;
}) {
  return await prisma.aiDecisionLog.update({
    where: { id: params.decisionId },
    data: {
      flaggedForHumanReview: false,
      reviewedBy: params.reviewedBy,
      reviewAction: params.action,
    },
  });
}

export async function getAiGovernanceLogs(companyId?: string) {
  const where = companyId ? { companyId } : {};
  return await prisma.aiDecisionLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
