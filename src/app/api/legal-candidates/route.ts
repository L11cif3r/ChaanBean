import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { McpGateway } from "@/lib/mcp/gateway";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

/**
 * LEGAL CANDIDATES & HUMAN REVIEW API
 *
 * GET: Lists legal candidates or fetches compiled case package
 * POST: Creates candidate or records human legal review verdict
 */
export async function GET(req: NextRequest) {
  try {
    const candidateId = req.nextUrl.searchParams.get("id");
    const company = await resolveTenantCompany(req);

    if (!company) {
      return NextResponse.json({ error: "Tenant organisation not found." }, { status: 404 });
    }

    if (candidateId) {
      const candidate = await prisma.legalCandidate.findUnique({
        where: { id: candidateId },
        include: {
          recoveryCase: {
            include: {
              buyer: true,
              creditAccount: { include: { invoices: true } },
              timelines: { orderBy: { createdAt: "desc" } },
            },
          },
        },
      });

      if (!candidate) {
        return NextResponse.json({ error: "Legal candidate not found." }, { status: 404 });
      }

      if (candidate.companyId !== company.id) {
        return NextResponse.json({ error: "Cross-tenant access blocked." }, { status: 403 });
      }

      const casePackage = JSON.parse(candidate.compiledCasePackage);

      return NextResponse.json({
        success: true,
        candidate,
        compiledCasePackage: casePackage,
      });
    }

    const candidates = await prisma.legalCandidate.findMany({
      where: { companyId: company.id },
      include: {
        recoveryCase: { include: { buyer: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, count: candidates.length, candidates });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch legal candidates";
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
      userId: body.userId || "usr_legal_counsel",
      userRoles: ["admin", "legal_reviewer"],
      idempotencyKey: req.headers.get("x-idempotency-key") || undefined,
    };

    // ACTION 1: CREATE LEGAL CANDIDATE
    if (action === "create_legal_candidate") {
      const { recoveryCaseId, statutoryGrounds } = body;

      const result = await McpGateway.executeTool({
        domain: "legal",
        tool: "create_legal_candidate",
        arguments: { recoveryCaseId, statutoryGrounds },
        context,
      });

      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // ACTION 2: HUMAN LEGAL REVIEW DECISION
    if (action === "human_review_decision") {
      const { candidateId, decision, reviewNotes, reviewerName } = body;

      if (!candidateId || !decision) {
        return NextResponse.json({ error: "Missing candidateId or decision." }, { status: 400 });
      }

      const candidate = await prisma.legalCandidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
      if (candidate.companyId !== company.id) return NextResponse.json({ error: "Cross-tenant access blocked." }, { status: 403 });

      const newStatus =
        decision === "approve"
          ? "approved"
          : decision === "issue_notice"
          ? "notice_dispatched"
          : "rejected";

      const updated = await prisma.legalCandidate.update({
        where: { id: candidateId },
        data: {
          status: newStatus,
          reviewedBy: reviewerName || context.userId,
          reviewNotes: reviewNotes || `Human Legal Review verdict: ${decision.toUpperCase()}.`,
          reviewedAt: new Date(),
        },
      });

      // Append to CaseTimeline
      await prisma.caseTimeline.create({
        data: {
          companyId: company.id,
          recoveryCaseId: candidate.recoveryCaseId,
          eventType: "LEGAL_REVIEW_APPROVED",
          actor: "human_legal_counsel",
          title: `Legal Review Completed: ${newStatus.toUpperCase()}`,
          description: reviewNotes || `Case package approved by Legal Review Desk. Notice drafting initiated under MSMED Act §18.`,
          metadata: JSON.stringify({
            candidateId,
            decision,
            reviewer: reviewerName || context.userId,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        candidateId,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
      });
    }

    return NextResponse.json({ error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Legal candidate processing error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
