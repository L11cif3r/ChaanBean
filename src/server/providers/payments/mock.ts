import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { serverEnv } from "@/server/env";
import type { PaymentEvent, PaymentProvider } from "./types";

// Mock gateway until the merchant account exists (PRD dependency "Payment gateway merchant account"). Checkout is the
// development page /dev/pay/:order, which asks the server to deliver a signed webhook exactly as a gateway would, so
// the real webhook path (signature, duplicates, activation, invoice) is what runs.

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";

function secret(): Buffer {
  return crypto.createHmac("sha256", serverEnv().SESSION_COOKIE_SECRET).update("mock-payments-webhook").digest();
}

export function signMockWebhook(rawBody: string): string {
  return crypto.createHmac("sha256", secret()).update(rawBody).digest("hex");
}

const body = z.object({
  id: z.string().min(1).max(100),
  type: z.string().min(1).max(60),
  order_id: z.string().min(1).max(100),
  payment_id: z.string().max(100).nullable(),
  amount: z.number().int().nonnegative(),
  failure_reason: z.string().max(300).nullable(),
});

export type MockWebhookBody = z.infer<typeof body>;

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  async createOrder({ returnUrl }) {
    const providerOrderId = `mock_order_${crypto.randomBytes(9).toString("base64url")}`;
    return { providerOrderId, checkoutUrl: `/dev/pay/${providerOrderId}?return=${encodeURIComponent(returnUrl)}` };
  },

  parseWebhook(rawBody, headers): PaymentEvent {
    const given = Buffer.from(headers.get(MOCK_SIGNATURE_HEADER) ?? "", "hex");
    const expected = Buffer.from(signMockWebhook(rawBody), "hex");
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw new Error("Invalid webhook signature");
    const b = body.parse(JSON.parse(rawBody));
    return {
      eventId: b.id,
      type: b.type,
      providerOrderId: b.order_id,
      providerPaymentId: b.payment_id,
      amountPaise: BigInt(b.amount),
      failureReason: b.failure_reason,
      payload: b,
    };
  },
};
