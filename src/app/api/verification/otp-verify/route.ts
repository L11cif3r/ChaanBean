import { NextResponse } from "next/server";
import { verifyGstSupremeOtp } from "@/lib/verification-gateway/clients";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { sessionId, otp, subjectId, subjectType = "business" } = await request.json();
    if (!sessionId || !otp) {
      return NextResponse.json({ error: "sessionId and otp are required" }, { status: 400 });
    }

    const result = await verifyGstSupremeOtp(sessionId, otp);
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
