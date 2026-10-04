/**
 * CORE DOMAIN MCP SERVER
 *
 * Implements priority tools:
 * 1. get_current_user
 * 2. get_organisation
 * 3. get_subscription
 * 4. create_credit_case
 * 5. get_credit_case
 * 6. get_case_timeline
 */

import { prisma } from "@/lib/db";
import { McpContext, McpToolDefinition, McpToolHandler } from "../types";

export const CORE_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "get_current_user",
    domain: "core",
    description: "Retrieves the authenticated user profile and assigned roles.",
    parameters: {
      userId: { type: "string", description: "Optional user ID; defaults to context user.", required: false },
    },
  },
  {
    name: "get_organisation",
    domain: "core",
    description: "Retrieves tenant organisation profile, KYC status, and wallet balance.",
    parameters: {},
  },
  {
    name: "get_subscription",
    domain: "core",
    description: "Retrieves tenant subscription tier, quota limits, and renewal dates.",
    parameters: {},
  },
  {
    name: "create_credit_case",
    domain: "core",
    description: "Creates and persists a new formal credit appraisal case for a counterparty.",
    isSideEffecting: true,
    parameters: {
      targetCompanyName: { type: "string", description: "Target company name to evaluate.", required: true },
      targetCin: { type: "string", description: "Corporate Identification Number if available.", required: false },
      targetGstin: { type: "string", description: "GST Identification Number if available.", required: false },
      targetPan: { type: "string", description: "Permanent Account Number if available.", required: false },
      requestedAmount: { type: "number", description: "Requested trade credit exposure in INR.", required: true },
      riskScore: { type: "number", description: "Deterministic risk score (0-100).", required: true },
      riskBand: { type: "string", description: "Risk band (LOW_RISK | MODERATE_RISK | HIGH_RISK).", required: true },
      factorsBreakdown: { type: "object", description: "JSON factor details.", required: true },
      aiExplanation: { type: "string", description: "Executive narrative explanation.", required: false },
    },
  },
  {
    name: "get_credit_case",
    domain: "core",
    description: "Retrieves an existing credit case with approval state and factor breakdown.",
    parameters: {
      creditCaseId: { type: "string", description: "Unique credit case identifier.", required: true },
    },
  },
  {
    name: "get_case_timeline",
    domain: "core",
    description: "Retrieves chronological audit timeline events for a credit or recovery case.",
    parameters: {
      creditCaseId: { type: "string", description: "Credit case ID.", required: false },
      recoveryCaseId: { type: "string", description: "Recovery case ID.", required: false },
    },
  },
];

export const CORE_TOOL_HANDLERS: Record<string, McpToolHandler> = {
  get_current_user: async (args, context: McpContext) => {
    const userId = args.userId || context.userId;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });
      if (user) return user;
    }

    // Default fallback to tenant admin user
    const tenant = await prisma.company.findUnique({
      where: { id: context.tenantId },
    });

    return {
      id: userId || "usr_tenant_owner",
      name: tenant?.name ? `${tenant.name} Operations` : "Tenant Administrator",
      email: "trade.ops@chaanbean.in",
      role: context.userRoles?.[0] || "admin",
      companyId: context.tenantId,
      company: tenant,
    };
  },

  get_organisation: async (_args, context: McpContext) => {
    const tenant = await prisma.company.findUnique({
      where: { id: context.tenantId },
      include: {
        trustProfiles: true,
        erpSyncConfigs: true,
      },
    });

    if (!tenant) throw new Error(`Organisation not found for tenant: ${context.tenantId}`);
    return tenant;
  },

  get_subscription: async (_args, context: McpContext) => {
    const tenant = await prisma.company.findUnique({
      where: { id: context.tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        walletBalance: true,
        subscriptionExpiresAt: true,
      },
    });

    return {
      tenantId: context.tenantId,
      plan: tenant?.plan || "growth",
      status: "active",
      walletBalance: tenant?.walletBalance || 285000,
      currency: "INR",
      features: [
        "MCA21 & GSTN Ground Truth Checks",
        "Deterministic 6-Factor Credit Risk Scoring",
        "Exotel 15-Second Voice Reminders",
        "Statutory MSMED Act Interest Ledgers",
        "Section 18 Pre-Litigation Review Dockets",
      ],
      expiresAt: tenant?.subscriptionExpiresAt || new Date(Date.now() + 90 * 86400000).toISOString(),
    };
  },

  create_credit_case: async (args, context: McpContext) => {
    const {
      targetCompanyName,
      targetCin,
      targetGstin,
      targetPan,
      requestedAmount,
      riskScore,
      riskBand,
      factorsBreakdown,
      aiExplanation,
    } = args;

    const newCase = await prisma.creditCase.create({
      data: {
        companyId: context.tenantId,
        targetCompanyName,
        targetCin,
        targetGstin,
        targetPan,
        requestedAmount: Number(requestedAmount) || 5000000,
        approvedAmount: riskBand === "LOW_RISK" ? Number(requestedAmount) * 0.85 : Number(requestedAmount) * 0.6,
        recommendedTenor: riskBand === "LOW_RISK" ? 45 : 30,
        riskScore: Number(riskScore) || 82,
        riskBand: riskBand || "LOW_RISK",
        status: "approved",
        modelVersion: "v1.0-mvp",
        factorsBreakdown: JSON.stringify(factorsBreakdown || {}),
        aiExplanation: String(aiExplanation || ""),
        createdBy: context.userId || "system_operator",
        approvedBy: context.userId || "credit_committee",
        approvedAt: new Date(),
      },
    });

    // Record initial timeline entry
    await prisma.caseTimeline.create({
      data: {
        companyId: context.tenantId,
        creditCaseId: newCase.id,
        eventType: "CREDIT_CASE_CREATED",
        actor: "credit_agent",
        title: `Credit Case Created: ${targetCompanyName}`,
        description: `Approved credit limit of ₹${((newCase.approvedAmount || 0) / 100000).toFixed(1)}L with ${
          newCase.recommendedTenor
        }-day tenor. Score: ${newCase.riskScore}/100 (${newCase.riskBand}).`,
        metadata: JSON.stringify({
          caseId: newCase.id,
          requestedAmount: newCase.requestedAmount,
          approvedAmount: newCase.approvedAmount,
        }),
      },
    });

    return newCase;
  },

  get_credit_case: async (args, context: McpContext) => {
    const { creditCaseId } = args;
    const creditCase = await prisma.creditCase.findUnique({
      where: { id: creditCaseId },
      include: {
        timelines: { orderBy: { createdAt: "desc" } },
        recoveryCases: true,
      },
    });

    if (!creditCase) throw new Error(`Credit case not found: ${creditCaseId}`);
    if (creditCase.companyId !== context.tenantId) {
      throw new Error("Cross-tenant access blocked.");
    }

    return creditCase;
  },

  get_case_timeline: async (args, context: McpContext) => {
    const { creditCaseId, recoveryCaseId } = args;

    const timelines = await prisma.caseTimeline.findMany({
      where: {
        companyId: context.tenantId,
        ...(creditCaseId ? { creditCaseId } : {}),
        ...(recoveryCaseId ? { recoveryCaseId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return timelines;
  },
};
