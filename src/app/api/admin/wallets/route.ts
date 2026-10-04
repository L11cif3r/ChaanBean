import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllRechargeTiers } from "@/lib/pricing/recharge-plans";
import { getAllFeaturePricing } from "@/lib/pricing/pricing-engine";

import { verifyAdminSession } from "@/lib/auth/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await verifyAdminSession(req);
  if (!session.authorized) {
    return NextResponse.json(
      { error: session.error || "Admin authentication required" },
      { status: session.status || 401 }
    );
  }

  try {
    const companies = await prisma.company.findMany({
      include: {
        walletLedger: true,
      },
      orderBy: { walletBalance: "desc" },
    });

    const totalTenants = companies.length;
    const totalWalletLiabilities = companies.reduce((acc, c) => acc + (c.walletBalance || 0), 0);
    const customizationCount = companies.filter(
      (c) =>
        c.plan?.includes("50k") ||
        c.plan?.includes("60k") ||
        c.plan?.includes("70k") ||
        c.plan?.includes("80k") ||
        c.plan?.includes("90k") ||
        c.plan?.includes("100k") ||
        c.plan === "enterprise"
    ).length;
    const payAndUseCount = companies.filter(
      (c) => c.plan?.startsWith("recharge_") || c.plan?.startsWith("alacarte_")
    ).length;

    const rechargeTiers = getAllRechargeTiers();
    const pricing = getAllFeaturePricing();

    return NextResponse.json({
      companies: companies.map((c) => {
        const now = new Date();
        const expiresAt = c.subscriptionExpiresAt;
        let daysRemaining = 0;
        let isExpired = false;
        if (expiresAt) {
          const diffMs = new Date(expiresAt).getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isExpired = diffMs <= 0;
        }

        return {
          id: c.id,
          name: c.name,
          plan: c.plan,
          walletBalance: c.walletBalance,
          subscriptionExpiresAt: c.subscriptionExpiresAt,
          daysRemaining,
          isExpired,
          kycStatus: c.kycStatus,
          healthScore: c.healthScore,
          lastActiveAt: c.lastActiveAt,
          signupDate: c.signupDate,
          ledgerCount: c.walletLedger.length,
        };
      }),
      stats: {
        totalTenants,
        totalWalletLiabilities,
        customizationCount,
        payAndUseCount,
      },
      rechargeTiers,
      pricing,
    });
  } catch (error) {
    console.error("Admin wallets GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch admin wallet data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await verifyAdminSession(req, { requireOwner: true });
  if (!session.authorized) {
    return NextResponse.json(
      { error: session.error || "Owner authentication required for wallet operations" },
      { status: session.status || 403 }
    );
  }

  try {
    const body = await req.json();
    const { action, companyId, amount, type = "credit", reason = "Admin adjustment", plan, validityDays = 90 } = body as {
      action: "adjust_balance" | "set_plan";
      companyId: string;
      amount?: number;
      type?: "credit" | "debit";
      reason?: string;
      plan?: string;
      validityDays?: number;
    };

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (action === "adjust_balance") {
      const numAmount = typeof amount === "number" ? Math.abs(amount) : 0;
      if (numAmount <= 0) {
        return NextResponse.json({ error: "Valid non-zero amount required" }, { status: 400 });
      }

      let updatedCompany;
      if (type === "credit") {
        updatedCompany = await prisma.company.update({
          where: { id: companyId },
          data: {
            walletBalance: { increment: numAmount },
            lastActiveAt: new Date(),
          },
        });
      } else {
        // Atomic debit with gte guard preventing negative balances under race conditions
        const debitResult = await prisma.company.updateMany({
          where: {
            id: companyId,
            walletBalance: { gte: numAmount },
          },
          data: {
            walletBalance: { decrement: numAmount },
            lastActiveAt: new Date(),
          },
        });

        if (debitResult.count === 0) {
          return NextResponse.json(
            { error: "Insufficient wallet balance for debit adjustment" },
            { status: 400 }
          );
        }

        updatedCompany = await prisma.company.findUniqueOrThrow({
          where: { id: companyId },
        });
      }

      // Record in usage ledger
      await prisma.walletUsageLedger.upsert({
        where: { companyId_reportType: { companyId, reportType: `admin_adjustment_${Date.now()}` } },
        create: {
          companyId,
          reportType: `admin_adjustment_${Date.now()}`,
          timesUsed: 1,
          available: Math.round(updatedCompany.walletBalance),
          cost: numAmount,
        },
        update: {
          timesUsed: { increment: 1 },
          available: Math.round(updatedCompany.walletBalance),
        },
      });

      return NextResponse.json({
        success: true,
        action: "adjust_balance",
        type,
        adjustedAmount: numAmount,
        newBalance: updatedCompany.walletBalance,
        company: updatedCompany,
      });
    }

    if (action === "set_plan") {
      if (!plan) {
        return NextResponse.json({ error: "Plan is required" }, { status: 400 });
      }

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + (validityDays || 90));

      const updated = await prisma.company.update({
        where: { id: companyId },
        data: {
          plan,
          subscriptionExpiresAt: newExpiry,
          lastActiveAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        action: "set_plan",
        newPlan: updated.plan,
        newExpiry: updated.subscriptionExpiresAt,
        company: updated,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin wallets POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute wallet operation" },
      { status: 500 }
    );
  }
}
