import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { McpGateway } from "@/lib/mcp/gateway";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

/**
 * RECOVERY CASES API
 *
 * Coordinates overdue account management, next action determination,
 * Exotel voice call triggers, and Promise to Pay (PTP) commitments.
 */
export async function GET(req: NextRequest) {
  try {
    const caseId = req.nextUrl.searchParams.get("id");
    const company = await resolveTenantCompany(req);

    if (!company) {
      return NextResponse.json({ error: "Tenant organisation not found." }, { status: 404 });
    }

    if (caseId) {
      const recoveryCase = await prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: {
          buyer: true,
          creditAccount: {
            include: {
              promisesToPay: { orderBy: { promisedDate: "desc" } },
              invoices: true,
            },
          },
          exotelCallLogs: { orderBy: { calledAt: "desc" } },
          timelines: { orderBy: { createdAt: "desc" } },
          legalCandidate: true,
        },
      });

      if (!recoveryCase) {
        return NextResponse.json({ error: "Recovery case not found." }, { status: 404 });
      }

      if (recoveryCase.companyId !== company.id) {
        return NextResponse.json({ error: "Cross-tenant access blocked." }, { status: 403 });
      }

      return NextResponse.json({ success: true, recoveryCase });
    }

    // List all recovery cases
    const cases = await prisma.recoveryCase.findMany({
      where: { companyId: company.id },
      include: {
        buyer: true,
        exotelCallLogs: { orderBy: { calledAt: "desc" }, take: 1 },
        legalCandidate: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, count: cases.length, cases });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch recovery cases";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const company = await resolveTenantCompany(req);

    if (!company) {
      return NextResponse.json({ error: "Tenant organisation not found." }, { status: 404 });
    }

    const context = {
      tenantId: company.id,
      userId: body.userId || "usr_recovery_operator",
      userRoles: ["admin", "recovery_operator"],
      idempotencyKey: req.headers.get("x-idempotency-key") || undefined,
    };

    // ACTION 1: CREATE RECOVERY CASE
    if (action === "create_recovery_case") {
      const { creditAccountId, buyerId, totalOverdue, overdueDpd } = body;

      const result = await McpGateway.executeTool({
        domain: "recovery",
        tool: "create_recovery_case",
        arguments: { creditAccountId, buyerId, totalOverdue, overdueDpd },
        context,
      });

      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // ACTION 2: GET NEXT ACTION
    if (action === "get_next_action") {
      const { recoveryCaseId } = body;

      const result = await McpGateway.executeTool({
        domain: "recovery",
        tool: "get_next_recovery_action",
        arguments: { recoveryCaseId },
        context,
      });

      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // ACTION 3: TRIGGER EXOTEL VOICE REMINDER
    if (action === "trigger_exotel_call") {
      const { recoveryCaseId, toPhone, debtorName, overdueAmount, overdueDpd, language } = body;

      const result = await McpGateway.executeTool({
        domain: "communication",
        tool: "make_voice_call",
        arguments: {
          toPhone,
          debtorName,
          overdueAmount,
          overdueDpd,
          recoveryCaseId,
          language: language || "en",
        },
        context,
      });

      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // ACTION 4: RECORD PROMISE TO PAY (PTP)
    if (action === "record_ptp") {
      const { recoveryCaseId, amount, promisedDate, paymentMode, notes } = body;

      const result = await McpGateway.executeTool({
        domain: "recovery",
        tool: "record_customer_commitment",
        arguments: { recoveryCaseId, amount, promisedDate, paymentMode, notes },
        context,
      });

      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json({ error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Recovery case processing error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
