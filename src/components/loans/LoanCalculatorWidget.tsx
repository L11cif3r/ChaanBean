"use client";

import React from "react";
import type { LoanProduct } from "@/lib/loans/types";
import {
  Calculator,
  ArrowRight,
  Zap,
  Info,
  CheckCircle2,
  Percent,
  Calendar,
  Coins,
  ShieldCheck,
} from "lucide-react";

interface LoanCalculatorWidgetProps {
  product: LoanProduct;
  amount: number;
  tenureYears: number;
  onAmountChange: (val: number) => void;
  onTenureChange: (val: number) => void;
  onApply: () => void;
}

export function LoanCalculatorWidget({
  product,
  amount,
  tenureYears,
  onAmountChange,
  onTenureChange,
  onApply,
}: LoanCalculatorWidgetProps) {
  const formatINR = (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`;

  // Sliders percentage for visual fill
  const amountProgress = Math.min(
    100,
    Math.max(
      0,
      ((amount - product.minAmount) / (product.maxAmount - product.minAmount)) * 100
    )
  );

  const tenureProgress = Math.min(
    100,
    Math.max(
      0,
      ((tenureYears - product.minTenureYears) /
        (product.maxTenureYears - product.minTenureYears || 1)) *
        100
    )
  );

  // Dynamic calculations based on facility type
  const isTermLoan = product.facilityType === "term_loan";
  const isRevolving = product.facilityType === "revolving_credit";
  const isDiscounting = product.facilityType === "discounting";
  const isGuarantee = product.facilityType === "guarantee";

  // Term loan EMI formula
  const monthlyRate = product.annualRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  const emi = Math.round(
    (amount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1 || 1)
  );
  const totalRepayment = emi * totalMonths;
  const totalInterest = Math.max(0, totalRepayment - amount);

  // Revolving Credit (OD/CC) calculations: 75% avg utilization
  const revolvingMonthlyInterest = Math.round((amount * 0.75 * (product.annualRate / 100)) / 12);
  const annualCommitmentFee = Math.round(amount * 0.0025); // 0.25% review fee

  // Discounting calculations
  const invoiceNetAdvance = Math.round(amount * 0.90); // 90% advance
  const monthlyDiscountCost = Math.round((amount * (product.annualRate / 100)) / 12);

  // Bank Guarantee calculations
  const annualBgCommission = Math.round(amount * (product.annualRate / 100));
  const estimatedCashMargin = Math.round(amount * 0.15); // 15% margin

  // Quick Amount Presets
  const generateAmountPresets = () => {
    const min = product.minAmount;
    const max = product.maxAmount;
    const p1 = min;
    const p2 = min + (max - min) * 0.25;
    const p3 = min + (max - min) * 0.5;
    const p4 = min + (max - min) * 0.75;
    const p5 = max;

    return [p1, p2, p3, p4, p5].map((val) => {
      if (val >= 10000000) return Math.round(val / 5000000) * 5000000;
      if (val >= 1000000) return Math.round(val / 500000) * 500000;
      return Math.round(val / 50000) * 50000;
    });
  };

  const amountPresets = generateAmountPresets();

  return (
    <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-[#FC8019] border border-orange-500/20">
              <Calculator size={18} />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              Capital Access Facility Simulator
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Calculator for {product.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Simulate monthly outflows, statutory facility charges, and interest rates based on institutional lender terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-orange-50 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800 shadow-2xs">
            Rate: {product.rateText}
          </span>
          <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {product.category}
          </span>
        </div>
      </div>

      {/* Main Grid: Sliders on left, Financial Summary on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sliders (7 Columns) */}
        <div className="lg:col-span-7 space-y-7">
          {/* Amount Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Requested Limit / Amount
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-[#FC8019] bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-800/80 px-4 py-1 rounded-xl shadow-xs">
                {formatINR(amount)}
              </span>
            </div>

            {/* Slider track with prominent visible line drawn from left to right */}
            <div className="relative py-1 w-full">
              <input
                type="range"
                min={product.minAmount}
                max={product.maxAmount}
                step={
                  product.maxAmount >= 50000000
                    ? 500000
                    : product.maxAmount >= 10000000
                    ? 100000
                    : product.minAmount >= 500000
                    ? 50000
                    : 10000
                }
                value={amount}
                onChange={(e) => onAmountChange(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #fc8019 0%, #fc8019 ${amountProgress}%, var(--range-unfilled-color, #cbd5e1) ${amountProgress}%, var(--range-unfilled-color, #cbd5e1) 100%)`,
                }}
                className="emi-range-input w-full cursor-pointer"
                aria-label="Requested loan limit or amount"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Min: {formatINR(product.minAmount)}</span>
              <span>Max: {formatINR(product.maxAmount)}</span>
            </div>

            {/* Quick Presets for Amount */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mr-1">Quick:</span>
              {amountPresets.map((val, i) => {
                const isCurrent = Math.abs(amount - val) < (product.maxAmount > 5000000 ? 250000 : 50000);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onAmountChange(val)}
                    className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg border transition ${
                      isCurrent
                        ? "bg-[#FC8019] text-white border-[#FC8019] shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#FC8019]"
                    }`}
                  >
                    {formatINR(val)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tenure Slider (applicable to Term Loans, Mortgages, Vehicles, etc.) */}
          {product.maxTenureYears > 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Repayment Tenure
                </span>
                <span className="text-base font-black font-mono text-[#FC8019] bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-800/80 px-4 py-1 rounded-xl shadow-xs">
                  {tenureYears} {tenureYears === 1 ? "Year" : "Years"} ({tenureYears * 12} Months)
                </span>
              </div>

              {/* Slider track with prominent visible line drawn from left to right */}
              <div className="relative py-1 w-full">
                <input
                  type="range"
                  min={product.minTenureYears}
                  max={product.maxTenureYears}
                  step={1}
                  value={tenureYears}
                  onChange={(e) => onTenureChange(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #fc8019 0%, #fc8019 ${tenureProgress}%, var(--range-unfilled-color, #cbd5e1) ${tenureProgress}%, var(--range-unfilled-color, #cbd5e1) 100%)`,
                  }}
                  className="emi-range-input w-full cursor-pointer"
                  aria-label="Repayment tenure in years"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Min: {product.minTenureYears} Year</span>
                <span>Max: {product.maxTenureYears} Years</span>
              </div>

              {/* Quick Presets for Tenure */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mr-1">Tenure:</span>
                {[
                  product.minTenureYears,
                  Math.min(product.maxTenureYears, 3),
                  Math.min(product.maxTenureYears, 5),
                  Math.min(product.maxTenureYears, 10),
                  Math.min(product.maxTenureYears, 15),
                  product.maxTenureYears,
                ]
                  .filter((v, idx, arr) => arr.indexOf(v) === idx)
                  .map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => onTenureChange(yr)}
                      className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg border transition ${
                        tenureYears === yr
                          ? "bg-[#FC8019] text-white border-[#FC8019]"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#FC8019]"
                      }`}
                    >
                      {yr}Y
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Facility Specific Explanatory Note */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 flex items-start gap-2.5">
            <Info size={16} className="text-[#FC8019] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                {isTermLoan && "Standard Reducing Balance Term Loan"}
                {isRevolving && "Revolving Credit Line (Interest only on utilized amount)"}
                {isDiscounting && "Cash Flow Discounting (Immediate receivables advance)"}
                {isGuarantee && "Non-Funded Bank Guarantee (No immediate cash debit)"}
              </span>
              <span>
                {isTermLoan && "Interest is charged on reducing principal monthly. Part-prepayments directly reduce principal without penalty."}
                {isRevolving && "Draw funds whenever you need to settle vendors; deposit receipts to immediately stop interest accrual."}
                {isDiscounting && "Financed directly against certified client invoices or long-term commercial rental contracts."}
                {isGuarantee && "Issued via SFMS to tender beneficiaries. Only issuance commission & margin requirements apply."}
              </span>
            </div>
          </div>
        </div>

        {/* Calculation Result Summary (5 Columns) */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-orange-50/20 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 space-y-5 shadow-sm">
          {/* Main Primary Metric */}
          {isTermLoan && (
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-mono uppercase font-bold tracking-wider">
                Monthly Repayment (EMI)
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(emi)}
                <span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Calculated at {product.annualRate}% p.a. for {tenureYears} years ({totalMonths} instalments)
              </p>
            </div>
          )}

          {isRevolving && (
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-mono uppercase font-bold tracking-wider">
                Est. Monthly Interest (at 75% utilization)
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(revolvingMonthlyInterest)}
                <span className="text-xs font-normal text-slate-500"> / mo</span>
              </div>
              <p className="text-[11px] text-slate-500">
                ₹0 interest if limit is not drawn. Interest accrues only on utilized days.
              </p>
            </div>
          )}

          {isDiscounting && (
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-mono uppercase font-bold tracking-wider">
                Immediate Upfront Advance (90%)
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(invoiceNetAdvance)}
              </div>
              <p className="text-[11px] text-slate-500">
                Monthly discounting cost: {formatINR(monthlyDiscountCost)} (billed on settlement)
              </p>
            </div>
          )}

          {isGuarantee && (
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-mono uppercase font-bold tracking-wider">
                Annual Guarantee Commission
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(annualBgCommission)}
                <span className="text-xs font-normal text-slate-500"> / yr</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Estimated 15% Cash Margin: {formatINR(estimatedCashMargin)} (kept as FD)
              </p>
            </div>
          )}

          {/* Detailed Metric Breakdown Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
            {isTermLoan && (
              <>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Interest</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(totalInterest)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Payable</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(totalRepayment)}</span>
                </div>
              </>
            )}

            {isRevolving && (
              <>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sanctioned Limit</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(amount)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual Review Fee</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(annualCommitmentFee)}</span>
                </div>
              </>
            )}

            {isDiscounting && (
              <>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Retention (10%)</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(amount * 0.1)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice Value</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(amount)}</span>
                </div>
              </>
            )}

            {isGuarantee && (
              <>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">BG Amount</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(amount)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Validity Period</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{tenureYears} Year(s)</span>
                </div>
              </>
            )}
          </div>

          {/* Matched Partner Banks Badge */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-bold block">
              Top Institutional Lending Desks:
            </span>
            <div className="space-y-2">
              {product.matchedLenders.map((lender) => (
                <div
                  key={lender.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#FC8019]">{lender.logoText}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{lender.name}</span>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {lender.indicativeRate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Apply Button */}
          <button
            type="button"
            onClick={onApply}
            className="w-full py-4 rounded-2xl text-sm sm:text-base font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap size={18} />
            <span>Apply for {product.name} ({formatINR(amount)})</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
