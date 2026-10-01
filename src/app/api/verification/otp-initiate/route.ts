import { NextResponse } from "next/server";
import { initiateGstnOtp, storeGstnSession } from "@/lib/gstn";
import { lookupDatabaseEntity } from "@/lib/verification-gateway/clients";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gstin, mobile, legalName, email, emailId_pas } = body;
    const cleanGstin = typeof gstin === "string" ? gstin.trim().toUpperCase() : "";
    if (!cleanGstin || cleanGstin.length !== 15) {
      return NextResponse.json({ error: "Valid 15-character GSTIN is required" }, { status: 400 });
    }

    // Lookup entity if legalName or email not passed
    let targetLegalName = typeof legalName === "string" ? legalName.trim() : "";
    let targetEmail = typeof email === "string" ? email.trim() : typeof emailId_pas === "string" ? emailId_pas.trim() : "";

    if (!targetLegalName || !targetEmail) {
      const entity = await lookupDatabaseEntity(cleanGstin);
      if (!targetLegalName) targetLegalName = entity.name || "Authorized Taxpayer";
      if (!targetEmail) targetEmail = entity.email || "compliance@taxpayer.in";
    }

    const result = await initiateGstnOtp({
      gstin: cleanGstin,
      legalName: targetLegalName,
      emailId_pas: targetEmail,
    });

    if (result.success && result.txnId) {
      storeGstnSession({
        txnId: result.txnId,
        gstin: cleanGstin,
        legalName: targetLegalName,
        email: targetEmail,
      });

      return NextResponse.json({
        sessionId: result.txnId,
        status: "otp_sent",
        message: result.message,
        txnId: result.txnId,
      });
    }

    return NextResponse.json(
      { error: result.message, errorCode: result.errorCode },
      { status: result.errorCode === "INTR_002" ? 400 : 422 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate OTP" },
      { status: 500 }
    );
  }
}

