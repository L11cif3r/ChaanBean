import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const subjectId = searchParams.get("subjectId");
    const reportType = searchParams.get("reportType");
    const q = searchParams.get("q")?.trim().toLowerCase();

    let company = null;
    if (companyId) {
      company = await prisma.company.findUnique({ where: { id: companyId } });
    }
    if (!company) {
      company = await prisma.company.findFirst();
    }

    const where: Record<string, unknown> = {};
    if (company) {
      where.companyId = company.id;
    }
    if (subjectId) {
      where.subjectId = subjectId;
    }
    if (reportType && reportType !== "all") {
      where.reportType = reportType;
    }

    const libraryItems = await prisma.userReportLibrary.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const filtered = q
      ? libraryItems.filter(
          (item) =>
            item.subjectName.toLowerCase().includes(q) ||
            item.subjectId.toLowerCase().includes(q) ||
            item.reportTitle.toLowerCase().includes(q) ||
            item.reportType.toLowerCase().includes(q)
        )
      : libraryItems;

    return NextResponse.json({
      success: true,
      totalCount: filtered.length,
      reports: filtered.map((r) => {
        let parsedData = {};
        try {
          parsedData = JSON.parse(r.reportData);
        } catch {
          parsedData = {};
        }
        return {
          id: r.id,
          companyId: r.companyId,
          subjectId: r.subjectId,
          subjectName: r.subjectName,
          subjectType: r.subjectType,
          reportType: r.reportType,
          reportTitle: r.reportTitle,
          costPaid: r.costPaid,
          downloadedAt: r.downloadedAt,
          createdAt: r.createdAt,
          data: parsedData,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load report library" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      companyId: explicitCompanyId,
      subjectId,
      subjectName,
      subjectType = "business",
      reportType,
      reportTitle,
      costPaid = 0,
      reportData,
      isDownload = false,
    } = body as {
      companyId?: string;
      subjectId: string;
      subjectName?: string;
      subjectType?: string;
      reportType: string;
      reportTitle?: string;
      costPaid?: number;
      reportData: unknown;
      isDownload?: boolean;
    };

    if (!subjectId || !reportType) {
      return NextResponse.json(
        { error: "subjectId and reportType are required" },
        { status: 400 }
      );
    }

    let company = null;
    if (explicitCompanyId) {
      company = await prisma.company.findUnique({ where: { id: explicitCompanyId } });
    }
    if (!company) {
      company = await prisma.company.findFirst();
    }

    const title =
      reportTitle ||
      reportType
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const finalSubjectName = subjectName || subjectId;

    // Check if already in library
    const existing = await prisma.userReportLibrary.findFirst({
      where: {
        companyId: company?.id,
        subjectId,
        reportType,
      },
    });

    if (existing) {
      const updated = await prisma.userReportLibrary.update({
        where: { id: existing.id },
        data: {
          downloadedAt: isDownload ? new Date() : existing.downloadedAt,
          reportData: reportData ? JSON.stringify(reportData) : existing.reportData,
          costPaid: existing.costPaid || costPaid,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Report refreshed in your Report Library (already paid).",
        item: updated,
        isExisting: true,
      });
    }

    // Insert new library record
    const created = await prisma.userReportLibrary.create({
      data: {
        companyId: company?.id,
        subjectId,
        subjectName: finalSubjectName,
        subjectType,
        reportType,
        reportTitle: title,
        costPaid,
        reportData: JSON.stringify(reportData || {}),
        downloadedAt: isDownload ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Report successfully saved to your Report Library.",
      item: created,
      isExisting: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save report to library" },
      { status: 500 }
    );
  }
}
