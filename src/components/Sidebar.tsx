"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Search,
  Building2,
  Phone,
  Scale,
  Landmark,
  Settings,
  User,
  Users,
  CreditCard,
  KeyRound,
  HelpCircle,
  Headphones,
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, toggleCollapse, isMobileOpen, setIsMobileOpen } = useSidebar();
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState<boolean>(true);

  useEffect(() => {
    const checkSub = () => {
      try {
        const sub = localStorage.getItem("chaanbean_subscription");
        if (sub) {
          const parsed = JSON.parse(sub);
          setActivePlan(parsed.planId || null);
        }
      } catch {}
    };
    checkSub();
    window.addEventListener("chaanbean:wallet-updated", checkSub);
    window.addEventListener("storage", checkSub);
    return () => {
      window.removeEventListener("chaanbean:wallet-updated", checkSub);
      window.removeEventListener("storage", checkSub);
    };
  }, []);

  // Ensure settings accordion is open when navigating to settings
  useEffect(() => {
    if (pathname.startsWith("/settings")) {
      setSettingsOpen(true);
    }
  }, [pathname]);

  // Hide sidebar on public/auth/intro/landing/admin routes
  if (
    pathname.startsWith("/admin") ||
    pathname === "/intro" ||
    pathname === "/login" ||
    pathname === "/subscription" ||
    pathname === "/landing"
  ) {
    return null;
  }

  // The 5 Core Navigation Boxes:
  // 1. AI Credit Check
  // 2. AI Business Security
  // 3. Payment Automation
  // 4. Legal Infrastructure
  // 5. Loans
  const coreTabs = [
    {
      id: "ai-credit-check",
      href: "/background-check",
      label: "AI Credit Check",
      subtitle: "14 Statutory Gateways",
      icon: Search,
      badge: "Credit",
    },
    {
      id: "business-security",
      href: "/business-check",
      label: "AI Business Security",
      subtitle: "Risk Underwriting Engine",
      icon: Building2,
      badge: "Security",
    },
    {
      id: "payment-automation",
      href: "/payment-recovery",
      label: "Payment Automation",
      subtitle: "Voice AI & Cadence Recovery",
      icon: Phone,
      badge: "Recovery",
    },
    {
      id: "legal-infrastructure",
      href: "/arbitration",
      label: "Legal Infrastructure",
      subtitle: "MSMED §18 Dispute Docket",
      icon: Scale,
      badge: "Arbitration",
    },
    {
      id: "loans",
      href: "/loans",
      label: "Loans",
      subtitle: "Home, Personal, Gold & Business",
      icon: Landmark,
      badge: "4 Options",
    },
  ];

  // 8 Settings Options:
  const settingsOptions = [
    { id: "profile", label: "Your Profile", icon: User },
    { id: "company", label: "Your Company Profile", icon: Building2 },
    { id: "department", label: "Department", icon: Users },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "password", label: "Change Password", icon: KeyRound },
    { id: "faqs", label: "FAQs", icon: HelpCircle },
    { id: "support", label: "Support", icon: Headphones },
    { id: "feedback", label: "Feedback", icon: MessageSquarePlus },
  ];

  const handleLinkClick = () => {
    // If on small screen, automatically fold sidebar to leave full space for page
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsCollapsed(true);
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay when user opens full drawer on mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-72 h-full bg-white dark:bg-[#0D1322] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header with Fold/Close Button */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
              <Link href="/landing" onClick={handleLinkClick} className="flex items-center gap-2.5">
                <div className="relative h-8 w-10 shrink-0">
                  <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Chaan<span className="text-[#FC8019]">Bean</span>
                  </h1>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">CREDIT & RECOVERY OS</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-[#FC8019] hover:bg-orange-50 dark:hover:bg-orange-950/50 border border-slate-200 dark:border-slate-700 transition shadow-xs"
                title="Fold Sidebar"
                aria-label="Fold Sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Mobile Navigation List */}
            <nav className="flex-1 p-4 space-y-4 overflow-y-auto font-sans">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                  Core Operating Stations
                </span>
                <span className="text-[10px] font-mono text-[#FC8019] bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded">
                  5 Modules
                </span>
              </div>

              <div className="space-y-2.5">
                {coreTabs.map((tab, idx) => {
                  const Icon = tab.icon;
                  const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      onClick={handleLinkClick}
                      className={clsx(
                        "group relative block rounded-2xl p-3 transition-all duration-200 border text-left",
                        isActive
                          ? "bg-orange-50/90 dark:bg-orange-500/15 border-[#FC8019] shadow-md shadow-[#FC8019]/10"
                          : "bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      {isActive && <span className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-[#FC8019]" />}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={clsx(
                              "rounded-xl p-2 transition-colors shrink-0",
                              isActive
                                ? "bg-[#FC8019] text-white shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            )}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0">
                                0{idx + 1}
                              </span>
                              <h3 className="text-xs font-bold leading-tight truncate text-slate-900 dark:text-white">
                                {tab.label}
                              </h3>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
                              {tab.subtitle}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md border shrink-0 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500">
                          {tab.badge}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Settings Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <Link
                  href="/settings"
                  onClick={handleLinkClick}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Settings size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Settings</div>
                    <div className="text-[10px] text-slate-400 font-mono">8 Options Available</div>
                  </div>
                </Link>
              </div>
            </nav>

            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <Link
                href="/login"
                onClick={() => {
                  sessionStorage.removeItem("chaanbean_session_active");
                  localStorage.removeItem("chaanbean_auth");
                  localStorage.removeItem("chaanbean_subscription");
                  document.cookie = "chaanbean_session=; path=/; max-age=0";
                  document.cookie = "chaanbean_subscription=; path=/; max-age=0";
                }}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:text-red-500 transition"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Persistent In-Flow Sidebar (Collapsible: w-14/16 Shrunk <-> w-72 Expanded) */}
      <aside
        className={clsx(
          "flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] text-slate-800 dark:text-slate-100 shrink-0 select-none transition-all duration-300 ease-in-out z-20",
          isCollapsed ? "w-14 sm:w-16" : "w-72"
        )}
      >
        {/* Brand Header */}
        <div
          className={clsx(
            "border-b border-slate-200 dark:border-slate-800 flex items-center transition-all",
            isCollapsed ? "p-2 sm:p-2.5 flex-col gap-2 justify-center" : "px-5 py-4 justify-between"
          )}
        >
          {/* Logo */}
          <Link
            href="/landing"
            onClick={handleLinkClick}
            className={clsx("flex items-center gap-3 group", isCollapsed && "justify-center")}
            title="ChaanBean Credit & Recovery OS"
          >
            <div className="relative h-8 w-10 shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Chaan<span className="text-[#FC8019]">Bean</span>
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wide">
                  CREDIT &amp; RECOVERY OS
                </p>
              </div>
            )}
          </Link>

          {/* Toggle Fold / Expand Button */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800 hover:bg-[#FC8019] hover:text-white transition shadow-xs group"
              title="Expand Core Operating Stations"
              aria-label="Expand Core Operating Stations"
            >
              <ChevronRight size={16} className="group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-[#FC8019] hover:bg-orange-50 dark:hover:bg-orange-950/60 border border-slate-200 dark:border-slate-700 transition shadow-xs"
              title="Fold Sidebar"
              aria-label="Fold Sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Main Navigation Area */}
        <nav
          className={clsx(
            "flex-1 space-y-3 overflow-y-auto font-sans scrollbar-none",
            isCollapsed ? "p-1.5 sm:p-2" : "p-4 space-y-4"
          )}
        >
          {/* Section Header (when expanded) */}
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Core Operating Stations
              </span>
              <span className="text-[10px] font-mono text-[#FC8019] bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded">
                5 Modules
              </span>
            </div>
          )}

          {/* 5 Core Stations */}
          <div className={clsx("space-y-2", isCollapsed && "flex flex-col items-center space-y-2")}>
            {coreTabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
              const isAlaCarte = Boolean(activePlan?.startsWith("alacarte"));
              const isRestrictedForAlaCarte = isAlaCarte && tab.id !== "payment-automation";
              const displayBadge = isRestrictedForAlaCarte
                ? "Growth/Ent"
                : isAlaCarte && tab.id === "payment-automation"
                ? "Calls Active"
                : tab.badge;

              if (isCollapsed) {
                // Compact Shrunk Mode (Icon + Station Number)
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    onClick={handleLinkClick}
                    title={`${tab.label} (0${idx + 1}) · ${tab.subtitle}`}
                    className={clsx(
                      "relative group flex flex-col items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 border",
                      isActive
                        ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-[#FC8019]/25 scale-105"
                        : "bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-[#FC8019]"
                    )}
                  >
                    <Icon size={18} />
                    <span
                      className={clsx(
                        "absolute -top-1 -right-1 text-[8px] font-mono font-bold px-1 rounded-full border leading-tight",
                        isActive
                          ? "bg-white text-[#FC8019] border-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      0{idx + 1}
                    </span>
                  </Link>
                );
              }

              // Full Expanded Mode
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onClick={handleLinkClick}
                  title={
                    isRestrictedForAlaCarte
                      ? "À La Carte subscription is active for Call Recovery. Upgrade to Growth/Enterprise for this station."
                      : undefined
                  }
                  className={clsx(
                    "group relative block rounded-2xl p-3.5 transition-all duration-200 border text-left",
                    isActive
                      ? "bg-orange-50/90 dark:bg-orange-500/15 border-[#FC8019] shadow-md shadow-[#FC8019]/10"
                      : "bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 shadow-sm"
                  )}
                >
                  {isActive && <span className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-[#FC8019]" />}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={clsx(
                          "rounded-xl p-2 transition-colors shrink-0",
                          isActive
                            ? "bg-[#FC8019] text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-[#FC8019] group-hover:bg-orange-50 dark:group-hover:bg-orange-950/50"
                        )}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0">
                            0{idx + 1}
                          </span>
                          <h3
                            className={clsx(
                              "text-xs font-bold leading-tight truncate",
                              isActive
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"
                            )}
                          >
                            {tab.label}
                          </h3>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
                          {tab.subtitle}
                        </p>
                      </div>
                    </div>

                    <span
                      className={clsx(
                        "text-[9px] font-mono px-1.5 py-0.5 rounded-md border shrink-0",
                        isActive
                          ? "bg-[#FC8019]/20 border-[#FC8019]/40 text-[#FC8019] font-bold"
                          : isRestrictedForAlaCarte
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-semibold"
                          : isAlaCarte && tab.id === "payment-automation"
                          ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {displayBadge}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {/* Settings Tab */}
            {isCollapsed ? (
              <div className="flex justify-center">
                <Link
                  href="/settings"
                  onClick={handleLinkClick}
                  title="Settings (8 Options)"
                  className={clsx(
                    "flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 border",
                    isSettingsActive
                      ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-[#FC8019]/25 scale-105"
                      : "bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-[#FC8019]"
                  )}
                >
                  <Settings size={18} />
                </Link>
              </div>
            ) : (
              <div
                className={clsx(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  isSettingsActive
                    ? "border-[#FC8019]/60 bg-orange-50/50 dark:bg-orange-950/20 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between p-2.5">
                  <Link
                    href="/settings"
                    onClick={handleLinkClick}
                    className="flex items-center gap-2.5 flex-1 min-w-0 group"
                  >
                    <div
                      className={clsx(
                        "p-2 rounded-xl transition-colors",
                        isSettingsActive
                          ? "bg-[#FC8019] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-[#FC8019]"
                      )}
                    >
                      <Settings size={16} />
                    </div>
                    <div>
                      <div
                        className={clsx(
                          "text-xs font-bold leading-tight",
                          isSettingsActive
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                        )}
                      >
                        Settings
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">8 Options Available</div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title={settingsOpen ? "Collapse Settings Menu" : "Expand Settings Options"}
                  >
                    {settingsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>

                {settingsOpen && (
                  <div className="px-2 pb-2.5 pt-1 space-y-1 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-150">
                    {settingsOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <Link
                          key={opt.id}
                          href={`/settings?tab=${opt.id}`}
                          onClick={handleLinkClick}
                          className={clsx(
                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition",
                            isSettingsActive && pathname === "/settings"
                              ? "text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-[#FC8019]"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          )}
                        >
                          <Icon size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate text-[11px]">{opt.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Clean Bottom Left-Hand Footer */}
        <div
          className={clsx(
            "border-t border-slate-200 dark:border-slate-800 font-sans transition-all",
            isCollapsed ? "p-2 flex flex-col items-center gap-2" : "p-4 space-y-2.5"
          )}
        >
          {isCollapsed ? (
            <Link
              href="/login"
              onClick={() => {
                sessionStorage.removeItem("chaanbean_session_active");
                localStorage.removeItem("chaanbean_auth");
                localStorage.removeItem("chaanbean_subscription");
                document.cookie = "chaanbean_session=; path=/; max-age=0";
                document.cookie = "chaanbean_subscription=; path=/; max-age=0";
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </Link>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <Link
                  href="/landing"
                  onClick={handleLinkClick}
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-[#FC8019] transition text-[11px]"
                >
                  <Sparkles size={13} className="text-[#FC8019]" />
                  <span>Platform Overview</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => {
                    sessionStorage.removeItem("chaanbean_session_active");
                    localStorage.removeItem("chaanbean_auth");
                    localStorage.removeItem("chaanbean_subscription");
                    document.cookie = "chaanbean_session=; path=/; max-age=0";
                    document.cookie = "chaanbean_subscription=; path=/; max-age=0";
                  }}
                  className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition text-[11px]"
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </Link>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <FileCheck2 size={12} className="text-emerald-500" />
                <span>MSMED Act 2006 &amp; TRAI Grounded</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
