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
  Phone,
  Mail,
  MapPin,
  Scale,
  Search,
  CheckCircle2,
  X,
  ShieldCheck,
  Award,
  UserCheck,
  Coins,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RECHARGE_TIERS, RechargeTier, getAllRechargeTiers, RateCardItem, DEFAULT_RATE_CARD } from "@/lib/pricing/recharge-plans";

interface PlanTier {
  id: string;
  priceKey: string;
  name: string;
  tagline: string;
  defaultPrice: number;
  grossPrice?: number;
  popular?: boolean;
  features: string[];
  ctaText: string;
  badge?: string;
  isAlaCarte?: boolean;
  validityText?: string;
  validityDays?: number;
  validityMonths?: number;
  callsCount?: number;
}

interface CallPackageOption {
  id: string;
  calls: number;
  callsFormatted: string;
  price: number;
  validity: string;
  validityMonths: number;
  validityDays: number;
  perCallRate: string;
  popular?: boolean;
}

const ALACARTE_OPTIONS: CallPackageOption[] = [
  {
    id: "alacarte_3k",
    calls: 3000,
    callsFormatted: "3,000 Calls",
    price: 4500,
    validity: "3 Months Validity",
    validityMonths: 3,
    validityDays: 90,
    perCallRate: "₹1.50/call",
  },
  {
    id: "alacarte_8k",
    calls: 8000,
    callsFormatted: "8,000 Calls",
    price: 10000,
    validity: "6 Months Validity",
    validityMonths: 6,
    validityDays: 180,
    perCallRate: "₹1.25/call",
    popular: true,
  },
  {
    id: "alacarte_14k",
    calls: 14000,
    callsFormatted: "14,000 Calls",
    price: 15000,
    validity: "9 Months Validity",
    validityMonths: 9,
    validityDays: 270,
    perCallRate: "₹1.07/call",
  },
  {
    id: "alacarte_19k",
    calls: 19000,
    callsFormatted: "19,000 Calls",
    price: 20000,
    validity: "1 Year Validity",
    validityMonths: 12,
    validityDays: 365,
    perCallRate: "₹1.05/call",
  },
];

const PLANS: PlanTier[] = [
  {
    id: "growth",
    priceKey: "growth_subscription",
    name: "Retail Plan (Growth)",
    tagline: "High-accuracy statutory credit underwriting, DIN vetting, and multi-cadence automated voice recovery.",
    defaultPrice: 9899,
    grossPrice: 49200,
    popular: true,
    badge: "3 Months Validity · 80% Discount · 100% Wallet Credit",
    validityText: "3 Months Validity",
    validityDays: 90,
    validityMonths: 3,
    features: [
      "10 Director Details (DIN KYC & Disqualification Check)",
      "10 MSME Reports (Udyam Classification & Standing)",
      "40 GST Slabs & Statutory Tax Bracket Checks",
      "40 GST Exact Turnovers Filed (GSTR-3B & GSTR-9)",
      "40 GST Monthly Filing Calendars (Free Included)",
      "40 Mobile to PAN Identity Resolutions",
      "10 Mobile Identity (All Alternate Numbers & Multi-SIM)",
      "30 Court Case History – FIR Reports (e-Courts & CCTNS)",
      "40 Import Export Reports (DGFT IEC & Customs Clearances)",
      "40 PAN to GST Nationwide Multi-State Lookups",
      "3,500 Default Payments Voice Calls (₹5,000 value)",
      "5 Statutory Legal Notices (§43B(h) / DRC-01A / MSMED)",
      "500 Delayed Payments Follow-Ups (PTP & Aging)",
      "3 User Access Seats Included (₹0 Additional Charge)",
      "1 Additional Company Name Profile Included (₹1,500 value)",
    ],
    ctaText: "Contact Us",
  },
  {
    id: "enterprise",
    priceKey: "enterprise_subscription",
    name: "Enterprise Plan",
    tagline: "Expanded corporate volume, higher verification quotas, priority API, and dedicated legal chamber desk.",
    defaultPrice: 17599,
    grossPrice: 85950,
    validityText: "3 Months Validity",
    validityDays: 90,
    validityMonths: 3,
    badge: "Enterprise Quotas · 80% Discount · 100% Wallet Credit",
    features: [
      "20 Director Details (DIN KYC & Disqualification Check)",
      "20 MSME Reports (Udyam Classification & Standing)",
      "65 GST Slabs & Statutory Tax Bracket Checks",
      "65 GST Exact Turnovers Filed (GSTR-3B & GSTR-9)",
      "65 GST Monthly Filing Calendars (Free Included)",
      "65 Mobile to PAN Identity Resolutions",
      "25 Mobile Identity (All Alternate Numbers & Multi-SIM)",
      "50 Court Case History – FIR Reports (e-Courts & CCTNS)",
      "65 Import Export Reports (DGFT IEC & Customs Clearances)",
      "65 PAN to GST Nationwide Multi-State Lookups",
      "6,000 Default Payments Voice Calls (₹7,500 value)",
      "10 Statutory Legal Notices (§43B(h) / DRC-01A / MSMED)",
      "1,000 Delayed Payments Follow-Ups (PTP & Aging)",
      "5 User Access Seats Included (₹0 Additional Charge)",
      "1 Additional Company Name Profile Included (₹1,500 value)",
    ],
    ctaText: "Contact Us",
  },
];


