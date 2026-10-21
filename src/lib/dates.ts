// Business dates are Indian dates (IST, UTC+5:30), held as "YYYY-MM-DD" strings. Timestamps are stored in UTC.
// Nothing here depends on the server's own time zone. Ported from the old repo's business-security/dates.ts.

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The IST calendar date of an instant. */
export function istDate(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since IST midnight for an instant (0–1439). */
export function istMinutes(at: Date): number {
  const d = new Date(at.getTime() + IST_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** The instant of an IST wall-clock time on an IST date. `time` is "HH:MM". */
export function istInstant(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.parse(`${date}T00:00:00Z`) - IST_OFFSET_MS + (h * 60 + m) * 60_000);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export const isIsoDate = (s: unknown): s is string =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/** "05 Mar 2027" (PRD: dates as DD MMM YYYY). */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** "05 Mar 2027, 14:07 IST" for an instant; with seconds ("14:07:09") for activity logs (S16 marker 6). */
export function formatDateTimeIst(at: Date, withSeconds = false): string {
  const minutes = istMinutes(at);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  const ss = withSeconds ? `:${String(at.getUTCSeconds()).padStart(2, "0")}` : "";
  return `${formatDate(istDate(at))}, ${hh}:${mm}${ss} IST`;
}

/** Indian financial year of a date: "2026-27" for any date from 1 Apr 2026 to 31 Mar 2027. */
export function financialYear(date: string): string {
  const [y, m] = date.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
