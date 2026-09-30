"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, Wallet, ShieldCheck, LogOut, FileText, Clock, Sparkles, MessageSquarePlus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [walletBalance, setWalletBalance] = useState<number>(100000);
  const [daysRemaining, setDaysRemaining] = useState<number>(90);
  const [planName, setPlanName] = useState<string>("Retail Plan (Growth)");
  const [companyName, setCompanyName] = useState<string>("Alright Trade");

  const refreshWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      if (typeof data.walletBalance === "number") {
        setWalletBalance(data.walletBalance);
      }
      if (typeof data.daysRemaining === "number") {
        setDaysRemaining(data.daysRemaining);
      }
      if (data.companyName && data.companyName !== "Rival Zenith Logistics") {
        setCompanyName(data.companyName);
      }
      if (data.plan) {
        if (data.plan.startsWith("recharge")) {
          const amountStr = data.plan.replace("recharge_", "");
          setPlanName(`Pay & Use (${amountStr.toUpperCase()})`);
        } else if (data.plan.startsWith("alacarte")) {
          const map: Record<string, string> = {
            alacarte_3k: "À La Carte (3,000 Calls)",
            alacarte_8k: "À La Carte (8,000 Calls)",
            alacarte_14k: "À La Carte (14,000 Calls)",
            alacarte_19k: "À La Carte (19,000 Calls)",
          };
          setPlanName(map[data.plan] || "Universal À La Carte");
        } else if (data.plan === "enterprise") {
          setPlanName("Enterprise Plan");
        } else {
          setPlanName("Retail Plan (Growth)");
        }
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    refreshWallet();

    // Listen for real-time wallet deduction or credit updates
    const handleWalletUpdate = () => {
      refreshWallet();
    };

    window.addEventListener("chaanbean:wallet-updated", handleWalletUpdate);
    window.addEventListener("storage", handleWalletUpdate);

    return () => {
      window.removeEventListener("chaanbean:wallet-updated", handleWalletUpdate);
      window.removeEventListener("storage", handleWalletUpdate);
    };
  }, [refreshWallet]);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0D1322]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 text-sm text-slate-800 dark:text-slate-100 shrink-0 z-30">
      {/* Left: Active Organization / Tenant */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[140px] sm:max-w-[240px] md:max-w-none text-sm sm:text-base">
            {companyName}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
            <ShieldCheck size={13} />
            KYC Verified
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Quick Trigger: Ask ChaanBean AI Navigator */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("chaanbean:open-ask-ai"));
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-[#FC8019] hover:bg-[#FC8019] hover:text-white font-bold text-xs shadow-xs transition group"
          title="Ask ChaanBean AI Navigator"
        >
          <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
          <span className="hidden md:inline">Ask ChaanBean</span>
        </button>

        {/* Prominent Top Navigation Wallet Balance with Real-time Validity Indicator */}
        <Link
          href="/wallet"
          className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/15 dark:from-orange-500/20 dark:via-amber-500/15 dark:to-orange-500/20 border-2 border-orange-400/80 dark:border-orange-500/70 shadow-sm hover:shadow-md hover:shadow-orange-500/15 hover:border-[#FC8019] transition-all group shrink-0"
          title={`Wallet Balance: ₹${walletBalance.toLocaleString("en-IN")} · ${planName} (Valid for ${daysRemaining} days)`}
        >
          <div className="p-1.5 rounded-lg bg-[#FC8019] text-white shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
            <Wallet size={17} className="shrink-0 stroke-[2.5]" />
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans hidden sm:block">
              {t.walletBalance || "Wallet Balance"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-[#FC8019] dark:text-orange-400 font-mono tracking-tight">
                ₹{walletBalance.toLocaleString("en-IN")}
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200 font-sans font-bold">
                <Clock size={11} className="text-[#FC8019]" />
                {daysRemaining}d left
              </span>
            </div>
          </div>
        </Link>



        {/* Theme Switcher (Dark / Light Mode Icon) */}
        <ThemeToggle />

        {/* Global Feedback Trigger */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("chaanbean:open-feedback"));
            }
          }}
          className="p-2 rounded-xl text-slate-500 hover:text-[#FC8019] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Give Feedback & Feature Request"
        >
          <MessageSquarePlus size={16} />
        </button>

        {/* Language Switcher */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
          <Globe size={13} className="text-slate-500 dark:text-slate-400 ml-1.5" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "ml" | "ta")}
            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1 font-medium"
          >
            <option value="en" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">EN</option>
            <option value="hi" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">HI</option>
            <option value="ml" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">ML</option>
            <option value="ta" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">TA</option>
          </select>
        </div>

        {/* Sign Out / Logout */}
        <Link
          href="/login"
          onClick={() => {
            sessionStorage.removeItem("chaanbean_session_active");
            localStorage.removeItem("chaanbean_auth");
            localStorage.removeItem("chaanbean_subscription");
            document.cookie = "chaanbean_session=; path=/; max-age=0";
            document.cookie = "chaanbean_subscription=; path=/; max-age=0";
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/30 transition shadow-sm"
          title="Sign Out of Your Account"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Sign Out</span>
        </Link>
      </div>
    </header>
  );
}
