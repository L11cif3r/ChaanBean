import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFeaturePrice } from "@/lib/pricing/pricing-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let companyId = searchParams.get("companyId");

    if (!companyId) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
      if (match) companyId = decodeURIComponent(match[1]);
    }

    let company = null;
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { walletLedger: true },
      });
    }
    if (!company) {
      company = await prisma.company.findFirst({
        where: { name: { contains: "Acme Traders" } },
        include: { walletLedger: true },
      });
      if (!company) {
        company = await prisma.company.findFirst({
          include: { walletLedger: true },
        });
      }
    }

    if (!company) {
      return NextResponse.json({
        walletBalance: 0,
        plan: "none",
        subscriptionExpiresAt: null,
        daysRemaining: 0,
        isExpired: true,
        ledger: [],
      });
    }

    const now = new Date();
    const expiresAt = company.subscriptionExpiresAt;
    let daysRemaining = 90;
    let isExpired = false;

    if (expiresAt) {
      const diffMs = new Date(expiresAt).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      plan: company.plan,
      walletBalance: company.walletBalance,
      subscriptionExpiresAt: company.subscriptionExpiresAt,
      daysRemaining,
      isExpired,
      ledger: company.walletLedger || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load wallet" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action = "deduct",
      featureKey,
      featureName,
      amount,
      companyId: explicitCompanyId,
      metadata,
    } = body as {
      action?: "deduct" | "credit";
      featureKey?: string;
      featureName?: string;
      amount?: number;
      companyId?: string;
      metadata?: Record<string, unknown>;
    };

    let company = null;
    if (explicitCompanyId) {
      company = await prisma.company.findUnique({ where: { id: explicitCompanyId } });
    }
    if (!company) {
      company = await prisma.company.findFirst();
    }

    if (!company) {
      return NextResponse.json({ error: "No active company found" }, { status: 404 });
    }

    // Determine final price: explicit amount or from dynamic pricing engine
    const finalAmount =
      typeof amount === "number" && amount >= 0
        ? amount
        : featureKey
        ? getFeaturePrice(featureKey)
        : 0;

    // Enforce À La Carte (Call Service Only) scope: cannot deduct for credit reports/legal notices
    if (
      company.plan?.startsWith("alacarte") &&
      action === "deduct" &&
      featureKey &&
      !["default_payment_voice_calls", "recovery_call", "call_service"].includes(featureKey)
    ) {
      return NextResponse.json(
        {
          error: "Your current subscription is À La Carte (Call Service Only). Upgrade to Growth or Enterprise Plan to unlock statutory AI Credit Checks and legal reports.",
          isAlaCarteRestricted: true,
          currentPlan: company.plan,
        },
        { status: 403 }
      );
    }

    if (action === "credit") {
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          walletBalance: { increment: finalAmount },
          lastActiveAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        action: "credit",
        credited: finalAmount,
        newBalance: updated.walletBalance,
      });
    }

    // Action: deduct
    if (company.walletBalance < finalAmount) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Feature costs ₹${finalAmount.toLocaleString(
            "en-IN"
          )}, but your current balance is ₹${company.walletBalance.toLocaleString("en-IN")}.`,
          currentBalance: company.walletBalance,
          requiredAmount: finalAmount,
        },
        { status: 402 }
      );
    }

    // Deduct and update ledger
    const updated = await prisma.company.update({
      where: { id: company.id },
      data: {
        walletBalance: { decrement: finalAmount },
        lastActiveAt: new Date(),
      },
    });

    if (featureKey) {
      await prisma.walletUsageLedger.upsert({
        where: { companyId_reportType: { companyId: company.id, reportType: featureKey } },
        create: {
          companyId: company.id,
          reportType: featureKey,
          timesUsed: 1,
          available: 99,
          cost: finalAmount,
        },
        update: {
          timesUsed: { increment: 1 },
          available: { decrement: 1 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      action: "deduct",
      featureKey,
      featureName: featureName || featureKey,
      deducted: finalAmount,
      newBalance: updated.walletBalance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet operation failed" },
      { status: 500 }
    );
  }
}
