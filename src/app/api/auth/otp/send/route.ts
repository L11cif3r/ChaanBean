import { NextResponse } from "next/server";
import { createOtpSession } from "@/lib/auth/otp-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/otp/send
 * Initiates an OTP session for Mobile Sign-In or Registration.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mobile, purpose = "login", fullName, companyName, email, pan, gstin, plan, industry } = body;

    if (!mobile) {
      return NextResponse.json(
        { error: "Mobile number is required." },
        { status: 400 }
      );
    }

    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const session = await createOtpSession({
      mobile: cleanMobile,
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OTP" },
      { status: 500 }
    );
  }
}
