import crypto from "node:crypto";
import { z } from "zod";
import { handlePaymentWebhook } from "@/server/billing/service";
import { sql } from "@/server/db/sql";
import { notFound } from "@/server/errors";
import { route } from "@/server/http";
import { MOCK_SIGNATURE_HEADER, signMockWebhook, type MockWebhookBody } from "@/server/providers/payments/mock";

// Development only: the mock gateway's checkout page (/dev/pay/:order) asks for a payment to succeed or fail. The
// server signs a webhook exactly as a gateway would and runs it through the real webhook handler.
const body = z.object({
  providerOrderId: z.string().regex(/^mock_order_[A-Za-z0-9_-]{6,40}$/),
  outcome: z.enum(["success", "failure"]),
});

export const POST = route({ capability: "billing.manage", body }, async ({ ctx, body }) => {
  if (process.env.NODE_ENV === "production") throw notFound("This page");
  const [order] = await sql()<{ total_paise: string; status: string }[]>`
    select total_paise, status::text from public.payment_orders
     where provider = 'mock' and provider_order_id = ${body.providerOrderId} and org_id = ${ctx.orgId!}`;
  if (!order) throw notFound("This payment");

  const event: MockWebhookBody = {
    id: `mock_evt_${crypto.randomBytes(9).toString("base64url")}`,
    type: body.outcome === "success" ? "payment.succeeded" : "payment.failed",
    order_id: body.providerOrderId,
    payment_id: body.outcome === "success" ? `mock_pay_${crypto.randomBytes(9).toString("base64url")}` : null,
    amount: Number(order.total_paise),
    failure_reason: body.outcome === "success" ? null : "The bank declined this payment (test).",
  };
  const raw = JSON.stringify(event);
  return handlePaymentWebhook("mock", raw, new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(raw) }));
});
