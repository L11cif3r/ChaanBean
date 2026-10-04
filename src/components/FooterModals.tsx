"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  BookOpen,
  FileText,
  HelpCircle,
  CheckCircle2,
  Users,
  Target,
  Compass,
  Clock,
  Scale,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export type ModalType =
  | "terms"
  | "privacy"
  | "manuals"
  | "blogs"
  | "about"
  | "faqs"
  | null;

interface FooterModalsProps {
  activeModal: ModalType;
  onClose: () => void;
}

const FAQ_LIST = [
  {
    question: "What is the MSME 45-day payment rule under Indian law?",
    answer:
      "Under Section 15 of the MSMED Act 2006 and Income Tax Section 43B(h), buyers must clear dues to MSME suppliers within the agreed credit period or within a statutory maximum of 45 days. If a buyer fails to pay within 45 days, they are legally liable to pay compound interest with monthly rests at three times the RBI Bank Rate, and the buyer cannot claim the unpaid invoice as a business tax deduction.",
  },
  {
    question: "How does ChaanBean verify whether a buyer is safe before I give credit?",
    answer:
      "ChaanBean audits multiple public and judicial registries in seconds: MCA21 corporate filings, GST return regularity, court litigations and cheque bounce dockets, and national commercial credit records. The platform synthesizes these into a simple Green, Amber, or Red safety badge along with an exact safe rupee credit limit recommendation.",
  },
  {
    question: "Will automated reminders damage my personal relationship with buyers?",
    answer:
      "No. ChaanBean's automated calls and WhatsApp reminders are crafted with courteous, professional language in Hindi, English, and regional Indian languages. They frame payment follow-ups around mutual statutory accounting and Section 43B(h) compliance, preserving healthy commercial relationships while ensuring timely receivables.",
  },
  {
    question: "How does the legal arbitration process work if a buyer refuses to pay?",
    answer:
      "When an invoice becomes persistently overdue, ChaanBean automatically builds an admissible digital evidence docket with your e-invoices, e-way bills, proof of delivery, and communication history. You can then issue statutory legal notices and submit claims to institutional MSMED Section 18 fast-track arbitration councils without spending months or heavy fees in traditional civil courts.",
  },
  {
    question: "How can I apply for the Business Loans and Invoice Financing on ChaanBean?",
    answer:
      "Registered ChaanBean clients can apply directly from their portal. Because your counterparty verifications and sales ledgers are already validated on our platform, our partner banks and NBFCs can disburse working capital and invoice advances within 24 to 48 hours with minimal documentation.",
  },
  {
    question: "Is my business, buyer, and ledger data secure and confidential?",
    answer:
      "Yes, absolutely. All client records are secured with bank-grade AES-256 encryption at rest and TLS 1.3 in transit, hosted on ISO 27001-certified Indian cloud infrastructure. We strictly abide by the Digital Personal Data Protection (DPDP) Act 2023 and never share or monetize your private ledger data.",
  },
];

export function FooterModals({ activeModal, onClose }: FooterModalsProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
              {activeModal === "about" && <Users size={18} />}
              {activeModal === "faqs" && <HelpCircle size={18} />}
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {activeModal === "terms" && "Terms and Conditions of Service"}
                {activeModal === "privacy" && "Privacy & Data Protection Policy"}
                {activeModal === "manuals" && "ChaanBean Customer User Manual"}
                {activeModal === "blogs" && "ChaanBean Trade Credit Insights & Blogs"}
                {activeModal === "about" && "About ChaanBean · Mission & Vision"}
                {activeModal === "faqs" && "Frequently Asked Questions (FAQs)"}
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
          {/* About Us Modal */}
          {activeModal === "about" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                  About ChaanBean
                </span>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Protecting India&apos;s MSMEs from Trade Credit Defaults
                </h4>
                <p>
                  Every month, thousands of manufacturers, suppliers, and distributors across India face severe working capital loss due to delayed payments and untraceable buyers. ChaanBean was created to give MSME business owners the same institutional-grade credit intelligence and recovery infrastructure used by large commercial banks.
                </p>
              </div>

              {/* Pillars */}
              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                    <ShieldCheck size={18} />
                  </div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">100% Statutory Verification</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                    Direct government records from MCA, GST, e-Courts, and Udyam to ensure you deal with authentic businesses.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                    <Clock size={18} />
                  </div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">45-Day Discipline</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                    Automated reminders and statutory notices under MSMED Act §15-18 ensure timely payment arrivals.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                    <Scale size={18} />
                  </div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">Lawful Resolution</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                    Automatic 3x RBI bank rate compound interest computation and legal arbitration backing.
                  </p>
                </div>
              </div>

              {/* Mission & Vision */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-[#FC8019]" />
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">Our Mission</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Zero Bad Debts for Every MSME. To eliminate trade credit defaults across Indian supply chains by arming businesses with upfront risk vetting, polite automated recovery, and legal enforcement without legal overhead.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <Compass size={18} className="text-[#FC8019]" />
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">Our Vision</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    A Disciplined Trade Economy. Building India&apos;s most trusted trade ecosystem where 45-day MSME statutory timelines are standard practice and honest entrepreneurs scale fearlessly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FAQs Modal */}
          {activeModal === "faqs" && (
            <div className="space-y-4">
              <div className="space-y-1 mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
                  Answers &amp; Clarity
                </span>
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Frequently Asked Questions
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Key answers regarding buyer risk verification, MSME 45-day statutory rules, and autonomous recovery.
                </p>
              </div>

              <div className="space-y-3">
                {FAQ_LIST.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 transition-all overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-slate-900 dark:text-white hover:text-[#FC8019] transition"
                      >
                        <span>{faq.question}</span>
                        <span className="ml-3 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 shrink-0">
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-700/60">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Terms Modal */}
          {activeModal === "terms" && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">1. Platform Scope & Purpose</h4>
              <p>
                ChaanBean is a statutory B2B counterparty due diligence, credit verification, and payment recovery platform for Indian enterprises. All services are strictly rendered in compliance with the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006.
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

          {/* Privacy Modal */}
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

          {/* User Manuals Modal */}
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

          {/* Blogs Modal */}
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
