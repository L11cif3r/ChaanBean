"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Building,
  Mail,
  User,
  KeyRound,
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Eye,
  X,
} from "lucide-react";

interface GstRegistrationVerificationWidgetProps {
  initialGstin?: string;
  initialLegalName?: string;
  initialEmail?: string;
  businessId?: string;
  companyId?: string;
  onSuccess?: (data: {
    gstin: string;
    legalName: string;
    tradeName?: string;
    constitutionOfBusiness?: string;
    certificateId?: string;
    certificateViewUrl?: string;
  }) => void;
  className?: string;
}

export function GstRegistrationVerificationWidget({
  initialGstin = "",
  initialLegalName = "",
  initialEmail = "",
  businessId,
  companyId,
  onSuccess,
  className = "",
}: GstRegistrationVerificationWidgetProps) {
  // Step: "A_FORM" | "B_OTP" | "C_VERIFIED"
  const [step, setStep] = useState<"A_FORM" | "B_OTP" | "C_VERIFIED">("A_FORM");

  // Form State (Step A)
  const [gstin, setGstin] = useState(initialGstin);
  const [legalName, setLegalName] = useState(initialLegalName);
  const [email, setEmail] = useState(initialEmail);

  // OTP State (Step B)
  const [txnId, setTxnId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  // Verified Data (Step C)
  const [verifiedData, setVerifiedData] = useState<{
    gstin: string;
    legalName: string;
    tradeName: string;
    constitutionOfBusiness: string;
    certificateId?: string;
    certificateViewUrl?: string;
    certificateDownloadUrl?: string;
  } | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // PDF Modal Viewer State
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Quick autofill sample for UAT test
  const handleQuickAutofillUat = () => {
    setGstin("30MCBPH2034F2Z8");
    setLegalName("Amit");
    setEmail("abc@gmail.com");
    setError(null);
  };

  // STEP A: Initiate OTP via Backend
  const handleInitiateOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setErrorCode(null);

    const cleanGstin = gstin.trim().toUpperCase();
    const cleanLegal = legalName.trim();
    const cleanEmail = email.trim();

    if (!cleanGstin || cleanGstin.length !== 15) {
      setError("Please enter a valid 15-character GSTIN.");
      return;
    }
    if (!cleanLegal) {
      setError("Please enter legal name as per GST records.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid Primary Authorized Signatory email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/gst/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstin: cleanGstin,
          legalName: cleanLegal,
          email: cleanEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.txnId) {
        setTxnId(data.txnId);
        setOtpMessage(
          data.message ||
            "OTP has been sent to the registered email and mobile of the Primary Authorised Signatory."
        );
        setStep("B_OTP");
      } else {
        setError(data.error || "Failed to initiate GST verification.");
        setErrorCode(data.errorCode || null);
      }
    } catch {
      setError("Network error connecting to verification gateway.");
    } finally {
      setLoading(false);
    }
  };

  // STEP B: Validate OTP & Fetch Certificate via Backend
  const handleValidateOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!txnId) {
      setError("Session expired. Please restart verification.");
      setStep("A_FORM");
      return;
    }

    const cleanOtp = otp.replace(/\D/g, "").slice(0, 6);
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the 6-digit OTP received.");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch("/api/gst/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstin: gstin.trim().toUpperCase(),
          otp: cleanOtp,
          txnId,
          businessId,
          companyId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const payload = data.data;
        setVerifiedData(payload);
        setStep("C_VERIFIED");

        if (onSuccess) {
          onSuccess(payload);
        }

        // Notify app shell of updated verification
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chaanbean:gst-verified", { detail: payload }));
        }
      } else {
        setError(data.error || "OTP verification failed. Please try again.");
        setErrorCode(data.errorCode || null);
      }
    } catch {
      setError("Network error validating OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Reset to Start Over
  const handleReset = () => {
    setStep("A_FORM");
    setOtp("");
    setTxnId(null);
    setOtpMessage(null);
    setError(null);
    setErrorCode(null);
    setVerifiedData(null);
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-[#FC8019]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                GSTN Registration Certificate Verification
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                API Setu v1.0.1
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authorised Signatory OTP Gateway · Genuine Taxpayer Master Registry · Official PDF Certificate
            </p>
          </div>
        </div>

        {step !== "A_FORM" && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium transition"
          >
            <RefreshCw size={12} />
            Start New Check
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {/* =================================================================== */}
        {/* STEP A: GST VERIFICATION FORM                                       */}
        {/* =================================================================== */}
        {step === "A_FORM" && (
          <form onSubmit={handleInitiateOtp} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building size={14} className="text-[#FC8019]" />
                Step 1: Taxpayer Identification
              </span>

              <button
                type="button"
                onClick={handleQuickAutofillUat}
                className="text-[11px] font-mono font-semibold text-[#FC8019] hover:underline flex items-center gap-1"
              >
                Autofill UAT Test Values
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* GSTIN */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GST Identification Number (GSTIN)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 30MCBPH2034F2Z8"
                  maxLength={15}
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white outline-none focus:border-[#FC8019] shadow-xs"
                />
              </div>

              {/* Legal Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Legal Name as per GST Records
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Amit"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019] shadow-xs"
                  />
                  <User size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Primary Signatory Email (PAS)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. abc@gmail.com"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019] shadow-xs"
                  />
                  <Mail size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    {errorCode ? `GSTN Error (${errorCode})` : "Verification Error"}
                  </div>
                  <div className="mt-0.5 leading-relaxed">{error}</div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                GSTN will dispatch a one-time password to the registered contacts of the signatory.
              </span>

              <button
                type="submit"
                disabled={loading || !gstin.trim() || !legalName.trim() || !email.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-40 shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Querying GSTN Gateway...
                  </>
                ) : (
                  <>
                    Verify GST
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* STEP B: OTP VERIFICATION                                            */}
        {/* =================================================================== */}
        {step === "B_OTP" && (
          <form onSubmit={handleValidateOtp} className="space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-1">
                <KeyRound size={15} />
                OTP Dispatched by GSTN
              </div>
              <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                {otpMessage || "OTP has been sent to the registered email and mobile of the Primary Authorised Signatory."}
              </p>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-amber-900/70 dark:text-amber-300/70 font-mono">
                <span>GSTIN: <strong>{gstin}</strong></span>
                <span>Signatory: <strong>{legalName}</strong></span>
                <span>Txn: <strong className="opacity-80">{txnId?.slice(0, 18)}...</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 565173"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-base font-mono tracking-widest text-center text-slate-900 dark:text-white outline-none focus:border-[#FC8019] shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-40 shadow-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Validating with GSTN...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Verify OTP &amp; Fetch Certificate
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleInitiateOtp()}
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Resend OTP
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    {errorCode ? `GSTN Error (${errorCode})` : "Validation Failed"}
                  </div>
                  <div className="mt-0.5 leading-relaxed">{error}</div>
                </div>
              </div>
            )}
          </form>
        )}

        {/* =================================================================== */}
        {/* STEP C: SUCCESSFUL VERIFICATION & CERTIFICATE DISPLAY               */}
        {/* =================================================================== */}
        {step === "C_VERIFIED" && verifiedData && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Success Banner */}
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="text-base font-black tracking-tight text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    GST VERIFIED ✓
                  </div>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-400/90 mt-0.5">
                    Official GST Registration Certificate validated and stored. Admissible under Bharatiya Sakshya Adhiniyam 2023.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-bold">
                Status: ACTIVE REGISTRATION
              </span>
            </div>

            {/* Extracted Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">GSTIN</span>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                  {verifiedData.gstin}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Legal Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
                  {verifiedData.legalName || "—"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Trade Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
                  {verifiedData.tradeName || verifiedData.legalName || "—"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Constitution of Business</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
                  {verifiedData.constitutionOfBusiness || "Proprietorship / Corporate"}
                </span>
              </div>
            </div>

            {/* Certificate Action Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    GST Registration Certificate (Form GST REG-06)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Official digitally signed certificate decoded directly from GSTN. Ready to view and archive.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {verifiedData.certificateViewUrl && (
                  <button
                    type="button"
                    onClick={() => setShowPdfModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#FC8019] hover:text-[#FC8019] transition shadow-xs"
                  >
                    <Eye size={13} />
                    View Certificate
                  </button>
                )}

                {verifiedData.certificateDownloadUrl && (
                  <a
                    href={verifiedData.certificateDownloadUrl}
                    download={`GST-Certificate-${verifiedData.gstin}.pdf`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-xs font-bold text-white transition shadow-sm"
                  >
                    <Download size={13} />
                    Download Certificate
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {showPdfModal && verifiedData?.certificateViewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-red-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  GST Registration Certificate — {verifiedData.gstin}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {verifiedData.certificateDownloadUrl && (
                  <a
                    href={verifiedData.certificateDownloadUrl}
                    download={`GST-Certificate-${verifiedData.gstin}.pdf`}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Download size={13} />
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 p-2">
              <iframe
                src={verifiedData.certificateViewUrl}
                title="GST Registration Certificate PDF"
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
