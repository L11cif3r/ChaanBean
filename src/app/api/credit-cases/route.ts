import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { McpGateway } from "@/lib/mcp/gateway";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

/**
 * CREDIT CASES API
 *
 * GET: Lists all credit appraisal cases for the tenant
 * POST: Evaluates and creates/approves a credit case
 */
export async function GET(req: NextRequest) {
  try {
    const company = await resolveTenantCompany(req);

    if (!company) {
      return NextResponse.json({ error: "Tenant organisation not found." }, { status: 404 });
    }

    const cases = await prisma.creditCase.findMany({
      where: { companyId: company.id },
      include: {
        timelines: { orderBy: { createdAt: "desc" } },
        recoveryCases: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, count: cases.length, cases });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch credit cases";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetCompanyName,
      targetCin,
      targetGstin,
      targetPan,
      requestedAmount,
    } = body;

    if (!targetCompanyName || typeof targetCompanyName !== "string" || !targetCompanyName.trim()) {
      return NextResponse.json({ error: "targetCompanyName is required" }, { status: 400 });
    }

    const numRequestedAmount = typeof requestedAmount === "number"
      ? Math.max(1, requestedAmount)
      : parseFloat(requestedAmount) > 0
        ? parseFloat(requestedAmount)
        : 5000000;

    const company = await resolveTenantCompany(req);

    if (!company) {
      return NextResponse.json({ error: "Tenant organisation not found." }, { status: 404 });
    }

    const context = {
      tenantId: company.id,
      userId: body.userId || "usr_active_underwriter",
      userRoles: ["admin", "credit_underwriter"],
      idempotencyKey: req.headers.get("x-idempotency-key") || undefined,
    };

    // 1. Invoke Credit MCP Server: calculate_credit_risk
    const calcResult = await McpGateway.executeTool({
      domain: "credit",
      tool: "calculate_credit_risk",
      arguments: {
        companyName: targetCompanyName,
        requestedExposure: numRequestedAmount,
        cin: targetCin,
        gstin: targetGstin,
      },
      context,
    });

    if (!calcResult.success || !calcResult.data) {
      return NextResponse.json({ error: calcResult.error || "Credit risk calculation failed" }, { status: 400 });
    }

    const creditData = calcResult.data as any;

    // 2. Invoke Credit MCP Server: get_risk_explanation
    const explResult = await McpGateway.executeTool({
      domain: "credit",
      tool: "get_risk_explanation",
      arguments: {
        companyName: targetCompanyName,
        compositeScore: creditData.compositeScore,
        riskBand: creditData.riskBand,
      },
      context,
    });

    const aiExplanation = (explResult.data as any)?.explanation || creditData.statutorySafeguard;

    // 3. Invoke Core MCP Server: create_credit_case
    const createResult = await McpGateway.executeTool({
      domain: "core",
      tool: "create_credit_case",
      arguments: {
        targetCompanyName,
        targetCin,
        targetGstin,
        targetPan,
        requestedAmount: numRequestedAmount,
        riskScore: creditData.compositeScore,
        riskBand: creditData.riskBand,
        factorsBreakdown: creditData.factors,
        aiExplanation,
      },
      context,
    });

    return NextResponse.json({
      success: true,
      creditAssessment: creditData,
      aiExplanation,
      creditCase: createResult.data,
      auditRecordId: createResult.auditRecordId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Credit case creation error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
