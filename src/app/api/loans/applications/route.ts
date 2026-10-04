import { NextResponse } from "next/server";
import { getLoanApplications } from "@/lib/loans/loan-store";

export async function GET() {
  try {
    const applications = getLoanApplications();
    return NextResponse.json({
      success: true,
      applications,
      count: applications.length,
    });
  } catch (error) {
    console.error("Error fetching loan applications:", error);
    return NextResponse.json(
      { error: "Failed to retrieve loan applications." },
      { status: 500 }
    );
  }
}
