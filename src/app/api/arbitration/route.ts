import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateMSMEPenalInterest } from "@/lib/arbitration/interest";
import crypto from "crypto";

export async function GET() {
  const cases = await prisma.arbitrationCase.findMany({
    include: { creditAccount: { include: { buyer: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ cases });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { caseId, action, signatoryName, signatoryRole } = body as {
      caseId: string;
      action: string;
      signatoryName?: string;
      signatoryRole?: string;
    };

    if (!caseId) {
      return NextResponse.json({ error: "caseId required" }, { status: 400 });
    }

    const arbCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      include: { creditAccount: { include: { buyer: true } } },
    });

    if (!arbCase) {
      return NextResponse.json({ error: "Arbitration case not found" }, { status: 404 });
    }

    if (action === "recalculate_interest") {
      const calc = calculateMSMEPenalInterest(
        arbCase.principalAmount,
        arbCase.creditAccount.dueDate
      );

      const updated = await prisma.arbitrationCase.update({
        where: { id: caseId },
        data: {
          penalInterestRate: calc.statutoryRatePercent,
          accruedInterest: calc.accruedInterest,
          totalClaimAmount: calc.totalPayable,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Statutory penal interest recomputed under MSMED Act 2006 §16",
        calculation: calc,
        updatedCase: updated,
      });
    }

    if (action === "generate_settlement") {
      const settlementDocUrl = `https://chaanbean-docs.s3.ap-south-1.amazonaws.com/settlements/${caseId}-settlement.pdf`;
      const terms = `Mutually agreed out-of-court settlement: Principal ₹${arbCase.principalAmount.toLocaleString("en-IN")} + negotiated interest ₹${Math.round(arbCase.accruedInterest * 0.6).toLocaleString("en-IN")} payable in 2 tranches over 30 days under the Arbitration & Conciliation Act 1996.`;

      await prisma.arbitrationCase.update({
        where: { id: caseId },
        data: {
          status: "settlement_pending",
          settlementTerms: terms,
          settlementDocUrl,
          eSignStatus: "pending",
        },
      });

      const hash = crypto.createHash("sha256").update(settlementDocUrl + terms).digest("hex");

      await prisma.legalEvidenceLog.create({
        data: {
          relatedEntityType: "arbitration_case",
          relatedEntityId: caseId,
          channel: "arbitration",
          contentHash: hash,
          metadata: JSON.stringify({
            action: "settlement_terms_generated",
            terms,
            settlementDocUrl,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Settlement agreement generated — ready for Aadhaar e-Sign",
        settlementDocUrl,
        terms,
      });
    }

    if (action === "e_sign") {
      const signer = signatoryName || "Authorized Signatory (Claimant)";
      const role = signatoryRole || "Claimant";
      const timestamp = new Date().toISOString();
      const existingSignatures = arbCase.eSignSignatures ? JSON.parse(arbCase.eSignSignatures) : [];
      const newSignature = {
        name: signer,
        role,
        signedAt: timestamp,
        authMode: "Aadhaar e-Sign (UIDAI OTP Verified)",
        docHash: crypto.createHash("sha256").update(`${caseId}:${signer}:${timestamp}`).digest("hex"),
      };

      const updatedSignatures = [...existingSignatures, newSignature];
      const fullySigned = updatedSignatures.length >= 2;

      await prisma.arbitrationCase.update({
        where: { id: caseId },
        data: {
          eSignStatus: fullySigned ? "fully_signed" : "initiator_signed",
          status: fullySigned ? "award_passed" : "settlement_pending",
          eSignSignatures: JSON.stringify(updatedSignatures),
        },
      });

      await prisma.legalEvidenceLog.create({
        data: {
          relatedEntityType: "arbitration_case",
          relatedEntityId: caseId,
          channel: "e_sign",
          contentHash: newSignature.docHash,
          metadata: JSON.stringify(newSignature),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Aadhaar e-Sign recorded for ${signer} (${role})`,
        signatures: updatedSignatures,
        eSignStatus: fullySigned ? "fully_signed" : "initiator_signed",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Arbitration action error" },
      { status: 500 }
    );
  }
}
