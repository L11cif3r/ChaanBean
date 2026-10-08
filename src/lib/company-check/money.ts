// Money is always integer paise (PRD §11.1). ₹1 = 100 paise. No floats for money.

export const PAISE_PER_RUPEE = 100n;
export const ONE_LAKH_PAISE = 100_000n * PAISE_PER_RUPEE;
export const ONE_CRORE_PAISE = 10_000_000n * PAISE_PER_RUPEE;

export const rupeesToPaise = (rupees: number | bigint): bigint =>
  typeof rupees === "bigint" ? rupees * PAISE_PER_RUPEE : BigInt(Math.round(rupees * 100));

/** "₹1,25,00,000" (Indian digit grouping), whole rupees. */
export function formatInr(paise: bigint): string {
  const negative = paise < 0n;
  const rupees = (negative ? -paise : paise) / PAISE_PER_RUPEE;
  const s = rupees.toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}₹${rest ? `${rest},${last3}` : last3}`;
}

/** "₹1.25 crore", "₹70 lakh", "₹4,000". */
export function formatInrWords(paise: bigint): string {
  if (paise >= ONE_CRORE_PAISE) return `₹${trim(Number(paise) / Number(ONE_CRORE_PAISE))} crore`;
  if (paise >= ONE_LAKH_PAISE) return `₹${trim(Number(paise) / Number(ONE_LAKH_PAISE))} lakh`;
  return formatInr(paise);
}

const trim = (n: number) => Number(n.toFixed(2)).toString();

/** BigInt-safe JSON for API responses: paise go out as numbers (fit in 2^53 up to ~₹90 lakh crore). */
export function toJsonSafe<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}
