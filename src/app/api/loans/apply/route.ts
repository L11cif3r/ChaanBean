import { NextResponse } from "next/server";
import { CAPITAL_ACCESS_LOAN_PRODUCTS } from "@/lib/loans/loan-catalog";
import { saveLoanApplication } from "@/lib/loans/loan-store";
import type { LoanApplication } from "@/lib/loans/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      productId,
      requestedAmount,
      tenureYears,
      applicantName,
      entityName,
      entityType,
      phone,
      email,
      city,
      state,
      pan,
      gstin,
      udyamNumber,
      annualTurnover,
      primaryBank,
      loanPurpose,
      collateralType,
    } = body;

    if (!productId || !requestedAmount || !applicantName || !phone) {
      return NextResponse.json(
        { error: "Missing mandatory fields: productId, requestedAmount, applicantName, and phone are required." },
        { status: 400 }
      );
    }

    const product = CAPITAL_ACCESS_LOAN_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json(
        { error: `Loan product '${productId}' not found in Capital Access catalog.` },
        { status: 404 }
      );
    }

    // Calculate preliminary underwriting score based on provided profile
    let preliminaryScore = 80;
    if (gstin && gstin.trim()) preliminaryScore += 6;
    if (pan && pan.trim()) preliminaryScore += 5;
    if (udyamNumber && udyamNumber.trim()) preliminaryScore += 4;
    if (annualTurnover && annualTurnover >= requestedAmount) preliminaryScore += 5;
    preliminaryScore = Math.min(99, preliminaryScore);

    // Calculate approximate monthly payment or cost
    const rate = product.annualRate;
    const months = (tenureYears || product.defaultTenureYears) * 12;
    const monthlyR = rate / 12 / 100;
    let estimatedEmiOrCost = 0;

    if (product.facilityType === "term_loan") {
      estimatedEmiOrCost = Math.round(
        (requestedAmount * monthlyR * Math.pow(1 + monthlyR, months)) /
          (Math.pow(1 + monthlyR, months) - 1)
      );
    } else if (product.facilityType === "revolving_credit") {
      // Monthly interest on average 75% utilization
      estimatedEmiOrCost = Math.round((requestedAmount * 0.75 * (rate / 100)) / 12);
    } else if (product.facilityType === "discounting") {
      // Monthly discounting fee
      estimatedEmiOrCost = Math.round((requestedAmount * (rate / 100)) / 12);
    } else if (product.facilityType === "guarantee") {
      // Annual commission divided into monthly equivalent
      estimatedEmiOrCost = Math.round((requestedAmount * (rate / 100)) / 12);
    }

    // Generate unique verifiable application reference
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const applicationRef = `CA-2026-${randomDigits}`;

    const newApplication: LoanApplication = {
      id: `loan-app-${Date.now()}-${randomDigits}`,
      applicationRef,
      productId: product.id,
      productName: product.name,
      category: product.category,
      requestedAmount: Number(requestedAmount),
      tenureYears: Number(tenureYears || product.defaultTenureYears),
      annualRate: product.annualRate,
      estimatedEmiOrCost,
      facilityType: product.facilityType,

      applicantName: String(applicantName).trim(),
      entityName: entityName ? String(entityName).trim() : undefined,
      entityType: entityType ? String(entityType).trim() : "Private Limited",
      phone: String(phone).trim(),
      email: email ? String(email).trim() : undefined,
      city: String(city || "Mumbai").trim(),
      state: state ? String(state).trim() : "Maharashtra",

      pan: pan ? String(pan).trim().toUpperCase() : undefined,
      gstin: gstin ? String(gstin).trim().toUpperCase() : undefined,
      udyamNumber: udyamNumber ? String(udyamNumber).trim() : undefined,
      annualTurnover: annualTurnover ? Number(annualTurnover) : undefined,
      primaryBank: primaryBank ? String(primaryBank).trim() : undefined,

      loanPurpose: loanPurpose ? String(loanPurpose).trim() : `Financing for ${product.name}`,
      collateralType: collateralType ? String(collateralType).trim() : "Primary Asset Hypothecation",

      status: "under_review",
      statusLabel: "Preliminary Verification in Progress",
      preliminaryScore,
      matchedLenders: product.matchedLenders,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveLoanApplication(newApplication);

    return NextResponse.json({
      success: true,
      application: newApplication,
      message: `Your application for ${product.name} (Ref: ${applicationRef}) has been submitted successfully to Capital Access partner banks.`,
    });
  } catch (error) {
    console.error("Error processing loan application:", error);
    return NextResponse.json(
      { error: "Failed to process loan application. Please verify parameters." },
      { status: 500 }
    );
  }
}
