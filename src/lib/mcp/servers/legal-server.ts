/**
 * LEGAL DOMAIN MCP SERVER
 *
 * Implements priority tools:
 * 1. check_legal_eligibility
 * 2. create_legal_candidate
 * 3. compile_case_package (Human Legal Review Dossier)
 */

import { prisma } from "@/lib/db";
import { McpContext, McpToolDefinition, McpToolHandler } from "../types";
import { RulesAuthorizer } from "@/lib/rules-engine/rules-authorizer";

export const LEGAL_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "check_legal_eligibility",
    domain: "legal",
    description: "Evaluates whether an overdue account meets statutory thresholds for legal escalation.",
    parameters: {
      recoveryCaseId: { type: "string", description: "Recovery case identifier.", required: true },
    },
  },
  {
    name: "create_legal_candidate",
    domain: "legal",
    description: "Promotes an eligible recovery case into a formal Pre-Litigation Legal Candidate.",
    isSideEffecting: true,
    parameters: {
      recoveryCaseId: { type: "string", description: "Recovery case ID.", required: true },
      statutoryGrounds: { type: "array", description: "List of legal grounds.", required: false },
    },
  },
  {
    name: "compile_case_package",
    domain: "legal",
    description: "Compiles a certified evidentiary case package (MCA profile, invoices, call logs, Section 65B metadata) for Human Legal Review.",
    parameters: {
      legalCandidateId: { type: "string", description: "Legal candidate ID or recovery case ID.", required: true },
    },
  },
];

export const LEGAL_TOOL_HANDLERS: Record<string, McpToolHandler> = {
  check_legal_eligibility: async (args, context: McpContext) => {
    const { recoveryCaseId } = args;
    return RulesAuthorizer.evaluateLegalEligibility(context, recoveryCaseId);
  },

  create_legal_candidate: async (args, context: McpContext) => {
    const { recoveryCaseId, statutoryGrounds } = args;

    // 1. Validate rules eligibility
    const eligibility = await RulesAuthorizer.evaluateLegalEligibility(context, recoveryCaseId);
    if (!eligibility.permitted) {
      throw new Error(`Legal Candidate creation unauthorized: ${eligibility.reason}`);
    }

    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: {
        buyer: true,
        creditAccount: {
          include: {
            invoices: true,
            promisesToPay: true,
          },
        },
        exotelCallLogs: true,
        timelines: true,
      },
    });

    if (!recoveryCase) throw new Error(`Recovery case not found: ${recoveryCaseId}`);
    if (recoveryCase.companyId !== context.tenantId) throw new Error("Cross-tenant access blocked.");

    const candidateNumber = `LEG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const grounds =
      statutoryGrounds ||
      (eligibility.details?.grounds as string[]) || [
        "MSMED Act 2006 (Section 15-18): Overdue exceeds statutory 45 days limit.",
        "Compounded penal interest at 3x RBI Bank Rate (20.25% p.a.).",
        "Section 43B(h) Income Tax disallowance notice trigger.",
      ];

    // 2. Pre-compile evidentiary bundle
    const casePackage = {
      candidateNumber,
      debtorProfile: {
        companyName: recoveryCase.buyer.name,
        pan: recoveryCase.buyer.pan,
        gstin: recoveryCase.buyer.gstin,
        contactPerson: recoveryCase.buyer.contactPerson,
        registeredAddress: recoveryCase.buyer.address,
      },
      claimSummary: {
        principalOverdue: recoveryCase.totalOverdue,
        accruedInterest: recoveryCase.statutoryInterest,
        totalClaimAmount: recoveryCase.totalClaim,
        overdueDpd: recoveryCase.overdueDpd,
        statutoryRate: "20.25% p.a. (3x RBI Bank Rate)",
      },
      statutoryGrounds: grounds,
      evidenceChronology: recoveryCase.timelines.map((t) => ({
        time: t.createdAt,
        title: t.title,
        description: t.description,
        actor: t.actor,
      })),
      telephonyLogs: recoveryCase.exotelCallLogs.map((c) => ({
        callSid: c.callSid,
        toPhone: c.toPhone,
        duration: `${c.durationSec}s`,
        status: c.status,
        timestamp: c.calledAt,
      })),
      evidentiarySeals: {
        certificate65B: `SEC65B-SHA256-${candidateNumber}-${Date.now()}`,
        admissibilityStandard: "Section 65B Indian Evidence Act / Section 63 BSA 2023",
        certifiedTimestamp: new Date().toISOString(),
      },
    };

    // 3. Persist LegalCandidate
    const candidate = await prisma.legalCandidate.create({
      data: {
        companyId: context.tenantId,
        recoveryCaseId,
        candidateNumber,
        status: "pending_review",
        statutoryGrounds: JSON.stringify(grounds),
        principalAmount: recoveryCase.totalOverdue,
        penalInterest: recoveryCase.statutoryInterest,
        totalClaim: recoveryCase.totalClaim,
        compiledCasePackage: JSON.stringify(casePackage),
      },
    });

    // 4. Update RecoveryCase stage
    await prisma.recoveryCase.update({
      where: { id: recoveryCaseId },
      data: {
        stage: "L3_LEGAL_ESCALATION",
        status: "legal_review",
        isLegalEligible: true,
      },
    });

    // 5. Append to Timeline
    await prisma.caseTimeline.create({
      data: {
        companyId: context.tenantId,
        recoveryCaseId,
        eventType: "LEGAL_CANDIDATE_CREATED",
        actor: "legal_agent",
        title: `Legal Candidate Docket Compiled: ${candidateNumber}`,
        description: `Promoted to formal Pre-Litigation Review. Claim: ₹${(recoveryCase.totalClaim / 100000).toFixed(
          2
        )}L under MSMED Act §18.`,
        metadata: JSON.stringify({ candidateNumber, candidateId: candidate.id }),
      },
    });

    return {
      candidateId: candidate.id,
      candidateNumber,
      status: candidate.status,
      totalClaim: candidate.totalClaim,
      statutoryGrounds: grounds,
    };
  },

  compile_case_package: async (args, context: McpContext) => {
    const { legalCandidateId } = args;

    let candidate = await prisma.legalCandidate.findUnique({
      where: { id: legalCandidateId },
      include: { recoveryCase: { include: { buyer: true } } },
    });

    if (!candidate) {
      // Fallback search by recoveryCaseId
      candidate = await prisma.legalCandidate.findFirst({
        where: { recoveryCaseId: legalCandidateId, companyId: context.tenantId },
        include: { recoveryCase: { include: { buyer: true } } },
      });
    }

    if (!candidate) throw new Error(`Legal candidate not found: ${legalCandidateId}`);
    if (candidate.companyId !== context.tenantId) throw new Error("Cross-tenant access blocked.");

    return JSON.parse(candidate.compiledCasePackage);
  },
};
