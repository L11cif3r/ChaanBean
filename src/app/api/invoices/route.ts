import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get("buyerId");
    const status = searchParams.get("status");

    const where: any = {};
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
    const body = await request.json();
    const { creditAccountId, buyerId, invoiceNumber, invoiceDate, dueDate, amount, notes } = body;

    if (!creditAccountId || !buyerId || !invoiceNumber || !amount || !dueDate) {
      return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
    }

    const inv = await prisma.invoice.create({
      data: {
        creditAccountId,
        buyerId,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate || Date.now()),
        dueDate: new Date(dueDate),
        amount: parseFloat(amount),
        status: "unpaid",
        ageingBucket: "current",
        notes,
      },
    });

    return NextResponse.json(inv);
  } catch (error: any) {
    console.error("[api/invoices] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 });
  }
}
