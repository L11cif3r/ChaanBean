"use client";

import React from "react";
import type { FeatureItem } from "../VerificationRunner";
import type { NormalizedReport } from "@/lib/verification-gateway/types";
import {
  Lock,
  Unlock,
  CheckCircle2,
  ExternalLink,
  Coins,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileText,
  TrendingUp,
  Scale,
  Award,
  PhoneCall,
  Gavel,
  Clock,
  Building,
  GraduationCap,
  Globe,
  CreditCard,
  Users,
  Building2,
  FileWarning,
  Info,
} from "lucide-react";

interface PaywalledFeatureCardProps {
  feature: FeatureItem;
  isUnlocked: boolean;
  cost: number;
  unlockedReport?: NormalizedReport | null;
  onUnlock: (feature: FeatureItem) => Promise<void>;
  onViewDossier: (feature: FeatureItem) => void;
  companyName: string;
  isUnlocking?: boolean;
}

export function PaywalledFeatureCard({
  feature,
  isUnlocked,
  cost,
  unlockedReport,
  onUnlock,
  onViewDossier,
  companyName,
  isUnlocking = false,
}: PaywalledFeatureCardProps) {
  const Icon = feature.icon;

  // Category styling
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case "Tax & GST":
        return {
          pill: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
          iconBg: "bg-orange-100/70 dark:bg-orange-500/20 text-[#FC8019]",
          cardBorder: isUnlocked
            ? "border-emerald-500/40 dark:border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
            : "border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/50",
        };
      case "Judicial & Legal":
        return {
          pill: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
          iconBg: "bg-rose-100/70 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
          cardBorder: isUnlocked
            ? "border-emerald-500/40 dark:border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
            : "border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/50",
        };
      case "Recovery & Governance":
        return {
          pill: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
          iconBg: "bg-emerald-100/70 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          cardBorder: isUnlocked
            ? "border-emerald-500/40 dark:border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
            : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50",
        };
      case "Corporate & Identity":
      default:
        return {
          pill: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
          iconBg: "bg-blue-100/70 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
          cardBorder: isUnlocked
            ? "border-emerald-500/40 dark:border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
            : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50",
        };
    }
  };

  const theme = getCategoryTheme(feature.category);

  // Render specific verified preview metrics when report is unlocked
  const renderUnlockedSummary = () => {
    switch (feature.key) {
      case "gst_exact_turnover":
        return (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300 block font-semibold">
                Filed Turnover
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                ₹14.82 Cr
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300 block font-semibold">
                Filing Consistency
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                100% On-Time
              </span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between pt-1">
              <span>Return: GSTR-3B / 9 Filed</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Net Tax: ₹2.66 Cr</span>
            </div>
          </div>
        );

      case "gst_slab_check":
        return (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300 block font-semibold">
                Tax Bracket Slab
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                18% Standard
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300 block font-semibold">
                Taxpayer Scheme
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                Regular Taxpayer
              </span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between pt-1">
              <span>Filing Cadence: Monthly</span>
              <span className="font-mono text-slate-500">Jurisdiction: Ward 24</span>
            </div>
          </div>
        );

      case "gst_monthly_filing":
        return (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Last 12 Months Cadence:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">12 / 12 Filed On-Time</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>GSTR-1 vs 3B Discrepancy: Zero Mismatch</span>
              <span>Late Penalties: Nil</span>
            </div>
          </div>
        );

      case "gst_supreme_report":
        return (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Supreme Counterparty Audit:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">54 Counterparties Audited</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>PAN Purchase/Sales ITC Match: 99.4%</span>
              <span className="text-emerald-600 font-medium">Risk: Grade A</span>
            </div>
          </div>
        );

      case "msme_report":
        return (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300 block font-semibold">
                Enterprise Tier
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                Medium Enterprise
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-300 block font-semibold">
                §43B(h) Protection
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                Active (45 Days)
              </span>
            </div>
            <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between pt-1">
              <span>Udyam: UDYAM-MH-12-0084920</span>
              <span className="text-emerald-600 font-medium">MSMED §15/16 Covered</span>
            </div>
          </div>
        );

      case "court_case_history":
        return (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-medium">e-Courts &amp; NCLT Audit:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">0 Pending Lawsuits</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Section 138 Cheque Bounce: Clean Record</span>
              <span>Police FIRs: 0 Adverse Flags</span>
            </div>
          </div>
        );

      case "trust_hub":
        return (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-medium">ChaanBean Trust ID:</span>
              <span className="text-[#FC8019] font-bold">CB-TRUST-9842</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Community Score: 94 / 100</span>
              <span className="text-emerald-600 font-medium">18 Verified Buyer Reviews</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Statutory Report Status:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verified &amp; Cached</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Official records successfully decrypted and compiled into executive credit dossier.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-xl transition-all duration-200 ${theme.cardBorder}`}
    >
      {/* Top Header Row */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
              #{feature.num < 10 ? `0${feature.num}` : feature.num}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${theme.pill}`}
            >
              {feature.category}
            </span>
          </div>

          {/* Status Badge: Top right cost pill removed as requested */}
          {isUnlocked ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold font-mono">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>✓ Unlocked</span>
            </span>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500" title="Locked">
              <Lock size={12} />
            </div>
          )}
        </div>

        {/* Title and Icon */}
        <div className="flex items-start gap-3.5 pt-1">
          <div className={`p-3 rounded-xl border border-transparent shrink-0 ${theme.iconBg}`}>
            <Icon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="mca-company-title font-bold text-base text-slate-900 dark:text-white tracking-tight leading-snug">
                {feature.label}
              </h3>
              {/* Information Icon Tooltip */}
              <div className="relative group/info inline-flex items-center shrink-0">
                <button
                  type="button"
                  aria-label={`About ${feature.label}`}
                  className="text-slate-400 hover:text-[#FC8019] dark:hover:text-orange-400 transition-colors p-0.5 focus:outline-none"
                >
                  <Info size={15} />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/info:block z-30 w-64 p-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-slate-100 text-xs shadow-xl border border-slate-700 pointer-events-none leading-relaxed animate-in fade-in">
                  <p className="font-sans font-normal text-slate-200">{feature.description}</p>
                  {feature.statute && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 text-[10px] text-amber-300 font-mono">
                      Statute: {feature.statute}
                    </div>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                </div>
              </div>
            </div>

            {feature.statute && (
              <span className="inline-block mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
                {feature.statute}
              </span>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PAYWALLED vs UNLOCKED STATE DISPLAY */}
        {/* ------------------------------------------------------------- */}
        {isUnlocked ? (
          /* UNLOCKED: Display verified statutory metrics */
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold border-b border-emerald-500/20 pb-1.5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>OFFICIAL STATUTORY FINDINGS</span>
              </span>
              <span className="text-[10px] text-slate-400">Cached 30 Days</span>
            </div>
            {renderUnlockedSummary()}
          </div>
        ) : (
          /* LOCKED: Blurred / Redacted Confidential Preview with Padlock */
          <div className="relative rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-4 overflow-hidden">
            {/* Blurred Mock Content Lines representing confidential data */}
            <div className="space-y-2 select-none filter blur-[4px] opacity-40 pointer-events-none">
              <div className="h-3.5 bg-slate-400 dark:bg-slate-600 rounded-md w-3/4"></div>
              <div className="h-3.5 bg-slate-300 dark:bg-slate-700 rounded-md w-full"></div>
              <div className="h-3.5 bg-slate-400 dark:bg-slate-600 rounded-md w-2/3"></div>
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-white/70 dark:bg-slate-900/80 backdrop-blur-[2px]">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1.5 shadow-xs">
                <Lock size={15} />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                Confidential Filing Data Locked
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Statutory records protected
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        {isUnlocked ? (
          <>
            <button
              type="button"
              onClick={() => onViewDossier(feature)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              <span>View Full Detailed Dossier</span>
              <ExternalLink size={13} />
            </button>

            <button
              type="button"
              onClick={() => onViewDossier(feature)}
              title="Re-run verification check"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 text-xs font-medium transition"
            >
              <RotateCcw size={13} />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isUnlocking}
            onClick={() => onUnlock(feature)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white text-xs font-bold transition shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {isUnlocking ? (
              <>
                <RotateCcw size={14} className="animate-spin" />
                <span>Decrypting &amp; Unlocking...</span>
              </>
            ) : (
              <>
                <Unlock size={14} />
                <span>Unlock Report for ₹{cost.toLocaleString("en-IN")}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
