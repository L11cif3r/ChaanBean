import "server-only";
import { requireKeys } from "./registry";
import type { ProviderResult } from "./identity/types";

// A slot for a real provider that is listed in the registry but whose adapter is not written yet (PRD v3.0 section
// 17). Choosing it is safe: it checks that its keys are set, then answers "not connected" in the same result shape
// the dummy uses, so the engine falls back to the next provider in the chain or shows "Not available, not charged".
// To connect a provider, write its adapter (see docs/PROVIDERS.md) and register it in that service's index file; the
// slot is then no longer used for it.

export const NOT_CONNECTED = "PROVIDER_NOT_CONNECTED";

export class ProviderNotConnected extends Error {
  constructor(readonly provider: string, what: string) {
    super(`${provider} is not connected yet (${what}).`);
    this.name = "ProviderNotConnected";
  }
}

/** The "not available" result a slot returns, with the reason. */
export function notConnected<T = never>(provider: string, what: string): ProviderResult<T> & { raw: unknown } {
  let message = `${provider} is not connected yet (${what}).`;
  try {
    requireKeys(provider);
  } catch (e) {
    message = (e as Error).message;
  }
  return {
    status: "not_available",
    provider,
    fetchedAt: new Date().toISOString(),
    error: { code: NOT_CONNECTED, message, retryable: true },
    raw: { slot: provider, what },
  };
}

/** For flows that cannot answer "not available" (sending a message, opening a checkout): fail loudly instead. */
export function refuse(provider: string, what: string): never {
  requireKeys(provider);
  throw new ProviderNotConnected(provider, what);
}
