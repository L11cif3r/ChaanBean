import "server-only";
import { MOCK, primary } from "@/server/providers/registry";
import { refuse } from "@/server/providers/slots";
import { mockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";

export type { CreatedOrder, PaymentEvent, PaymentProvider } from "./types";

/** Real gateways by provider name. Add one here when it is written (docs/PROVIDERS.md); the rest use a slot. */
const REAL: Record<string, PaymentProvider> = {};
const providers: Record<string, PaymentProvider> = { [MOCK]: mockPaymentProvider, ...REAL };

const slot = (name: string): PaymentProvider => ({
  name,
  createOrder: async () => refuse(name, "checkout"),
  parseWebhook: () => refuse(name, "webhook"),
});

/** The gateway used for new payments (PROVIDER_PAYMENTS; dummy when unset). */
export function paymentProvider(): PaymentProvider {
  const name = primary("payments");
  return providers[name] ?? slot(name);
}

/** The gateway a webhook URL names, so events for older orders still verify after a switch. */
export function paymentProviderByName(name: string): PaymentProvider | undefined {
  return providers[name];
}
