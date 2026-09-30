"use client";

import React, { useState, useEffect } from "react";
import type { LoanProduct, LoanApplication } from "@/lib/loans/types";
import {
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  CreditCard,
  Send,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Briefcase,
  FileCheck,
} from "lucide-react";

interface CapitalXApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: LoanProduct;
  initialAmount: number;
  initialTenureYears: number;
  companyContext?: {
    companyName?: string;
    pan?: string;
    gstin?: string;
    city?: string;
    state?: string;
  };
  onApplicationSubmitted?: (application: LoanApplication) => void;
}

export function CapitalXApplicationModal({
  isOpen,
  onClose,
  product,
  initialAmount,
  initialTenureYears,
  companyContext,
  onApplicationSubmitted,
}: CapitalXApplicationModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Borrower Profile
  const [applicantName, setApplicantName] = useState("");
  const [entityName, setEntityName] = useState(companyContext?.companyName || "");
  const [entityType, setEntityType] = useState("Private Limited");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(companyContext?.city || "Mumbai");
  const [state, setState] = useState(companyContext?.state || "Maharashtra");

  // Step 2: Financial Credentials
  const [pan, setPan] = useState(companyContext?.pan || "");
  const [gstin, setGstin] = useState(companyContext?.gstin || "");
  const [udyamNumber, setUdyamNumber] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState<number | "">("");
  const [primaryBank, setPrimaryBank] = useState("State Bank of India");

  // Step 3: Loan Requirement & Security
  const [requestedAmount, setRequestedAmount] = useState<number>(initialAmount || product.defaultAmount);
  const [tenureYears, setTenureYears] = useState<number>(initialTenureYears || product.defaultTenureYears);
  const [loanPurpose, setLoanPurpose] = useState(`Financing for ${product.name}`);
  const [collateralType, setCollateralType] = useState("Primary Asset Hypothecation");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<LoanApplication | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial configuration when opening modal
  useEffect(() => {
    if (initialAmount) setRequestedAmount(initialAmount);
    if (initialTenureYears) setTenureYears(initialTenureYears);
    if (companyContext?.companyName && !entityName) {
      setEntityName(companyContext.companyName);
    }
    if (companyContext?.pan && !pan) {
      setPan(companyContext.pan);
    }
    if (companyContext?.gstin && !gstin) {
      setGstin(companyContext.gstin);
    }
  }, [initialAmount, initialTenureYears, companyContext]);

  if (!isOpen) return null;

  const formatINR = (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !phone.trim() || !requestedAmount) {
      setErrorMessage("Please fill in applicant name, mobile number, and requested loan amount.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/loans/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          requestedAmount,
          tenureYears,
          applicantName,
          entityName,
          entityType,
          phone,
          email,
          city,
          state,
          pan,
          gstin,
          udyamNumber,
          annualTurnover: annualTurnover ? Number(annualTurnover) : undefined,
          primaryBank,
          loanPurpose,
          collateralType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit loan application. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSubmittedApp(data.application);
      setCurrentStep(4);
      if (onApplicationSubmitted && data.application) {
        onApplicationSubmitted(data.application);
      }
    } catch {
      setErrorMessage("Network error communicating with CapitalX gateway. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#FC8019]/10 text-[#FC8019] flex items-center justify-center font-bold shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                  CapitalX Gateway
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {product.category}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Institutional Application: {product.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator (Steps 1 to 3) */}
        {currentStep < 4 && (
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs font-mono font-bold">
            <div className="flex items-center gap-2">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 1
                    ? "bg-[#FC8019] text-white"
                    : "bg-emerald-500 text-white"
                }`}
              >
                1
              </span>
              <span className={currentStep === 1 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                Borrower Profile
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">→</span>
            <div className="flex items-center gap-2">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 2
                    ? "bg-[#FC8019] text-white"
                    : currentStep > 2
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}
              >
                2
              </span>
              <span className={currentStep === 2 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                Financial Credentials
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">→</span>
            <div className="flex items-center gap-2">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 3
                    ? "bg-[#FC8019] text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}
              >
                3
              </span>
              <span className={currentStep === 3 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                Facility &amp; Security
              </span>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Borrower Profile */}
          {currentStep === 1 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-slate-600 dark:text-slate-400 text-xs">
                Provide designated borrower contact information. No dummy mock values are pre-filled.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Applicant / Authorized Signatory Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Contact Mobile Number (+91) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Entity / Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Traders Pvt Ltd"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Entity Constitution
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                  >
                    <option value="Private Limited">Private Limited Company</option>
                    <option value="Public Limited">Public Limited Company</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="Partnership">Partnership Firm</option>
                    <option value="Proprietorship">Sole Proprietorship</option>
                    <option value="Individual">Individual / Self-Employed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Work / Official Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. finance@yourcompany.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Financial Credentials */}
          {currentStep === 2 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs">
                Statutory and financial credentials help institutional lenders issue fast-track sanctions with lower interest rates.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Permanent Account Number (PAN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AAECG1234H"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono uppercase outline-none focus:border-[#FC8019]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Goods &amp; Services Tax (GSTIN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAECG1234H1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono uppercase outline-none focus:border-[#FC8019]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Udyam / MSME Registration (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UDYAM-MH-12-0012345"
                    value={udyamNumber}
                    onChange={(e) => setUdyamNumber(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono outline-none focus:border-[#FC8019]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Annual Turnover / Revenue (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 85000000 (8.5 Cr)"
                    value={annualTurnover}
                    onChange={(e) => setAnnualTurnover(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono outline-none focus:border-[#FC8019]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Primary Operative Banking Relationship
                </label>
                <select
                  value={primaryBank}
                  onChange={(e) => setPrimaryBank(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                >
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="IDFC FIRST Bank">IDFC FIRST Bank</option>
                  <option value="Other Bank">Other Scheduled Bank</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: Facility Requirements & Security */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Product:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Indicative Rate:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{product.rateText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Amount:</span>
                  <span className="font-black text-[#FC8019]">{formatINR(requestedAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Requested Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={product.minAmount}
                    max={product.maxAmount}
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono text-sm font-bold outline-none focus:border-[#FC8019]"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Range: {formatINR(product.minAmount)} – {formatINR(product.maxAmount)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Required Tenure (Years)
                  </label>
                  <input
                    type="number"
                    min={product.minTenureYears}
                    max={product.maxTenureYears}
                    value={tenureYears}
                    onChange={(e) => setTenureYears(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono text-sm font-bold outline-none focus:border-[#FC8019]"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Max allowed: {product.maxTenureYears} Years
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Specific Commercial Purpose / End-Use of Funds
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purchase of industrial raw material stock, warehouse purchase, machinery"
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Primary Collateral / Security Offered
                </label>
                <select
                  value={collateralType}
                  onChange={(e) => setCollateralType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                >
                  <option value="Primary Asset Hypothecation">Hypothecation of Asset / Vehicle / Machinery</option>
                  <option value="Residential Property Mortgage">Residential Property Mortgage</option>
                  <option value="Commercial Real Estate Mortgage">Commercial Real Estate Mortgage</option>
                  <option value="Stock and Book Debts">Stock &amp; Book Debts (Receivables)</option>
                  <option value="Rental Escrow">Rental Escrow / Long-Term Lease Agreement</option>
                  <option value="Liquid Fixed Deposit Margin">Fixed Deposit / Liquid Security Margin</option>
                  <option value="CGTMSE Guarantee">CGTMSE Guarantee (Zero Collateral for MSMEs)</option>
                  <option value="Clean / Unsecured">Clean / Unsecured Balance Sheet</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-bold">Instant Partner Match Probability: 94%</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-600">3 Lenders Ready</span>
              </div>
            </div>
          )}

          {/* STEP 4: Success Confirmation */}
          {currentStep === 4 && submittedApp && (
            <div className="py-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Institutional Application Dispatched
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Application Submitted to CapitalX Desk
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Your request for <strong>{submittedApp.productName}</strong> has been registered with priority institutional allocation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left text-xs font-mono space-y-2">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500">Application Reference:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{submittedApp.applicationRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sanction Facility:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(submittedApp.requestedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Preliminary Match Score:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{submittedApp.preliminaryScore}/100 (High)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant Contact:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{submittedApp.phone}</span>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2 text-left">
                <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block">
                  Matched Lending Partners:
                </span>
                <div className="space-y-1.5">
                  {submittedApp.matchedLenders.map((lender) => (
                    <div
                      key={lender.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#FC8019]">{lender.logoText}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{lender.name}</span>
                      </div>
                      <span className="text-emerald-600 font-mono font-bold text-[11px]">{lender.indicativeRate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3">
          {currentStep === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!applicantName.trim() || !phone.trim()) {
                    setErrorMessage("Please enter applicant full name and mobile number to proceed.");
                    return;
                  }
                  setErrorMessage(null);
                  setCurrentStep(2);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue: Financial Credentials</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ← Back to Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setCurrentStep(3);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue: Facility Details</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}

          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    <span>Underwriting &amp; Matching...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit to CapitalX Partner Desks</span>
                  </>
                )}
              </button>
            </>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
            >
              Done &amp; View My Applications
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
