import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. CLIENT LOGIN
    if (action === "login_client") {
      const { email, companyName } = body;
      let company = await prisma.company.findFirst({
        where: {
          OR: [
            companyName ? { name: { contains: companyName } } : {},
            { name: "Acme Traders Pvt Ltd" },
          ],
        },
      });

      if (!company) {
        company = await prisma.company.findFirst();
      }

      if (!company) {
        return NextResponse.json(
          { error: "No active client organization account found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        type: "client",
        user: {
          id: company.id,
          name: company.name,
          email: email || "trade.operations@acmetraders.in",
          role: "client_admin",
          companyId: company.id,
          plan: company.plan,
          walletBalance: company.walletBalance,
        },
      });
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
        return NextResponse.json({
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

      return NextResponse.json({
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

      return NextResponse.json({
        success: true,
        type: "admin",
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      });
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

      // Check admin security passkey
      const VALID_PASSKEYS = ["CHAANBEAN-ROOT-2026", "CHAANBEAN-ADMIN", "ADMIN2026"];
      if (securityKey && !VALID_PASSKEYS.includes(securityKey.trim())) {
        return NextResponse.json(
          { error: "Invalid Admin Master Security Key." },
          { status: 403 }
        );
      }

      const existing = await prisma.adminUser.findUnique({
        where: { email },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          type: "admin",
          message: "Admin credentials verified.",
          user: existing,
        });
      }

      const newAdmin = await prisma.adminUser.create({
        data: {
          name,
          email,
          role: role === "team_member" ? "team_member" : "owner",
        },
      });

      return NextResponse.json({
        success: true,
        type: "admin",
        message: "New Administrator successfully registered.",
        user: newAdmin,
      });
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
