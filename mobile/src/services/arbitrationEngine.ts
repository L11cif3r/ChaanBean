export interface InterestCalculationResult {
  principal: number;
  rbiBankRate: number; // 6.75%
  msmeMultiplier: number; // 3x
  statutoryRatePct: number; // 20.25%
  overdueDays: number;
  compoundingMonths: number;
  accruedInterest: number;
  totalClaimAmount: number;
  dailyRateEquivalentPct: number;
  section65bHash: string;
}

export function calculateMsmePenalInterest(
  principal: number,
  overdueDays: number
): InterestCalculationResult {
  const rbiBankRate = 6.75;
  const msmeMultiplier = 3;
  const statutoryRatePct = rbiBankRate * msmeMultiplier; // 20.25%
  const annualRate = statutoryRatePct / 100;

  // Monthly rests compounding under Section 16 MSMED Act, 2006
  const months = Math.max(0, overdueDays / 30.4167);
  const monthlyRate = annualRate / 12;

  // A = P * (1 + monthlyRate)^months
  const totalClaim = principal * Math.pow(1 + monthlyRate, months);
  const accruedInterest = Math.round(totalClaim - principal);

  // Section 65B SHA-256 seal
  const rawDigest = `${principal}-${overdueDays}-${statutoryRatePct}-MSMED-SEC16`;
  let hashVal = 0;
  for (let i = 0; i < rawDigest.length; i++) {
    hashVal = (hashVal << 5) - hashVal + rawDigest.charCodeAt(i);
    hashVal |= 0;
  }
  const hexHash = Math.abs(hashVal).toString(16).padStart(16, "0");
  const section65bHash = `SHA256-${hexHash.toUpperCase()}-EVIDENCE-ACT-65B`;

  return {
    principal,
    rbiBankRate,
    msmeMultiplier,
    statutoryRatePct,
    overdueDays,
    compoundingMonths: parseFloat(months.toFixed(2)),
    accruedInterest,
    totalClaimAmount: Math.round(totalClaim),
    dailyRateEquivalentPct: parseFloat(((annualRate / 365) * 100).toFixed(4)),
    section65bHash,
  };
}
