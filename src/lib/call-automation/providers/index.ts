import { exotelProvider } from "./exotel";
import { mockProvider } from "./mock";
import type { VoiceProvider } from "./types";

export type { VoiceProvider, CallRequest, CallResult, CallStatusResult } from "./types";

/** Selected by CALL_PROVIDER (mock | exotel). Defaults to mock so a missing config can never dial anyone. */
export function getProvider(): VoiceProvider {
  switch ((process.env.CALL_PROVIDER ?? "mock").toLowerCase()) {
    case "exotel":
      return exotelProvider;
    default:
      return mockProvider;
  }
}

export function getProviderByName(name: string): VoiceProvider | null {
  if (name === "MOCK") return mockProvider;
  if (name === "EXOTEL") return exotelProvider;
  return null; // VOBIZ: not implemented
}
