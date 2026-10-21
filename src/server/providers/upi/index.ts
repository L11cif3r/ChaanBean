import "server-only";
import crypto from "node:crypto";
import type { ProviderResult } from "@/server/providers/identity";
import { MOCK, primary } from "@/server/providers/registry";
import { notConnected } from "@/server/providers/slots";

// Bank-linked mobile check (PRD S06 marker 4, FR-CP-03): a UPI lookup that says whether a mobile is linked to a bank
// account and gives the name registered on UPI. Only the mock exists until a verification provider is contracted.
//
// Mock rules, so every S06 state can be tested: a mobile ending in 0 is not linked, one ending in 9 makes the service
// unavailable, anything else is linked with a sample name.

export interface UpiLookup {
  linked: boolean;
  /** Name registered with the bank on UPI (only when linked). */
  name: string | null;
}

export interface UpiProvider {
  name: string;
  isMock: boolean;
  lookup(mobile10: string): Promise<ProviderResult<UpiLookup>>;
}

const SAMPLE_UPI_NAMES = ["RAMESH KUMAR", "SUNITA PATIL", "ANIL SHARMA", "PRIYA NAIR", "MOHAMMED IRFAN", "LAKSHMI REDDY"];

const mockUpiProvider: UpiProvider = {
  name: "mock_upi",
  isMock: true,
  async lookup(mobile10) {
    const fetchedAt = new Date().toISOString();
    const last = mobile10.slice(-1);
    if (last === "9") {
      return { status: "not_available", provider: "mock_upi", fetchedAt, error: { code: "PROVIDER_DOWN", message: "UPI lookup unavailable" } };
    }
    if (last === "0") return { status: "success", provider: "mock_upi", fetchedAt, data: { linked: false, name: null } };
    const pick = crypto.createHash("sha256").update(mobile10).digest()[0] % SAMPLE_UPI_NAMES.length;
    return { status: "success", provider: "mock_upi", fetchedAt, data: { linked: true, name: SAMPLE_UPI_NAMES[pick] } };
  },
};

/** Real adapters by provider name. Add one here when it is written (docs/PROVIDERS.md); the rest use a slot. */
const REAL: Record<string, UpiProvider> = {};

/** Bank-linked mobile check (PROVIDER_UPI; dummy when unset). */
export function upiProvider(): UpiProvider {
  const name = primary("upi");
  if (name === MOCK) return mockUpiProvider;
  return REAL[name] ?? { name, isMock: false, lookup: async () => notConnected(name, "UPI lookup") };
}
