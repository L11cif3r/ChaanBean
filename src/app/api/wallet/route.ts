import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFeaturePrice, getAlaCarteRateCard } from "@/lib/pricing/pricing-engine";
import { getAllRechargeTiers, getRechargeTier } from "@/lib/pricing/recharge-plans";
import { resolveTenantCompany, getDefaultCompany } from "@/lib/tenant/tenant-resolver";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get("companyId");

    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const authenticatedTenantId = req.headers.get("x-tenant-id") || (match ? decodeURIComponent(match[1]) : undefined);

    if (queryCompanyId && authenticatedTenantId && queryCompanyId !== authenticatedTenantId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access another company's wallet" },
        { status: 403 }
      );
    }

    const company = await resolveTenantCompany(req, { include: { walletLedger: true } });

    if (!company) {
      return NextResponse.json({
        walletBalance: 0,
        plan: "none",
        subscriptionExpiresAt: null,
        daysRemaining: 0,
        isExpired: true,
        ledger: [],
        rateCard: getAlaCarteRateCard(),
        rechargeTiers: getAllRechargeTiers(),
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

    const res = NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      plan: company.plan,
      walletBalance: company.walletBalance,
      subscriptionExpiresAt: company.subscriptionExpiresAt,
      daysRemaining,
      isExpired,
      ledger: (company as any).walletLedger || [],
      rateCard: getAlaCarteRateCard(),
      rechargeTiers: getAllRechargeTiers(),
    });

    // Keep active tenant cookie strictly synchronized
    res.cookies.set("chaanbean_company_id", company.id, {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });
    res.cookies.set("chaanbean_company_name", encodeURIComponent(company.name), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return res;
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
      rechargeId,
      companyId: explicitCompanyId,
      metadata,
    } = body as {
      action?: "deduct" | "credit" | "recharge";
      featureKey?: string;
      featureName?: string;
      amount?: number;
      rechargeId?: string;
      companyId?: string;
      metadata?: Record<string, unknown>;
    };

    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const authenticatedTenantId = req.headers.get("x-tenant-id") || (match ? decodeURIComponent(match[1]) : undefined);

    let targetCompanyId = authenticatedTenantId;
    if (explicitCompanyId) {
      if (authenticatedTenantId && explicitCompanyId !== authenticatedTenantId) {
        return NextResponse.json(
          { error: "Forbidden: Cannot perform wallet operations on another tenant's account" },
          { status: 403 }
        );
      }
      targetCompanyId = explicitCompanyId;
    }

    let company = null;
    if (targetCompanyId) {
      company = await prisma.company.findUnique({ where: { id: targetCompanyId } });
    }
    if (!company) {
      company = await getDefaultCompany();
    }

    if (!company) {
      return NextResponse.json({ error: "No active company found" }, { status: 404 });
    }

    // -------------------------------------------------------------
    // ACTION: RECHARGE (À La Carte Pay & Use Packs from ₹5k to ₹100k+)
    // -------------------------------------------------------------
    if (action === "recharge") {
      if (typeof amount === "number" && (isNaN(amount) || amount <= 0)) {
        return NextResponse.json(
          { error: "Recharge amount must be a positive number greater than 0" },
          { status: 400 }
        );
      }

      let rechargeAmount = typeof amount === "number" && amount >= 5000 ? amount : 5000;
      let rechargeTier = rechargeId ? getRechargeTier(rechargeId) : undefined;

      if (!rechargeTier && typeof amount === "number") {
        const tiers = getAllRechargeTiers();
        rechargeTier = tiers.find((t) => t.amount === amount);
      }

      if (rechargeTier) {
        rechargeAmount = rechargeTier.amount;
      }

      const validityDays = rechargeTier ? rechargeTier.validityDays : 90;
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + validityDays);

      const isSub = company.plan === "growth" || company.plan === "enterprise";
      const targetPlan = isSub ? company.plan : (rechargeTier?.id || "alacarte_pay_and_use");

      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          walletBalance: { increment: rechargeAmount },
          plan: targetPlan,
          subscriptionExpiresAt: newExpiry,
          lastActiveAt: new Date(),
        },
      });

      // Record in usage ledger
      await prisma.walletUsageLedger.upsert({
        where: { companyId_reportType: { companyId: company.id, reportType: "wallet_recharge" } },
        create: {
          companyId: company.id,
          reportType: "wallet_recharge",
          timesUsed: 1,
          available: Math.round(updated.walletBalance),
          cost: rechargeAmount,
        },
        update: {
          timesUsed: { increment: 1 },
          available: Math.round(updated.walletBalance),
        },
      });

      return NextResponse.json({
        success: true,
        action: "recharge",
        rechargeAmount,
        tier: rechargeTier?.name || `Pay & Use ₹${rechargeAmount.toLocaleString("en-IN")}`,
        isCustomization: Boolean(rechargeTier?.isCustomization),
        validityDays,
        newBalance: updated.walletBalance,
        subscriptionExpiresAt: updated.subscriptionExpiresAt,
      });
    }

    // -------------------------------------------------------------
    // ACTION: CREDIT (Direct administrative or promotional credit)
    // -------------------------------------------------------------
    if (action === "credit") {
      const adminRoleHeader = req.headers.get("x-admin-role");
      const adminSecretHeader = req.headers.get("x-admin-key");
      const isAdmin =
        adminRoleHeader === "owner" ||
        adminRoleHeader === "admin" ||
        (process.env.ADMIN_SECRET_KEY && adminSecretHeader === process.env.ADMIN_SECRET_KEY);

      if (!isAdmin && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Unauthorized: Administrative role required for direct credit operations" },
          { status: 403 }
        );
      }

      if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Credit amount must be a positive number greater than 0" },
          { status: 400 }
        );
      }

      const creditAmount = amount;
      const updated = await prisma.company.update({
        where: { id: company.id },
        data: {
          walletBalance: { increment: creditAmount },
          lastActiveAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        action: "credit",
        credited: creditAmount,
        newBalance: updated.walletBalance,
      });
    }

    // -------------------------------------------------------------
    // ACTION: DEDUCT (Pay-per-use across ANY platform service)
    // -------------------------------------------------------------
    if (typeof amount === "number" && (isNaN(amount) || amount <= 0)) {
      return NextResponse.json(
        { error: "Deduction amount must be a positive number greater than 0" },
        { status: 400 }
      );
    }

    // Determine final price: explicit amount or from dynamic pricing engine
    const finalAmount =
      typeof amount === "number" && amount > 0
        ? amount
        : featureKey
        ? getFeaturePrice(featureKey)
        : 0;

    if (finalAmount <= 0) {
      return NextResponse.json(
        { error: "Feature price or deduction amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (company.walletBalance < finalAmount) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Feature costs ₹${finalAmount.toLocaleString(
            "en-IN"
          )}, but your current balance is ₹${company.walletBalance.toLocaleString("en-IN")}.`,
          currentBalance: company.walletBalance,
          requiredAmount: finalAmount,
          isInsufficientBalance: true,
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
