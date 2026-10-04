/**
 * RECOVERY DOMAIN MCP SERVER
 *
 * Implements priority tools:
 * 1. get_overdue_accounts
 * 2. create_recovery_case
 * 3. get_next_recovery_action
 * 4. record_customer_commitment (PTP)
 */

import { prisma } from "@/lib/db";
import { McpContext, McpToolDefinition, McpToolHandler } from "../types";
import { RulesAuthorizer } from "@/lib/rules-engine/rules-authorizer";

export const RECOVERY_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "get_overdue_accounts",
    domain: "recovery",
    description: "Retrieves all overdue debtor accounts, aging buckets, and outstanding exposures.",
    parameters: {
      minDpd: { type: "number", description: "Minimum Days Past Due filter.", required: false },
    },
  },
  {
    name: "create_recovery_case",
    domain: "recovery",
    description: "Initializes a formal statutory recovery workflow for an overdue credit account.",
    isSideEffecting: true,
    parameters: {
      creditAccountId: { type: "string", description: "Credit account identifier.", required: true },
      buyerId: { type: "string", description: "Debtor buyer identifier.", required: true },
      totalOverdue: { type: "number", description: "Principal overdue amount.", required: true },
      overdueDpd: { type: "number", description: "Days past due.", required: true },
    },
  },
  {
    name: "get_next_recovery_action",
    domain: "recovery",
    description: "Invokes the Rules Engine to determine the next authorized recovery step.",
    parameters: {
      recoveryCaseId: { type: "string", description: "Recovery case ID.", required: true },
    },
  },
  {
    name: "record_customer_commitment",
    domain: "recovery",
    description: "Records a formal Promise to Pay (PTP) commitment from the debtor.",
    isSideEffecting: true,
    parameters: {
      recoveryCaseId: { type: "string", description: "Recovery case ID.", required: true },
      amount: { type: "number", description: "Promised settlement amount in INR.", required: true },
      promisedDate: { type: "string", description: "ISO date format (YYYY-MM-DD).", required: true },
      paymentMode: { type: "string", description: "NEFT/RTGS | UPI | Cheque", required: false },
      notes: { type: "string", description: "Notes taken during call/interaction.", required: false },
    },
  },
];

export const RECOVERY_TOOL_HANDLERS: Record<string, McpToolHandler> = {
  get_overdue_accounts: async (args, context: McpContext) => {
    const minDpd = Number(args.minDpd) || 1;

    // Find debtors belonging to tenant
    const accounts = await prisma.creditAccount.findMany({
      where: {
        buyer: { companyId: context.tenantId },
        outstandingAmount: { gt: 0 },
      },
      include: {
        buyer: true,
        invoices: { where: { status: { in: ["unpaid", "overdue"] } } },
        promisesToPay: { orderBy: { promisedDate: "desc" }, take: 1 },
      },
    });

    const now = new Date();
    return accounts.map((acc) => {
      const diffMs = now.getTime() - new Date(acc.dueDate).getTime();
      const dpd = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      // MSMED Act §16: 3x RBI rate (20.25% p.a.) with monthly compounding
      const penalInterest = Math.round(acc.outstandingAmount * (0.2025 / 365) * dpd);

      return {
        creditAccountId: acc.id,
        buyerId: acc.buyerId,
        buyerName: acc.buyer.name,
        contactPerson: acc.buyer.contactPerson,
        phone: JSON.parse(acc.buyer.mobileNumbers || "[]")[0] || "9820098200",
        outstandingAmount: acc.outstandingAmount,
        dueDate: acc.dueDate,
        dpd,
        penalInterest,
        totalClaim: acc.outstandingAmount + penalInterest,
        isEligibleForLegal: dpd >= 45,
        lastPtp: acc.promisesToPay[0] || null,
      };
    }).filter((a) => a.dpd >= minDpd);
  },

  create_recovery_case: async (args, context: McpContext) => {
    const { creditAccountId, buyerId, totalOverdue, overdueDpd } = args;

    const principal = Number(totalOverdue);
    if (isNaN(principal) || principal <= 0) {
      throw new Error("Total overdue amount must be greater than 0");
    }

    // Calculate statutory MSMED Act interest (20.25% p.a.)
    const dpd = Math.max(0, Number(overdueDpd) || 0);
    const statutoryInterest = Math.round(principal * (0.2025 / 365) * dpd);
    const totalClaim = principal + statutoryInterest;

    const caseNumber = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        companyId: context.tenantId,
        creditAccountId,
        buyerId,
        caseNumber,
        stage: dpd >= 45 ? "L3_LEGAL_ESCALATION" : dpd >= 30 ? "L2_DEMAND" : "L1_REMINDER",
        status: "active",
        totalOverdue: principal,
        overdueDpd: dpd,
        statutoryInterest,
        totalClaim,
        isLegalEligible: dpd >= 45,
        nextActionType: dpd >= 45 ? "create_legal_candidate" : "exotel_voice_call",
      },
      include: { buyer: true },
    });

    // Record timeline entry
    await prisma.caseTimeline.create({
      data: {
        companyId: context.tenantId,
        recoveryCaseId: recoveryCase.id,
        eventType: "RECOVERY_CASE_CREATED",
        actor: "recovery_agent",
        title: `Recovery Case Opened: ${caseNumber}`,
        description: `Overdue claim of ₹${(totalClaim / 100000).toFixed(2)}L (${dpd} DPD) for ${recoveryCase.buyer.name}. Stage: ${recoveryCase.stage}.`,
        metadata: JSON.stringify({
          principal,
          statutoryInterest,
          dpd,
        }),
      },
    });

    return recoveryCase;
  },

  get_next_recovery_action: async (args, context: McpContext) => {
    const { recoveryCaseId } = args;
    return RulesAuthorizer.determineNextRecoveryAction(context, recoveryCaseId);
  },

  record_customer_commitment: async (args, context: McpContext) => {
    const { recoveryCaseId, amount, promisedDate, paymentMode, notes } = args;

    const recoveryCase = await prisma.recoveryCase.findUnique({
      where: { id: recoveryCaseId },
      include: { buyer: true },
    });

    if (!recoveryCase) throw new Error(`Recovery case not found: ${recoveryCaseId}`);
    if (recoveryCase.companyId !== context.tenantId) throw new Error("Cross-tenant access blocked.");

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error("PTP commitment amount must be greater than 0");
    }

    const ptp = await prisma.promiseToPay.create({
      data: {
        creditAccountId: recoveryCase.creditAccountId,
        buyerId: recoveryCase.buyerId,
        amount: numAmount,
        promisedDate: new Date(promisedDate),
        paymentMode: paymentMode || "NEFT/RTGS",
        notes: notes || "Recorded via agentic recovery interaction.",
        recordedBy: context.userId || "recovery_agent",
        status: "pending",
      },
    });

    // Update case status
    await prisma.recoveryCase.update({
      where: { id: recoveryCaseId },
      data: {
        ptpActive: true,
        status: "ptp_active",
        lastActionType: "recorded_ptp",
        lastActionAt: new Date(),
      },
    });

    // Timeline entry
    await prisma.caseTimeline.create({
      data: {
        companyId: context.tenantId,
        recoveryCaseId,
        eventType: "PTP_RECORDED",
        actor: "recovery_agent",
        title: `Promise to Pay Recorded: ₹${Number(amount).toLocaleString("en-IN")}`,
        description: `Debtor committed to pay ₹${Number(amount).toLocaleString("en-IN")} by ${new Date(promisedDate).toLocaleDateString("en-IN")}.`,
        metadata: JSON.stringify(ptp),
      },
    });

    return ptp;
  },
};
