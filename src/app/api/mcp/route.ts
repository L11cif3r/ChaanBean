import { NextRequest, NextResponse } from "next/server";
import { McpGateway } from "@/lib/mcp/gateway";
import { McpDomain } from "@/lib/mcp/types";
import { prisma } from "@/lib/db";
import { getDefaultCompany } from "@/lib/tenant/tenant-resolver";

/**
 * MCP GATEWAY API ROUTE
 *
 * GET: Lists all registered MCP tools or filters by ?domain=core|company|credit|recovery|communication|legal
 * POST: Dispatches a tool execution with tenant context
 */
export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get("domain") as McpDomain | null;
    const tools = McpGateway.listTools(domain || undefined);

    return NextResponse.json({
      success: true,
      totalTools: tools.length,
      domain: domain || "all",
      tools,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to list MCP tools";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain, tool, arguments: args, context } = body;

    if (!tool) {
      return NextResponse.json({ error: "Missing required parameter: tool" }, { status: 400 });
    }

    // Enforce tenant boundary: auth cookie/header takes priority and rejects forged context
    const authTenantId = req.headers.get("x-tenant-id") || req.cookies.get("chaanbean_company_id")?.value;
    if (authTenantId && context?.tenantId && context.tenantId !== authTenantId) {
      return NextResponse.json({ error: "Forbidden: Forged tenant context rejected." }, { status: 403 });
    }

    let tenantId = authTenantId || context?.tenantId;
    if (!tenantId) {
      const defaultCompany = await getDefaultCompany();
      tenantId = defaultCompany?.id || "cmukt7n090000jn04sx3ac7ly";
    }

    const effectiveContext = {
      tenantId,
      userId: context?.userId || "user_active_operator",
      userRoles: context?.userRoles || ["admin", "operator"],
      idempotencyKey: context?.idempotencyKey || req.headers.get("x-idempotency-key") || undefined,
    };

    const response = await McpGateway.executeTool({
      domain: domain || "core",
      tool,
      arguments: args || {},
      context: effectiveContext,
    });

    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "MCP gateway execution error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
