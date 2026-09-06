import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { refreshBuyerRiskFlag } from "@/lib/services/risk-service";

export const dynamic = "force-dynamic";

/**
 * Payment Automation Settlement & Reconciliation Webhook Endpoint.
 * Reconciles debtor remittances, zeroes outstanding credit, halts escalation,
 * and records tamper-proof proof in LegalEvidenceLog.
 */
export async function POST(req: Request) {
  try {
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

    const amountPaid = typeof paymentAmount === "number" && paymentAmount > 0
      ? paymentAmount
      : account.outstandingAmount;

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

    // 2. Update Escalation State (clear active triggers upon full settlement)
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

    // 3. Record in immutable LegalEvidenceLog
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
        }),
      },
    });

    // 4. Automatically re-evaluate buyer risk flag
    await refreshBuyerRiskFlag(account.buyerId);

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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment settlement failed" },
      { status: 500 }
    );
  }
}
