"use client";

import React from "react";
import { X, ShieldCheck, BookOpen, FileText, HelpCircle, CheckCircle2 } from "lucide-react";

export type ModalType = "terms" | "privacy" | "manuals" | "blogs" | null;

interface FooterModalsProps {
  activeModal: ModalType;
  onClose: () => void;
}

export function FooterModals({ activeModal, onClose }: FooterModalsProps) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center">
              {activeModal === "terms" && <FileText size={18} />}
              {activeModal === "privacy" && <ShieldCheck size={18} />}
              {activeModal === "manuals" && <BookOpen size={18} />}
              {activeModal === "blogs" && <BookOpen size={18} />}
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {activeModal === "terms" && "Terms and Conditions of Service"}
                {activeModal === "privacy" && "Privacy & Data Protection Policy"}
                {activeModal === "manuals" && "ChaanBean Customer User Manual"}
                {activeModal === "blogs" && "ChaanBean Trade Credit Insights & Blogs"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official ChaanBean OS Regulatory Document · Effective 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          {activeModal === "terms" && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">1. Platform Scope & Purpose</h4>
              <p>
                ChaanBean provides autonomous trade credit underwriting, debtor verification, automated communication cadences, and statutory dispute documentation. All services are strictly rendered in compliance with the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006.
              </p>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">2. Customer Representations & Invoice Legitimacy</h4>
              <p>
                The Customer affirms that all ledger data, invoices, and delivery notes uploaded to the platform represent genuine commercial transactions. ChaanBean reserves the right to suspend accounts submitting fraudulent documents.
              </p>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">3. Statutory Compound Interest Computation</h4>
              <p>
                All penal interest calculations are computed strictly under Section 16 of the MSMED Act at three times the Reserve Bank of India (RBI) bank rate, compounded monthly.
              </p>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">4. Telephony & Communications Cadence</h4>
              <p>
                Automated calls and reminder notices initiated through the platform adhere to standard commercial recovery hours (9:00 AM to 7:00 PM IST) and TRAI guidelines.
              </p>
            </div>
          )}

          {activeModal === "privacy" && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">1. Data Ownership & Confidentiality</h4>
              <p>
                Your customer ledgers, counterparty details, and trade documentation remain 100% your proprietary property. ChaanBean never sells, leases, or trades commercial debt records to third-party marketing brokers.
              </p>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">2. Statutory Verification Inquiries</h4>
              <p>
                Inquiries performed via MCA21, GSTIN, e-Courts, and CCTNS gateways are query-based lookups grounded in authoritative public databases for risk underwriting.
              </p>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">3. Encryption & Audit Seals</h4>
              <p>
                All uploaded documents, evidence packs, and call audio recordings are cryptographically secured with SHA-256 tamper-evident digital seals and encrypted in transit and at rest.
              </p>
            </div>
          )}

          {activeModal === "manuals" && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Quickstart Step-by-Step Guide for MSME Business Owners</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="h-6 w-6 rounded-full bg-[#FC8019] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Create Your Business Profile</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Enter your business GSTIN or PAN to automatically configure your statutory MSME dashboard.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="h-6 w-6 rounded-full bg-[#FC8019] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Run Buyer Credit Check</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Before dispatching goods, search any counterparty CIN or name to review active litigation and court cases.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="h-6 w-6 rounded-full bg-[#FC8019] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Activate Automated Payment Recovery</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Upload overdue invoices. The system automatically schedules polite calls, WhatsApp payment links, and 45-day tax notices.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="h-6 w-6 rounded-full bg-[#FC8019] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">Generate MSME §18 Legal Docket</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">If payment is still delayed, download the auto-computed 3x compound interest legal notice ready for MSME Samadhaan arbitration.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModal === "blogs" && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Latest Industry Blogs &amp; Legal Updates</h4>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#FC8019]">Tax &amp; Compliance Guide</span>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                    Income Tax Section 43B(h): Why Big Buyers Must Pay MSMEs within 45 Days
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Learn how Section 43B(h) disallows tax deductions for delayed payments, giving MSMEs powerful leverage to recover receivables.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#FC8019]">Credit Underwriting</span>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                    5 Warning Signs That Your Counterparty is About to Default
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    How checking GST filing delays and e-Court litigation history helps manufacturers spot bad debt months in advance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#FC8019]">Legal Recovery</span>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                    How MSMED Act Section 18 Arbitration Outperforms Regular Civil Suits
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Fast-track statutory conciliation resolves overdue commercial disputes in under 90 days with 3x RBI bank rate compound interest.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">ChaanBean Credit OS · India</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#FC8019] text-white font-bold text-xs hover:bg-[#E26D0A] transition"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
}
