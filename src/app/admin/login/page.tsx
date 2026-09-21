"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const [adminRole, setAdminRole] = useState("owner");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fillOwnerCredentials = () => {
    setAdminEmail("owner@chaanbean.in");
    setAdminPassword("RootOwnerKey2026!");
    setSecurityKey("CHAANBEAN-ROOT-2026");
  };

  const fillTeamCredentials = () => {
    setAdminEmail("pooja.deshmukh@chaanbean.in");
    setAdminPassword("TeamMemberKey2026!");
    setSecurityKey("CHAANBEAN-ROOT-2026");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "login_admin",
            email: adminEmail,
            password: adminPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Admin authentication failed");

        setSuccessMsg(`Authorized as Administrator (${data.user?.role || "owner"}). Redirecting to Admin Desk...`);
        sessionStorage.setItem("chaanbean_session_active", "true");
        sessionStorage.setItem("chaanbean_admin_auth", "true");
        localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "admin", user: data.user }));
        localStorage.setItem("chaanbean_admin_role", data.user?.role || "owner");
        document.cookie = "chaanbean_session=admin; path=/; max-age=86400";
        document.cookie = "chaanbean_admin_session=active; path=/; max-age=86400";
        setTimeout(() => router.push("/admin"), 600);
      } else {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register_admin",
            name: adminName,
            email: adminEmail,
            securityKey: securityKey || "CHAANBEAN-ROOT-2026",
            role: adminRole,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Admin registration failed");

        setSuccessMsg("Administrator registered successfully! Entering Admin Desk...");
        sessionStorage.setItem("chaanbean_session_active", "true");
        sessionStorage.setItem("chaanbean_admin_auth", "true");
        localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "admin", user: data.user }));
        localStorage.setItem("chaanbean_admin_role", data.user?.role || "owner");
        document.cookie = "chaanbean_session=admin; path=/; max-age=86400";
        document.cookie = "chaanbean_admin_session=active; path=/; max-age=86400";
        setTimeout(() => router.push("/admin"), 600);
      }
    } catch (err: any) {
      setError(err.message || "Authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-[#070A10] text-slate-100 font-sans">
      {/* Top Right Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <ThemeToggle />
      </div>

      {/* Subtle Security Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[140px] opacity-20"
        style={{ background: "radial-gradient(circle, #F59E0B 0%, rgba(245, 158, 11, 0) 70%)" }}
      />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center text-center mb-6">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-14">
            <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
          </div>
          <div className="text-left">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Chaan<span className="text-[#FC8019]">Bean</span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] text-amber-400/90 font-mono tracking-wider uppercase font-semibold">
                Admin Desk &amp; Internal Ops
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Card Container */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B0F17]/95 p-6 lg:p-8 shadow-2xl backdrop-blur-md">
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`text-sm font-bold transition pb-1.5 border-b-2 ${
                mode === "login"
                  ? "text-amber-400 border-amber-400"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`text-sm font-bold transition pb-1.5 border-b-2 ${
                mode === "register"
                  ? "text-amber-400 border-amber-400"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              Register Officer
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Restricted URL
          </span>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "login" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Administrator Email
                </label>
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 focus-within:border-amber-400 transition">
                  <Mail size={16} className="text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="owner@chaanbean.in"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Admin Passkey / Security Key
                </label>
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 focus-within:border-amber-400 transition">
                  <KeyRound size={16} className="text-slate-500 mr-2 shrink-0" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Quick Fill Credentials */}
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={fillOwnerCredentials}
                  className="text-left text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline transition flex items-center gap-1.5 font-mono"
                >
                  <Sparkles size={12} />
                  <span>Fill Owner Credentials (Siddharth Verma)</span>
                </button>
                <button
                  type="button"
                  onClick={fillTeamCredentials}
                  className="text-left text-[11px] text-slate-400 hover:text-slate-200 hover:underline transition font-mono"
                >
                  Fill Team Member Credentials (Pooja Deshmukh)
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Administrator Full Name *
                </label>
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 focus-within:border-amber-400 transition">
                  <User size={16} className="text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siddharth Verma"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Official Admin Email *
                </label>
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 focus-within:border-amber-400 transition">
                  <Mail size={16} className="text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="officer@chaanbean.in"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Master Security Key *
                </label>
                <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 focus-within:border-amber-400 transition">
                  <KeyRound size={16} className="text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="CHAANBEAN-ROOT-2026"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono text-white placeholder-slate-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Role Assignment
                </label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-400 font-mono"
                >
                  <option value="owner" className="bg-slate-900 text-white">System Owner (Full MRR &amp; Pipeline Access)</option>
                  <option value="team_member" className="bg-slate-900 text-white">Team Member (CRM &amp; Pipeline Operator)</option>
                </select>
              </div>
            </>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Authenticating with Admin OS...</span>
              </>
            ) : (
              <>
                <span>{mode === "login" ? "Enter Admin Desk" : "Register Admin Officer"}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Security Notice Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-600 font-mono leading-relaxed">
          CONFIDENTIAL &amp; PROPRIETARY · Platform Owner &amp; Executive Command Only.
        </div>
      </div>
    </div>
  );
}
