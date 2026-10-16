// Payment gateway adapter (FR-BIL-02). Checkout opens the gateway's page; the result only counts once the gateway's
// signed webhook arrives, never from the browser's return to the app.

export interface CreateOrderInput {
  /** Our payment_orders.id, sent to the gateway as the receipt. */
  orderId: string;
  amountPaise: bigint;
  /** Where the gateway sends the browser back after payment (success or failure). */
  returnUrl: string;
}

export interface CreatedOrder {
  providerOrderId: string;
  /** Page the browser opens to pay. */
  checkoutUrl: string;
}

export interface PaymentEvent {
  /** Unique per event; a repeated id is a duplicate delivery. */
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | (string & {});
  providerOrderId: string;
  providerPaymentId: string | null;
  amountPaise: bigint;
  failureReason: string | null;
  payload: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createOrder(input: CreateOrderInput): Promise<CreatedOrder>;
  /** Verifies the webhook signature and reads the event. Throws when the signature does not match. */
  parseWebhook(rawBody: string, headers: Headers): PaymentEvent;
}
