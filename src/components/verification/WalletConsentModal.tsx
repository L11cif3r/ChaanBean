"use client";

import React, { useState } from "react";
import {
  Wallet,
  ShieldCheck,
  AlertCircle,
  Coins,
  CheckCircle2,
  X,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

export interface WalletConsentProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  featureName: string;
  featureDescription: string;
  statute?: string;
  costCredits: number;
  currentBalance: number;
  relevanceRationale?: string;
}

export function WalletConsentModal({
  isOpen,
  onClose,
  onConfirm,
  featureName,
  featureDescription,
  statute,
  costCredits,
  currentBalance,
  relevanceRationale,
}: WalletConsentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const hasSufficientBalance = currentBalance >= costCredits;
  const balanceAfter = Math.max(0, currentBalance - costCredits);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl bg-[#FC8019] text-white flex items-center justify-center shadow-md shadow-orange-500/20 ring-2 ring-orange-400/30 shrink-0"
              style={{ backgroundColor: "#FC8019", color: "#ffffff" }}
            >
              <Lock size={18} className="text-white" strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Explicit Wallet Consent
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Section 8 Protocol
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preview ≠ Purchase. Credits are only debited upon your explicit confirmation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Target Check Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  {statute || "Statutory Investigation Module"}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {featureName}
                </h4>
              </div>
              <span className="text-sm font-black font-mono text-[#FC8019] px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 shrink-0">
                ₹{costCredits.toLocaleString("en-IN")} / {costCredits} Credits
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {featureDescription}
            </p>
          </div>

          {/* Why this check matters */}
          <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#FC8019]">
              <Sparkles size={14} />
              <span>Why ChaanBean Recommends This Check</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {relevanceRationale ||
                "Verifies statutory registry data, active filings, and risk signals before you extend trade credit, protecting your receivables from payment defaults."}
            </p>
          </div>

          {/* Wallet Impact Calculation */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Wallet Transaction Impact
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Balance</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                  ₹{currentBalance.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/60">
                <span className="text-[10px] text-[#FC8019] uppercase font-semibold">Deduction</span>
                <p className="text-sm font-black text-[#FC8019] font-mono mt-0.5">
                  - ₹{costCredits.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Balance After</span>
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                  ₹{balanceAfter.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          {!hasSufficientBalance && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>Insufficient balance in company wallet. Please recharge wallet to proceed.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSufficientBalance || isSubmitting}
            style={
              hasSufficientBalance && !isSubmitting
                ? { backgroundColor: "#FC8019", color: "#ffffff" }
                : undefined
            }
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shrink-0 ring-2 ring-orange-400/40",
              hasSufficientBalance && !isSubmitting
                ? "bg-[#FC8019] hover:bg-[#e26d0a] text-white shadow-orange-500/25 active:scale-95 cursor-pointer"
                : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700"
            )}
          >
            <ShieldCheck
              size={16}
              className={hasSufficientBalance && !isSubmitting ? "text-white shrink-0" : "text-slate-500 dark:text-slate-400 shrink-0"}
            />
            <span className={hasSufficientBalance && !isSubmitting ? "text-white font-bold" : "text-slate-600 dark:text-slate-400"}>
              {isSubmitting ? "Decrypting & Debiting..." : `Confirm & Unlock (${costCredits} Credits)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
