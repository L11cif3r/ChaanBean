"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Shield,
  Users,
  Search,
  Phone,
  Scale,
  Settings,
  UserCircle,
  ExternalLink,
  AlertTriangle,
  FileCheck2,
  RotateCcw,
  LogOut,
  Building2,
  BarChart3,
  FileSearch,
  UserSearch,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";


export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname.startsWith("/admin") || pathname === "/intro" || pathname === "/login") {
    return null;
  }

  const coreNav = [
    { href: "/", label: t.dashboard, icon: LayoutDashboard },
    { href: "/debtors", label: t.debtors, icon: UserCircle, badge: "Portfolio" },
    { href: "/background-check", label: t.backgroundCheck, icon: Search, badge: "11 APIs" },
    { href: "/payment-recovery", label: t.paymentRecovery, icon: Phone, badge: "Voice AI" },
    { href: "/arbitration", label: t.arbitrationCenter, icon: Scale, badge: "MSME §18" },
  ];

  const networkNav = [
    { href: "/find-someone", label: "Find Someone", icon: UserSearch, badge: "Highlight" },
    { href: "/trust-hub", label: t.trustHub, icon: Shield, badge: "Network" },
    { href: "/vendors", label: t.vendors, icon: Users, badge: "KYC" },
  ];

  const settingsNav = [
    { href: "/settings", label: t.settings, icon: Settings },
  ];

  const financialIntelNav = [
    { href: "/business-check", label: "Business Check", icon: Building2, badge: "NEW" },
    { href: "/business-check?filter=risk", label: "Risk Reports", icon: BarChart3 },
    { href: "/business-check?filter=docs", label: "Documents", icon: FileSearch },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] text-slate-800 dark:text-slate-100 shrink-0">
      {/* Brand Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-12 shrink-0 group-hover:scale-105 transition-transform">
            <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Chaan<span className="text-[#FC8019]">Bean</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wide">CREDIT & RECOVERY OS</p>
          </div>
        </Link>
      </div>

      {/* Nav Categories */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto font-sans">
        {/* Section 1: Core Engines */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5 font-semibold">
            Core Workflows
          </span>
          <div className="space-y-1">
            {coreNav.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs transition-all duration-150",
                    isActive
                      ? "bg-orange-50 dark:bg-orange-500/15 text-[#FC8019] border border-[#FC8019]/30 font-semibold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-orange-50/70 dark:hover:bg-orange-500/10 hover:text-[#FC8019] font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} className={isActive ? "text-[#FC8019]" : "text-slate-400"} />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge && (
                    <span className={clsx(
                      "text-[9px] font-mono px-2 py-0.5 rounded-md border",
                      isActive
                        ? "bg-orange-100/80 dark:bg-orange-500/20 border-[#FC8019]/30 text-[#FC8019] font-bold"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    )}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 1.5: Financial Intelligence & Business Checks */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 block mb-1.5">
            Financial Intelligence
          </span>
          <div className="space-y-1">
            {financialIntelNav.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs transition-all duration-150",
                    isActive
                      ? "bg-orange-50 dark:bg-orange-500/15 text-[#FC8019] border border-[#FC8019]/30 font-semibold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-orange-50/70 dark:hover:bg-orange-500/10 hover:text-[#FC8019] font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} className={isActive ? "text-[#FC8019]" : "text-slate-400"} />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-orange-100/80 dark:bg-orange-500/20 border border-[#FC8019]/30 text-[#FC8019] font-bold">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 2: Network & Due Diligence */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5 font-semibold">
            Network & Trust
          </span>
          <div className="space-y-1">
            {networkNav.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs transition-all duration-150",
                    isActive
                      ? "bg-orange-50 dark:bg-orange-500/15 text-[#FC8019] border border-[#FC8019]/30 font-semibold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-orange-50/70 dark:hover:bg-orange-500/10 hover:text-[#FC8019] font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} className={isActive ? "text-[#FC8019]" : "text-slate-400"} />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge && (
                    <span className={clsx(
                      "text-[9px] font-mono px-2 py-0.5 rounded-md border",
                      badge === "Highlight"
                        ? "bg-gradient-to-r from-[#FC8019] to-amber-500 text-white font-bold border-transparent shadow-sm shadow-orange-500/20"
                        : isActive
                        ? "bg-orange-100/80 dark:bg-orange-500/20 border-[#FC8019]/30 text-[#FC8019] font-bold"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    )}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 3: Operations OS & Settings */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5 font-semibold">
            Management
          </span>
          <div className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {t.adminPortal}
              </span>
              <ExternalLink size={12} />
            </Link>

            {settingsNav.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs transition-all duration-150",
                    isActive
                      ? "bg-orange-50 dark:bg-orange-500/15 text-[#FC8019] border border-[#FC8019]/30 font-semibold shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-orange-50/70 dark:hover:bg-orange-500/10 hover:text-[#FC8019] font-medium"
                  )}
                >
                  <Icon size={16} className={isActive ? "text-[#FC8019]" : "text-slate-400"} />
                  <span>{label}</span>
                </Link>
              );
            })}

            <Link
              href="/intro"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-orange-50/70 dark:hover:bg-orange-500/10 hover:text-[#FC8019] transition-colors"
            >
              <RotateCcw size={15} />
              <span>Watch Animated Intro</span>
            </Link>

            <Link
              href="/login"
              onClick={() => {
                sessionStorage.removeItem("chaanbean_session_active");
                localStorage.removeItem("chaanbean_auth");
                document.cookie = "chaanbean_session=; path=/; max-age=0";
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <LogOut size={15} />
              <span>Sign Out / Switch Portal</span>
            </Link>
          </div>
        </div>

        {/* Quick Report Default Card */}
        <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/10 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[#FC8019] text-xs font-semibold">
            <AlertTriangle size={14} />
            <span>Community Default Alert</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Encountered a commercial default? Report to the Trust Hub to automatically protect peer enterprises.
          </p>
          <Link
            href="/trust-hub"
            className="block text-center rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] py-2 text-xs font-bold text-white transition shadow-sm shadow-orange-500/20"
          >
            Report Default →
          </Link>
        </div>
      </nav>

      {/* Compliance Stamp Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          <FileCheck2 size={13} />
          <span>TRAI & MSME Verified</span>
        </div>
        <div className="text-slate-400 dark:text-slate-500 mt-1">Single-Decision Risk Desk · India Market</div>
      </div>
    </aside>
  );
}
