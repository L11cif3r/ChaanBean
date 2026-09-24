"use client";

import React from "react";
import type { ReportType, NormalizedReport } from "@/lib/verification-gateway/types";
import {
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Target,
  Sparkles,
  ExternalLink,
  Coins,
  Info,
} from "lucide-react";

export interface FeatureBlockCardProps {
  feature: {
    key: string;
    num: number;
    label: string;
    shortLabel: string;
    reportTypes: ReportType[];
    category: "Corporate & Identity" | "Tax & GST" | "Judicial & Legal" | "Recovery & Governance";
    statute?: string;
    description: string;
    purpose: string;
    useCase?: string;
    capabilities?: string[];
    cost: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  };
  hasCachedReport: boolean;
  cost: number;
  searchQuery?: string;
  onOpenRunner: () => void;
  onViewDossier?: () => void;
}

export function FeatureBlockCard({
  feature,
  hasCachedReport,
  cost,
  searchQuery = "",
  onOpenRunner,
  onViewDossier,
}: FeatureBlockCardProps) {
  const Icon = feature.icon;

  // Visual styling accents based on category
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "Tax & GST":
        return {
          pill: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
          iconBg: "bg-orange-100/70 dark:bg-orange-500/20 text-[#FC8019]",
          borderHover: "hover:border-orange-400/80 dark:hover:border-orange-500/60",
          glow: "group-hover:shadow-orange-500/10",
        };
      case "Judicial & Legal":
        return {
          pill: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
          iconBg: "bg-rose-100/70 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
          borderHover: "hover:border-rose-400/80 dark:hover:border-rose-500/60",
          glow: "group-hover:shadow-rose-500/10",
        };
      case "Recovery & Governance":
        return {
          pill: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
          iconBg: "bg-emerald-100/70 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          borderHover: "hover:border-emerald-400/80 dark:hover:border-emerald-500/60",
          glow: "group-hover:shadow-emerald-500/10",
        };
      case "Corporate & Identity":
      default:
        return {
          pill: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
          iconBg: "bg-blue-100/70 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
          borderHover: "hover:border-blue-400/80 dark:hover:border-blue-500/60",
          glow: "group-hover:shadow-blue-500/10",
        };
    }
  };

  const styles = getCategoryStyles(feature.category);

  // Helper to highlight matched query in text
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 text-slate-900 dark:text-amber-100 rounded px-1 py-0.2 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const isMatchedInPurpose =
    searchQuery.trim().length > 1 &&
    (feature.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (feature.useCase && feature.useCase.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-xl transition-all duration-200 ${styles.borderHover} ${styles.glow}`}
    >
      {/* Top Strip: Number, Category & Fee */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
              #{feature.num < 10 ? `0${feature.num}` : feature.num}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${styles.pill}`}
            >
              {feature.category}
            </span>
          </div>

        </div>

        {/* Feature Title and Primary Icon */}
        <div className="flex items-start gap-3.5 pt-1">
          <div className={`p-3 rounded-xl border border-transparent shrink-0 ${styles.iconBg}`}>
            <Icon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="mca-company-title font-bold text-base text-slate-900 dark:text-white tracking-tight leading-snug">
                {renderHighlightedText(feature.label, searchQuery)}
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
                  <p className="font-sans font-normal text-slate-200">{feature.purpose}</p>
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
                {renderHighlightedText(feature.statute, searchQuery)}
              </span>
            )}
          </div>
        </div>

        {/* Capabilities Chips */}
        {feature.capabilities && feature.capabilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {feature.capabilities.map((cap, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400 font-medium font-mono"
              >
                {renderHighlightedText(cap, searchQuery)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        {hasCachedReport ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium font-mono">
              <CheckCircle2 size={14} />
              <span>Verified Report (₹0)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onViewDossier || onOpenRunner}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                <span>View Dossier</span>
                <ExternalLink size={12} />
              </button>
              <button
                type="button"
                onClick={onOpenRunner}
                title="Re-run verification check"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 text-xs font-medium transition"
              >
                Re-run
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-[11px] text-slate-400 font-mono">
              Cached: 30 days
            </span>

            <button
              type="button"
              onClick={onOpenRunner}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-chaan-brand hover:bg-chaan-brandDark text-white text-xs font-bold transition shadow-md shadow-orange-500/20 group-hover:translate-x-0.5"
            >
              <span>Launch Check</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
