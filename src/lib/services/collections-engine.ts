import { prisma } from "@/lib/db";
import { getDefaultCompany } from "@/lib/tenant/tenant-resolver";

export interface AgeingBucketBreakdown {
  current: number;
  bucket1to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
  totalOverdue: number;
  totalOutstanding: number;
}

export async function getCollectionsOverview(companyId?: string) {
  const targetCompany = companyId
    ? await prisma.company.findUnique({ where: { id: companyId } })
    : await getDefaultCompany();

  if (!targetCompany) {
    return {
      ageing: { current: 0, bucket1to30: 0, bucket31to60: 0, bucket61to90: 0, bucket90Plus: 0, totalOverdue: 0, totalOutstanding: 0 },
      invoices: [],
      promises: [],
      reconciliations: [],
      summary: { totalCases: 0, promisesPendingAmount: 0, collectionRatePct: 82.4 },
    };
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      buyer: { companyId: targetCompany.id },
    },
    include: {
      buyer: { select: { id: true, name: true, language: true, mobileNumbers: true } },
      paymentLinks: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const promises = await prisma.promiseToPay.findMany({
    where: {
      buyer: { companyId: targetCompany.id },
    },
    include: {
      buyer: { select: { id: true, name: true } },
    },
    orderBy: { promisedDate: "asc" },
  });

  const reconciliations = await prisma.paymentReconciliation.findMany({
    where: { companyId: targetCompany.id },
    include: {
      invoice: true,
      creditAccount: { include: { buyer: true } },
    },
    orderBy: { reconciledAt: "desc" },
  });

  const now = new Date().getTime();
  const ageing: AgeingBucketBreakdown = {
    current: 0,
    bucket1to30: 0,
    bucket31to60: 0,
    bucket61to90: 0,
    bucket90Plus: 0,
    totalOverdue: 0,
    totalOutstanding: 0,
  };

  for (const inv of invoices) {
    const balance = inv.amount - inv.paidAmount;
    if (balance <= 0) continue;

    ageing.totalOutstanding += balance;
    const dueTime = new Date(inv.dueDate).getTime();
    const diffDays = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      ageing.current += balance;
    } else {
      ageing.totalOverdue += balance;
      if (diffDays <= 30) ageing.bucket1to30 += balance;
      else if (diffDays <= 60) ageing.bucket31to60 += balance;
      else if (diffDays <= 90) ageing.bucket61to90 += balance;
      else ageing.bucket90Plus += balance;
    }
  }

  const promisesPendingAmount = promises
    .filter((p) => p.status === "pending")
    .reduce((acc, p) => acc + p.amount, 0);

  return {
    ageing,
    invoices,
    promises,
    reconciliations,
    summary: {
      totalCases: invoices.filter((i) => i.status !== "paid").length,
      promisesPendingAmount,
      collectionRatePct: ageing.totalOutstanding > 0 ? Math.round(((ageing.totalOutstanding - ageing.totalOverdue) / ageing.totalOutstanding) * 100) : 100,
    },
  };
}

export async function recordPromiseToPay(params: {
  creditAccountId: string;
  buyerId: string;
  amount: number;
  promisedDate: string | Date;
  notes?: string;
  paymentMode?: string;
  recordedBy?: string;
}) {
  const safeAmount = typeof params.amount === "number" && !isNaN(params.amount) ? Math.max(0, params.amount) : 0;
  if (safeAmount <= 0) {
    throw new Error("Promise to pay amount must be greater than 0");
  }

  return await prisma.promiseToPay.create({
    data: {
      creditAccountId: params.creditAccountId,
      buyerId: params.buyerId,
      amount: safeAmount,
      promisedDate: new Date(params.promisedDate),
      notes: params.notes,
      paymentMode: params.paymentMode || "NEFT/RTGS",
      recordedBy: params.recordedBy || "Collections Desk",
      status: "pending",
    },
  });
}

export async function generatePaymentLink(params: {
  creditAccountId: string;
  invoiceId?: string;
  amount: number;
  expiresInDays?: number;
}) {
  const safeAmount = typeof params.amount === "number" && !isNaN(params.amount) ? Math.max(0, params.amount) : 0;
  if (safeAmount <= 0) {
    throw new Error("Payment link amount must be greater than 0");
  }

  const token = Math.random().toString(36).substring(2, 10);
  const linkUrl = `https://pay.chaanbean.in/quick-pay/${token}`;
  const expiresAt = new Date(Date.now() + (params.expiresInDays || 7) * 86400000);

  return await prisma.paymentLink.create({
    data: {
      creditAccountId: params.creditAccountId,
      invoiceId: params.invoiceId,
      amount: safeAmount,
      linkUrl,
      expiresAt,
      status: "active",
    },
  });
}

export async function processPaymentReconciliation(params: {
  companyId: string;
  creditAccountId?: string;
  invoiceId?: string;
  amountPaid: number;
  referenceNo: string;
  paymentMode?: string;
  notes?: string;
}) {
  const safeAmountPaid = typeof params.amountPaid === "number" && !isNaN(params.amountPaid) ? Math.max(0, params.amountPaid) : 0;
  if (safeAmountPaid <= 0) {
    throw new Error("Payment reconciliation amountPaid must be greater than 0");
  }

  let linkedAccountId = params.creditAccountId;

  // If invoiceId is supplied, update the invoice
  if (params.invoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: params.invoiceId } });
    if (inv) {
      linkedAccountId = linkedAccountId || inv.creditAccountId;
      const newPaid = inv.paidAmount + safeAmountPaid;
      const newStatus = newPaid >= inv.amount ? "paid" : "partial";
      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: newPaid,
          status: newStatus,
        },
      });
    }
  }

  // Synchronize CreditAccount outstanding balance
  if (linkedAccountId) {
    await prisma.creditAccount.updateMany({
      where: { id: linkedAccountId },
      data: {
        outstandingAmount: { decrement: safeAmountPaid },
      },
    });
  }

  // Create reconciliation record
  const rec = await prisma.paymentReconciliation.create({
    data: {
      companyId: params.companyId,
      creditAccountId: linkedAccountId,
      invoiceId: params.invoiceId,
      amountPaid: safeAmountPaid,
      referenceNo: params.referenceNo,
      paymentMode: params.paymentMode || "bank_transfer",
      status: "matched",
      notes: params.notes || "Reconciled via Automated Payment Gateway / Bank Statement",
    },
  });

  return rec;
}
