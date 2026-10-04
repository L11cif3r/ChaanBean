import { NextResponse } from "next/server";
import { initiateGstnOtp, storeGstnSession } from "@/lib/gstn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gstin, legalName, email, emailId_pas } = body;

    const targetEmail = (email || emailId_pas || "").trim();

    const cleanGstin = typeof gstin === "string" ? gstin.trim().toUpperCase() : "";
    const cleanLegalName = typeof legalName === "string" ? legalName.trim() : "";

    if (!cleanGstin || cleanGstin.length !== 15) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid 15-character GST Identification Number (GSTIN).",
          errorCode: "INVALID_GSTIN",
        },
        { status: 400 }
      );
    }

    if (!cleanLegalName) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter the legal business name as registered in GST records.",
          errorCode: "MISSING_LEGAL_NAME",
        },
        { status: 400 }
      );
    }

    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address for the Primary Authorized Signatory.",
          errorCode: "INVALID_EMAIL",
        },
        { status: 400 }
      );
    }

    // Call GSTN API Setu initiate endpoint
    const result = await initiateGstnOtp({
      gstin: cleanGstin,
      legalName: cleanLegalName,
      emailId_pas: targetEmail,
    });

    if (result.success && result.txnId) {
      // Store session securely on server
      storeGstnSession({
        txnId: result.txnId,
        gstin: cleanGstin,
        legalName: cleanLegalName,
        email: targetEmail,
      });

      return NextResponse.json({
        success: true,
        statusCd: "1",
        txnId: result.txnId,
        message: result.message,
      });
    }

    // Failure returned from GSTN
    const httpStatus = result.errorCode === "INTR_002" ? 400 : 422;
    return NextResponse.json(
      {
        success: false,
        statusCd: "0",
        error: result.message,
        errorCode: result.errorCode || "INITIATE_FAILED",
      },
      { status: httpStatus }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error initiating GST verification",
      },
      { status: 500 }
    );
  }
}
