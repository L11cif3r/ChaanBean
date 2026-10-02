import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultCompany } from "@/lib/tenant/tenant-resolver";
import { createOtpSession, verifyOtpSession } from "@/lib/auth/otp-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth
 * Retrieves current authenticated session details for client or admin.
 */
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const matchCompany = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const cookieCompanyId = matchCompany ? decodeURIComponent(matchCompany[1]) : undefined;
    const headerCompanyId = req.headers.get("x-tenant-id");
    const targetCompanyId = headerCompanyId || cookieCompanyId;

    const matchAdminSession = cookieHeader.match(/chaanbean_admin_session=([^;]+)/);
    const matchAdminId = cookieHeader.match(/chaanbean_admin_id=([^;]+)/);
    const adminSessionActive = matchAdminSession && matchAdminSession[1] === "active";
    const adminId = matchAdminId ? decodeURIComponent(matchAdminId[1]) : undefined;

    // 1. Check if admin session is active
    if (adminSessionActive) {
      const adminUser = adminId
        ? await prisma.adminUser.findUnique({ where: { id: adminId } })
        : await prisma.adminUser.findFirst();

      if (adminUser) {
        return NextResponse.json({
          authenticated: true,
          type: "admin",
          user: {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
          },
        });
      }
    }

    // 2. Check if client company session is active
    if (targetCompanyId) {
      const company = await prisma.company.findUnique({
        where: { id: targetCompanyId },
        include: { trustProfiles: true },
      });

      if (company) {
        return NextResponse.json({
          authenticated: true,
          type: "client",
          user: {
            id: company.id,
            name: company.name,
            email: company.name.includes("ABC")
              ? "enterprise@abcindustry.in"
              : "trade.ops@acmetraders.in",
            role: "client_admin",
            companyId: company.id,
            plan: company.plan,
            walletBalance: company.walletBalance,
            kycStatus: company.kycStatus,
            healthScore: company.healthScore,
            trustId: company.trustProfiles?.[0]?.trustId || null,
          },
        });
      }
    }

    // 3. No active session found
    return NextResponse.json({
      authenticated: false,
      message: "No active user or client organization session found.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve session" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. CLIENT LOGIN
    if (action === "login_client") {
      const { email, companyName } = body;
      const emailLower = (email || "").toLowerCase();
      const compLower = (companyName || "").toLowerCase();

      let company = null;

      if (emailLower.includes("abc") || compLower.includes("abc")) {
        company = await prisma.company.findFirst({
          where: { name: { contains: "ABC Industry" } },
        });
      } else if (compLower) {
        company = await prisma.company.findFirst({
          where: { name: { contains: companyName } },
        });
      }

      if (!company) {
        company = await getDefaultCompany();
      }

      if (!company) {
        return NextResponse.json(
          { error: "No active client organization account found." },
          { status: 404 }
        );
      }

      const res = NextResponse.json({
        success: true,
        type: "client",
        user: {
          id: company.id,
          name: company.name,
          email:
            email ||
            (company.name.includes("ABC")
              ? "enterprise@abcindustry.in"
              : "trade.ops@acmetraders.in"),
          role: "client_admin",
          companyId: company.id,
          plan: company.plan,
          walletBalance: company.walletBalance,
        },
      });

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
    }

    // 1b. SEND OTP (Sign-In or Registration Initiation)
    if (action === "send_otp") {
      const { mobile, purpose = "login", fullName, companyName, email, pan, gstin, plan, industry } = body;
      if (!mobile) {
        return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
      }

      const session = await createOtpSession({
        mobile,
        purpose: purpose === "register" ? "register" : "login",
        metadata: {
          fullName: fullName ? String(fullName).trim() : undefined,
          companyName: companyName ? String(companyName).trim() : undefined,
          email: email ? String(email).trim().toLowerCase() : undefined,
          pan: pan ? String(pan).trim().toUpperCase() : undefined,
          gstin: gstin ? String(gstin).trim().toUpperCase() : undefined,
          plan: plan ? String(plan).trim() : undefined,
          industry: industry ? String(industry).trim() : undefined,
        },
      });

      return NextResponse.json({
        success: true,
        txnId: session.txnId,
        mobile: session.mobile,
        expiresInSeconds: session.expiresInSeconds,
        message: session.message,
        ...(session.uatOtp ? { uatOtp: session.uatOtp } : {}),
      });
    }

    // 1c. VERIFY OTP / CLIENT OTP LOGIN
    if (action === "login_otp" || action === "verify_otp") {
      const { mobile, otpCode, otp, txnId, companyName, fullName, email, pan, gstin, plan, industry } = body;
      const finalOtp = otp || otpCode;

      if (!mobile) {
        return NextResponse.json({ error: "Mobile number is required." }, { status: 400 });
      }
      if (!finalOtp) {
        return NextResponse.json({ error: "6-digit OTP code is required." }, { status: 400 });
      }

      const verification = await verifyOtpSession({
        mobile: String(mobile),
        otp: String(finalOtp),
        txnId: txnId ? String(txnId).trim() : undefined,
      });

      const cleanMobile = verification.mobile;
      const meta = verification.metadata || {};
      const finalCompanyName = (companyName || meta.companyName || "").trim();
      const finalFullName = (fullName || meta.fullName || "").trim();
      const finalEmail = (email || meta.email || "").trim().toLowerCase();
      const finalPan = (pan || meta.pan || "").trim().toUpperCase();
      const finalPlan = plan || meta.plan || "growth";
      const finalIndustry = industry || meta.industry || "Wholesale & Industrial Distribution";

      let company = null;
      if (finalCompanyName) {
        company = await prisma.company.findFirst({
          where: { name: { contains: finalCompanyName, mode: "insensitive" } },
        });
      }

      if (!company) {
        const buyerWithPhone = await prisma.buyerDebtor.findFirst({
          where: { mobileNumbers: { contains: cleanMobile } },
          include: { company: true },
        });
        if (buyerWithPhone?.company) {
          company = buyerWithPhone.company;
        }
      }

      if (!company) {
        const generatedName = finalCompanyName || `Enterprise Partner (${cleanMobile.slice(-4)})`;
        company = await prisma.company.create({
          data: {
            name: generatedName,
            plan: finalPlan,
            walletBalance: 250000,
            kycStatus: "verified",
            industry: finalIndustry,
            healthScore: "Healthy",
          },
        });

        const cleanPanSlice = finalPan ? finalPan.slice(2, 6) : "ABCD";
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        await prisma.trustProfile.create({
          data: {
            companyId: company.id,
            trustId: `TH-CB-${cleanPanSlice}-${randomSuffix}`,
            visibility: "network",
            linkedReports: JSON.stringify(["mobile_verified", "kyc_passed"]),
            complianceBadges: JSON.stringify([
              "Mobile Verified Enterprise",
              "ChaanBean Authenticated Partner",
            ]),
          },
        });
      }

      const userEmail = finalEmail || `${cleanMobile}@chaanbean-partner.in`;
      const userFullName = finalFullName || (company.name.includes("Enterprise") ? "Trade Director" : company.name);

      const res = NextResponse.json({
        success: true,
        type: "client",
        authenticated: true,
        message: "Mobile verified successfully.",
        user: {
          id: company.id,
          name: company.name,
          fullName: userFullName,
          email: userEmail,
          phone: cleanMobile,
          role: "client_admin",
          companyId: company.id,
          plan: company.plan,
          walletBalance: company.walletBalance,
        },
      });

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
    }

    // 2. CLIENT REGISTRATION
    if (action === "register_client") {
      const {
        fullName,
        companyName,
        email,
        phone,
        pan,
        gstin,
        plan = "growth",
        industry = "Wholesale & Industrial Distribution",
      } = body;

      if (!companyName || !email) {
        return NextResponse.json(
          { error: "Enterprise Company Name and Official Email are required." },
          { status: 400 }
        );
      }

      // Check if company already registered
      const existingCompany = await prisma.company.findFirst({
        where: { name: companyName },
      });

      if (existingCompany) {
        const res = NextResponse.json({
          success: true,
          type: "client",
          message: "Enterprise account already registered. Logged in successfully.",
          user: {
            id: existingCompany.id,
            name: existingCompany.name,
            email,
            phone,
            role: "client_admin",
            companyId: existingCompany.id,
            plan: existingCompany.plan,
            walletBalance: existingCompany.walletBalance,
          },
        });
        res.cookies.set("chaanbean_company_id", existingCompany.id, {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
        res.cookies.set("chaanbean_company_name", encodeURIComponent(existingCompany.name), {
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
      }

      // Create new Company in Prisma
      const newCompany = await prisma.company.create({
        data: {
          name: companyName,
          plan,
          walletBalance: 250000,
          kycStatus: "verified",
          industry,
          healthScore: "Healthy",
        },
      });

      // Issue initial TrustProfile for the new company
      const cleanPan = pan ? pan.toUpperCase() : "AABCC1234F";
      const trustId = `TH-CB-${cleanPan.slice(2, 6)}-${Math.abs(crc32(companyName) % 9000 + 1000)}`;

      await prisma.trustProfile.create({
        data: {
          companyId: newCompany.id,
          trustId,
          visibility: "network",
          linkedReports: JSON.stringify(["gst_active", "kyc_passed"]),
          complianceBadges: JSON.stringify([
            "GST Verified Enterprise",
            "Zero Peer Default Certified",
            "ChaanBean Verified Account",
          ]),
        },
      });

      const res = NextResponse.json({
        success: true,
        type: "client",
        message: "Enterprise account registered successfully.",
        user: {
          id: newCompany.id,
          name: newCompany.name,
          fullName: fullName || "Trade Director",
          email,
          phone,
          role: "client_admin",
          companyId: newCompany.id,
          plan: newCompany.plan,
          walletBalance: newCompany.walletBalance,
          trustId,
        },
      });
      res.cookies.set("chaanbean_company_id", newCompany.id, {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });
      res.cookies.set("chaanbean_company_name", encodeURIComponent(newCompany.name), {
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
    }

    // 3. ADMIN LOGIN
    if (action === "login_admin") {
      const { email, password } = body;

      let adminUser = await prisma.adminUser.findFirst({
        where: email ? { email } : { role: "owner" },
      });

      if (!adminUser) {
        adminUser = await prisma.adminUser.findFirst();
      }

      if (!adminUser) {
        // Create initial default admin if empty
        adminUser = await prisma.adminUser.create({
          data: {
            name: "Siddharth Verma",
            email: email || "owner@chaanbean.in",
            role: "owner",
          },
        });
      }

      const res = NextResponse.json({
        success: true,
        type: "admin",
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      });

      res.cookies.set("chaanbean_admin_session", "active", {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });
      res.cookies.set("chaanbean_admin_role", adminUser.role, {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });
      res.cookies.set("chaanbean_admin_id", adminUser.id, {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });

      return res;
    }

    // 4. ADMIN REGISTRATION
    if (action === "register_admin") {
      const { name, email, securityKey, role = "owner" } = body;

      if (!name || !email) {
        return NextResponse.json(
          { error: "Administrator Name and Official Email are required." },
          { status: 400 }
        );
      }

      // Check admin security passkey (externalized to ADMIN_SECURITY_KEY in production)
      const configuredKey = process.env.ADMIN_SECURITY_KEY;
      const isDev = process.env.NODE_ENV !== "production";
      const validKeys = [
        ...(configuredKey ? [configuredKey.trim()] : []),
        ...(isDev ? ["CHAANBEAN-ROOT-2026", "CHAANBEAN-ADMIN", "ADMIN2026"] : []),
      ];

      const providedKey = (securityKey || "").trim();
      if (!validKeys.includes(providedKey)) {
        return NextResponse.json(
          { error: "Invalid Admin Master Security Key." },
          { status: 403 }
        );
      }

      const existing = await prisma.adminUser.findUnique({
        where: { email },
      });

      if (existing) {
        const res = NextResponse.json({
          success: true,
          type: "admin",
          message: "Admin credentials verified.",
          user: existing,
        });

        res.cookies.set("chaanbean_admin_session", "active", {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
        res.cookies.set("chaanbean_admin_role", existing.role, {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });
        res.cookies.set("chaanbean_admin_id", existing.id, {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
        });

        return res;
      }

      const newAdmin = await prisma.adminUser.create({
        data: {
          name,
          email,
          role: role === "team_member" ? "team_member" : "owner",
        },
      });

      const res = NextResponse.json({
        success: true,
        type: "admin",
        message: "New Administrator successfully registered.",
        user: newAdmin,
      });

      res.cookies.set("chaanbean_admin_session", "active", {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });
      res.cookies.set("chaanbean_admin_role", newAdmin.role, {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });
      res.cookies.set("chaanbean_admin_id", newAdmin.id, {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });

      return res;
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed." },
      { status: 500 }
    );
  }
}

function crc32(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
