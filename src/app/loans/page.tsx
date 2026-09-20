"use client";

import React, { useState } from "react";
import {
  Home,
  User,
  Coins,
  Briefcase,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Phone,
  Sparkles,
  Zap,
  X,
  Send,
  Clock,
  ShieldCheck,
} from "lucide-react";

type LoanType = "home" | "personal" | "gold" | "business";

interface LoanOption {
  id: LoanType;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge: string;
  rateText: string;
  annualRate: number; // in %
  minAmount: number;
  maxAmount: number;
  defaultAmount: number;
  minTenureYears: number;
  maxTenureYears: number;
  defaultTenureYears: number;
  description: string;
  features: string[];
}

const LOAN_OPTIONS: LoanOption[] = [
  {
    id: "home",
    title: "Home Loan",
    icon: Home,
    badge: "Lowest Rate",
    rateText: "From 8.35% p.a.",
    annualRate: 8.35,
    minAmount: 500000,
    maxAmount: 50000000,
    defaultAmount: 3500000,
    minTenureYears: 1,
    maxTenureYears: 30,
    defaultTenureYears: 20,
    description: "Purchase your dream home, construct, or transfer your existing balance at lowest EMIs.",
    features: ["Up to 30 years tenure", "Zero hidden charges", "Quick property approval"],
  },
  {
    id: "personal",
    title: "Personal Loan",
    icon: User,
    badge: "Instant Disbursal",
    rateText: "From 10.49% p.a.",
    annualRate: 10.49,
    minAmount: 50000,
    maxAmount: 2500000,
    defaultAmount: 500000,
    minTenureYears: 1,
    maxTenureYears: 5,
    defaultTenureYears: 3,
    description: "Fast unsecured cash for weddings, medical emergencies, travel, or home renovation.",
    features: ["100% paperless approval", "Disbursal in 2 hours", "No collateral required"],
  },
  {
    id: "gold",
    title: "Gold Loan",
    icon: Coins,
    badge: "Zero Income Proof",
    rateText: "From 0.79% / mo (9.5% p.a.)",
    annualRate: 9.5,
    minAmount: 25000,
    maxAmount: 15000000,
    defaultAmount: 300000,
    minTenureYears: 1,
    maxTenureYears: 3,
    defaultTenureYears: 1,
    description: "Unlock instant cash against gold jewellery with highest per-gram value and secure vault storage.",
    features: ["Same-day cash in bank", "Free gold insurance in vault", "Minimal documentation"],
  },
  {
    id: "business",
    title: "Business Loan",
    icon: Briefcase,
    badge: "Grow Your Enterprise",
    rateText: "From 12.60% p.a.",
    annualRate: 12.6,
    minAmount: 100000,
    maxAmount: 5000000,
    defaultAmount: 1500000,
    minTenureYears: 1,
    maxTenureYears: 5,
    defaultTenureYears: 3,
    description: "Collateral-free working capital, machinery financing, and expansion capital for your business.",
    features: ["GST & turnover backed", "Flexible repayment terms", "Up to ₹50 Lakhs limit"],
  },
];

