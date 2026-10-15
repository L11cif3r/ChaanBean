// OTP limits from PRD S01 and FR-AUTH-02: at most 5 OTP requests per number per hour, and 5 wrong codes lock OTP
// sign-in for 30 minutes. Pure functions over the recent events, so the rules are unit-tested without a database.

export const OTP_RULES = {
  sendsPerHour: 5,
  failuresBeforeLock: 5,
  lockMs: 30 * 60_000,
  windowMs: 60 * 60_000,
} as const;

export interface OtpEvent {
  kind: "send" | "fail" | "success";
  at: Date;
}

export interface OtpState {
  /** Set when sending is not allowed until this time. */
  nextSendAt: Date | null;
  /** Set while sign-in is locked. */
  lockedUntil: Date | null;
  /** Wrong codes left before the lock. */
  attemptsLeft: number;
}

export function otpState(events: OtpEvent[], now: Date): OtpState {
  const t = now.getTime();
  const recent = events.filter((e) => t - e.at.getTime() < OTP_RULES.windowMs).sort((a, b) => a.at.getTime() - b.at.getTime());

  const sends = recent.filter((e) => e.kind === "send");
  const nextSendAt =
    sends.length >= OTP_RULES.sendsPerHour
      ? new Date(sends[sends.length - OTP_RULES.sendsPerHour].at.getTime() + OTP_RULES.windowMs)
      : null;

  const lastSuccess = Math.max(0, ...recent.filter((e) => e.kind === "success").map((e) => e.at.getTime()));
  const fails = recent.filter((e) => e.kind === "fail" && e.at.getTime() > lastSuccess && t - e.at.getTime() < OTP_RULES.lockMs);
  const lockedUntil =
    fails.length >= OTP_RULES.failuresBeforeLock
      ? new Date(fails[OTP_RULES.failuresBeforeLock - 1].at.getTime() + OTP_RULES.lockMs)
      : null;

  return {
    nextSendAt: nextSendAt && nextSendAt > now ? nextSendAt : null,
    lockedUntil: lockedUntil && lockedUntil > now ? lockedUntil : null,
    attemptsLeft: Math.max(0, OTP_RULES.failuresBeforeLock - fails.length),
  };
}
