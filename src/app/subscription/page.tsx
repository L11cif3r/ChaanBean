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
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"upi" | "card" | "netbanking" | "neft">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txnDetails, setTxnDetails] = useState<{ txnId: string; timestamp: string } | null>(null);

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

      // Save active subscription in localStorage and cookie
      if (typeof window !== "undefined") {
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
        document.cookie = "chaanbean_subscription=active; path=/; max-age=2592000";
      }

      // Automatically forward to platform dashboard after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 1800);
    }, 1200);
  };

  const handleExploreBypass = () => {
    if (typeof window !== "undefined") {
      document.cookie = "chaanbean_subscription=active; path=/; max-age=2592000";
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
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070A10] text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-3">
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

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleExploreBypass}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#FC8019] transition underline"
          >
            Bypass / Explore Demo Mode →
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-[#FC8019] text-xs font-mono font-semibold">
            <Sparkles size={14} />
            <span>Enterprise Gateway Onboarding</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Choose Your Credit &amp; Recovery Hub Subscription
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Select a plan to access India&apos;s most advanced statutory B2B credit scoring and debt recovery platform. Powered by 18 public verification gateways, Asterisk voice recovery, and fast-track dispute decrees.
          </p>
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
    </div>
  );
}
