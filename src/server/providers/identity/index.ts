import "server-only";
import { MOCK, primary } from "@/server/providers/registry";
import { notConnected } from "@/server/providers/slots";
import { apisetuIdentityProvider } from "./apisetu";
import { mockIdentityProvider } from "./mock";
import type { IdentityProvider } from "./types";

export type { GstTaxpayer, IdentityProvider, PanResult, ProviderResult } from "./types";

/** Real adapters by provider name. Add one here when it is written (docs/PROVIDERS.md); the rest use a slot. */
const REAL: Record<string, IdentityProvider> = { apisetu: apisetuIdentityProvider };

/** Sign-up GST search and PAN check (PROVIDER_IDENTITY; dummy when unset). */
export function identityProvider(): IdentityProvider {
  const name = primary("identity");
  if (name === MOCK) return mockIdentityProvider;
  return REAL[name] ?? {
    name, isMock: false,
    searchGstin: async () => notConnected(name, "GST search"),
    verifyPan: async () => notConnected(name, "PAN check"),
  };
}
