import { NextResponse } from "next/server";
import { validateGstnOtp, getGstnSession, removeGstnSession } from "@/lib/gstn";
import { verifyGstSupremeOtp } from "@/lib/verification-gateway/clients";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { sessionId, txnId, otp, subjectId, subjectType = "business", companyId } = await request.json();
    const activeTxnId = txnId || sessionId;
    if (!activeTxnId || !otp) {
      return NextResponse.json({ error: "sessionId / txnId and otp are required" }, { status: 400 });
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const tenantId = companyId || request.headers.get("x-tenant-id") || (match ? match[1] : undefined);

    // 1. Check if this is a real GSTN session
    const gstnSession = getGstnSession(activeTxnId);
    if (gstnSession || activeTxnId.includes("-")) {
      const gstin = (gstnSession?.gstin || subjectId || "30MCBPH2034F2Z8").toUpperCase();
      const realResult = await validateGstnOtp({
        gstin,
        otp: String(otp).trim(),
        txnId: activeTxnId,
      });

      if (!realResult.success || realResult.statusCd !== "1") {
        return NextResponse.json(
          { error: realResult.message, errorCode: realResult.errorCode },
          { status: realResult.errorCode === "INTR_006" ? 400 : 422 }
        );
      }

      removeGstnSession(activeTxnId);
      const cachedUntil = new Date(Date.now() + 720 * 3600000);
      const report = await prisma.verificationReport.create({
        data: {
          subjectType,
          subjectId: realResult.gstin,
          reportType: "gst_registration_certificate",
          provider: "GSTN / API Setu (v1.0.1)",
          requestedBy: tenantId || null,
          status: "completed",
          rawPayload: JSON.stringify(realResult),
          normalizedPayload: JSON.stringify({
            reportType: "gst_registration_certificate",
            subjectType,
            subjectId: realResult.gstin,
            provider: "GSTN / API Setu (v1.0.1)",
            status: "completed",
            fetchedAt: new Date().toISOString(),
            expiresAt: cachedUntil.toISOString(),
            data: realResult,
          }),
          cachedUntil,
        },
      });

      return NextResponse.json({
        success: true,
        reportId: report.id,
        reports: [
          {
            reportType: "gst_registration_certificate",
            subjectId: realResult.gstin,
            provider: "GSTN / API Setu (v1.0.1)",
            status: "completed",
            data: realResult,
          },
        ],
        data: realResult,
      });
    }

    // Fallback for legacy test session IDs
    const result = await verifyGstSupremeOtp(activeTxnId, otp);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "OTP verification failed" }, { status: 400 });
    }

    const cachedUntil = new Date(Date.now() + 720 * 3600000);
    const report = await prisma.verificationReport.create({
      data: {
        subjectType,
        subjectId: subjectId || "29AABCU9842F1Z5",
        reportType: "gst_supreme_report",
        provider: result.provider,
        requestedBy: tenantId || null,
        status: "completed",
        rawPayload: JSON.stringify(result.data),
        normalizedPayload: JSON.stringify({
          reportType: "gst_supreme_report",
          subjectType,
          subjectId: subjectId || "29AABCU9842F1Z5",
          provider: result.provider,
          status: "completed",
          fetchedAt: new Date().toISOString(),
          expiresAt: cachedUntil.toISOString(),
          data: result.data,
        }),
        cachedUntil,
      },
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify OTP" },
      { status: 500 }
    );
  }
}

