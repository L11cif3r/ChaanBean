// Call Automation policy: calling window, cadence and limits. Pure functions, no I/O.
//
// OPEN PRODUCT/COMPLIANCE DECISION: the window, cadence presets and attempt limits below are conservative
// defaults taken from the existing authorizer (09:00-18:00 IST). They are NOT confirmed as legally approved,
// so live providers refuse to place calls until CALL_AUTOMATION_POLICY_APPROVED=1 is set deliberately.

export const IST_OFFSET_MIN = 330; // Asia/Kolkata has no DST, so a fixed offset is exact.
export const CALLING_WINDOW = { startHour: 9, endHour: 18 } as const; // [09:00, 18:00) IST

export const FREQUENCIES = ["DAILY", "EVERY_2_DAYS", "WEEKLY"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_DAYS: Record<Frequency, number> = { DAILY: 1, EVERY_2_DAYS: 2, WEEKLY: 7 };

export const MIN_ATTEMPTS = 1;
export const MAX_ATTEMPTS_CAP = 10;
export const DEFAULT_MAX_ATTEMPTS = 3;
/** After a provider rejection (no call placed) retry after this delay, within calling hours. */
export const PROVIDER_RETRY_DELAY_MIN = 30;
/** Consecutive provider rejections that pause a schedule instead of looping during an outage. */
export const MAX_CONSECUTIVE_FAILURES = 3;
/** Minimum gap between manual calls to the same debtor. */
export const MANUAL_CALL_MIN_GAP_MIN = 60;

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Wall-clock parts in IST for an instant. */
export function istParts(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * MIN);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** Instant for a given IST wall-clock time. */
export function istInstant(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MIN * MIN);
}

/** Today's date in IST as YYYY-MM-DD. */
export function istDateString(d: Date): string {
  const p = istParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function isWithinCallingHours(d: Date): boolean {
  const { hour } = istParts(d);
  return hour >= CALLING_WINDOW.startHour && hour < CALLING_WINDOW.endHour;
}

/** The first instant at or after `d` that falls inside the calling window. */
export function nextEligibleTime(d: Date): Date {
  if (isWithinCallingHours(d)) return d;
  const p = istParts(d);
  const todayStart = istInstant(p.year, p.month, p.day, CALLING_WINDOW.startHour);
  return d.getTime() < todayStart.getTime() ? todayStart : new Date(todayStart.getTime() + DAY);
}

/**
 * The slot after `slot` for a cadence, pushed into calling hours. If the scheduler was down for longer than
 * one interval we continue the cadence from `now` rather than firing a burst of catch-up calls.
 */
export function nextSlotAfter(slot: Date, frequency: Frequency, now: Date): Date {
  const step = FREQUENCY_DAYS[frequency] * DAY;
  let base = slot.getTime() + step;
  if (base <= now.getTime()) base = now.getTime() + step;
  return nextEligibleTime(new Date(base));
}

/** First 09:00 IST after the given promise-to-pay date (we do not call before the promised day has passed). */
export function dayAfterPromiseStart(promiseDate: string): Date {
  const [y, m, d] = promiseDate.split("-").map(Number);
  return istInstant(y, m, d + 1, CALLING_WINDOW.startHour);
}

export function clampMaxAttempts(n: number): number {
  return Math.min(MAX_ATTEMPTS_CAP, Math.max(MIN_ATTEMPTS, Math.trunc(n)));
}

/** Whether a live (real-money, real-phone) provider may place calls. Mock is always allowed. */
export function policyApproved(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CALL_AUTOMATION_POLICY_APPROVED === "1";
}
