// Provider status normalisation and forward-only transition rules (handles duplicate / out-of-order callbacks).

export type AttemptStatus = "QUEUED" | "INITIATED" | "ANSWERED" | "COMPLETED" | "NO_ANSWER" | "BUSY" | "FAILED";

export const TERMINAL: readonly AttemptStatus[] = ["COMPLETED", "NO_ANSWER", "BUSY", "FAILED"];
export const isTerminal = (s: AttemptStatus) => TERMINAL.includes(s);

const RANK: Record<AttemptStatus, number> = {
  QUEUED: 0,
  INITIATED: 1,
  ANSWERED: 2,
  COMPLETED: 3,
  NO_ANSWER: 3,
  BUSY: 3,
  FAILED: 3,
};

/** A status may only move forward, and a terminal status is final. */
export function canTransition(from: AttemptStatus, to: AttemptStatus): boolean {
  if (isTerminal(from)) return false;
  return RANK[to] > RANK[from];
}

/** Maps a provider's status vocabulary (Exotel / generic) to ours; null when unrecognised. */
export function normalizeProviderStatus(raw: string | null | undefined): AttemptStatus | null {
  switch ((raw ?? "").trim().toLowerCase().replace(/_/g, "-")) {
    case "queued":
    case "ringing":
    case "initiated":
      return "INITIATED";
    case "in-progress":
    case "answered":
      return "ANSWERED";
    case "completed":
      return "COMPLETED";
    case "no-answer":
    case "noanswer":
      return "NO_ANSWER";
    case "busy":
      return "BUSY";
    case "failed":
    case "canceled":
    case "cancelled":
      return "FAILED";
    default:
      return null;
  }
}
