"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Key,
  RefreshCw,
  Star,
  Quote,
  Zap,
  Scale,
  Clock,
  Award,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();

  // Auth mode: "login" | "register"
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login method: "otp" | "password"
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");

  // OTP Login state
  const [otpMobile, setOtpMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Password Login state
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");

  // Register state
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [plan, setPlan] = useState("growth");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pre-fill email from query parameters (if directed from "Already a customer?")
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) {
        setClientEmail(emailParam);
        setLoginMethod("password");
      }
    }
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Request OTP handler
  const handleSendOtp = () => {
    setError(null);
    const cleanedMobile = otpMobile.replace(/\D/g, "");
    if (cleanedMobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSent(true);
    setOtpTimer(30);
    // Provide demo code in success message for convenience
    setSuccessMsg(`One-Time Password (OTP) dispatched to +91 ${cleanedMobile.slice(-10)}. [Demo OTP: 482910]`);
    if (!otpCode) {
      setOtpCode("482910");
    }
  };

  // Quick fill sample credentials
  const fillSampleOtp = () => {
    setOtpMobile("9876543210");
    setOtpCode("482910");
    setOtpSent(true);
    setOtpTimer(30);
    setError(null);
    setSuccessMsg("Filled demo mobile & OTP: 9876543210 / 482910");
  };

  const fillSampleClient = () => {
    setClientEmail("trade.ops@acmetraders.in");
    setClientPassword("ChaanBeanPass2026!");
    setCompanyName("Acme Traders Pvt Ltd");
    setError(null);
  };

  const fillEnterpriseClient = () => {
    setClientEmail("enterprise@abcindustry.in");
    setClientPassword("ABCIndustry@Enterprise2026!");
    setCompanyName("ABC Industry");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === "login") {
        if (loginMethod === "otp") {
          // Mobile + OTP flow
          if (!otpMobile) {
            throw new Error("Mobile number is required.");
          }
          if (!otpCode || otpCode.length < 4) {
            throw new Error("Please enter the 6-digit OTP sent to your phone.");
          }

          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "login_otp",
              mobile: otpMobile,
              otpCode: otpCode,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "OTP verification failed.");

          setSuccessMsg(`Welcome, ${data.user?.name || "Client"}! Verified via OTP. Entering dashboard...`);
          sessionStorage.setItem("chaanbean_session_active", "true");
          localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "client", user: data.user }));
          document.cookie = "chaanbean_session=client; path=/; max-age=86400";
          document.cookie = "chaanbean_subscription=active; path=/; max-age=7776000";
          if (data.user?.companyId) {
            document.cookie = `chaanbean_company_id=${data.user.companyId}; path=/; max-age=86400`;
          }
          if (data.user?.name) {
            document.cookie = `chaanbean_company_name=${encodeURIComponent(data.user.name)}; path=/; max-age=86400`;
          }
          setTimeout(() => router.push("/background-check"), 600);
        } else {
          // Email + Password flow
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
          document.cookie = "chaanbean_subscription=active; path=/; max-age=7776000";
          if (data.user?.companyId) {
            document.cookie = `chaanbean_company_id=${data.user.companyId}; path=/; max-age=86400`;
          }
          if (data.user?.name) {
            document.cookie = `chaanbean_company_name=${encodeURIComponent(data.user.name)}; path=/; max-age=86400`;
          }
          setTimeout(() => router.push("/background-check"), 600);
        }
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

        setSuccessMsg("Enterprise account registered successfully! Entering AI Credit Check...");
        sessionStorage.setItem("chaanbean_session_active", "true");
        localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "client", user: data.user }));
        document.cookie = "chaanbean_session=client; path=/; max-age=86400";
        document.cookie = "chaanbean_subscription=active; path=/; max-age=7776000";
        setTimeout(() => router.push("/background-check"), 600);
      }
    } catch (err: any) {
      setError(err.message || "Authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const marketingPillars = [
    {
      icon: ShieldCheck,
      title: "Real-Time MCA & GST Intelligence",
      description: "Verify company registration, active directors, GST filing track record, and court litigations before supplying on credit.",
    },
    {
      icon: Scale,
      title: "MSME 45-Day Payment Safeguard",
      description: "Automate 3x compound penal interest calculations under MSMED Act §15 and Section 43B(h) tax disallowance notifications.",
    },
    {
      icon: Zap,
      title: "Polite AI Voice & WhatsApp Recovery",
      description: "Multilingual automated phone calls and instant payment links collect overdue receivables without personal friction.",
    },
    {
      icon: Award,
      title: "Fast-Track Section 18 Arbitration",
      description: "Generate legally admissible evidence packs and file institutional arbitration to recover stuck business capital quickly.",
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-white transition-colors duration-200 font-sans overflow-x-hidden">
      {/* Background Matrix & Ambience */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#FC8019_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.035] dark:opacity-[0.06] z-0" />
      <div
        className="pointer-events-none absolute -top-40 left-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[160px] opacity-15 dark:opacity-20 z-0"
        style={{ background: "radial-gradient(circle, #FC8019 0%, rgba(252, 128, 25,0) 70%)" }}
      />
      <div className="pointer-events-none absolute bottom-10 right-10 w-[420px] h-[420px] opacity-[0.03] dark:opacity-[0.05] rotate-12 z-0">
        <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 mx-auto flex h-16 max-w-7xl items-center justify-between px-6 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
        <Link href="/landing" className="flex items-center gap-3 group">
          <div className="relative h-9 w-12 shrink-0 group-hover:scale-105 transition-transform">
            <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight">
              Chaan<span className="text-[#FC8019]">Bean</span>
            </span>
            <span className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Credit &amp; Recovery OS
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/landing"
            className="flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-[#FC8019] hover:text-[#FC8019] transition shadow-sm"
          >
            <ArrowLeft size={13} />
            <span>Explore Platform</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Split Layout: Marketing Information (Left) + Authentication Portal (Right) */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Rich Marketing Showcase & Social Proof */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-[#FC8019]">
                <Sparkles size={14} className="text-[#FC8019]" />
                <span>India&apos;s Leading B2B Credit Risk &amp; Recovery Operating System</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Never Suffer Bad Debts or Stuck Receivables Again.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl">
                ChaanBean empowers Indian manufacturers, traders, and suppliers to verify buyer trustworthiness before granting credit, automate 45-day statutory payment collections, and recover delayed capital under MSME law.
              </p>
            </div>

            {/* 4 Feature Marketing Highlights */}
            <div className="grid sm:grid-cols-2 gap-4">
              {marketingPillars.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm hover:border-[#FC8019]/60 transition group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-[#FC8019] group-hover:bg-[#FC8019] group-hover:text-white transition">
                        <Icon size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#FC8019] transition">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Trust Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-4 backdrop-blur-sm">
              <div>
                <span className="block text-xl font-extrabold text-[#FC8019]">4+ Years</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Continuous Service</span>
              </div>
              <div>
                <span className="block text-xl font-extrabold text-slate-900 dark:text-white">₹1,500+ Cr</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Recovered</span>
              </div>
              <div>
                <span className="block text-xl font-extrabold text-[#FC8019]">2,000+</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cases Settled</span>
              </div>
              <div>
                <span className="block text-xl font-extrabold text-slate-900 dark:text-white">100K+</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Verified Companies</span>
              </div>
            </div>

            {/* Verified Client Testimonial */}
            <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent p-5 dark:from-orange-500/10 dark:via-slate-900 dark:to-slate-900">
              <div className="flex items-center gap-1 text-amber-500 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">5.0 Star Rating</span>
              </div>
              <p className="text-xs sm:text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                &ldquo;We were about to ship two truckloads of raw materials on 60-day credit. ChaanBean&apos;s AI Credit Check revealed three active cheque-bounce cases against the buyer. We demanded 100% advance, saving our business from an ₹85 Lakh catastrophic default.&rdquo;
              </p>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Dinesh Patidar</span>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Director, Rameshwar Agro &amp; Chemicals</span>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[11px]">
                  ₹85 Lakhs Loss Prevented
                </span>
              </div>
            </div>

            {/* Compliance & Security Seals */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#FC8019]" />
                <span>DPDP Act 2023 Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock size={15} className="text-[#FC8019]" />
                <span>Bank-Grade AES-256 Encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 size={15} className="text-[#FC8019]" />
                <span>ISO 27001 Indian Data Centers</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Modern High-Converting Auth Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              
              {/* Header Toggle: Sign In vs Create Account */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className={`text-base font-extrabold transition pb-1.5 border-b-2 ${
                      mode === "login"
                        ? "text-[#FC8019] border-[#FC8019]"
                        : "text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
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
                    className={`text-base font-extrabold transition pb-1.5 border-b-2 ${
                      mode === "register"
                        ? "text-[#FC8019] border-[#FC8019]"
                        : "text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FC8019] bg-orange-500/10 px-2 py-0.5 rounded-full">
                  Client Portal
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

              {/* In Login mode: Dual Option Switcher (Mobile + OTP vs Email + Password) */}
              {mode === "login" && (
                <div className="mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-1 flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("otp");
                      setError(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                      loginMethod === "otp"
                        ? "bg-white dark:bg-slate-900 text-[#FC8019] shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Phone size={14} />
                    <span>Mobile Number + OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod("password");
                      setError(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                      loginMethod === "password"
                        ? "bg-white dark:bg-slate-900 text-[#FC8019] shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Lock size={14} />
                    <span>Email &amp; Password</span>
                  </button>
                </div>
              )}

              {/* FORM BODY */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "login" ? (
                  loginMethod === "otp" ? (
                    /* OPTION A: MOBILE NUMBER + OTP */
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Registered Mobile Number
                        </label>
                        <div className="flex gap-2">
                          <div className="flex flex-1 items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] focus-within:ring-1 focus-within:ring-[#FC8019] transition">
                            <span className="text-xs font-bold text-slate-500 mr-2 border-r border-slate-300 dark:border-slate-700 pr-2">
                              +91
                            </span>
                            <Phone size={15} className="text-slate-400 mr-2 shrink-0" />
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              placeholder="9876543210"
                              value={otpMobile}
                              onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-medium tracking-wide"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpTimer > 0 || !otpMobile}
                            className="rounded-xl border border-[#FC8019] bg-orange-500/10 hover:bg-[#FC8019] hover:text-white text-[#FC8019] px-3.5 py-2.5 text-xs font-bold disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#FC8019] transition shrink-0"
                          >
                            {otpTimer > 0 ? `Resend (${otpTimer}s)` : "Get OTP"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Enter 6-Digit OTP
                          </label>
                          {otpSent && (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                              OTP Sent to Phone
                            </span>
                          )}
                        </div>
                        <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 focus-within:border-[#FC8019] focus-within:ring-1 focus-within:ring-[#FC8019] transition">
                          <Key size={16} className="text-slate-400 mr-2 shrink-0" />
                          <input
                            type="text"
                            maxLength={6}
                            required
                            placeholder="Enter 6-digit OTP code"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-mono tracking-widest text-sm"
                          />
                        </div>
                      </div>

                      {/* Demo Quick OTP Fill */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={fillSampleOtp}
                          className="text-left text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline transition flex items-center gap-1.5"
                        >
                          <Sparkles size={12} className="text-amber-500 shrink-0" />
                          <span>Click to auto-fill Demo Number (+91 9876543210 · OTP: 482910)</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* OPTION B: EMAIL & PASSWORD */
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

                      {/* Quick Fill Demo Credentials */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={fillEnterpriseClient}
                          className="text-left text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline transition flex items-center gap-1.5"
                        >
                          <Sparkles size={12} className="text-amber-500 shrink-0" />
                          <span>ABC Industry (Enterprise Plan · 3 Scenarios)</span>
                        </button>
                        <button
                          type="button"
                          onClick={fillSampleClient}
                          className="text-left text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:underline transition"
                        >
                          Acme Traders (Clean First-Time Login)
                        </button>
                      </div>
                    </>
                  )
                ) : (
                  /* REGISTER MODE */
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
                          Contact Person
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
                          Mobile Phone
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
                        <option value="growth" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          Growth Enterprise (₹2,50,000 initial credits)
                        </option>
                        <option value="enterprise" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          Custom Enterprise (Multi-seat + Priority Telephony)
                        </option>
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
                      <span>Authenticating with ChaanBean...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === "login"
                          ? loginMethod === "otp"
                            ? "Verify OTP & Sign In"
                            : "Sign In with Password"
                          : "Register Enterprise Account"}
                      </span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Navigation Links */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center flex flex-wrap items-center justify-center gap-4 text-xs">
                <Link
                  href="/subscription"
                  className="flex items-center gap-1.5 font-bold text-[#FC8019] hover:text-[#E26D0A] transition"
                >
                  <span>Need a plan? View Subscriptions</span>
                  <ArrowRight size={13} />
                </Link>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <Link
                  href="/landing"
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                >
                  <ArrowLeft size={12} />
                  <span>Platform Overview</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
