import { NextResponse } from "next/server";
import { executeFindSomeone } from "@/lib/find-someone/engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/find-someone?q=...
 * Query by Mobile Number, PAN, GSTIN, or Entity Name.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || searchParams.get("identifier") || "Metro Supplies Co";

    // Future Real API Hook Check
    const hasExternalApi = Boolean(
      process.env.FIND_SOMEONE_API_KEY ||
      process.env.CIBIL_API_KEY ||
      process.env.TELECOM_KYC_API_KEY
    );

    const report = await executeFindSomeone(q);

    return NextResponse.json({
      success: true,
      report,
      apiConfig: {
        externalApisConfigured: hasExternalApi,
        supportedProviders: ["TelecomKYC", "ECommerceDeliveryAggregator", "CIBIL", "Experian", "CRIF", "MCA21", "GSTN", "NPCI_IMPS"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute Find Someone trace" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/find-someone
 * Payload: { identifier: string, type?: "mobile" | "pan" | "name" | "gstin" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = body.identifier || body.q || "Metro Supplies Co";

    const hasExternalApi = Boolean(
      process.env.FIND_SOMEONE_API_KEY ||
      process.env.CIBIL_API_KEY ||
      process.env.TELECOM_KYC_API_KEY
    );

    const report = await executeFindSomeone(identifier);

    return NextResponse.json({
      success: true,
      report,
      apiConfig: {
        externalApisConfigured: hasExternalApi,
        supportedProviders: ["TelecomKYC", "ECommerceDeliveryAggregator", "CIBIL", "Experian", "CRIF", "MCA21", "GSTN", "NPCI_IMPS"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute Find Someone trace" },
      { status: 500 }
    );
  }
}
