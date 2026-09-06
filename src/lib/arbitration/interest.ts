/**
 * MSME Statutory Penal Interest Calculator
 * As per Section 16 of the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006:
 * - Buyer is liable to pay compound interest with monthly rests at 3 times the Bank Rate notified by the RBI.
 * - Current RBI Bank Rate = 6.75% per annum -> Statutory Rate = 20.25% per annum (or 21.75% depending on notification).
 */

export interface MSMEInterestResult {
  principalAmount: number;
  statutoryRatePercent: number; // e.g. 20.25
  rbiBaseRatePercent: number; // e.g. 6.75
  multiplicationFactor: number; // 3
  daysOverdue: number;
  compoundingPeriodsMonths: number;
  accruedInterest: number;
  totalPayable: number;
  legalFormula: string;
  statutorySection: string;
  calculatedAt: string;
}

export function calculateMSMEPenalInterest(
  principal: number,
  dueDate: Date | string,
  asOfDate: Date = new Date(),
  rbiBankRate = 6.75
): MSMEInterestResult {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const diffTime = Math.max(0, asOfDate.getTime() - due.getTime());
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const statutoryRatePercent = rbiBankRate * 3; // 3x Bank Rate
  const monthlyRate = statutoryRatePercent / 100 / 12;
  const months = daysOverdue / 30.4167; // average days per month

  // Compound interest with monthly rests: A = P * (1 + r)^n
  const totalPayable = principal * Math.pow(1 + monthlyRate, months);
  const accruedInterest = Math.max(0, totalPayable - principal);

  return {
    principalAmount: Math.round(principal * 100) / 100,
    statutoryRatePercent,
    rbiBaseRatePercent: rbiBankRate,
    multiplicationFactor: 3,
    daysOverdue,
    compoundingPeriodsMonths: Math.round(months * 10) / 10,
    accruedInterest: Math.round(accruedInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    legalFormula: "A = P * (1 + (3 * RBI_Bank_Rate)/12)^months (MSMED Act 2006 §16)",
    statutorySection: "Section 16, MSMED Act 2006 (Mandatory Compound Interest with Monthly Rests)",
    calculatedAt: asOfDate.toISOString(),
  };
}

export function calculateStandardCommercialInterest(
  principal: number,
  dueDate: Date | string,
  annualRate = 18.0,
  asOfDate: Date = new Date()
): { principal: number; interest: number; total: number; days: number; rate: number } {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const diffTime = Math.max(0, asOfDate.getTime() - due.getTime());
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const interest = (principal * (annualRate / 100) * days) / 365;

  return {
    principal: Math.round(principal * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    total: Math.round((principal + interest) * 100) / 100,
    days,
    rate: annualRate,
  };
}
