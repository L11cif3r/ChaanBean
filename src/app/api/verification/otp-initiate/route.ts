import { NextResponse } from "next/server";
import { initiateGstSupremeOtp } from "@/lib/verification-gateway/clients";

export async function POST(request: Request) {
  try {
    const { gstin, mobile } = await request.json();
    const cleanGstin = typeof gstin === "string" ? gstin.trim().toUpperCase() : "";
    if (!cleanGstin || cleanGstin.length !== 15) {
      return NextResponse.json({ error: "Valid 15-character GSTIN is required" }, { status: 400 });
    }

    const cleanMobile = typeof mobile === "string" ? mobile.replace(/\D/g, "").slice(-10) : "9876543210";
    const result = await initiateGstSupremeOtp(cleanGstin, cleanMobile);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OTP" },
      { status: 500 }
    );
  }
}
