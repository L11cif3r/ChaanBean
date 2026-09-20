"use client";

import React, { useState } from "react";
import {
  X,
  Info,
  Activity,
  Send,
  Volume2,
  FileText,
  Gavel,
  ShieldCheck,
  AlertTriangle,
  Radio,
  FileCheck2,
  Clock,
  Landmark,
  Scale,
  CheckCircle2,
} from "lucide-react";

interface HowPaymentRecoveryWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowPaymentRecoveryWorksModal({
  isOpen,
  onClose,
}: HowPaymentRecoveryWorksModalProps) {
  const [activeTab, setActiveTab] = useState<"stages" | "compliance" | "invoice_guard">("stages");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019] shrink-0">
              <Info size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#FC8019] bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded">
                  Architecture &amp; Legal Framework
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight">
                How Automated Payment Recovery Hub Works
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deterministic policy execution, statutory invoice safeguards, and automated regulatory reporting
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab("stages")}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === "stages"
                ? "border-[#FC8019] text-[#FC8019]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Activity size={14} />
            <span>4-Stage Escalation Ladder</span>
          </button>

          <button
            onClick={() => setActiveTab("invoice_guard")}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === "invoice_guard"
                ? "border-[#FC8019] text-[#FC8019]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck2 size={14} />
            <span>Invoice Matching &amp; Auto-Stop Guard</span>
          </button>

          <button
            onClick={() => setActiveTab("compliance")}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === "compliance"
                ? "border-[#FC8019] text-[#FC8019]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Statutory Compliance &amp; TRAI Guidelines</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: 4-STAGE ESCALATION LADDER */}
          {activeTab === "stages" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                The platform automates debtor follow-up through an escalating 4-stage policy progression designed to maximize collection recovery while maintaining strict statutory compliance under the MSMED Act, 2006.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Stage 1 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2 py-0.5 text-[10px] font-mono font-bold">
                      STAGE 1 · DAYS 1–15
                    </span>
                    <Send size={14} className="text-sky-500" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">L1 Polite Reminders</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Automated multi-channel statements via WhatsApp and verified email. Debtor receives a friendly reminder with a 1-click payment link (UPI, NEFT, RTGS) with zero penal interest charged.
                  </p>
                </div>

                {/* Stage 2 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-mono font-bold">
                      STAGE 2 · DAYS 16–30
                    </span>
                    <Volume2 size={14} className="text-amber-500" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">L2 Firm Voice Engagement</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Automated outbound telephony powered by Asterisk PBX and Vobiz SIP trunks. Calls are dispatched in debtor&apos;s native dialect (English, Hindi, Malayalam, Tamil, Tulu, etc.) requesting a firm Promise-to-Pay (PTP) date. <strong>Calls are billed at ₹1 per call</strong>, deducted directly from your subscription plan wallet <strong>only if the call is picked up</strong> (unanswered calls are ₹0).
                  </p>
                </div>

                {/* Stage 3 */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-[10px] font-mono font-bold">
                      STAGE 3 · DAYS 31–45
                    </span>
                    <FileText size={14} className="text-rose-500" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">L3 Statutory Demand Notices</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Official demand notices referencing Section 43B(h) of Income Tax Act, Section 16(4) / DRC-01A of GST Act, and Section 138 of Negotiable Instruments Act with official Government Reference Numbers.
                  </p>
                </div>

                {/* Stage 4 */}
                <div className="rounded-xl border border-[#FC8019]/40 bg-orange-50/40 dark:bg-orange-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-orange-100 dark:bg-[#FC8019]/20 text-[#FC8019] border border-orange-300 dark:border-[#FC8019]/40 px-2 py-0.5 text-[10px] font-mono font-bold">
                      STAGE 4 · DAYS 45+
                    </span>
                    <Gavel size={14} className="text-[#FC8019]" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">Institutional Arbitration</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Automatic escalation to dispute arbitration under MSMED Act §18. Computes compound interest at 3× RBI Bank Rate and prepares an enforceable Aadhaar e-Signed arbitral award docket.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICE MATCHING & AUTO-STOP GUARD */}
          {activeTab === "invoice_guard" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                  <AlertTriangle size={16} />
                  <span>Statutory Guard: Automatic System Stop on Invalid Invoice</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  Under the Indian Negotiable Instruments Act and commercial debt recovery jurisprudence, no automated collection action or outbound calls can be initiated without authenticating the underlying commercial consideration.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                  How Invoice Matching Works:
                </h4>
                <ul className="space-y-2.5 list-disc pl-5 leading-relaxed">
                  <li>
                    <strong>Document Verification:</strong> The uploaded bill or invoice copy (.pdf, .jpg, .png) is cryptographically processed to match:
                    <span className="block mt-1 pl-2 text-slate-700 dark:text-slate-200 font-mono text-[11px]">
                      • Debtor&apos;s Company Trade Name<br />
                      • Debtor&apos;s 15-Digit GSTIN &amp; PAN<br />
                      • Exact Total Amount Due (Minimum ₹5,000)
                    </span>
                  </li>
                  <li>
                    <strong>Automatic Fail-Safe Stop:</strong> If the uploaded bill is missing, unreadable, or mismatches the debtor details, the recovery engine automatically halts:
                    <span className="block mt-1 pl-2 text-rose-600 dark:text-rose-400 font-semibold">
                      Outbound calls, automated SMS messages, and statutory legal notices are blocked until a matching invoice is verified.
                    </span>
                  </li>
                  <li>
                    <strong>Immunity &amp; Compliance Protection:</strong> Prevents false collection claims and shields your organization against counter-litigation under Section 503 IPC and consumer harassment rules.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: STATUTORY COMPLIANCE & TRAI */}
          {activeTab === "compliance" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white font-mono">
                    <Radio size={14} className="text-emerald-500" />
                    <span>TRAI Voice Calling Window</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Automated voice calls are strictly restricted to <strong>09:00 to 18:00 IST</strong> in accordance with Telecom Regulatory Authority of India (TRAI) commercial communications regulations.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white font-mono">
                    <Scale size={14} className="text-amber-500" />
                    <span>MSMED Act §16 Compound Interest</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Statutory interest is computed monthly with compounded rests at three times the RBI Bank Rate (currently <strong>20.25% per annum</strong>) for delayed MSME payments.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white font-mono">
                    <ShieldCheck size={14} className="text-sky-500" />
                    <span>BSA 2023 §63 Certificate</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Every call recording, transcript, WhatsApp delivery receipt, and notice transmission is hashed with SHA-256 for admissible electronic evidence under Section 63 of Bharatiya Sakshya Adhiniyam, 2023.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white font-mono">
                    <Landmark size={14} className="text-purple-500" />
                    <span>Income Tax §43B(h) &amp; GST DRC-01A</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Unpaid MSME balances after 45 days cannot be claimed as tax-deductible expenses by the buyer and trigger input tax credit (ITC) scrutiny under Form DRC-01A.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Fully compliant with Indian Commercial Recovery Regulations</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
          >
            Got It, Close
          </button>
        </div>
      </div>
    </div>
  );
}
