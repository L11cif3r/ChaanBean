"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, Wallet, ShieldCheck, RotateCcw, LogOut } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [walletBalance, setWalletBalance] = useState<number>(285000);
  const [companyName, setCompanyName] = useState<string>("Acme Traders Pvt Ltd");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0D1322]/95 backdrop-blur-md px-6 flex items-center justify-between gap-4 text-sm text-slate-800 dark:text-slate-100 shrink-0 z-30">
      {/* Left: Organization & KYC Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-white tracking-tight">{companyName}</span>
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
            <ShieldCheck size={11} />
            KYC Verified
          </span>
        </div>
      </div>

      {/* Center: Prominent Global Database Search Bar */}
      <div className="flex-1 max-w-xl mx-4">
        <GlobalSearch />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Wallet Balance Pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-xs font-mono shadow-sm"
          title="Pre-funded Verification & Call Ledger Balance"
        >
          <Wallet size={14} className="text-[#FC8019]" />
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">{t.walletBalance}:</span>
          <span className="font-bold text-[#FC8019]">₹{walletBalance.toLocaleString("en-IN")}</span>
        </div>

        {/* System Health Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>11 Gateways Live</span>
        </div>

        {/* Theme Switcher (Dark / Light Mode Icon) */}
        <ThemeToggle />

        {/* Language Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
          <Globe size={13} className="text-slate-500 dark:text-slate-400 ml-1.5" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "ml" | "ta")}
            className="bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-1 font-medium"
          >
            <option value="en" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">English (EN)</option>
            <option value="hi" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">हिंदी (HI)</option>
            <option value="ml" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">മലയാളം (ML)</option>
            <option value="ta" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">தமிழ் (TA)</option>
          </select>
        </div>

        {/* Replay Animated Intro */}
        <Link
          href="/intro"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:border-[#FC8019]/60 hover:text-[#FC8019] transition"
          title="Watch ChaanBean Animated Intro"
        >
          <RotateCcw size={13} />
          <span className="hidden xl:inline">Intro</span>
        </Link>

        {/* Portal Login / Switch */}
        <Link
          href="/login"
          onClick={() => {
            sessionStorage.removeItem("chaanbean_session_active");
            localStorage.removeItem("chaanbean_auth");
            document.cookie = "chaanbean_session=; path=/; max-age=0";
          }}
          className="flex items-center gap-1.5 rounded-lg border border-[#FC8019]/40 bg-orange-50 dark:bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-[#FC8019] hover:bg-orange-100 dark:hover:bg-orange-500/25 transition shadow-sm"
          title="Switch User or Admin Account"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Auth</span>
        </Link>
      </div>
    </header>
  );
}
