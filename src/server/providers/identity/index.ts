import "server-only";
import { mockIdentityProvider } from "./mock";
import type { IdentityProvider } from "./types";

export type { GstTaxpayer, IdentityProvider, PanResult, ProviderResult } from "./types";

/** The configured identity provider (IDENTITY_PROVIDER). Only the mock exists until Part 5 adds real ones. */
export function identityProvider(): IdentityProvider {
  return mockIdentityProvider;
}
