"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
  UserCheck,
  Briefcase,
  Building2,
  FileCheck2,
  Scale,
  CreditCard,
  TrendingUp,
  Globe2,
  PhoneCall,
  CheckCircle2,
  Award,
} from "lucide-react";
import { TrustIdRegistrationModal } from "./TrustIdRegistrationModal";

interface BusinessVerificationViewProps {
  onVerifiedSuccess?: (trustId: string) => void;
}

export function BusinessVerificationView({ onVerifiedSuccess }: BusinessVerificationViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"proprietorship" | "partnership" | "company">("company");

  const openWizardWithTier = (type: "proprietorship" | "partnership" | "company") => {
    setSelectedType(type);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb / Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Business Verification (Trust ID)</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralised statutory business verification and automated Trust ID credentialing
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition"
        >
          <Zap size={14} />
          <span>Start Verification Process</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 lg:p-8 space-y-8 shadow-xl">
        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-400">
            <ShieldCheck size={14} />
            <span>TrustHub — Centralised Business Verification</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Complete KYC verification for your business in one place
          </h1>
          <p className="text-xs lg:text-sm text-slate-400">
            Fast-track your credibility across India&apos;s B2B supply chains with automated GSTIN, MCA21, and community audit checks.
          </p>
        </div>

        {/* Quick Start Action Card */}
        <div className="rounded-xl border border-emerald-800/50 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold font-mono">
                  Quick Start
                </span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  Instant 3-Min Process
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-0.5">
                Begin your business verification today
              </h3>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md transition"
          >
            <span>Start Verification Process</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Explanatory Notice */}
        <div className="flex items-start gap-3 rounded-xl border border-sky-800/40 bg-sky-950/20 p-4 text-xs text-sky-200">
          <Lock size={16} className="text-sky-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Our comprehensive verification system will collect and verify your business information through trusted data sources
            (GSTN, Ministry of Corporate Affairs, e-Courts, MSME Udyam, and NPCI). The process is secure, automated, and requires minimal documentation.
          </p>
        </div>

        {/* Section: Supported Business Types */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-emerald-400" />
              <span>Supported Business Types</span>
            </h3>
            <span className="text-xs text-slate-400">Select structure to initiate</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Proprietorship */}
            <div
              onClick={() => openWizardWithTier("proprietorship")}
              className="cursor-pointer group rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-500 hover:bg-emerald-950/10 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                    <UserCheck size={18} />
                  </div>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-medium">
                    Individual
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  Proprietorship
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Individual business owner verification via PAN, Aadhaar OTP & GSTIN.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Price:</span>
                <span className="text-sm font-mono font-bold text-emerald-400">₹ 1,000</span>
              </div>
            </div>

            {/* Partnership Firm */}
            <div
              onClick={() => openWizardWithTier("partnership")}
              className="cursor-pointer group rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-500 hover:bg-emerald-950/10 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                    <Briefcase size={18} />
                  </div>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 font-medium">
                    Partners
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  Partnership Firm
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  All partners verification included with partnership deed validation.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Price:</span>
                <span className="text-sm font-mono font-bold text-emerald-400">₹ 1,500</span>
              </div>
            </div>

            {/* Company / LLP */}
            <div
              onClick={() => openWizardWithTier("company")}
              className="cursor-pointer group rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-5 hover:border-emerald-400 hover:bg-emerald-950/30 transition flex flex-col justify-between ring-1 ring-emerald-500/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Building2 size={18} />
                  </div>
                  <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300 font-bold border border-emerald-800">
                    Recommended
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  Company / LLP
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  Corporate entity verification with automated MCA21 ROC & DIN audit.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Price:</span>
                <span className="text-sm font-mono font-bold text-emerald-400">₹ 2,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: What We'll Verify */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>What We&apos;ll Verify</span>
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <FileCheck2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">GST Profile & Turnover</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Complete GST registration, return filing consistency (GSTR-3B), and annualized turnover estimation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <UserCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Director / Partner Details</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Background verification of key managerial personnel, DIN active status, and cross-company directorships.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <Award size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">MSME Registration</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Small business certification status under MSMED Act 2006 for statutory 45-day payment protections.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <CreditCard size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Payment Critical Dues Check</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Checks for any historical payment critical dues, undisputed defaults, or peer alerts across the network.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <TrendingUp size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Payment Behavior</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Financial credibility assessment, commercial tenor adherence, and trade credit settlement track record.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <Scale size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Legal & Court Compliance</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automated scan of court cases, e-Courts litigation, NCLT insolvency proceedings, and regulatory alerts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 sm:col-span-2">
              <Globe2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Import-Export Profile & Transactions</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  International trade verification with DGFT IEC status, customs clearance standing, and foreign exchange compliance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section: What You'll Need */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <PhoneCall size={16} className="text-emerald-400" />
            <span>What You&apos;ll Need</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200">Basic Information</h4>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li>PAN Number (Entity or Proprietor)</li>
                <li>GST Registration Number (GSTIN)</li>
                <li>Phone Number for OTP verification</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200">Additional Details</h4>
              <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                <li>Partner / Director Name, PAN number & Phone numbers</li>
                <li>CIN Number (for companies / LLPs)</li>
                <li>Statutory Consent for data verification</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section: Simple 3-Step Process */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Simple 3-Step Process</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center space-y-2">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                1
              </div>
              <h4 className="text-xs font-bold text-white">Select Business Type</h4>
              <p className="text-[11px] text-slate-400">Choose your business structure</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center space-y-2">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                2
              </div>
              <h4 className="text-xs font-bold text-white">Provide Details</h4>
              <p className="text-[11px] text-slate-400">Enter PAN, GST & phone numbers</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center space-y-2">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                3
              </div>
              <h4 className="text-xs font-bold text-white">Get Verified</h4>
              <p className="text-[11px] text-slate-400">Receive your Trust ID instantly</p>
            </div>
          </div>
        </div>

        {/* Bottom Banner & Action */}
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-300 font-medium">
            <Lock size={14} className="text-emerald-400" />
            <span>Secure & Compliant — Bank-grade encryption with data protection compliance</span>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-950/50 hover:bg-emerald-500 transition"
          >
            <span>Start Verification Process</span>
            <ArrowRight size={16} />
          </button>

          <p className="text-[11px] text-slate-400">
            Secure, automated, and compliant with Indian statutory and data protection regulations.
          </p>
        </div>
      </div>

      {/* Registration Wizard Modal */}
      <TrustIdRegistrationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialBusinessType={selectedType}
        onSuccess={(id) => {
          if (onVerifiedSuccess) onVerifiedSuccess(id);
        }}
      />
    </div>
  );
}
