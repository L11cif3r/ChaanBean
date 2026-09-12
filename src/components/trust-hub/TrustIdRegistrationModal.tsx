"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Building2,
  UserCheck,
  Briefcase,
  X,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  Copy,
  Check,
} from "lucide-react";

interface TrustIdRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBusinessType?: "proprietorship" | "partnership" | "company";
  onSuccess?: (newTrustId: string) => void;
}

export function TrustIdRegistrationModal({
  isOpen,
  onClose,
  initialBusinessType = "company",
  onSuccess,
}: TrustIdRegistrationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessType, setBusinessType] = useState<"proprietorship" | "partnership" | "company">(
    initialBusinessType
  );
  const [companyName, setCompanyName] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [cin, setCin] = useState("");
  const [phone, setPhone] = useState("");
  const [signatory, setSignatory] = useState("");
  const [consent, setConsent] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintedResult, setMintedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const feeMap = {
    proprietorship: 1000,
    partnership: 1500,
    company: 2000,
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !pan) {
      setError("Please provide Entity Legal Name and PAN.");
      return;
    }
    if (!consent) {
      setError("Statutory consent for data verification is mandatory under IT Act 2000.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trust-hub/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType,
          companyName,
          pan: pan.toUpperCase(),
          gstin: gstin ? gstin.toUpperCase() : undefined,
          cin: cin ? cin.toUpperCase() : undefined,
          phone,
          authorizedSignatory: signatory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setMintedResult(data);
      setStep(3);
      if (onSuccess) onSuccess(data.trustId);
    } catch (err: any) {
      setError(err.message || "Failed to process verification.");
    } finally {
      setLoading(false);
    }
  };

  const copyTrustId = () => {
    if (!mintedResult?.trustId) return;
    navigator.clipboard.writeText(mintedResult.trustId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white rounded-lg p-1 transition"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-[#FC8019]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">TrustHub — Business Verification Wizard</h3>
            <p className="text-xs text-slate-400">
              Complete KYC verification and mint your official shareable Trust ID
            </p>
          </div>
        </div>

        {/* Step Progression Indicators */}
        <div className="my-5 flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= 1
                  ? "bg-[#FC8019] text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              1
            </div>
            <span className={`text-xs font-medium ${step >= 1 ? "text-[#FFA34D]" : "text-slate-400"}`}>
              Structure & Tier
            </span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-slate-800" />
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= 2
                  ? "bg-[#FC8019] text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              2
            </div>
            <span className={`text-xs font-medium ${step >= 2 ? "text-[#FFA34D]" : "text-slate-400"}`}>
              Entity Details
            </span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-slate-800" />
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === 3
                  ? "bg-[#FC8019] text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              3
            </div>
            <span className={`text-xs font-medium ${step === 3 ? "text-[#FFA34D]" : "text-slate-400"}`}>
              Trust ID Minted
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-800/60 bg-rose-950/30 p-3 text-xs text-rose-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select Business Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Select Your Business Structure</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Proprietorship */}
              <button
                type="button"
                onClick={() => setBusinessType("proprietorship")}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                  businessType === "proprietorship"
                    ? "border-[#FC8019] bg-rose-950/20 shadow-md ring-1 ring-[#FC8019]"
                    : "border-slate-700/80 bg-slate-800/40 hover:border-slate-600"
                }`}
              >
                <div>
                  <UserCheck
                    className={
                      businessType === "proprietorship" ? "text-[#FC8019]" : "text-slate-400"
                    }
                    size={20}
                  />
                  <h5 className="mt-2 text-xs font-bold text-white">Proprietorship</h5>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Individual business owner verification
                  </p>
                </div>
                <div className="mt-3 border-t border-slate-700/60 pt-2 text-xs font-mono font-bold text-[#FC8019]">
                  ₹ 1,000
                </div>
              </button>

              {/* Partnership */}
              <button
                type="button"
                onClick={() => setBusinessType("partnership")}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                  businessType === "partnership"
                    ? "border-[#FC8019] bg-rose-950/20 shadow-md ring-1 ring-[#FC8019]"
                    : "border-slate-700/80 bg-slate-800/40 hover:border-slate-600"
                }`}
              >
                <div>
                  <Briefcase
                    className={
                      businessType === "partnership" ? "text-[#FC8019]" : "text-slate-400"
                    }
                    size={20}
                  />
                  <h5 className="mt-2 text-xs font-bold text-white">Partnership Firm</h5>
                  <p className="mt-1 text-[11px] text-slate-400">
                    All active partners verification included
                  </p>
                </div>
                <div className="mt-3 border-t border-slate-700/60 pt-2 text-xs font-mono font-bold text-[#FC8019]">
                  ₹ 1,500
                </div>
              </button>

              {/* Company / LLP */}
              <button
                type="button"
                onClick={() => setBusinessType("company")}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                  businessType === "company"
                    ? "border-[#FC8019] bg-rose-950/20 shadow-md ring-1 ring-[#FC8019]"
                    : "border-slate-700/80 bg-slate-800/40 hover:border-slate-600"
                }`}
              >
                <div>
                  <Building2
                    className={
                      businessType === "company" ? "text-[#FC8019]" : "text-slate-400"
                    }
                    size={20}
                  />
                  <h5 className="mt-2 text-xs font-bold text-white">Company / LLP</h5>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Corporate entity verification with MCA21
                  </p>
                </div>
                <div className="mt-3 border-t border-slate-700/60 pt-2 text-xs font-mono font-bold text-[#FC8019]">
                  ₹ 2,000
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Statutory verification fee:{" "}
                <strong className="text-[#FC8019] font-mono">
                  ₹ {feeMap[businessType].toLocaleString("en-IN")}
                </strong>{" "}
                (deducted from wallet)
              </span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-xl bg-[#FC8019] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#E26D0A] transition"
              >
                <span>Continue to Entity Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Provide Entity Details */}
        {step === 2 && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Legal Entity / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Precision Components Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#FC8019]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Entity PAN Number *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. AABCA1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#FC8019]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  GST Registration Number (GSTIN)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AABCA1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#FC8019]"
                />
              </div>

              {businessType === "company" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Corporate Identification Number (CIN)
                  </label>
                  <input
                    type="text"
                    maxLength={21}
                    placeholder="e.g. U72900MH2024PTC123456"
                    value={cin}
                    onChange={(e) => setCin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#FC8019]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Authorized Director / Signatory Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma (Managing Director)"
                  value={signatory}
                  onChange={(e) => setSignatory(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#FC8019]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Mobile Number for OTP *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#FC8019]"
                />
              </div>
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-800/40 p-3 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-[#FC8019] focus:ring-[#FC8019]"
              />
              <span>
                I hereby declare that I am authorized to represent this entity and authorize ChaanBean
                to query statutory registries (GSTN, MCA21, e-Courts, MSME Udyam) under IT Act 2000 Section 3A.
              </span>
            </label>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[#FC8019] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#E26D0A] disabled:opacity-50 transition"
              >
                {loading ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Auditing Registries & Minting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>Verify & Mint Trust ID (₹{feeMap[businessType]})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Verification Success */}
        {step === 3 && mintedResult && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Trust ID Successfully Certified!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Your business KYC has been validated across statutory registries and registered into the national Trust Network.
              </p>
            </div>

            {/* Credential Box */}
            <div className="rounded-xl border border-rose-900/60 bg-gradient-to-b from-rose-950/30 to-slate-900/80 p-4 text-left">
              <div className="flex items-center justify-between border-b border-rose-900/50 pb-2">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                  Official ChaanBean Trust ID
                </span>
                <span className="rounded bg-rose-950 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-800/60">
                  Active & Verifiable
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xl font-mono font-bold text-white tracking-wide">
                  {mintedResult.trustId}
                </span>
                <button
                  onClick={copyTrustId}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy ID"}</span>
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-300 border-t border-slate-800/80 pt-2">
                <p>Entity: <strong className="text-white">{mintedResult.profile?.companyName}</strong></p>
                <p>PAN: <span className="font-mono text-slate-200">{mintedResult.profile?.pan}</span></p>
                <p>Structure: <span className="capitalize text-slate-200">{businessType}</span></p>
                <p>SHA-256 Seal: <span className="font-mono text-[10px] text-slate-400">{mintedResult.profile?.certificateHash?.slice(0, 16)}...</span></p>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="rounded-xl bg-[#FC8019] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#E26D0A] transition"
              >
                View in Trust Hub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
