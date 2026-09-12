"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Briefcase,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();

  // Portal tab: "client" | "admin"
  const [portal, setPortal] = useState<"client" | "admin">("client");
  // Auth mode: "login" | "register"
  const [mode, setMode] = useState<"login" | "register">("login");

  // Client form state
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [plan, setPlan] = useState("growth");

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const [adminRole, setAdminRole] = useState("owner");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick fill sample credentials
  const fillSampleClient = () => {
    setClientEmail("trade.ops@acmetraders.in");
    setClientPassword("ChaanBeanPass2026!");
    setCompanyName("Acme Traders Pvt Ltd");
  };

  const fillSampleAdmin = () => {
    setAdminEmail("owner@chaanbean.in");
    setAdminPassword("RootOwnerKey2026!");
    setSecurityKey("CHAANBEAN-ROOT-2026");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (portal === "client") {
        if (mode === "login") {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "login_client",
              email: clientEmail,
              companyName,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Login failed");

          setSuccessMsg(`Welcome back, ${data.user?.name || "Client"}! Redirecting...`);
          sessionStorage.setItem("chaanbean_session_active", "true");
          localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "client", user: data.user }));
          document.cookie = "chaanbean_session=client; path=/; max-age=86400";
          setTimeout(() => router.push("/"), 700);
        } else {
          // Register client
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "register_client",
              fullName,
              companyName,
              email: clientEmail,
              phone,
              pan,
              gstin,
              plan,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Registration failed");

          setSuccessMsg("Enterprise account registered successfully! Entering console...");
          sessionStorage.setItem("chaanbean_session_active", "true");
          localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "client", user: data.user }));
          document.cookie = "chaanbean_session=client; path=/; max-age=86400";
          setTimeout(() => router.push("/"), 700);
        }
      } else {
        // Admin portal
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
          if (!res.ok) throw new Error(data.error || "Admin login failed");

          setSuccessMsg(`Authorized as Administrator (${data.user?.role}). Redirecting to Admin OS...`);
          sessionStorage.setItem("chaanbean_session_active", "true");
          localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "admin", user: data.user }));
          localStorage.setItem("chaanbean_admin_role", data.user?.role || "owner");
          document.cookie = "chaanbean_session=admin; path=/; max-age=86400";
          setTimeout(() => router.push("/admin"), 700);
        } else {
          // Register admin
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

          setSuccessMsg("Administrator registered successfully! Entering Admin OS...");
          sessionStorage.setItem("chaanbean_session_active", "true");
          localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "admin", user: data.user }));
          localStorage.setItem("chaanbean_admin_role", data.user?.role || "owner");
          document.cookie = "chaanbean_session=admin; path=/; max-age=86400";
          setTimeout(() => router.push("/admin"), 700);
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-white transition-colors duration-200">
      {/* Top Right Header: Theme Switcher & Watch Intro */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/intro"
          className="flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
          title="Watch Animated Intro"
        >
          <RotateCcw size={13} />
          <span>Watch Intro</span>
        </Link>
      </div>

      {/* Ambient Crimson Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[140px] opacity-15 dark:opacity-25"
        style={{ background: "radial-gradient(circle, #FC8019 0%, rgba(252, 128, 25,0) 70%)" }}
      />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center text-center mb-6">
        <Link href="/intro" className="group flex items-center gap-3 transition">
          <div className="relative h-12 w-16 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="ChaanBean Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-left">
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-slate-900 dark:text-white">Chaan</span>
              <span className="text-[#FC8019]">Bean</span>
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">
              B2B Credit Recovery & Verification
            </span>
          </div>
        </Link>
      </div>

      {/* Auth Card Container */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 lg:p-8 shadow-2xl backdrop-blur-md">
        {/* Portal Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 mb-6 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setPortal("client");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition ${
              portal === "client"
                ? "bg-[#FC8019] text-white shadow-md shadow-[#FC8019]/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 size={15} />
            <span>Client Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPortal("admin");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition ${
              portal === "admin"
                ? "bg-[#FC8019] text-white shadow-md shadow-[#FC8019]/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck size={15} />
            <span>Admin Desk</span>
          </button>
        </div>

        {/* Sub-Mode Toggle: Sign In vs Register */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`text-sm font-bold transition pb-1 border-b-2 ${
                mode === "login"
                  ? "text-slate-900 dark:text-white border-[#FC8019]"
                  : "text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-300"
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
              className={`text-sm font-bold transition pb-1 border-b-2 ${
                mode === "register"
                  ? "text-slate-900 dark:text-white border-[#FC8019]"
                  : "text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Create Account
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {portal === "client" ? "Enterprise Client" : "Admin Operations"}
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

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ==================== CLIENT SIGN IN ==================== */}
          {portal === "client" && mode === "login" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Business Email / Account Identifier
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] focus-within:ring-1 focus-within:ring-[#FC8019] transition">
                  <Mail size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="operations@acmetraders.in"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] focus-within:ring-1 focus-within:ring-[#FC8019] transition">
                  <Lock size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={fillSampleClient}
                  className="text-[11px] font-semibold text-[#FC8019] hover:text-[#E26D0A] hover:underline transition"
                >
                  Fill Sample Client Credentials (Acme Traders)
                </button>
              </div>
            </>
          )}

          {/* ==================== CLIENT REGISTRATION ==================== */}
          {portal === "client" && mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enterprise Company Name *
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                  <Building2 size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zenith Precision Logistics Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Name
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                    <User size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Vikram Shah"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone (+91)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                    <Phone size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Business Email *
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                  <Mail size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="trade@zenithlogistics.in"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entity PAN
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="AABCZ1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#FC8019]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AABCZ1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#FC8019]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subscription Tier
                </label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                >
                  <option value="growth" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Growth Enterprise (₹2,50,000 initial credits)</option>
                  <option value="enterprise" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Custom Enterprise (Multi-seat + Priority Telephony)</option>
                </select>
              </div>
            </>
          )}

          {/* ==================== ADMIN SIGN IN ==================== */}
          {portal === "admin" && mode === "login" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Administrator Email
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                  <Mail size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="owner@chaanbean.in"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin Passkey / Security Key
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                  <KeyRound size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={fillSampleAdmin}
                  className="text-[11px] font-semibold text-[#FC8019] hover:text-[#E26D0A] hover:underline transition"
                >
                  Fill Sample Admin Credentials (Owner)
                </button>
              </div>
            </>
          )}

          {/* ==================== ADMIN REGISTRATION ==================== */}
          {portal === "admin" && mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Full Name *
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                  <User size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siddharth Verma"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Admin Email *
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                  <Mail size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="officer@chaanbean.in"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Master Security Key *
                </label>
                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] transition">
                  <KeyRound size={16} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="CHAANBEAN-ROOT-2026"
                    value={securityKey}
                    onChange={(e) => setSecurityKey(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Assignment
                </label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                >
                  <option value="owner" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">System Owner (Full MRR & Pipeline Access)</option>
                  <option value="team_member" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Team Member (CRM & Pipeline Operator)</option>
                </select>
              </div>
            </>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FC8019] py-3 text-xs font-bold text-white shadow-lg shadow-[#FC8019]/30 hover:bg-[#E26D0A] disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Authenticating with Prisma...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === "login"
                    ? portal === "client"
                      ? "Sign In to Client Portal"
                      : "Sign In to Admin OS"
                    : portal === "client"
                    ? "Register Enterprise Account"
                    : "Register Admin Officer"}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Bottom Link to Intro */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center flex items-center justify-center gap-4">
          <Link
            href="/intro"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#FC8019] transition"
          >
            <RotateCcw size={13} />
            <span>Watch Intro Animation</span>
          </Link>
          <span className="text-slate-700">·</span>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Enter as Guest
          </Link>
        </div>
      </div>
    </div>
  );
}