export default function LoansPage() {
  const [selectedType, setSelectedType] = useState<LoanType>("home");
  const currentLoan = LOAN_OPTIONS.find((l) => l.id === selectedType)!;

  // Calculator State initialized from current loan
  const [amount, setAmount] = useState<number>(currentLoan.defaultAmount);
  const [tenureYears, setTenureYears] = useState<number>(currentLoan.defaultTenureYears);

  // Application Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<"form" | "submitting" | "done">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [applicationId, setApplicationId] = useState("");

  const handleSelectLoan = (loan: LoanOption) => {
    setSelectedType(loan.id);
    setAmount(loan.defaultAmount);
    setTenureYears(loan.defaultTenureYears);
  };

  // Simple EMI formula: [P x R x (1+R)^N]/[(1+R)^N-1]
  const monthlyRate = currentLoan.annualRate / 12 / 100;
  const totalMonths = tenureYears * 12;
  const emi = Math.round(
    (amount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );
  const totalRepayment = emi * totalMonths;
  const totalInterest = totalRepayment - amount;

  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("submitting");
    setTimeout(() => {
      setApplicationId(`LN-${Math.floor(100000 + Math.random() * 900000)}`);
      setStep("done");
    }, 1000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Clean, Simple Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Loans Made Simple
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pick from 4 straightforward loan options with instant approval, low rates, and minimal paperwork.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep("form");
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
        >
          <Zap size={15} />
          <span>Apply Now</span>
        </button>
      </div>

      {/* 4 Simple Loan Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LOAN_OPTIONS.map((loan) => {
          const Icon = loan.icon;
          const isSelected = selectedType === loan.id;

          return (
            <div
              key={loan.id}
              onClick={() => handleSelectLoan(loan)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                isSelected
                  ? "border-[#FC8019] bg-orange-50/50 dark:bg-orange-950/20 shadow-md shadow-orange-500/10 ring-2 ring-[#FC8019]"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold ${
                      isSelected
                        ? "bg-[#FC8019] text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <Icon size={22} />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? "bg-[#FC8019]/20 border-[#FC8019]/40 text-[#FC8019]"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    {loan.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {loan.title}
                  </h3>
                  <div className="text-xs font-mono font-bold text-[#FC8019] mt-0.5">
                    {loan.rateText}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {loan.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {loan.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectLoan(loan);
                  setStep("form");
                  setModalOpen(true);
                }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-[#FC8019] text-white shadow-sm hover:bg-[#e67312]"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#FC8019] hover:text-white"
                }`}
              >
                <span>Select &amp; Apply</span>
                <ArrowRight size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Simple Loan & EMI Calculator */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-[#FC8019]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              EMI Calculator for {currentLoan.title}
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-[#FC8019] bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 px-2.5 py-1 rounded-lg">
            Interest: {currentLoan.annualRate}% p.a.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sliders (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Amount Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 font-bold uppercase">Loan Amount</span>
                <span className="text-base font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {formatINR(amount)}
                </span>
              </div>
              <input
                type="range"
                min={currentLoan.minAmount}
                max={currentLoan.maxAmount}
                step={currentLoan.minAmount >= 500000 ? 50000 : 10000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FC8019]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{formatINR(currentLoan.minAmount)}</span>
                <span>{formatINR(currentLoan.maxAmount)}</span>
              </div>
            </div>

            {/* Tenure Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 font-bold uppercase">Tenure</span>
                <span className="text-base font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {tenureYears} {tenureYears === 1 ? "Year" : "Years"} ({tenureYears * 12} Months)
                </span>
              </div>
              <input
                type="range"
                min={currentLoan.minTenureYears}
                max={currentLoan.maxTenureYears}
                step={1}
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FC8019]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{currentLoan.minTenureYears} Year</span>
                <span>{currentLoan.maxTenureYears} Years</span>
              </div>
            </div>
          </div>

          {/* EMI Result Summary (5 Cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-5 space-y-4">
            <div>
              <span className="text-[11px] text-slate-500 font-mono uppercase">Monthly Payment (EMI)</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {formatINR(emi)}
                <span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Total Interest</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(totalInterest)}</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Total Repayment</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatINR(totalRepayment)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("form");
                setModalOpen(true);
              }}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm flex items-center justify-center gap-2"
            >
              <span>Apply for {currentLoan.title}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Simple 3-Step Process (No Theories) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-1.5 shadow-sm">
          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950 text-[#FC8019] font-mono font-black text-xs flex items-center justify-center mx-auto">
            1
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Choose Your Loan</h4>
          <p className="text-[11px] text-slate-500">Pick Home, Personal, Gold, or Business loan.</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-1.5 shadow-sm">
          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950 text-[#FC8019] font-mono font-black text-xs flex items-center justify-center mx-auto">
            2
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">1-Minute Application</h4>
          <p className="text-[11px] text-slate-500">Provide basic contact info without bulky paperwork.</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-1.5 shadow-sm">
          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950 text-[#FC8019] font-mono font-black text-xs flex items-center justify-center mx-auto">
            3
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Fast Disbursal</h4>
          <p className="text-[11px] text-slate-500">Instant approval and quick disbursal into your bank account.</p>
        </div>
      </div>

      {/* 1-Minute Simple Application Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#FC8019]/10 text-[#FC8019] flex items-center justify-center font-bold">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Apply for {currentLoan.title}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Rate: {currentLoan.rateText}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {step === "form" && (
              <form onSubmit={handleSubmitApplication} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Your Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Nair"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Mobile Number (+91)</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatINR(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenure:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{tenureYears} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated EMI:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(emi)}/mo</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Submit Application</span>
                  </button>
                </div>
              </form>
            )}

            {step === "submitting" && (
              <div className="py-8 text-center space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FC8019] border-t-transparent mx-auto" />
                <div className="text-xs font-bold text-slate-900 dark:text-white">Submitting your request...</div>
              </div>
            )}

            {step === "done" && (
              <div className="py-4 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Application Submitted!
                  </h4>
                  <p className="text-xs text-slate-500">
                    Application Ref: <span className="font-mono font-bold text-slate-900 dark:text-white">{applicationId}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Our loan specialist will call you at <strong>{phone || "+91 9876543210"}</strong> within 15 minutes to complete the quick approval.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm mt-2"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
