// Money is always integer paise. ₹1 = 100 paise. No floats for money anywhere (PRD 7 common rules: Indian format).

export const PAISE_PER_RUPEE = 100n;
export const ONE_LAKH_PAISE = 100_000n * PAISE_PER_RUPEE;
export const ONE_CRORE_PAISE = 10_000_000n * PAISE_PER_RUPEE;

export const rupeesToPaise = (rupees: number | bigint): bigint =>
  typeof rupees === "bigint" ? rupees * PAISE_PER_RUPEE : BigInt(Math.round(rupees * 100));

function group(rupees: bigint): string {
  const s = rupees.toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest ? `${rest},${last3}` : last3;
}

/** "₹15,13,360" (Indian digit grouping). Paise are shown only when `withPaise` and non-zero: "₹1,250.50". */
export function formatInr(paise: bigint, opts: { withPaise?: boolean } = {}): string {
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const rupees = abs / PAISE_PER_RUPEE;
  const p = abs % PAISE_PER_RUPEE;
  const fraction = opts.withPaise && p !== 0n ? `.${p.toString().padStart(2, "0")}` : "";
  return `${negative ? "-" : ""}₹${group(rupees)}${fraction}`;
}

/** Short form used on cards: "₹1.84 Cr", "₹12.6 L", "₹4,000". */
export function formatInrShort(paise: bigint): string {
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const sign = negative ? "-" : "";
  if (abs >= ONE_CRORE_PAISE) return `${sign}₹${trim(Number(abs) / Number(ONE_CRORE_PAISE))} Cr`;
  if (abs >= ONE_LAKH_PAISE) return `${sign}₹${trim(Number(abs) / Number(ONE_LAKH_PAISE))} L`;
  return `${sign}${formatInr(abs)}`;
}

const trim = (n: number) => Number(n.toFixed(2)).toString();

/** GST on an amount in paise, rounded half up to the nearest paisa. `ratePercent` is e.g. 18. */
export function gstOn(paise: bigint, ratePercent: number): bigint {
  const basisPoints = BigInt(Math.round(ratePercent * 100));
  return (paise * basisPoints + 5_000n) / 10_000n;
}

/** BigInt-safe JSON for API responses: paise go out as numbers (exact up to ~₹90 lakh crore). */
export function toJsonSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? Number(v) : v)));
}
