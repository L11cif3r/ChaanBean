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
    <aside className="flex w-64 flex-col border-r border-chaan-border bg-chaan-card text-white shrink-0">
      {/* Brand Header */}
      <div className="border-b border-chaan-border px-6 py-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-12 shrink-0 group-hover:scale-105 transition-transform">
            <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Chaan<span className="text-[#F44851]">Bean</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide">CREDIT & RECOVERY OS</p>
          </div>
        </Link>
      </div>

      {/* Nav Categories */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto font-sans">
        {/* Section 1: Core Engines */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 block mb-1.5">
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
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-slate-800/80 text-chaan-accent border border-slate-700/60 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
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
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 block mb-1.5">
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
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-slate-800/80 text-chaan-accent border border-slate-700/60 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
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
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 block mb-1.5">
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
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-slate-800/80 text-chaan-accent border border-slate-700/60 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} />
                    <span className="truncate">{label}</span>
                  </div>
                  {badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
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
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 block mb-1.5">
            Management
          </span>
          <div className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-amber-400 bg-amber-950/20 border border-amber-800/40 hover:bg-amber-900/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
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
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-slate-800/80 text-chaan-accent border border-slate-700/60 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}

            <Link
              href="/intro"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/50 hover:text-[#F44851] transition-colors"
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
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors"
            >
              <LogOut size={15} />
              <span>Sign Out / Switch Portal</span>
            </Link>
          </div>
        </div>

        {/* Quick Report Default Card */}
        <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
            <AlertTriangle size={14} />
            <span>Community Default Alert</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Encountered a commercial default? Report to the Trust Hub to automatically protect peer enterprises.
          </p>
          <Link
            href="/trust-hub"
            className="block text-center rounded-lg bg-rose-600 hover:bg-rose-500 py-1.5 text-xs font-bold text-white transition shadow-sm"
          >
            Report Default →
          </Link>
        </div>
      </nav>

      {/* Compliance Stamp Footer */}
      <div className="border-t border-chaan-border p-4 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <FileCheck2 size={13} />
          <span>TRAI & MSME Verified</span>
        </div>
        <div className="text-slate-500 mt-1">Single-Decision Risk Desk · India Market</div>
      </div>
    </aside>
  );
}
