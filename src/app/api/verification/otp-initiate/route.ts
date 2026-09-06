import { NextResponse } from "next/server";
import { initiateGstSupremeOtp } from "@/lib/verification-gateway/clients";

export async function POST(request: Request) {
  try {
    const { gstin, mobile } = await request.json();
    if (!gstin) {
      return NextResponse.json({ error: "GSTIN is required" }, { status: 400 });
    }

    const result = await initiateGstSupremeOtp(gstin, mobile || "9876543210");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OTP" },
      { status: 500 }
    );
  }
}
