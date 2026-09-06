"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitPullRequest,
  Users2,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  ShieldAlert,
  UserCheck,
  Building,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<"owner" | "team_member">("owner");

  useEffect(() => {
    const saved = localStorage.getItem("chaanbean_admin_role") as "owner" | "team_member" | null;
    if (saved) setRole(saved);
  }, []);

  const switchRole = (newRole: "owner" | "team_member") => {
    setRole(newRole);
    localStorage.setItem("chaanbean_admin_role", newRole);
    window.location.reload();
  };

  const navItems = [
    { href: "/admin", label: "Executive Overview", icon: LayoutDashboard },
    { href: "/admin/pipeline", label: "Sales Pipeline (CRM)", icon: GitPullRequest },
    { href: "/admin/customers", label: "Customer Engagement", icon: Users2 },
    { href: "/admin/marketing", label: "Marketing & Attribution", icon: TrendingUp },
    { href: "/admin/financials", label: "Monthly Financials (MRR)", icon: DollarSign, ownerOnly: true },
  ];

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans">
      {/* Admin Global Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-11 shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">
                Chaan<span className="text-[#F44851]">Bean</span>
              </span>
              <span className="ml-2 rounded bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 text-[10px] font-mono text-amber-400 uppercase font-semibold">
                Internal Ops
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Active Role Selector (Owner vs Team Member) */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-xs">
            <span className="text-slate-400 ml-1.5 flex items-center gap-1">
              <UserCheck size={14} className="text-amber-400" />
              Role:
            </span>
            <select
              value={role}
              onChange={(e) => switchRole(e.target.value as "owner" | "team_member")}
              className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 font-mono font-semibold"
            >
              <option value="owner" className="bg-slate-900 text-slate-100">Owner (Siddharth Verma)</option>
              <option value="team_member" className="bg-slate-900 text-slate-100">Team Member (Pooja Deshmukh)</option>
            </select>
          </div>

          {/* Theme Switcher (Dark Mode / Bright Mode) */}
          <ThemeToggle />

          {/* Return to Customer Portal */}
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <ArrowLeft size={14} />
            Customer Portal
          </Link>
        </div>
      </header>

      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Admin Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-[#0B0F17] flex flex-col shrink-0">
          <nav className="flex-1 p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin" || pathname === "/admin/dashboard"
                  : pathname.startsWith(item.href);

              if (item.ownerOnly && role !== "owner") {
                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-slate-500 opacity-60 cursor-not-allowed"
                    title="Owner access only"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-500">Lock</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm font-semibold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4 text-[11px] font-mono text-slate-500">
            <div>ChaanBean Enterprise OS</div>
            <div className="text-slate-600 mt-0.5">Role Mode: {role.toUpperCase()}</div>
          </div>
        </aside>

        {/* Admin Main Content View */}
        <main className="flex-1 overflow-y-auto bg-[#070A10]">{children}</main>
      </div>
    </div>
  );
}
