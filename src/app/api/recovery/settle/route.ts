import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

export const dynamic = "force-dynamic";

/**
 * Payment Automation Settlement & Reconciliation Webhook Endpoint.
 * Reconciles debtor remittances, zeroes outstanding credit, halts escalation,
 * and records tamper-proof proof in LegalEvidenceLog.
 */
export async function POST(req: Request) {
  try {
    const company = await resolveTenantCompany(req);

    if (!company) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      creditAccountId,
      paymentAmount,
      paymentMode = "UPI",
      utrNumber,
      payerName,
    } = body as {
      creditAccountId: string;
      paymentAmount?: number;
      paymentMode?: "UPI" | "NEFT" | "RTGS" | "NET_BANKING" | "CARDS";
      utrNumber?: string;
      payerName?: string;
    };

    if (!creditAccountId) {
      return NextResponse.json({ error: "creditAccountId is required" }, { status: 400 });
    }

    if (paymentAmount !== undefined) {
      if (typeof paymentAmount !== "number" || isNaN(paymentAmount) || paymentAmount <= 0) {
        return NextResponse.json({ error: "paymentAmount must be a positive number greater than 0" }, { status: 400 });
      }
    }

    const account = await prisma.creditAccount.findUnique({
      where: { id: creditAccountId },
      include: {
        buyer: true,
        escalationStates: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
    }

    if (account.buyer.companyId !== company.id) {
      return NextResponse.json(
        { error: "Forbidden: Account does not belong to active tenant" },
        { status: 403 }
      );
    }

    if (account.outstandingAmount <= 0) {
      return NextResponse.json(
        { error: "Account already has 0 outstanding balance and is fully settled" },
        { status: 400 }
      );
    }

    const amountPaid = typeof paymentAmount === "number" && paymentAmount > 0
      ? Math.min(paymentAmount, account.outstandingAmount)
      : account.outstandingAmount;

    if (amountPaid <= 0) {
      return NextResponse.json(
        { error: "Account already has 0 outstanding balance or payment amount is invalid" },
        { status: 400 }
      );
    }

    const remainingBalance = Math.max(0, account.outstandingAmount - amountPaid);
    const isFullySettled = remainingBalance === 0;

    const timestamp = Date.now();
    const cleanUtr =
      utrNumber ||
      `UTR-CB-${paymentMode}-${timestamp.toString(36).toUpperCase()}-${crypto
        .createHash("sha256")
        .update(`${creditAccountId}:${amountPaid}:${timestamp}`)
        .digest("hex")
        .slice(0, 8)
        .toUpperCase()}`;

    const receiptNumber = `RCP-CB-${timestamp.toString(36).toUpperCase()}`;
    const settlementHash = crypto
      .createHash("sha256")
      .update(`${creditAccountId}:${cleanUtr}:${amountPaid}:${receiptNumber}`)
      .digest("hex");

    // 1. Update Credit Account balance & status
    const updatedAccount = await prisma.creditAccount.update({
      where: { id: creditAccountId },
      data: {
        outstandingAmount: remainingBalance,
        overdueStatus: isFullySettled ? "settled" : account.overdueStatus,
      },
    });

    // 2. Reconcile Open Invoices under this Credit Account
    const openInvoices = await prisma.invoice.findMany({
      where: {
        creditAccountId,
        status: { in: ["unpaid", "partial", "overdue"] },
      },
      orderBy: { invoiceDate: "asc" },
    });

    let remainingToAllocate = amountPaid;
    const reconciledInvoices: Array<{ id: string; invoiceNumber: string; amount: number; paid: number; status: string }> = [];

    for (const inv of openInvoices) {
      if (remainingToAllocate <= 0) break;
      const unpaidPortion = Math.max(0, inv.amount - (inv.paidAmount || 0));
      const paymentForThisInvoice = Math.min(remainingToAllocate, unpaidPortion);
      const newPaidAmount = (inv.paidAmount || 0) + paymentForThisInvoice;
      const newInvStatus = newPaidAmount >= inv.amount ? "paid" : "partial";

      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: newPaidAmount,
          status: newInvStatus,
        },
      });

      reconciledInvoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        paid: newPaidAmount,
        status: newInvStatus,
      });

      remainingToAllocate -= paymentForThisInvoice;
    }

    // 3. Persist formal PaymentReconciliation record
    const reconciliation = await prisma.paymentReconciliation.create({
      data: {
        companyId: account.buyer.companyId,
        creditAccountId,
        invoiceId: reconciledInvoices[0]?.id || null,
        amountPaid,
        paymentMode: paymentMode.toLowerCase(),
        referenceNo: cleanUtr,
        status: isFullySettled ? "matched" : "partial",
        notes: `Reconciled via automated settlement endpoint. Receipt: ${receiptNumber}. Mode: ${paymentMode}.`,
      },
    });

    // 4. Update linked Recovery Cases and log to CaseTimeline
    const linkedRecoveryCases = await prisma.recoveryCase.findMany({
      where: {
        creditAccountId,
        status: { in: ["active", "ptp_active", "legal_review"] },
      },
    });

    const updatedRecoveryCases: string[] = [];
    for (const rc of linkedRecoveryCases) {
      const newOverdue = Math.max(0, rc.totalOverdue - amountPaid);
      const isCaseClosed = newOverdue === 0;

      await prisma.recoveryCase.update({
        where: { id: rc.id },
        data: {
          totalOverdue: newOverdue,
          totalClaim: isCaseClosed ? 0 : newOverdue + rc.statutoryInterest,
          status: isCaseClosed ? "closed" : rc.status,
          stage: isCaseClosed ? "SETTLED" : rc.stage,
          lastActionType: isCaseClosed ? "full_settlement_reconciled" : "partial_payment_received",
          lastActionAt: new Date(),
        },
      });

      await prisma.caseTimeline.create({
        data: {
          companyId: account.buyer.companyId,
          recoveryCaseId: rc.id,
          eventType: isCaseClosed ? "CASE_SETTLED_IN_FULL" : "PARTIAL_PAYMENT_RECONCILED",
          actor: "settlement_gateway",
          title: isCaseClosed
            ? `Recovery Case Settled in Full (${cleanUtr.substring(0, 16)})`
            : `Partial Payment Received: ₹${amountPaid.toLocaleString("en-IN")}`,
          description: isCaseClosed
            ? `Full settlement of ₹${amountPaid.toLocaleString("en-IN")} received via ${paymentMode}. UTR: ${cleanUtr}. Recovery case successfully closed.`
            : `Received ₹${amountPaid.toLocaleString("en-IN")} via ${paymentMode}. Remaining overdue: ₹${newOverdue.toLocaleString("en-IN")}.`,
          metadata: JSON.stringify({
            utrNumber: cleanUtr,
            receiptNumber,
            amountPaid,
            remainingBalance: newOverdue,
            reconciliationId: reconciliation.id,
          }),
        },
      });

      updatedRecoveryCases.push(rc.caseNumber);
    }

    // 5. Update pending PromiseToPay records if account settled
    if (isFullySettled) {
      await prisma.promiseToPay.updateMany({
        where: { creditAccountId, status: "pending" },
        data: { status: "fulfilled" },
      });
    }

    // 6. Update Escalation State (clear active triggers upon full settlement)
    const state = account.escalationStates[0];
    if (state) {
      const history = JSON.parse(state.history || "[]");
      history.push({
        level: isFullySettled ? "Resolved" : state.currentLevel,
        action: "payment_received",
        channel: paymentMode,
        amount: amountPaid,
        utrNumber: cleanUtr,
        receiptNumber,
        at: new Date().toISOString(),
      });

      await prisma.escalationState.update({
        where: { id: state.id },
        data: {
          currentLevel: isFullySettled ? "Resolved" : state.currentLevel,
          history: JSON.stringify(history),
          nextActionAt: isFullySettled ? null : state.nextActionAt,
        },
      });
    }

    // 7. Record in immutable LegalEvidenceLog
    await prisma.legalEvidenceLog.create({
      data: {
        relatedEntityType: "credit_account",
        relatedEntityId: creditAccountId,
        channel: "payment_settlement",
        contentHash: settlementHash,
        deliveredAt: new Date(),
        metadata: JSON.stringify({
          receiptNumber,
          utrNumber: cleanUtr,
          paymentMode,
          amountPaid,
          remainingBalance,
          isFullySettled,
          payerName: payerName || account.buyer.name,
          reconciledAt: new Date().toISOString(),
          status: "SUCCESS_RECONCILED",
          reconciliationId: reconciliation.id,
        }),
      },
    });

    // 8. Automatically re-evaluate buyer risk flag asynchronously
    refreshBuyerRiskFlag(account.buyerId).catch((err) =>
      console.warn("[settle] Async risk flag update notice:", err?.message)
    );

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${amountPaid.toLocaleString("en-IN")} successfully reconciled via ${paymentMode}.`,
      receiptNumber,
      utrNumber: cleanUtr,
      settlementHash,
      previousBalance: account.outstandingAmount,
      remainingBalance,
      isFullySettled,
      updatedAccount,
      reconciliationId: reconciliation.id,
      reconciledInvoices,
      updatedRecoveryCases,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment settlement failed" },
      { status: 500 }
    );
  }
}
