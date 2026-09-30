"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Sparkles,
  Search,
  ShieldCheck,
  Phone,
  Scale,
  Landmark,
  Cpu,
  Link2,
  Zap,
  FileText,
  Wallet,
  MessageSquarePlus,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Users,
  CreditCard,
  KeyRound,
  HelpCircle,
  Headphones,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { AskChaanBeanModal } from "./ai/AskChaanBeanModal";

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, toggleCollapse, isMobileOpen, setIsMobileOpen } = useSidebar();
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const isSettingsActive = pathname.startsWith("/settings");
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState<boolean>(false);

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

    const handleOpenAskAi = () => setIsAskAiOpen(true);
    window.addEventListener("chaanbean:open-ask-ai", handleOpenAskAi);

    return () => {
      window.removeEventListener("chaanbean:wallet-updated", checkSub);
      window.removeEventListener("storage", checkSub);
      window.removeEventListener("chaanbean:open-ask-ai", handleOpenAskAi);
    };
  }, []);

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

  // 13 Official Navigation Items per Section 3 of ChaanBean Blueprint:
  const commandCentreItems = [
    {
      id: "home",
      href: "/dashboard",
      label: "Home",
      subtitle: "Command Centre",
      icon: LayoutDashboard,
      badge: "Hub",
    },
    {
      id: "ask-ai",
      action: () => setIsAskAiOpen(true),
      label: "AI / Ask ChaanBean",
      subtitle: "Natural-Language Copilot",
      icon: Sparkles,
      badge: "Agentic",
      isAction: true,
    },
    {
      id: "mvp-demo",
      href: "/demo",
      label: "ChaanBean 16-step journey",
      subtitle: "Interactive Workflow",
      icon: Zap,
      badge: "Journey",
    },
  ];

  const coreOperatingStations = [
    {
      id: "credit-due-diligence",
      href: "/background-check",
      label: "Credit Due Diligence",
      subtitle: "Investigate before credit",
      icon: Search,
      badge: "Due Diligence",
    },
    {
      id: "continuous-credit-protection",
      href: "/monitoring",
      label: "Continuous Credit Protection",
      subtitle: "Monitor credit & due dates",
      icon: ShieldCheck,
      badge: "Protection",
    },
    {
      id: "smart-collections",
      href: "/payment-recovery",
      label: "Smart Collections Automation",
      subtitle: "Autonomous recovery cadence",
      icon: Phone,
      badge: "Recovery",
    },
    {
      id: "legal",
      href: "/arbitration",
      label: "Legal",
      subtitle: "Escalate defaulted accounts",
      icon: Scale,
      badge: "Arbitration",
    },
    {
      id: "capital-access",
      href: "/loans",
      label: "CapitalX (Loans)",
      subtitle: "20 Institutional Facilities",
      icon: Landmark,
      badge: "CapitalX",
    },
  ];

  const ecosystemItems = [
    {
      id: "ai-transformation",
      href: "/ai-transformation",
      label: "AI Transformation",
      subtitle: "Identify & implement AI",
      icon: Cpu,
      badge: "AI",
    },
    {
      id: "connect",
      href: "/connect",
      label: "ChaanBean Connect",
      subtitle: "Tally, ERP & API sync",
      icon: Link2,
      badge: "ERP",
    },
    {
      id: "intelligence",
      href: "/intelligence",
      label: "ChaanBean Intelligence",
      subtitle: "Cross-business AI insights",
      icon: Zap,
      badge: "Insights",
    },
  ];

  const resourceItems = [
    {
      id: "reports",
      href: "/reports",
      label: "Reports",
      subtitle: "Purchased dossiers & library",
      icon: FileText,
      badge: "Library",
    },
    {
      id: "wallet",
      href: "/wallet",
      label: "Wallet",
      subtitle: "Balance & transactions",
      icon: Wallet,
      badge: "Credits",
    },
    {
      id: "feedback",
      href: "/feedback",
      label: "Feedback",
      subtitle: "Feature requests & rating",
      icon: MessageSquarePlus,
      badge: "Feedback",
    },
  ];

  const settingsOptions = [
    { id: "profile", label: "Your Profile", icon: Building2 },
    { id: "company", label: "Your Company Profile", icon: Building2 },
    { id: "department", label: "Department", icon: Users },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "password", label: "Change Password", icon: KeyRound },
    { id: "faqs", label: "FAQs", icon: HelpCircle },
    { id: "support", label: "Support", icon: Headphones },
  ];

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsCollapsed(true);
      setIsMobileOpen(false);
    }
  };

  const renderNavCard = (item: any) => {
    const Icon = item.icon;
    const isActive = item.href ? (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) : false;

    if (item.isAction) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            item.action();
            handleLinkClick();
          }}
          className={clsx(
            "w-full group relative block rounded-2xl p-2.5 sm:p-3 transition-all duration-200 border text-left",
            isCollapsed && "flex justify-center p-2.5",
            "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 hover:border-[#FC8019] border-orange-200 dark:border-orange-900/60 shadow-xs"
          )}
          title={item.label}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FC8019] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Icon size={16} />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {item.label}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            )}
          </div>
        </button>
      );
    }

    if (isCollapsed) {
      return (
        <Link
          key={item.id}
          href={item.href}
          onClick={handleLinkClick}
          title={`${item.label} · ${item.subtitle}`}
          className={clsx(
            "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 border",
            isActive
              ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-[#FC8019]/25 scale-105"
              : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-[#FC8019]"
          )}
        >
          <Icon size={17} />
        </Link>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={handleLinkClick}
        className={clsx(
          "group relative block rounded-2xl p-2.5 transition-all duration-200 border text-left",
          isActive
            ? "bg-orange-50/90 dark:bg-orange-500/15 border-[#FC8019] shadow-md shadow-[#FC8019]/10"
            : "bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 shadow-xs"
        )}
      >
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#FC8019]" />}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={clsx(
              "rounded-xl p-1.5 transition-colors shrink-0",
              isActive
                ? "bg-[#FC8019] text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-[#FC8019]"
            )}
          >
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className={clsx(
                "text-xs font-bold leading-tight truncate",
                isActive ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"
              )}
            >
              {item.label}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug truncate">
              {item.subtitle}
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop & Mobile Drawer */}
      <aside
        className={clsx(
          "h-full z-40 transition-all duration-300 ease-in-out flex flex-col bg-white dark:bg-[#0D1322] border-r border-slate-200 dark:border-slate-800",
          "fixed lg:static inset-y-0 left-0",
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "lg:w-64 xl:w-72"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <Image
              src="/icon.png"
              alt="ChaanBean"
              width={30}
              height={30}
              className="rounded-lg shrink-0"
            />
            {!isCollapsed && (
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight truncate">
                ChaanBean
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4 font-sans scrollbar-none">
          {/* Group 1: Command Centre */}
          <div className="space-y-1.5">
            {!isCollapsed && (
              <div className="px-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Command Centre
                </span>
              </div>
            )}
            <div className={clsx("space-y-1.5", isCollapsed && "flex flex-col items-center")}>
              {commandCentreItems.map((item) => renderNavCard(item))}
            </div>
          </div>

          {/* Group 2: Core Operating Stations */}
          <div className="space-y-1.5">
            {!isCollapsed && (
              <div className="px-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Core Operating Stations
                </span>
              </div>
            )}
            <div className={clsx("space-y-1.5", isCollapsed && "flex flex-col items-center")}>
              {coreOperatingStations.map((item) => renderNavCard(item))}
            </div>
          </div>

          {/* Group 3: Ecosystem & Intelligence */}
          <div className="space-y-1.5">
            {!isCollapsed && (
              <div className="px-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Ecosystem & Connect
                </span>
              </div>
            )}
            <div className={clsx("space-y-1.5", isCollapsed && "flex flex-col items-center")}>
              {ecosystemItems.map((item) => renderNavCard(item))}
            </div>
          </div>

          {/* Group 4: Account & Resources */}
          <div className="space-y-1.5">
            {!isCollapsed && (
              <div className="px-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Workspace & System
                </span>
              </div>
            )}
            <div className={clsx("space-y-1.5", isCollapsed && "flex flex-col items-center")}>
              {resourceItems.map((item) => renderNavCard(item))}
            </div>
          </div>

          {/* Settings Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            {isCollapsed ? (
              <div className="flex justify-center">
                <Link
                  href="/settings"
                  onClick={handleLinkClick}
                  title="Settings"
                  className={clsx(
                    "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 border",
                    isSettingsActive
                      ? "bg-[#FC8019] text-white border-[#FC8019]"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <Settings size={17} />
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019] transition"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={15} />
                    <span>Settings</span>
                  </div>
                  {settingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {settingsOpen && (
                  <div className="p-2 pt-0 space-y-1">
                    {settingsOptions.map((opt) => (
                      <Link
                        key={opt.id}
                        href={`/settings?tab=${opt.id}`}
                        onClick={handleLinkClick}
                        className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-[#FC8019] px-2 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        {opt.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Global Ask ChaanBean Modal */}
      <AskChaanBeanModal isOpen={isAskAiOpen} onClose={() => setIsAskAiOpen(false)} />
    </>
  );
}
