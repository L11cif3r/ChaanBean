import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      planId = "growth",
      planName = "Retail Plan (Growth)",
      paidAmount = 9899,
      validityDays: passedValidityDays,
      validityMonths: passedValidityMonths,
      callsCount,
      isAlaCarte,
      txnId,
      companyId: explicitCompanyId,
    } = body as {
      planId: string;
      planName: string;
      paidAmount: number;
      validityDays?: number;
      validityMonths?: number;
      callsCount?: number;
      isAlaCarte?: boolean;
      txnId?: string;
      companyId?: string;
    };

    let company = null;
    if (explicitCompanyId) {
      company = await prisma.company.findUnique({ where: { id: explicitCompanyId } });
    }
    if (!company) {
      company = await prisma.company.findFirst();
    }

    // Dynamic Validity duration calculation
    let validityDays = Number(passedValidityDays);
    let validityMonths = Number(passedValidityMonths);

    if (!validityDays || isNaN(validityDays)) {
      if (planId === "alacarte_19k") {
        validityDays = 365;
        validityMonths = 12;
      } else if (planId === "alacarte_14k") {
        validityDays = 270;
        validityMonths = 9;
      } else if (planId === "alacarte_8k") {
        validityDays = 180;
        validityMonths = 6;
      } else {
        validityDays = 90;
        validityMonths = 3;
      }
    }
    if (!validityMonths || isNaN(validityMonths)) {
      validityMonths = Math.round(validityDays / 30);
    }

    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: "Acme Traders Pvt Ltd",
          plan: planId,
          walletBalance: paidAmount, // 100% credited
          subscriptionExpiresAt: expiresAt,
          kycStatus: "verified",
          roles: "admin,operator",
          industry: "Manufacturing & Wholesale Distribution",
          healthScore: "Healthy",
        },
      });
    } else {
      // Add 100% of subscription amount to wallet balance
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          plan: planId,
          walletBalance: { increment: paidAmount },
          subscriptionExpiresAt: expiresAt,
          lastActiveAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Subscribed to ${planName}. ₹${paidAmount.toLocaleString("en-IN")} credited to Feature Wallet.`,
      company: {
        id: company.id,
        name: company.name,
        plan: company.plan,
        walletBalance: company.walletBalance,
        subscriptionExpiresAt: company.subscriptionExpiresAt,
      },
      subscription: {
        planId,
        planName,
        paidAmount,
        walletAdded: paidAmount,
        validityMonths,
        validityDays,
        callsCount: callsCount || (planId.startsWith("alacarte") ? parseInt(planId.replace("alacarte_", "").replace("k", "000")) : undefined),
        isAlaCarte: isAlaCarte || planId.startsWith("alacarte"),
        expiresAt: expiresAt.toISOString(),
        txnId: txnId || `TXN-CB-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to activate subscription" },
      { status: 500 }
    );
  }
}
