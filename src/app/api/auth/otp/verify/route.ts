import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOtpSession } from "@/lib/auth/otp-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/otp/verify
 * Validates the 6-digit OTP and completes Sign-In or Registration.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mobile,
      otp,
      txnId,
      purpose,
      fullName: reqFullName,
      companyName: reqCompanyName,
      email: reqEmail,
      pan: reqPan,
      gstin: reqGstin,
      plan: reqPlan = "growth",
      industry: reqIndustry = "Wholesale & Industrial Distribution",
    } = body;

    if (!mobile || !otp) {
      return NextResponse.json(
        { error: "Both mobile number and 6-digit OTP are required." },
        { status: 400 }
      );
    }

    // 1. Verify OTP with cryptographic session manager
    const verification = await verifyOtpSession({
      mobile: String(mobile),
      otp: String(otp),
      txnId: txnId ? String(txnId).trim() : undefined,
    });

    const cleanMobile = verification.mobile;
    const meta = verification.metadata || {};
    const finalCompanyName = (reqCompanyName || meta.companyName || "").trim();
    const finalFullName = (reqFullName || meta.fullName || "").trim();
    const finalEmail = (reqEmail || meta.email || "").trim().toLowerCase();
    const finalPan = (reqPan || meta.pan || "").trim().toUpperCase();
    const finalGstin = (reqGstin || meta.gstin || "").trim().toUpperCase();
    const finalPlan = reqPlan || meta.plan || "growth";
    const finalIndustry = reqIndustry || meta.industry || "Wholesale & Industrial Distribution";

    let company = null;

    // 2. If registering or companyName specified, look up or create company
    if (finalCompanyName) {
      company = await prisma.company.findFirst({
        where: { name: { contains: finalCompanyName, mode: "insensitive" } },
      });
    }

    // 3. Fallback: try finding buyer/debtor or company with this mobile number
    if (!company) {
      const buyerWithPhone = await prisma.buyerDebtor.findFirst({
        where: { mobileNumbers: { contains: cleanMobile } },
        include: { company: true },
      });
      if (buyerWithPhone?.company) {
        company = buyerWithPhone.company;
      }
    }

    // 4. Create new Company if user is registering or no company exists yet for this number
    if (!company) {
      const generatedCompanyName = finalCompanyName || `Enterprise Partner (${cleanMobile.slice(-4)})`;
      company = await prisma.company.create({
        data: {
          name: generatedCompanyName,
          plan: finalPlan,
          walletBalance: 250000,
          kycStatus: "verified",
          industry: finalIndustry,
          healthScore: "Healthy",
        },
      });

      // Issue TrustProfile
      const cleanPanSlice = finalPan ? finalPan.slice(2, 6) : "ABCD";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const trustId = `TH-CB-${cleanPanSlice}-${randomSuffix}`;

      await prisma.trustProfile.create({
        data: {
          companyId: company.id,
          trustId,
          visibility: "network",
          linkedReports: JSON.stringify(["gst_active", "mobile_verified"]),
          complianceBadges: JSON.stringify([
            "Mobile Verified Enterprise",
            "ChaanBean Authenticated Partner",
          ]),
        },
      });
    }

    // Formulate authentic user payload
    const userEmail = finalEmail || `${cleanMobile}@chaanbean-partner.in`;
    const userFullName = finalFullName || (company.name.includes("Enterprise") ? "Trade Director" : company.name);

    const res = NextResponse.json({
      success: true,
      authenticated: true,
      message: "Mobile number verified successfully. Access granted.",
      user: {
        id: company.id,
        name: company.name,
        fullName: userFullName,
        phone: cleanMobile,
        email: userEmail,
        role: "client_admin",
        companyId: company.id,
        plan: company.plan,
        walletBalance: company.walletBalance,
        kycStatus: company.kycStatus,
        healthScore: company.healthScore,
      },
    });

    // Set authentic session cookies
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
    res.cookies.set("chaanbean_session", "client", {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });
    res.cookies.set("chaanbean_subscription", "active", {
      path: "/",
      maxAge: 7776000,
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OTP validation failed." },
      { status: 400 }
    );
  }
}
