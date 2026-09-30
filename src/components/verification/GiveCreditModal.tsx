"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  X,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { logAuditEvent } from "@/lib/events/audit-events";

export interface GiveCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    companyName: string;
    amount: number;
    termsDays: number;
    dueDate: string;
    invoiceRef: string;
  }) => void;
  companyName: string;
  pan?: string;
  gstin?: string;
}

export function GiveCreditModal({
  isOpen,
  onClose,
  onSuccess,
  companyName,
  pan,
  gstin,
}: GiveCreditModalProps) {
  const [creditAmount, setCreditAmount] = useState<string>("5000000"); // ₹50L default
  const [termsDays, setTermsDays] = useState<number>(45);
  const [invoiceRef, setInvoiceRef] = useState<string>("PO-2026-9912");
  const [notes, setNotes] = useState<string>("Commercial trade credit on statutory 45-day terms");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  // Calculate Due Date based on termsDays
  const calculatedDueDate = new Date();
  calculatedDueDate.setDate(calculatedDueDate.getDate() + (Number(termsDays) || 30));
  const dueDateStr = calculatedDueDate.toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parsedAmount = parseFloat(creditAmount) || 0;
      await logAuditEvent("CREDIT_EXPOSURE_CREATED", {
        companyId: companyName,
        metadata: {
          companyName,
          amount: parsedAmount,
          termsDays,
          dueDate: dueDateStr,
          invoiceRef,
        },
      });

      // Save to localStorage portfolio so Continuous Credit Protection picks it up immediately
      try {
        const stored = localStorage.getItem("chaanbean_credit_portfolio");
        const portfolio = stored ? JSON.parse(stored) : [];
        portfolio.unshift({
          id: `acc_${Date.now()}`,
          customer: companyName,
          creditLimit: parsedAmount * 1.2,
          outstanding: parsedAmount,
          dueDate: dueDateStr,
          daysToDue: termsDays,
          daysOverdue: 0,
          risk: "Low Risk",
          collectionStatus: "Current / Monitored",
          nextAction: "Continuous Protection Active",
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem("chaanbean_credit_portfolio", JSON.stringify(portfolio));
      } catch {}

      setIsConfirmed(true);
      setTimeout(() => {
        setIsConfirmed(false);
        onSuccess({
          companyName,
          amount: parsedAmount,
          termsDays,
          dueDate: dueDateStr,
          invoiceRef,
        });
        onClose();
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Give Credit & Activate Protection
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Section 12 Flow
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enroll {companyName} into Continuous Credit Protection
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

        {/* Confirmation Screen */}
        {isConfirmed ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">
              Credit Recorded Successfully!
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
              “Credit recorded. Let ChaanBean help you protect it until payment.”
            </p>
            <span className="inline-block text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Added to Continuous Credit Protection
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Target Debtor Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Target Debtor</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{companyName}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">GSTIN / PAN</span>
                <p className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                  {gstin || pan || "Registered Entity"}
                </p>
              </div>
            </div>

            {/* Credit Amount & Invoice Ref */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Exposure Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    required
                    placeholder="e.g. 5000000"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice / PO Reference
                </label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="e.g. PO-2026-9912"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
                />
              </div>
            </div>

            {/* Payment Terms & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Terms (Days)
                </label>
                <select
                  value={termsDays}
                  onChange={(e) => setTermsDays(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
                >
                  <option value={15}>15 Days (Short Cycle)</option>
                  <option value={30}>30 Days (Commercial Standard)</option>
                  <option value={45}>45 Days (MSMED Statutory Limit)</option>
                  <option value={60}>60 Days (Extended)</option>
                  <option value={90}>90 Days (Quarterly Terms)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Calculated Due Date
                </label>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{dueDateStr}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Internal Commercial Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add commercial agreement terms or buyer purchase order notes..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FC8019]"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
              >
                <ShieldCheck size={16} />
                <span>Record Credit & Activate Protection</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
