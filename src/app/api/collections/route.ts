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
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const authTenantId = request.headers.get("x-tenant-id") || (match ? decodeURIComponent(match[1]) : undefined);

    const companyId = authTenantId || searchParams.get("companyId") || undefined;
    const overview = await getCollectionsOverview(companyId);
    return NextResponse.json(overview);
  } catch (error: any) {
    console.error("[api/collections] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch collections overview" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/chaanbean_company_id=([^;]+)/);
    const authTenantId = request.headers.get("x-tenant-id") || (match ? decodeURIComponent(match[1]) : undefined);

    const body = await request.json();
    const { action } = body;

    if (action === "promise_to_pay") {
      const numAmount = parseFloat(body.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: "Promise to pay amount must be greater than 0" }, { status: 400 });
      }
      if (!body.creditAccountId || !body.buyerId || !body.promisedDate) {
        return NextResponse.json({ error: "creditAccountId, buyerId, and promisedDate are required" }, { status: 400 });
      }

      const ptp = await recordPromiseToPay({
        creditAccountId: body.creditAccountId,
        buyerId: body.buyerId,
        amount: numAmount,
        promisedDate: body.promisedDate,
        notes: body.notes,
        paymentMode: body.paymentMode,
        recordedBy: body.recordedBy,
      });
      return NextResponse.json(ptp);
    }

    if (action === "payment_link") {
      const numAmount = parseFloat(body.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: "Payment link amount must be greater than 0" }, { status: 400 });
      }
      if (!body.creditAccountId) {
        return NextResponse.json({ error: "creditAccountId is required" }, { status: 400 });
      }

      const link = await generatePaymentLink({
        creditAccountId: body.creditAccountId,
        invoiceId: body.invoiceId,
        amount: numAmount,
        expiresInDays: body.expiresInDays || 7,
      });
      return NextResponse.json(link);
    }

    if (action === "reconcile") {
      const numAmountPaid = parseFloat(body.amountPaid);
      if (isNaN(numAmountPaid) || numAmountPaid <= 0) {
        return NextResponse.json({ error: "Reconciled amountPaid must be greater than 0" }, { status: 400 });
      }
      const targetCompanyId = authTenantId || body.companyId;
      if (!targetCompanyId) {
        return NextResponse.json({ error: "companyId is required for payment reconciliation" }, { status: 400 });
      }

      const rec = await processPaymentReconciliation({
        companyId: targetCompanyId,
        creditAccountId: body.creditAccountId,
        invoiceId: body.invoiceId,
        amountPaid: numAmountPaid,
        referenceNo: body.referenceNo || `REF-TXN-${Date.now()}`,
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
