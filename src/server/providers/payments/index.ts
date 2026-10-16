import "server-only";
import { mockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";

export type { CreatedOrder, PaymentEvent, PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = { mock: mockPaymentProvider };

/** The gateway used for new payments. Only the mock exists until the merchant account is approved. */
export function paymentProvider(): PaymentProvider {
  return mockPaymentProvider;
}

/** The gateway a webhook URL names, so events for older orders still verify after a switch. */
export function paymentProviderByName(name: string): PaymentProvider | undefined {
  return providers[name];
}
