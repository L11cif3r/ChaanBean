import { prisma } from "@/lib/db";

export interface AccountMonitoringSummary {
  creditAccountId: string;
  buyerId: string;
  buyerName: string;
  creditLimit: number;
  totalOutstanding: number;
  utilizationPct: number;
  isOverLimit: boolean;
  creditHoldActive: boolean;
  creditHoldReason?: string;
  overdueStatus: string;
  overdueAmount: number;
  activeAlertsCount: number;
  invoicesCount: number;
}

export async function getCompanyMonitoringSummary(companyId?: string): Promise<{
  accounts: AccountMonitoringSummary[];
  alerts: any[];
  totalExposure: number;
  totalOverdue: number;
  totalCreditLimit: number;
  overallUtilizationPct: number;
  accountsOnHoldCount: number;
}> {
  // Find first active company if not specified
  const targetCompany = companyId
    ? await prisma.company.findUnique({ where: { id: companyId } })
    : await prisma.company.findFirst();

  if (!targetCompany) {
    return {
      accounts: [],
      alerts: [],
      totalExposure: 0,
      totalOverdue: 0,
      totalCreditLimit: 0,
      overallUtilizationPct: 0,
      accountsOnHoldCount: 0,
    };
  }

  const buyers = await prisma.buyerDebtor.findMany({
    where: { companyId: targetCompany.id },
    include: {
      creditAccounts: {
        include: {
          invoices: true,
          creditHolds: { where: { status: "active" } },
        },
      },
      monitoringAlerts: {
        where: { status: { in: ["active", "snoozed"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const alerts = await prisma.monitoringAlert.findMany({
    where: { companyId: targetCompany.id },
    include: { buyer: { select: { id: true, name: true, gstin: true } } },
    orderBy: { createdAt: "desc" },
  });

  let totalExposure = 0;
  let totalOverdue = 0;
  let totalCreditLimit = 0;
  let accountsOnHoldCount = 0;

  const accounts: AccountMonitoringSummary[] = [];

  for (const b of buyers) {
    for (const ca of b.creditAccounts) {
      const activeHold = ca.creditHolds.length > 0 ? ca.creditHolds[0] : null;
      if (activeHold) accountsOnHoldCount++;

      const invoices = ca.invoices;
      const overdueInvoices = invoices.filter(
        (i) => i.status === "overdue" || (i.status !== "paid" && new Date(i.dueDate) < new Date())
      );
      const overdueAmt = overdueInvoices.reduce((acc, i) => acc + (i.amount - i.paidAmount), 0);

      const exposure = ca.outstandingAmount || invoices.reduce((acc, i) => acc + (i.amount - i.paidAmount), 0);
      const limit = ca.creditLimit || (ca.outstandingAmount > 0 ? ca.outstandingAmount * 1.25 : 500000);

      totalExposure += exposure;
      totalOverdue += overdueAmt;
      totalCreditLimit += limit;

      const utilizationPct = limit > 0 ? Math.round((exposure / limit) * 100) : 0;

      accounts.push({
        creditAccountId: ca.id,
        buyerId: b.id,
        buyerName: b.name,
        creditLimit: limit,
        totalOutstanding: exposure,
        utilizationPct,
        isOverLimit: exposure > limit,
        creditHoldActive: Boolean(activeHold),
        creditHoldReason: activeHold?.reason,
        overdueStatus: ca.overdueStatus,
        overdueAmount: overdueAmt,
        activeAlertsCount: b.monitoringAlerts.length,
        invoicesCount: invoices.length,
      });
    }
  }

  const overallUtilizationPct = totalCreditLimit > 0 ? Math.round((totalExposure / totalCreditLimit) * 100) : 0;

  return {
    accounts,
    alerts,
    totalExposure,
    totalOverdue,
    totalCreditLimit,
    overallUtilizationPct,
    accountsOnHoldCount,
  };
}

export async function setCreditHold(
  creditAccountId: string,
  reason: string,
  placedBy = "Operator"
): Promise<{ success: boolean; message: string }> {
  // Check existing
  const existing = await prisma.creditHold.findFirst({
    where: { creditAccountId, status: "active" },
  });

  if (existing) {
    return { success: true, message: "Credit hold is already active for this account." };
  }

  await prisma.creditHold.create({
    data: {
      creditAccountId,
      reason,
      status: "active",
      placedBy,
    },
  });

  return { success: true, message: "Credit hold enforced successfully." };
}

export async function revokeCreditHold(
  creditAccountId: string,
  revokedBy = "Operator"
): Promise<{ success: boolean; message: string }> {
  await prisma.creditHold.updateMany({
    where: { creditAccountId, status: "active" },
    data: {
      status: "revoked",
      revokedBy,
      revokedAt: new Date(),
    },
  });

  return { success: true, message: "Credit hold revoked. Account unlocked." };
}

export async function updateAlertStatus(
  alertId: string,
  status: "acknowledged" | "resolved" | "snoozed",
  actorName = "User"
): Promise<{ success: boolean }> {
  const updateData: any = { status };
  if (status === "acknowledged") {
    updateData.acknowledgedBy = actorName;
    updateData.acknowledgedAt = new Date();
  } else if (status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  await prisma.monitoringAlert.update({
    where: { id: alertId },
    data: updateData,
  });

  return { success: true };
}
