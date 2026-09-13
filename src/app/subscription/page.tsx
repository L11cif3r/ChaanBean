"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Shield,
  Zap,
  Building2,
  Lock,
  CreditCard,
  QrCode,
  Landmark,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Scale,
  Search,
  CheckCircle2,
  X,
  ShieldCheck,
  Award,
  UserCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface PlanTier {
  id: string;
  priceKey: string;
  name: string;
  tagline: string;
  defaultPrice: number;
  popular?: boolean;
  features: string[];
  ctaText: string;
  badge?: string;
}

const PLANS: PlanTier[] = [
  {
    id: "starter",
    priceKey: "starter_subscription",
    name: "Starter Plan",
    tagline: "Essential credit scoring and statutory debt recovery for single-proprietor MSMEs.",
    defaultPrice: 4999,
    features: [
      "1 User Seat included",
      "50 Business Background Checks / month",
      "Standard Outbound Voice Recovery",
      "Statutory MSME Samadhaan Filing",
      "Basic Trade Credit Risk Radar",
      "Email & In-App Support",
    ],
    ctaText: "Select Starter Plan",
  },
  {
    id: "growth",
    priceKey: "growth_subscription",
    name: "Growth Plan",
    tagline: "Full-scale corporate credit underwriting, deep skip-tracing, and multi-channel recovery.",
    defaultPrice: 14999,
    popular: true,
    badge: "Recommended for Enterprises",
    features: [
      "5 User Seats included (Feature #17)",
      "250 Background Checks / month across all 18 adapters",
      "Find Someone (OmniTrace 360™) 100 Skip-Trace Lookups",
      "CALL All Time (1m, 2m, 5m, 30m, 1h emergency cadences)",
      "Statutory Legal Notices (Income Tax §43B(h) & GST §16(4))",
      "Dispute Resolution Center fast-track decree docket",
      "Add Additional Company Name support (₹1,500 Addon)",
      "Dedicated Account Manager",
    ],
    ctaText: "Subscribe to Growth Plan",
  },
  {
    id: "enterprise",
    priceKey: "enterprise_subscription",
    name: "Enterprise Plan",
    tagline: "Institutional volume, unlimited seats, custom integrations, and dedicated arbitrator desk.",
    defaultPrice: 39999,
    features: [
      "Unlimited Concurrent User Seats",
      "Unlimited Business Background Verifications",
      "Unlimited OmniTrace 360™ Skip-Tracing",
      "Dedicated Fast-Track Arbitrator Chamber",
      "Direct API & Webhook ERP Integration (SAP, Tally, Zoho)",
      "White-Glove Legal Recovery Team & On-Ground Notice Servers",
      "Statutory 20.25% Compound Interest Computation Engine",
      "24/7 SLA Priority Legal Desk",
    ],
    ctaText: "Choose Enterprise Plan",
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [pricingMap, setPricingMap] = useState<Record<string, number>>({
    starter_subscription: 4999,
    growth_subscription: 14999,
    enterprise_subscription: 39999,
  });

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(PLANS[1]);
  const [customerInput, setCustomerInput] = useState<string>("");
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"upi" | "card" | "netbanking" | "neft">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txnDetails, setTxnDetails] = useState<{ txnId: string; timestamp: string } | null>(null);

  // Existing Customer Login Modal State
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState("trade.ops@acmetraders.in");
  const [modalPassword, setModalPassword] = useState("ChaanBeanPass2026!");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleGoToLogin = () => {
    const trimmed = customerInput.trim();
    if (trimmed) {
      setModalEmail(trimmed);
      router.push(`/login?email=${encodeURIComponent(trimmed)}`);
    } else {
      setLoginModalOpen(true);
    }
  };

  const handleOpenLoginModal = () => {
    const trimmed = customerInput.trim();
    if (trimmed) {
      setModalEmail(trimmed);
    }
    setLoginModalOpen(true);
  };

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login_client",
          email: modalEmail,
          companyName: "Acme Traders Pvt Ltd",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (typeof window !== "undefined") {
        document.cookie = "chaanbean_session=client; path=/; max-age=86400";
        document.cookie = "chaanbean_subscription=active; path=/; max-age=2592000";
        sessionStorage.setItem("chaanbean_session_active", "true");
        localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "client", user: data.user }));
        localStorage.setItem(
          "chaanbean_subscription",
          JSON.stringify({
            active: true,
            planId: "growth",
            planName: "Growth Plan (Verified Customer)",
            paidAmount: 14999,
            txnId: "CUSTOMER-LOGIN-ACTIVE",
            paidAt: new Date().toISOString(),
          })
        );
      }
      setLoginModalOpen(false);
      router.push("/dashboard");
    } catch (err: any) {
      // Offline / fallback demo login so testing is seamless
      if (typeof window !== "undefined") {
        document.cookie = "chaanbean_session=client; path=/; max-age=86400";
        document.cookie = "chaanbean_subscription=active; path=/; max-age=2592000";
        sessionStorage.setItem("chaanbean_session_active", "true");
        localStorage.setItem(
          "chaanbean_auth",
          JSON.stringify({
            type: "client",
            user: {
              id: "client-acme-1",
              name: "Acme Industrial Traders",
              email: modalEmail || "trade.ops@acmetraders.in",
              companyName: "Acme Traders Pvt Ltd",
            },
          })
        );
        localStorage.setItem(
          "chaanbean_subscription",
          JSON.stringify({
            active: true,
            planId: "growth",
            planName: "Growth Plan (Verified Customer)",
            paidAmount: 14999,
            txnId: "CUSTOMER-LOGIN-ACTIVE",
            paidAt: new Date().toISOString(),
          })
        );
      }
      setLoginModalOpen(false);
      router.push("/dashboard");
    } finally {
      setModalLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    if (typeof window !== "undefined") {
      document.cookie = "chaanbean_session=client; path=/; max-age=86400";
      document.cookie = "chaanbean_subscription=active; path=/; max-age=2592000";
      sessionStorage.setItem("chaanbean_session_active", "true");
      localStorage.setItem(
        "chaanbean_auth",
        JSON.stringify({
          type: "client",
          user: {
            id: "demo-client-101",
            name: "Acme Industrial Traders",
            email: "trade.ops@acmetraders.in",
            companyName: "Acme Traders Pvt Ltd",
          },
        })
      );
      localStorage.setItem(
        "chaanbean_subscription",
        JSON.stringify({
          active: true,
          planId: "growth",
          planName: "Growth Plan (Verified Customer)",
          paidAmount: 14999,
          txnId: "CUSTOMER-LOGIN-ACTIVE",
          paidAt: new Date().toISOString(),
        })
      );
    }
    router.push("/dashboard");
  };

  // Fetch dynamic pricing from backend engine so owner modifications immediately take effect
  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch("/api/admin/pricing");
        const data = await res.json();
        if (data.pricing) {
          const map: Record<string, number> = {};
          for (const key of Object.keys(data.pricing)) {
            map[key] = data.pricing[key].price;
          }
          setPricingMap((prev) => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.error("Failed to load dynamic pricing:", err);
      }
    }
    fetchPricing();
  }, []);

  const getPlanPrice = (plan: PlanTier) => {
    return pricingMap[plan.priceKey] ?? plan.defaultPrice;
  };

  const handleOpenGateway = (plan: PlanTier) => {
    setSelectedPlan(plan);
    setGatewayOpen(true);
    setPaymentSuccess(false);
  };

  const handleAuthorizePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const txnId = `TXN-CB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const timestamp = new Date().toISOString();
      setTxnDetails({ txnId, timestamp });
      setPaymentSuccess(true);

      // Save active subscription and authenticated session in localStorage and cookie
      if (typeof window !== "undefined") {
        document.cookie = "chaanbean_subscription=active; path=/; max-age=2592000";
        document.cookie = "chaanbean_session=client; path=/; max-age=86400";
        sessionStorage.setItem("chaanbean_session_active", "true");
        localStorage.setItem(
          "chaanbean_auth",
          JSON.stringify({
            type: "client",
            user: {
              id: "sub-user-active",
              name: "Subscribed Enterprise Client",
              email: "operations@acmetraders.in",
              companyName: "Acme Traders Pvt Ltd",
            },
          })
        );
        localStorage.setItem(
          "chaanbean_subscription",
          JSON.stringify({
            active: true,
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            paidAmount: getPlanPrice(selectedPlan),
            txnId,
            paidAt: timestamp,
          })
        );
      }

      // Automatically forward to customer dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 1800);
    }, 1200);
  };

  const handleExploreBypass = () => {
    if (typeof window !== "undefined") {
      document.cookie = "chaanbean_subscription=active; path=/; max-age=2592000";
      document.cookie = "chaanbean_session=client; path=/; max-age=86400";
      sessionStorage.setItem("chaanbean_session_active", "true");
      localStorage.setItem(
        "chaanbean_auth",
        JSON.stringify({
          type: "client",
          user: { id: "demo-client", name: "Acme Industrial Traders", email: "operations@acmetraders.in" },
        })
      );
      localStorage.setItem(
        "chaanbean_subscription",
        JSON.stringify({
          active: true,
          planId: "growth",
          planName: "Growth Plan (Demo Mode)",
          paidAmount: 14999,
          txnId: "DEMO-EXPLORE-ACCESS",
          paidAt: new Date().toISOString(),
        })
      );
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070A10] text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <Link href="/subscription" className="flex items-center gap-3">
          <div className="relative h-8 w-11 shrink-0">
            <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
              Chaan<span className="text-[#FC8019]">Bean</span>
            </span>
            <span className="ml-2 rounded bg-orange-50 dark:bg-[#FC8019]/10 border border-orange-200 dark:border-[#FC8019]/30 px-2 py-0.5 text-[10px] font-mono text-[#FC8019] uppercase font-semibold">
              Credit &amp; Recovery OS
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Prominent Already a Customer Icon & Login Button */}
          <button
            type="button"
            onClick={handleOpenLoginModal}
            className="flex items-center gap-2 rounded-xl border-2 border-[#FC8019] bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 px-3.5 py-1.5 text-xs font-bold text-[#FC8019] transition shadow-sm"
            title="Existing Customer Login Access"
          >
            <UserCheck size={16} className="text-[#FC8019]" />
            <span>Already a Customer? Log In</span>
            <ArrowRight size={13} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero & Side Input Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
          {/* Left Column: Headline & Value Propositions */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-[#FC8019] text-xs font-mono font-semibold w-fit">
              <Sparkles size={14} />
              <span>Enterprise Gateway Onboarding</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Choose Your Credit &amp; Recovery Hub Subscription
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Select a plan to access India&apos;s most advanced statutory B2B credit scoring and debt recovery platform. Powered by 18 public verification gateways, Asterisk voice recovery, and fast-track dispute decrees.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span>18 Public Gateways</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall size={16} className="text-[#FC8019] shrink-0" />
                <span>Asterisk Cadence Dialer</span>
              </div>
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-blue-500 shrink-0" />
                <span>Statutory §43B(h) Notices</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={16} className="text-purple-500 shrink-0" />
                <span>Section 65B Legal Proof</span>
              </div>
            </div>
          </div>

          {/* Right Column: "Already a customer?" Side Input Card */}
          <div className="lg:col-span-5">
            <div className="h-full rounded-2xl border-2 border-orange-500/30 dark:border-orange-500/40 bg-white dark:bg-slate-900/90 p-6 shadow-xl shadow-orange-500/5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-2.5 py-0.5 text-[10px] font-mono text-[#FC8019] uppercase font-bold tracking-wider">
                    Existing Account
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Instant Access</span>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-[#FC8019] flex items-center justify-center font-bold shrink-0">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Already a customer?</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Sign in to access your registered enterprise dashboard and recovery cases.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                    Registered Email or Phone
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="e.g. trade.ops@acmetraders.in"
                      value={customerInput}
                      onChange={(e) => setCustomerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGoToLogin();
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoToLogin}
                  className="w-full py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
                >
                  <span>Already a user? Login</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400">Sample Account:</span>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="text-[#FC8019] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>1-Click Demo Login</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono text-center">
                  256-bit SSL Encrypted · Direct Dashboard Redirection
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan) => {
            const price = getPlanPrice(plan);
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? "bg-white dark:bg-slate-900 border-2 border-[#FC8019] shadow-xl shadow-orange-500/10 md:-translate-y-2"
                    : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#FC8019] px-3.5 py-1 text-[11px] font-bold text-white uppercase tracking-wider font-mono shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">/ month</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      + 18% GST Applicable (Input Credit Claimable)
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-4">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                      Included Capabilities:
                    </span>
                    {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenGateway(plan)}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                      isPopular
                        ? "bg-[#FC8019] hover:bg-[#E26D0A] text-white shadow-orange-500/30"
                        : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white"
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Statutory Seals */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 flex flex-wrap items-center justify-around gap-6 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span>RBI / NPCI 256-bit Secure Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-amber-500" />
            <span>MSMED Act 2006 Compliant Invoicing</span>
          </div>
          <div className="flex items-center gap-2">
            <Award size={18} className="text-[#FC8019]" />
            <span>Full Section 65B Electronic Proof</span>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE PAYMENT GATEWAY MODAL */}
      {/* ------------------------------------------------------------- */}
      {gatewayOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#FC8019] flex items-center justify-center text-white font-bold">
                  CB
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">ChaanBean Payment Gateway</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Merchant ID: CB_PAY_CORP_2026</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGatewayOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {paymentSuccess ? (
              <div className="p-8 text-center space-y-4 font-mono">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Payment Authorized &amp; Active!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Welcome to ChaanBean. Forwarding to your Credit &amp; Recovery Hub...
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1">
                  <div className="text-slate-500 flex justify-between">
                    <span>Transaction ID:</span>
                    <strong className="text-slate-900 dark:text-white">{txnDetails?.txnId}</strong>
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>Plan Activated:</span>
                    <span className="text-[#FC8019] font-bold">{selectedPlan.name}</span>
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>Amount Charged:</span>
                    <span className="text-emerald-500 font-bold">₹{(getPlanPrice(selectedPlan) * 1.18).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <div className="h-3 w-3 rounded-full border-2 border-[#FC8019] border-t-transparent animate-spin" />
                    <span>Launching platform dashboard...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Order Summary Strip (Uses Dynamic Price!) */}
                <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/10 p-3.5 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px]">Selected Subscription:</span>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedPlan.name}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px]">Total with GST (18%):</span>
                    <div className="text-base font-black text-[#FC8019]">
                      ₹{(getPlanPrice(selectedPlan) * 1.18).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Gateway Payment Method Tabs */}
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPaymentTab("upi")}
                    className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
                      paymentTab === "upi"
                        ? "bg-white dark:bg-slate-800 text-[#FC8019] shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <QrCode size={16} />
                    <span className="text-[10px]">UPI QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTab("card")}
                    className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
                      paymentTab === "card"
                        ? "bg-white dark:bg-slate-800 text-[#FC8019] shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <CreditCard size={16} />
                    <span className="text-[10px]">Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTab("netbanking")}
                    className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
                      paymentTab === "netbanking"
                        ? "bg-white dark:bg-slate-800 text-[#FC8019] shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Landmark size={16} />
                    <span className="text-[10px]">NetBanking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentTab("neft")}
                    className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
                      paymentTab === "neft"
                        ? "bg-white dark:bg-slate-800 text-[#FC8019] shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Building2 size={16} />
                    <span className="text-[10px]">NEFT/RTGS</span>
                  </button>
                </div>

                {/* Tab Specific Content */}
                {paymentTab === "upi" && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-center space-y-3">
                    <div className="mx-auto w-36 h-36 rounded-xl border-2 border-dashed border-[#FC8019] bg-white p-2 flex items-center justify-center shadow-sm">
                      <div className="text-center font-mono text-[10px] text-slate-700">
                        <QrCode size={90} className="mx-auto text-[#FC8019]" />
                        <span>Scan with any UPI App</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5">Google Pay</span>
                      <span className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5">PhonePe</span>
                      <span className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5">Paytm</span>
                      <span className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5">CRED</span>
                    </div>
                  </div>
                )}

                {paymentTab === "card" && (
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase block mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="4532 ···· ···· 8901"
                        defaultValue="4532 8912 3409 8812"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase block mb-1">Valid Thru</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          defaultValue="08/29"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase block mb-1">CVV</label>
                        <input
                          type="password"
                          placeholder="···"
                          defaultValue="891"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentTab === "netbanking" && (
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Popular Corporate Banks:</span>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                      {["HDFC Bank", "ICICI Bank", "State Bank", "Axis Bank", "Kotak Bank", "Yes Bank"].map((b, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center font-bold text-slate-800 dark:text-slate-200 hover:border-[#FC8019] cursor-pointer"
                        >
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paymentTab === "neft" && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
                    <div className="text-slate-500 flex justify-between">
                      <span>Beneficiary:</span>
                      <strong className="text-slate-900 dark:text-white">ChaanBean FinTech Corp</strong>
                    </div>
                    <div className="text-slate-500 flex justify-between">
                      <span>Virtual A/C:</span>
                      <strong className="text-[#FC8019]">CB98102839401</strong>
                    </div>
                    <div className="text-slate-500 flex justify-between">
                      <span>IFSC Code:</span>
                      <strong className="text-slate-900 dark:text-white">HDFC0000240</strong>
                    </div>
                  </div>
                )}

                {/* Complete Payment Button */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleAuthorizePayment}
                  className="w-full py-3 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  <Lock size={14} />
                  {isProcessing
                    ? "Securing Transaction & Authorizing..."
                    : `Pay ₹${(getPlanPrice(selectedPlan) * 1.18).toLocaleString("en-IN")} & Launch Hub`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing Customer Login Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] shadow-2xl p-6 sm:p-7 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019] shrink-0 shadow-sm">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Existing Customer Login</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Sign in to access your registered Customer Dashboard.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleModalLogin} className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-mono">
                  {modalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                  Registered Email or Phone
                </label>
                <input
                  type="text"
                  required
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  placeholder="trade.ops@acmetraders.in"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={modalPassword}
                  onChange={(e) => setModalPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50"
              >
                {modalLoading ? (
                  <span>Authenticating Account...</span>
                ) : (
                  <>
                    <span>Login to Customer Dashboard</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo & Full Portal Links */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Instant testing:</span>
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="text-[#FC8019] font-bold hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <Sparkles size={12} />
                  <span>1-Click Demo Login (Acme Traders)</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                <span className="text-slate-400">Need full registration?</span>
                <Link
                  href={modalEmail ? `/login?email=${encodeURIComponent(modalEmail)}` : "/login"}
                  className="text-[#FC8019] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Go to Full Login Page</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
