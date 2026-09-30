import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveTenantCompany } from "@/lib/tenant/tenant-resolver";

export async function GET(request: Request) {
  try {
    const company = await resolveTenantCompany(request);

    if (!company) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get("buyerId");
    const status = searchParams.get("status");

    const where: any = {
      buyer: { companyId: company.id },
    };
    if (buyerId) where.buyerId = buyerId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        buyer: { select: { id: true, name: true, gstin: true } },
        paymentLinks: true,
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    console.error("[api/invoices] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const company = await resolveTenantCompany(request);

    if (!company) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { creditAccountId, buyerId, invoiceNumber, invoiceDate, dueDate, amount, notes } = body;

    if (!creditAccountId || !buyerId || !invoiceNumber || !amount || !dueDate) {
      return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
    }

    // Verify buyer belongs to this tenant
    const buyer = await prisma.buyerDebtor.findUnique({
      where: { id: buyerId },
    });

    if (!buyer || buyer.companyId !== company.id) {
      return NextResponse.json({ error: "Forbidden: Debtor does not belong to active tenant" }, { status: 403 });
    }

    // Verify creditAccount exists and belongs to this buyer and tenant
    const creditAccount = await prisma.creditAccount.findUnique({
      where: { id: creditAccountId },
      include: { buyer: true },
    });

    if (!creditAccount || creditAccount.buyerId !== buyerId || creditAccount.buyer.companyId !== company.id) {
      return NextResponse.json(
        { error: "Forbidden: Credit account does not belong to debtor or active tenant" },
        { status: 403 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invoice amount must be a positive number greater than 0" },
        { status: 400 }
      );
    }

    const dueDateTime = new Date(dueDate);
    const diffDays = Math.floor((Date.now() - dueDateTime.getTime()) / 86400000);

    let ageingBucket = "current";
    if (diffDays > 90) ageingBucket = "90+";
    else if (diffDays > 60) ageingBucket = "61-90";
    else if (diffDays > 30) ageingBucket = "31-60";
    else if (diffDays > 0) ageingBucket = "1-30";

    const initialStatus = diffDays > 0 ? "overdue" : "unpaid";

    const [inv] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          creditAccountId,
          buyerId,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate || Date.now()),
          dueDate: dueDateTime,
          amount: parsedAmount,
          status: initialStatus,
          ageingBucket,
          notes,
        },
      }),
      prisma.creditAccount.update({
        where: { id: creditAccountId },
        data: {
          outstandingAmount: { increment: parsedAmount },
          overdueStatus: initialStatus === "overdue" ? "overdue" : undefined,
        },
      }),
    ]);

    return NextResponse.json(inv);
  } catch (error: any) {
    console.error("[api/invoices] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 });
  }
}