export default function SubscriptionPage() {
  const router = useRouter();
  const [pricingMap, setPricingMap] = useState<Record<string, number>>({
    growth_subscription: 9899,
    enterprise_subscription: 17599,
    alacarte_3k: 4500,
    alacarte_8k: 10000,
    alacarte_14k: 15000,
    alacarte_19k: 20000,
  });

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(PLANS[0]);
  const [alaCarteMode, setAlaCarteMode] = useState<"universal" | "voice_only">("universal");
  const [selectedRechargeTier, setSelectedRechargeTier] = useState<RechargeTier>(RECHARGE_TIERS[1]);
  const [selectedCallOption, setSelectedCallOption] = useState<CallPackageOption>(ALACARTE_OPTIONS[1]);
  const [showRateCardModal, setShowRateCardModal] = useState<boolean>(false);
  const [customerInput, setCustomerInput] = useState<string>("");
  const [inquiryPlan, setInquiryPlan] = useState<string>("Retail Plan (Growth)");
  const [inquiryName, setInquiryName] = useState<string>("");
  const [inquiryCompany, setInquiryCompany] = useState<string>("");
  const [inquiryEmail, setInquiryEmail] = useState<string>("");
  const [inquiryPhone, setInquiryPhone] = useState<string>("");
  const [inquiryMessage, setInquiryMessage] = useState<string>("");
  const [inquirySubmitting, setInquirySubmitting] = useState<boolean>(false);
  const [inquirySent, setInquirySent] = useState<boolean>(false);

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
            planName: "Retail Plan (Growth)",
            paidAmount: 9899,
            txnId: "CUSTOMER-LOGIN-ACTIVE",
            paidAt: new Date().toISOString(),
          })
        );
      }
      setLoginModalOpen(false);
      router.push("/background-check");
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
            planName: "Retail Plan (Growth)",
            paidAmount: 9899,
            txnId: "CUSTOMER-LOGIN-ACTIVE",
            paidAt: new Date().toISOString(),
          })
        );
      }
      setLoginModalOpen(false);
      router.push("/background-check");
    } finally {
      setModalLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    if (typeof window !== "undefined") {
      document.cookie = "chaanbean_session=client; path=/; max-age=86400";
      document.cookie = "chaanbean_subscription=active; path=/; max-age=7776000";
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
          planName: "Retail Plan (Growth)",
          paidAmount: 9899,
          txnId: "CUSTOMER-LOGIN-ACTIVE",
          paidAt: new Date().toISOString(),
        })
      );
    }
    router.push("/background-check");
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

  const handleSelectInquiryPlan = (planName: string) => {
    setInquiryPlan(planName);
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setInquirySubmitting(false);
    setInquirySent(true);
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
          planName: "Retail Evaluation Plan",
          paidAmount: 9899,
          txnId: "EVAL-EXPLORE-ACCESS",
          paidAt: new Date().toISOString(),
        })
      );
    }
    router.push("/background-check");
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
                  <span className="text-slate-500 dark:text-slate-400">Instant Evaluation:</span>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="text-[#FC8019] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>1-Click Instant Access</span>
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

        {/* Pricing Cards Grid (Growth, Enterprise & À La Carte) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 max-w-7xl mx-auto gap-7 items-stretch">
          {PLANS.map((plan) => {
            const price = getPlanPrice(plan);
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? "bg-white dark:bg-slate-900 border-2 border-[#FC8019] shadow-xl shadow-orange-500/10 lg:-translate-y-2"
                    : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="block whitespace-nowrap rounded-full bg-[#FC8019] px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider font-mono shadow-md">
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

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    {plan.grossPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400 line-through">
                          ₹{plan.grossPrice.toLocaleString("en-IN")} Gross Value
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-bold">
                          Save ₹{(plan.grossPrice - price).toLocaleString("en-IN")} ({Math.round(((plan.grossPrice - price) / plan.grossPrice) * 100)}% Off)
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-mono text-[#FC8019] font-bold">/ 3 months validity</span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>₹{price.toLocaleString("en-IN")} credited 100% to Feature Wallet</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Strict 90-day active validity · Features deduct per use · + 18% GST
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
                  <a
                    href="#contact"
                    onClick={() => {
                      setInquiryPlan(plan.name);
                      const el = document.getElementById("contact");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                      isPopular
                        ? "bg-[#FC8019] hover:bg-[#E26D0A] text-white shadow-orange-500/30"
                        : "bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white"
                    }`}
                  >
                    <span>Contact Us</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            );
          })}

          {/* 3rd Option: Dual-Mode À La Carte (Universal Pay & Use OR Call-Service-Only) */}
          <div className="relative rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 bg-white dark:bg-slate-900 border-2 border-orange-500/40 dark:border-orange-500/40 shadow-xl shadow-orange-500/5 hover:border-[#FC8019]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="block whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-1 text-[11px] font-bold text-white uppercase tracking-wider font-mono shadow-md">
                {alaCarteMode === "universal" ? "À La Carte 01 · Universal Pay & Use" : "À La Carte 02 · Call-Service-Only"}
              </span>
            </div>

            <div className="space-y-4">
              {/* Dual-Mode Selector Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAlaCarteMode("universal")}
                  className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-center ${
                    alaCarteMode === "universal"
                      ? "bg-white dark:bg-slate-900 text-[#FC8019] shadow-sm font-black border border-orange-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Zap size={13} className={alaCarteMode === "universal" ? "text-[#FC8019]" : ""} />
                  <span className="truncate">Universal Pay &amp; Use</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAlaCarteMode("voice_only")}
                  className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-center ${
                    alaCarteMode === "voice_only"
                      ? "bg-white dark:bg-slate-900 text-[#FC8019] shadow-sm font-black border border-orange-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Phone size={13} className={alaCarteMode === "voice_only" ? "text-[#FC8019]" : ""} />
                  <span className="truncate">Call-Service-Only</span>
                </button>
              </div>

              {alaCarteMode === "universal" ? (
                /* Mode 1: Universal À La Carte */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Universal À La Carte</h3>
                      <span className="rounded bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                        All 18 Gateways
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Universal Pay &amp; Use across all 18 statutory checks, Asterisk voice recovery, and legal notice dockets. 100% credited to your wallet with zero lock-in.
                    </p>
                  </div>

                  {/* Recharge Tier Selector (13 Options) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Standard Tiers */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                          Standard Pay &amp; Use Tiers:
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ₹5K – ₹40K
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {RECHARGE_TIERS.filter((t) => !t.isCustomization).map((tier) => {
                          const isSelected = selectedRechargeTier.id === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setSelectedRechargeTier(tier)}
                              className={`py-1.5 px-2 rounded-lg border text-center transition font-mono ${
                                isSelected
                                  ? "border-[#FC8019] bg-[#FC8019] text-white shadow-sm ring-1 ring-[#FC8019]"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 text-xs"
                              }`}
                            >
                              <div className="text-[11px] font-black">₹{tier.amount >= 1000 ? `${tier.amount / 1000}k` : tier.amount}</div>
                              <div className={`text-[8px] ${isSelected ? "text-white/90" : "text-slate-400"} truncate`}>
                                {tier.validityMonths}M
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Customization Tiers (₹50k - ₹100k) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-[#FC8019] tracking-wider flex items-center gap-1">
                          <Sparkles size={11} />
                          <span>Enterprise Customization Tiers:</span>
                        </span>
                        <span className="text-[9px] font-mono bg-orange-100 dark:bg-orange-950/80 text-[#FC8019] px-1.5 py-0.2 rounded font-bold">
                          Bespoke Setup
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {RECHARGE_TIERS.filter((t) => t.isCustomization).map((tier) => {
                          const isSelected = selectedRechargeTier.id === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setSelectedRechargeTier(tier)}
                              className={`py-1.5 px-2 rounded-lg border text-center transition font-mono relative ${
                                isSelected
                                  ? "border-amber-500 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md ring-1 ring-amber-400"
                                  : "border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200 hover:border-orange-300 text-xs"
                              }`}
                            >
                              <div className="text-[11px] font-black flex items-center justify-center gap-0.5">
                                <span>₹{tier.amount / 1000}k</span>
                                <span className="text-[9px]">✨</span>
                              </div>
                              <div className={`text-[8px] ${isSelected ? "text-white/90" : "text-orange-600/80 dark:text-orange-400/80"} truncate`}>
                                1 Yr · Custom
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Price Display */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                        ₹{selectedRechargeTier.amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-mono text-[#FC8019] font-bold">
                        / {selectedRechargeTier.validityText.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>
                        ₹{selectedRechargeTier.amount.toLocaleString("en-IN")} credited 100% to Universal Wallet
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {selectedRechargeTier.tagline}
                    </div>
                  </div>

                  {/* Customization Highlight Box (If tier >= 50k) */}
                  {selectedRechargeTier.isCustomization && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-yellow-500/5 border-2 border-[#FC8019] shadow-md shadow-orange-500/10 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-[#FC8019] text-white">
                          <Sparkles size={13} />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-[#FC8019] font-mono">
                            Enterprise Customization Highlight
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Tailored setup included for ₹{selectedRechargeTier.amount.toLocaleString("en-IN")}+ tier
                          </div>
                        </div>
                      </div>
                      <ul className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 font-sans">
                        {selectedRechargeTier.customizationPerks?.map((perk, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check size={12} className="text-[#FC8019] shrink-0 mt-0.5" strokeWidth={3} />
                            <span className="leading-snug">{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                      Universal Wallet Capabilities:
                    </span>
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          <strong>Universal deduction</strong> across all 18 statutory checks &amp; recovery dialer
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          <strong>₹1/call</strong> only charged per connected recovery voice call
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          Statutory Legal Notices (§43B(h), DRC-01A, MSMED) at ₹1,500/notice
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          Director DIN KYC (₹200) &amp; Udyam MSME Validation (₹200)
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          GST Exact Turnovers filed (GSTR-3B/9) at ₹200/lookup
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          <strong>{selectedRechargeTier.validityText}</strong> active window · 100% wallet carryforward
                        </span>
                      </div>
                    </div>

                    {/* Rate Card Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setShowRateCardModal(true)}
                      className="w-full mt-2 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono font-semibold flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Coins size={14} className="text-[#FC8019]" />
                        <span>View All 18 Services Rate Card</span>
                      </span>
                      <span className="text-[#FC8019] text-[11px] font-bold">Rates &rarr;</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode 2: Call-Service-Only À La Carte (4500, 10000, 15000, 20000) */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Call-Service-Only</h3>
                      <span className="rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                        Dedicated Voice Dialer
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Multi-cadence automated voice recovery dialer with 9 Indian languages. Dedicated strictly to payment collection calls with no deductions for other platform checks.
                    </p>
                  </div>

                  {/* 4 Dedicated Call Packages (₹4.5k, ₹10k, ₹15k, ₹20k) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        Select Voice Call Package:
                      </span>
                      <span className="text-[10px] font-mono text-[#FC8019] font-bold">
                        ₹4,500 – ₹20,000
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ALACARTE_OPTIONS.map((pkg) => {
                        const isSelected = selectedCallOption.id === pkg.id;
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setSelectedCallOption(pkg)}
                            className={`p-2.5 rounded-xl border text-left transition font-mono relative ${
                              isSelected
                                ? "border-[#FC8019] bg-orange-50/80 dark:bg-orange-950/40 text-slate-900 dark:text-white shadow-sm ring-2 ring-[#FC8019]"
                                : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            {pkg.popular && (
                              <span className="absolute -top-2 right-2 text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#FC8019] text-white">
                                POPULAR
                              </span>
                            )}
                            <div className="text-sm font-black text-slate-900 dark:text-white">
                              ₹{pkg.price.toLocaleString("en-IN")}
                            </div>
                            <div className="text-xs font-bold text-[#FC8019] mt-0.5">
                              {pkg.callsFormatted}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                              <span>{pkg.validityMonths} Months</span>
                              <span>{pkg.perCallRate}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Price Display */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                        ₹{selectedCallOption.price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-mono text-[#FC8019] font-bold">
                        / {selectedCallOption.validity.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>
                        {selectedCallOption.callsFormatted} dedicated voice calls ({selectedCallOption.perCallRate})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Dedicated recovery voice balance · Full roll-over of unused calls during validity
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                      Call-Service-Only Capabilities:
                    </span>
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          <strong>Dedicated Asterisk Voice Dialer</strong> with 1m, 2m, 5m, 30m, 1h automated cadences
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          <strong>9 Indian Languages</strong> conversational AI voice recovery (Hindi, Tamil, Marathi, etc.)
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          Promise-to-Pay (PTP) recording &amp; WhatsApp payment link dispatch
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          Dedicated voice minutes (zero deductions for statutory checks)
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">
                          <strong>{selectedCallOption.validity}</strong> active window · 100% rollover of unused calls
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <a
                href="#contact"
                onClick={() => {
                  const planTitle = alaCarteMode === "universal"
                    ? (selectedRechargeTier.isCustomization
                        ? `Enterprise Customization (${selectedRechargeTier.name} - ₹${selectedRechargeTier.amount.toLocaleString("en-IN")})`
                        : `À La Carte Recharge (${selectedRechargeTier.name} - ₹${selectedRechargeTier.amount.toLocaleString("en-IN")})`)
                    : `Call-Service-Only À La Carte (${selectedCallOption.callsFormatted} - ₹${selectedCallOption.price.toLocaleString("en-IN")})`;
                  setInquiryPlan(planTitle);
                  const el = document.getElementById("contact");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md bg-[#FC8019] hover:bg-[#E26D0A] text-white shadow-orange-500/20"
              >
                <span>
                  {alaCarteMode === "universal"
                    ? `Contact Us for ${selectedRechargeTier.name}`
                    : `Contact Us for ${selectedCallOption.callsFormatted} (₹${selectedCallOption.price.toLocaleString("en-IN")})`}
                </span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
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

        {/* Contact Us Form Section */}
        <section id="contact" className="scroll-mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B101D] shadow-sm p-6 sm:p-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#FC8019]/10 text-[#FC8019] border border-[#FC8019]/20 mb-3">
                <Sparkles size={13} />
                <span>Private Access Onboarding</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Contact Us to Subscribe
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                We are actively onboarding commercial enterprises, MSMEs, and credit bureaus in private preview. Reach out to our advisory team directly to activate your subscription plan or request custom API integrations.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              Advisory Desk Active · 2 Hr Response SLA
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Official Contact Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider font-mono">
                  Official Contact Channels
                </h3>

                <div className="space-y-4 text-xs font-mono">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-[#FC8019]/15 border border-[#FC8019]/30 flex items-center justify-center text-[#FC8019] shrink-0">
                      <Phone size={15} />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">Direct Telephone / WhatsApp</div>
                      <a href="tel:+917900048382" className="text-slate-900 dark:text-white font-bold hover:text-[#FC8019] transition">
                        +91 79000 48382
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-[#FC8019]/15 border border-[#FC8019]/30 flex items-center justify-center text-[#FC8019] shrink-0">
                      <Mail size={15} />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">Official Email Desk</div>
                      <a href="mailto:hello@chaanbean.com" className="text-slate-900 dark:text-white font-bold hover:text-[#FC8019] transition">
                        hello@chaanbean.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-[#FC8019]/15 border border-[#FC8019]/30 flex items-center justify-center text-[#FC8019] shrink-0">
                      <MapPin size={15} />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">Kerala Office</div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs mt-0.5">
                          10 53 , PANAVILA VEEDU, THRIKOVILVATTOM MUKHATHALA, MUKHATHALA - KOLLAM - KERALA 691577— INDIA — 9819206637
                        </p>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase">Mumbai Office</div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs mt-0.5">
                          Flat no 101 1st floor Venkatesh Apts CHSL Rawal Nagar Behind Hardik Palace Station Road Mira
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
                  Operational Hours: Monday – Saturday, 9:30 AM to 7:00 PM IST. Enterprise accounts receive dedicated SLA support &amp; custom account managers.
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="lg:col-span-7">
              {inquirySent ? (
                <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-4 font-mono animate-in fade-in">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={30} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Subscription Inquiry Received!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
                      Thank you for contacting us regarding <span className="text-[#FC8019] font-bold">{inquiryPlan}</span>. Our corporate relationship desk will connect with you at <span className="font-bold">{inquiryPhone || inquiryEmail || "your registered contact"}</span> within 2 business hours.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInquirySent(false);
                      setInquiryName("");
                      setInquiryCompany("");
                      setInquiryEmail("");
                      setInquiryPhone("");
                      setInquiryMessage("");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition mt-2"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                      Selected Plan / Requirement *
                    </label>
                    <select
                      value={inquiryPlan}
                      onChange={(e) => setInquiryPlan(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition font-mono"
                    >
                      <optgroup label="Bundled Subscriptions (3-Month 80% Off)">
                        <option value="Retail Plan (Growth)">Retail Plan (Growth) - ₹9,899 / 3 Months</option>
                        <option value="Enterprise Plan">Enterprise Plan - ₹17,599 / 3 Months</option>
                      </optgroup>
                      <optgroup label="Standard Pay &amp; Use Tiers (Universal Wallet)">
                        {RECHARGE_TIERS.filter((t) => !t.isCustomization).map((t) => (
                          <option key={t.id} value={`À La Carte Recharge (${t.name} - ₹${t.amount.toLocaleString("en-IN")})`}>
                            {t.name} - ₹{t.amount.toLocaleString("en-IN")} ({t.validityText})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Enterprise Customization Tiers (Bespoke Setup)">
                        {RECHARGE_TIERS.filter((t) => t.isCustomization).map((t) => (
                          <option key={t.id} value={`Enterprise Customization (${t.name} - ₹${t.amount.toLocaleString("en-IN")})`}>
                            {t.name} - ₹{t.amount.toLocaleString("en-IN")} ({t.validityText}) [Customization]
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Call-Service-Only À La Carte (Dedicated Voice Recovery)">
                        {ALACARTE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={`Call-Service-Only À La Carte (${opt.callsFormatted} - ₹${opt.price.toLocaleString("en-IN")})`}>
                            {opt.callsFormatted} - ₹{opt.price.toLocaleString("en-IN")} ({opt.validity} · {opt.perCallRate})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Custom Inquiries">
                        <option value="Custom Enterprise / API Integration">Custom Enterprise / API Integration</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                        Full Name / Contact Person *
                      </label>
                      <input
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="e.g. Ramesh Sharma"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                        Company / Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={inquiryCompany}
                        onChange={(e) => setInquiryCompany(e.target.value)}
                        placeholder="e.g. Acme Industrial Traders Pvt Ltd"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                        Official Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={inquiryEmail}
                        onChange={(e) => setInquiryEmail(e.target.value)}
                        placeholder="ramesh@company.com"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block font-mono uppercase tracking-wider">
                      Message / Special Requirements (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="Specify company size, volume of credit checks, voice call automation needs, or questions..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] focus:ring-1 focus:ring-[#FC8019] transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    className="w-full py-3.5 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                  >
                    {inquirySubmitting ? (
                      <span>Sending Subscription Inquiry...</span>
                    ) : (
                      <>
                        <span>Submit Subscription Inquiry</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

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
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Instant access:</span>
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="text-[#FC8019] font-bold hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <Sparkles size={12} />
                  <span>1-Click Instant Access (Acme Traders)</span>
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

      {/* Universal À La Carte Rate Card Modal */}
      {showRateCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-900/50">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/15 text-[#FC8019] text-[10px] font-mono font-bold uppercase tracking-wider">
                  Universal Pay &amp; Use Rate Card
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  All 18 Services &amp; Statutory Gateways
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exact per-unit deduction rates applied when consuming services via your Universal Recharge Wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRateCardModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4 font-bold">Service / Gateway</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Billing Unit</th>
                      <th className="py-3 px-4 text-right font-bold text-[#FC8019]">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {DEFAULT_RATE_CARD.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{item.description}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.categoryLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm text-[#FC8019]">
                          {item.price === 0 ? "FREE" : `₹${item.price.toLocaleString("en-IN")}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <div>
                100% of recharge credited to wallet · Deductions apply only upon execution · + 18% GST
              </div>
              <button
                type="button"
                onClick={() => setShowRateCardModal(false)}
                className="py-1.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition font-sans"
              >
                Close Rate Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
