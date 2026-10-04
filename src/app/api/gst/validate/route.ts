import { NextResponse } from "next/server";
import { validateGstnOtp, getGstnSession, removeGstnSession } from "@/lib/gstn";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gstin, otp, txnId, businessId, companyId } = body;

    const cleanTxnId = typeof txnId === "string" ? txnId.trim() : "";
    const cleanOtp = typeof otp === "string" ? otp.replace(/\D/g, "").slice(0, 6) : "";

    if (!cleanTxnId) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction ID (txnId) is required from OTP initiation stage.",
          errorCode: "MISSING_TXN_ID",
        },
        { status: 400 }
      );
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter the 6-digit OTP received by the Primary Authorized Signatory.",
          errorCode: "INVALID_OTP_LENGTH",
        },
        { status: 400 }
      );
    }

    // Look up session
    const session = getGstnSession(cleanTxnId);
    const targetGstin = (session?.gstin || (typeof gstin === "string" ? gstin.trim().toUpperCase() : "")).toUpperCase();

    if (!targetGstin || targetGstin.length !== 15) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid 15-character GSTIN is required.",
          errorCode: "INVALID_GSTIN",
        },
        { status: 400 }
      );
    }

    // Call GSTN API Setu validate endpoint
    const result = await validateGstnOtp({
      gstin: targetGstin,
      otp: cleanOtp,
      txnId: cleanTxnId,
    });

    if (!result.success || result.statusCd !== "1") {
      const httpStatus = result.errorCode === "INTR_006" ? 400 : 422;
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          errorCode: result.errorCode || "VALIDATION_FAILED",
        },
        { status: httpStatus }
      );
    }

    // Successful validation! Remove active session
    removeGstnSession(cleanTxnId);

    // Resolve tenant / company identity
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const tenantId = companyId || request.headers.get("x-tenant-id") || (match ? match[1] : undefined);

    const cachedUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days cache

    // 1. Persist to VerificationReport
    let reportRecord = null;
    try {
      reportRecord = await prisma.verificationReport.create({
        data: {
          subjectType: "business",
          subjectId: result.gstin,
          reportType: "gst_registration_certificate",
          provider: "GSTN / API Setu (v1.0.1)",
          status: "completed",
          requestedBy: tenantId || null,
          rawPayload: JSON.stringify({
            gstin: result.gstin,
            legalName: result.legalName,
            tradeName: result.tradeName,
            constitutionOfBusiness: result.constitutionOfBusiness,
            txnId: result.txnId,
            certificateId: result.certificateId,
          }),
          normalizedPayload: JSON.stringify({
            reportType: "gst_registration_certificate",
            subjectId: result.gstin,
            provider: "GSTN / API Setu (v1.0.1)",
            status: "completed",
            verifiedAt: result.verifiedAt,
            legalName: result.legalName,
            tradeName: result.tradeName,
            constitutionOfBusiness: result.constitutionOfBusiness,
            certificateId: result.certificateId,
            viewUrl: result.certificateViewUrl,
            downloadUrl: result.certificateDownloadUrl,
          }),
          cachedUntil,
        },
      });
    } catch (dbErr) {
      console.error("[GSTN] Failed to save VerificationReport:", dbErr);
    }

    // 2. Persist to UserReportLibrary (download library)
    try {
      if (tenantId) {
        await prisma.userReportLibrary.create({
          data: {
            companyId: tenantId,
            subjectId: result.gstin,
            subjectName: result.tradeName || result.legalName || result.gstin,
            subjectType: "business",
            reportType: "gst_registration_certificate",
            reportTitle: `GST Registration Certificate (${result.gstin})`,
            costPaid: 0,
            reportData: JSON.stringify({
              gstin: result.gstin,
              legalName: result.legalName,
              tradeName: result.tradeName,
              constitutionOfBusiness: result.constitutionOfBusiness,
              certificateId: result.certificateId,
              certificateUrl: result.certificateViewUrl,
              verifiedAt: result.verifiedAt,
            }),
            downloadedAt: new Date(),
          },
        });
      }
    } catch (libErr) {
      console.error("[GSTN] Failed to save UserReportLibrary:", libErr);
    }

    // 3. Update existing BusinessProfile if matching ID or GSTIN exists
    try {
      const targetBizId = businessId;
      if (targetBizId) {
        await prisma.businessProfile.update({
          where: { id: targetBizId },
          data: {
            overallStatus: "COMPLETED",
            sourceStatus: "VERIFIED_GSTN",
            gstin: result.gstin,
            companyName: result.tradeName || result.legalName,
          },
        });
      } else {
        const existingBiz = await prisma.businessProfile.findFirst({
          where: { gstin: result.gstin },
        });
        if (existingBiz) {
          await prisma.businessProfile.update({
            where: { id: existingBiz.id },
            data: {
              overallStatus: "COMPLETED",
              sourceStatus: "VERIFIED_GSTN",
            },
          });
        }
      }
    } catch (bizErr) {
      console.warn("[GSTN] BusinessProfile update non-critical warning:", bizErr);
    }

    // 4. Update BuyerDebtor if matching GSTIN exists
    try {
      await prisma.buyerDebtor.updateMany({
        where: { gstin: result.gstin },
        data: {
          name: result.tradeName || result.legalName,
        },
      });
    } catch (buyerErr) {
      console.warn("[GSTN] BuyerDebtor update non-critical warning:", buyerErr);
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      reportId: reportRecord?.id,
      data: {
        gstin: result.gstin,
        legalName: result.legalName,
        tradeName: result.tradeName,
        constitutionOfBusiness: result.constitutionOfBusiness,
        certificateId: result.certificateId,
        certificateViewUrl: result.certificateViewUrl,
        certificateDownloadUrl: result.certificateDownloadUrl,
        verifiedAt: result.verifiedAt,
        statusCd: "1",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error verifying GST OTP",
      },
      { status: 500 }
    );
  }
}
