"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Landmark,
  BadgePercent,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileText,
  DollarSign,
  Building2,
  Zap,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Calculator,
  ChevronRight,
  Send,
  X,
  Lock,
} from "lucide-react";

export default function LoansPage() {
  // Interactive Calculator State
  const [loanAmount, setLoanAmount] = useState<number>(1500000);
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [selectedProduct, setSelectedProduct] = useState<"invoice" | "credit_line" | "term">("invoice");

  // Application Modal State
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyStep, setApplyStep] = useState<"form" | "submitting" | "approved">("form");
  const [applicantName, setApplicantName] = useState("Acme Traders Pvt Ltd");
  const [applicantGstin, setApplicantGstin] = useState("27AAECG1234H1Z5");
  const [loanPurpose, setLoanPurpose] = useState("Working Capital & Inventory Purchase");
  const [applicationId, setApplicationId] = useState("");

  // Rate based on product
  const ratePerMonth = selectedProduct === "invoice" ? 1.05 : selectedProduct === "credit_line" ? 1.15 : 1.25;
  const annualRate = ratePerMonth * 12;

  // Monthly EMI Calculation: [P x R x (1+R)^N]/[(1+R)^N-1]
  const monthlyRateFraction = ratePerMonth / 100;
  const emi = Math.round(
    (loanAmount * monthlyRateFraction * Math.pow(1 + monthlyRateFraction, tenureMonths)) /
      (Math.pow(1 + monthlyRateFraction, tenureMonths) - 1)
  );
  const totalRepayment = emi * tenureMonths;
  const totalInterest = totalRepayment - loanAmount;

  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplyStep("submitting");
    setTimeout(() => {
      setApplicationId(`CB-LOAN-2026-${Math.floor(10000 + Math.random() * 90000)}`);
      setApplyStep("approved");
    }, 1500);
  };

  const partnerLenders = [
    { name: "HDFC Bank Ltd", type: "Scheduled Commercial Bank", rbiCode: "SCB-0240", approvalTime: "4 Hours" },
    { name: "ICICI Bank Ltd", type: "Scheduled Commercial Bank", rbiCode: "SCB-0085", approvalTime: "6 Hours" },
    { name: "Tata Capital Financial Services", type: "Systemically Important NBFC", rbiCode: "NBFC-0182", approvalTime: "2 Hours" },
    { name: "Bajaj Finserv Ltd", type: "Systemically Important NBFC", rbiCode: "NBFC-0419", approvalTime: "3 Hours" },
    { name: "Vivriti Capital Pvt Ltd", type: "Institutional Credit Partner", rbiCode: "NBFC-0982", approvalTime: "1 Hour" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FC8019]/10 border border-[#FC8019]/25 flex items-center justify-center text-[#FC8019]">
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  ChaanBean Trade Finance &amp; Business Loans
                </h1>
                <span className="rounded bg-orange-50 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[10px] font-mono font-bold">
                  RBI Compliant DL-2022
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                100% paperless credit lines, invoice discounting &amp; MSME working capital backed by statutory GST &amp; MCA underwriting
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck size={14} />
            <span>Pre-Approved Credit: <strong>₹25,00,000</strong></span>
          </div>

          <button
            type="button"
            onClick={() => {
              setApplyStep("form");
              setApplyModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
          >
            <Zap size={14} />
            <span>Apply For Loan</span>
          </button>
        </div>
      </div>

      {/* Pre-Approved Limit Banner */}
      <div className="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 via-white to-amber-50 dark:from-orange-950/30 dark:via-[#111827] dark:to-amber-950/20 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FC8019]/10 border border-[#FC8019]/25 text-[#FC8019] text-xs font-mono font-bold">
              <Sparkles size={13} />
              <span>Instant Digital Pre-Approval Based On GSTR-3B Filings</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              You Have ₹25,00,000 Unlocked Working Capital Ready For Drawdown
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Because your company has 12 consecutive months of verified on-time GST filings (GSTR-3B), zero Section 138 cheque bounce FIRs, and verified MCA director credentials, institutional lenders have pre-sanctioned your working capital line. Zero collateral required.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shrink-0 min-w-[280px] space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 uppercase font-mono text-[10px]">Pre-Approved Limit</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Approved</span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              ₹25,00,000
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Interest: From 1.05%/mo</span>
              <span>Disbursal: 4 Hours</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setApplyStep("form");
                setApplyModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
            >
              <span>Instant Drawdown</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Loan Facilities */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Available Business Financing Products
          </h2>
          <span className="text-xs text-slate-500 font-mono">3 Facility Options</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Option 1: Invoice Discounting */}
          <div
            onClick={() => setSelectedProduct("invoice")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 space-y-4 ${
              selectedProduct === "invoice"
                ? "border-[#FC8019] bg-orange-50/40 dark:bg-orange-950/20 shadow-md shadow-orange-500/10 ring-1 ring-[#FC8019]"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950 text-[#FC8019] flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Most Popular
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Invoice Discounting &amp; Bill Financing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Advance up to 85% of unpaid verified debtor invoices within 4 hours. Repayment auto-settles when debtor pays via Recovery Hub.
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Advance Rate:</span>
                <span className="font-bold text-slate-900 dark:text-white">Up to 85%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rate of Interest:</span>
                <span className="font-bold text-[#FC8019] font-mono">1.05% / month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenure:</span>
                <span className="font-bold text-slate-900 dark:text-white">30 to 120 Days</span>
              </div>
            </div>
          </div>

          {/* Option 2: Revolving Credit Line */}
          <div
            onClick={() => setSelectedProduct("credit_line")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 space-y-4 ${
              selectedProduct === "credit_line"
                ? "border-[#FC8019] bg-orange-50/40 dark:bg-orange-950/20 shadow-md shadow-orange-500/10 ring-1 ring-[#FC8019]"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <TrendingUp size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                Flexible
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Revolving Working Capital Facility
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Flexible credit line to bridge cash flow gaps, procure inventory, or meet operational payroll. Pay interest only on what you withdraw.
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Credit Limit:</span>
                <span className="font-bold text-slate-900 dark:text-white">Up to ₹50 Lakhs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rate of Interest:</span>
                <span className="font-bold text-[#FC8019] font-mono">1.15% / month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Prepayment Fee:</span>
                <span className="font-bold text-emerald-600 font-mono">₹0 (Zero Penalty)</span>
              </div>
            </div>
          </div>

          {/* Option 3: MSME Term Loan */}
          <div
            onClick={() => setSelectedProduct("term")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 space-y-4 ${
              selectedProduct === "term"
                ? "border-[#FC8019] bg-orange-50/40 dark:bg-orange-950/20 shadow-md shadow-orange-500/10 ring-1 ring-[#FC8019]"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Building2 size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                Expansion
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                MSME Growth &amp; Term Loan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Unsecured business expansion loan for machinery acquisition, new factory outlets, or warehouse leasing with structured EMIs.
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Loan Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">Up to ₹35 Lakhs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rate of Interest:</span>
                <span className="font-bold text-[#FC8019] font-mono">1.25% / month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenure:</span>
                <span className="font-bold text-slate-900 dark:text-white">12 to 36 Months</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive EMI & Repayment Calculator */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <Calculator size={18} className="text-[#FC8019]" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Interactive Loan &amp; EMI Calculator
          </h2>
          <span className="text-xs text-slate-500 font-mono ml-auto">
            Rate: {ratePerMonth}% / mo ({annualRate}% p.a.)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sliders (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Amount Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 font-bold uppercase">Requested Loan Amount</span>
                <span className="text-base font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {formatINR(loanAmount)}
                </span>
              </div>
              <input
                type="range"
                min={100000}
                max={5000000}
                step={50000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FC8019]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹1 Lakh</span>
                <span>₹25 Lakhs</span>
                <span>₹50 Lakhs</span>
              </div>
            </div>

            {/* Tenure Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 font-bold uppercase">Tenure Duration</span>
                <span className="text-base font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {tenureMonths} Months
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={24}
                step={1}
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FC8019]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>3 Months</span>
                <span>12 Months</span>
                <span>24 Months</span>
              </div>
            </div>
          </div>

          {/* Results Summary Box (Right 5 Cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Calculated Monthly EMI</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(emi)}
                <span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Total Interest</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(totalInterest)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Total Repayment</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(totalRepayment)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setApplyStep("form");
                setApplyModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm flex items-center justify-center gap-2"
            >
              <span>Apply For {formatINR(loanAmount)}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Lending Network & Partners */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Institutional Lending Syndication Network
            </h3>
            <p className="text-xs text-slate-500">
              Co-lending facilities provided in partnership with RBI-regulated Scheduled Commercial Banks and Tier-1 NBFCs.
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
            5 Institutional Partners
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {partnerLenders.map((lender) => (
            <div
              key={lender.name}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-xs">
                <Landmark size={14} className="text-[#FC8019]" />
                <span className="truncate">{lender.name}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{lender.type}</div>
              <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-400">
                <span>{lender.rbiCode}</span>
                <span className="text-emerald-500 font-bold">{lender.approvalTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loan Application Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#FC8019]/10 text-[#FC8019] flex items-center justify-center font-bold">
                  <Landmark size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Apply For {selectedProduct === "invoice" ? "Invoice Discounting" : selectedProduct === "credit_line" ? "Credit Line" : "Term Loan"}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">100% Digital · Zero Physical Paperwork</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            {applyStep === "form" && (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Company Legal Name</label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Company GSTIN</label>
                    <input
                      type="text"
                      value={applicantGstin}
                      onChange={(e) => setApplicantGstin(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-mono font-bold uppercase outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Requested Amount (₹)</label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Tenure (Months)</label>
                    <select
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                    >
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={9}>9 Months</option>
                      <option value={12}>12 Months</option>
                      <option value={18}>18 Months</option>
                      <option value={24}>24 Months</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Purpose of Loan</label>
                  <input
                    type="text"
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                <div className="rounded-xl bg-orange-50 dark:bg-orange-950/40 p-3 border border-orange-200 dark:border-orange-800/60 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <Lock size={14} className="text-[#FC8019] shrink-0 mt-0.5" />
                  <span>
                    Your loan application will be automatically enriched with your verified GSTR-3B filings and MCA DIN records from the ChaanBean statutory ledger for instant preliminary sanction.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Submit Digital Application</span>
                  </button>
                </div>
              </form>
            )}

            {applyStep === "submitting" && (
              <div className="py-10 text-center space-y-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#FC8019] border-t-transparent mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Transmitting Verified Credit Dossier to Lending Partners...
                </h4>
                <p className="text-xs text-slate-500">
                  Packaging audited GSTR-3B revenue and MCA directorship certifications
                </p>
              </div>
            )}

            {applyStep === "approved" && (
              <div className="py-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-500 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Preliminary Sanction Approved!
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Your application for <strong>{formatINR(loanAmount)}</strong> has been registered with reference ID <span className="font-mono font-bold text-slate-900 dark:text-white">{applicationId}</span>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sanctioned Amount:</span>
                    <span className="text-emerald-500 font-bold">{formatINR(loanAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tenure:</span>
                    <span className="text-white">{tenureMonths} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly EMI:</span>
                    <span className="text-white font-bold">{formatINR(emi)} / mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Disbursal:</span>
                    <span className="text-[#FC8019]">Within 4 Business Hours</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
                >
                  Return to Loans Hub
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
