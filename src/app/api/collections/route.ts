import { NextResponse } from "next/server";
import {
  getCollectionsOverview,
  recordPromiseToPay,
  generatePaymentLink,
  processPaymentReconciliation,
} from "@/lib/services/collections-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || undefined;
    const overview = await getCollectionsOverview(companyId);
    return NextResponse.json(overview);
  } catch (error: any) {
    console.error("[api/collections] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch collections overview" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "promise_to_pay") {
      const ptp = await recordPromiseToPay({
        creditAccountId: body.creditAccountId,
        buyerId: body.buyerId,
        amount: parseFloat(body.amount),
        promisedDate: body.promisedDate,
        notes: body.notes,
        paymentMode: body.paymentMode,
        recordedBy: body.recordedBy,
      });
      return NextResponse.json(ptp);
    }

    if (action === "payment_link") {
      const link = await generatePaymentLink({
        creditAccountId: body.creditAccountId,
        invoiceId: body.invoiceId,
        amount: parseFloat(body.amount),
        expiresInDays: body.expiresInDays || 7,
      });
      return NextResponse.json(link);
    }

    if (action === "reconcile") {
      const rec = await processPaymentReconciliation({
        companyId: body.companyId,
        creditAccountId: body.creditAccountId,
        invoiceId: body.invoiceId,
        amountPaid: parseFloat(body.amountPaid),
        referenceNo: body.referenceNo,
        paymentMode: body.paymentMode,
        notes: body.notes,
      });
      return NextResponse.json(rec);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[api/collections] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to process collections action" }, { status: 500 });
  }
}
