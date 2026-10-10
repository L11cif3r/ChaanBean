// Voice provider contract (Call Automation guide §7). Everything above this layer is provider-agnostic.

import type { AttemptStatus } from "../status";

export type ProviderName = "MOCK" | "EXOTEL" | "VOBIZ";

export interface CallRequest {
  attemptId: string;
  caseId: string;
  organisationId: string;
  /** Plaintext E.164 number: decrypted only at dispatch time, never persisted or logged. */
  toPhone: string;
  debtorName: string;
  amountDuePaise: number;
  dueDate: string;
  language: "en" | "hi";
  idempotencyKey: string;
  /** Signed absolute URL the provider calls with status updates. */
  callbackUrl: string | null;
}

export interface CallResult {
  /** True only when the provider accepted the request. This is NOT proof the phone rang. */
  accepted: boolean;
  providerCallId?: string;
  failureReason?: string;
}

export interface CallStatusResult {
  status: AttemptStatus;
  durationSeconds?: number;
}

export interface VoiceProvider {
  readonly name: ProviderName;
  /** Missing credentials/approval => not ready; callers must not claim work or pretend a call happened. */
  isReady(): { ready: boolean; reason?: string };
  initiateCall(req: CallRequest): Promise<CallResult>;
  getCallStatus(providerCallId: string): Promise<CallStatusResult | null>;
}
