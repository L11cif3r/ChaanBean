"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wallet,
  Coins,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Download,
  AlertCircle,
  PhoneCall,
  Scale,
  Building2,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Check,
  CreditCard,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import {
  RECHARGE_TIERS,
  RechargeTier,
  DEFAULT_RATE_CARD,
  RateCardItem,
} from "@/lib/pricing/recharge-plans";

interface WalletLedgerItem {
  id: string;
  createdAt: string;
  amount: number;
  type: "credit" | "debit";
  featureKey?: string;
  description: string;
  balanceAfter: number;
}

export default function WalletHubPage() {
  const [balance, setBalance] = useState<number>(10000);
  const [plan, setPlan] = useState<string>("pay_and_use");
  const [daysRemaining, setDaysRemaining] = useState<number>(90);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Alright Trade");
  const [ledger, setLedger] = useState<WalletLedgerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recharging, setRecharging] = useState<boolean>(false);
  const [rechargeSuccess, setRechargeSuccess] = useState<string | null>(null);

  // Selected recharge tier
  const [selectedTier, setSelectedTier] = useState<RechargeTier>(RECHARGE_TIERS[1]); // ₹10,000 default
  const [tierCategory, setTierCategory] = useState<"standard" | "customization">("standard");

  // Rate card filtering
  const [rateCardSearch, setRateCardSearch] = useState<string>("");
  const [rateCardCategory, setRateCardCategory] = useState<string>("all");

  // Confirmation modal
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wallet");
      const data = await res.json();
      if (typeof data.walletBalance === "number") {
        setBalance(data.walletBalance);
      }
      if (typeof data.daysRemaining === "number") {
        setDaysRemaining(data.daysRemaining);
      }
      if (data.plan) {
        setPlan(data.plan);
      }
      if (data.subscriptionExpiresAt) {
        setExpiresAt(data.subscriptionExpiresAt);
      }
      if (data.companyName && data.companyName !== "Rival Zenith Logistics") {
        setCompanyName(data.companyName);
      }
      if (Array.isArray(data.ledger)) {
        setLedger(data.ledger);
      }
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleExecuteRecharge = async (tier: RechargeTier) => {
    setRecharging(true);
    setRechargeSuccess(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recharge",
          amount: tier.amount,
          tierId: tier.id,
          validityDays: tier.validityDays,
          notes: `${tier.name} (${tier.isCustomization ? "Enterprise Customization" : "Universal Pay & Use"})`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBalance(data.walletBalance);
        setPlan(data.plan);
        setRechargeSuccess(`Successfully recharged ₹${tier.amount.toLocaleString("en-IN")} into your Universal Wallet!`);
        setConfirmModalOpen(false);

        // Notify other components (Header, workbench)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("chaanbean:wallet-updated"));
        }

        await fetchWallet();
      } else {
        alert(data.error || "Failed to recharge wallet.");
      }
    } catch (err) {
      console.error("Recharge error:", err);
      alert("Network error processing recharge.");
    } finally {
      setRecharging(false);
    }
  };

  const filteredRateCard = DEFAULT_RATE_CARD.filter((item) => {
    const matchesCategory =
      rateCardCategory === "all" ||
      (rateCardCategory === "verification" && item.category === "verification") ||
      (rateCardCategory === "recovery" && item.category === "recovery") ||
      (rateCardCategory === "legal" && (item.category === "legal" || item.category === "addon"));

    const matchesSearch =
      rateCardSearch.trim() === "" ||
      item.name.toLowerCase().includes(rateCardSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(rateCardSearch.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(rateCardSearch.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070A10] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb / Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/background-check" className="hover:text-[#FC8019] transition">
                Portal
              </Link>
              <span>/</span>
              <span className="text-[#FC8019] font-bold">Universal Wallet Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Wallet className="text-[#FC8019]" size={28} />
              <span>Universal Pay &amp; Use Wallet Hub</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Recharge on-demand credits for all 18 statutory verification gateways, Asterisk automated voice recovery, and advocate-vetted legal notices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchWallet}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Refresh Wallet Balance"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-[#FC8019]" : ""} />
            </button>
            <Link
              href="/subscription"
              className="px-4 py-2.5 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/80 dark:bg-orange-500/10 text-[#FC8019] hover:bg-orange-100 text-xs font-bold transition flex items-center gap-2"
            >
              <span>Explore 3-Month Bundles</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {rechargeSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-mono animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <span>{rechargeSuccess}</span>
            </div>
            <button
              onClick={() => setRechargeSuccess(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:opacity-80"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Live Balance & Key Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Balance */}
          <div className="p-6 rounded-2xl border-2 border-orange-500/40 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">
                Available Wallet Balance
              </span>
              <span className="p-2 rounded-xl bg-[#FC8019] text-white shadow-sm">
                <Coins size={18} />
              </span>
            </div>
            <div className="my-4">
              <div className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                ₹{balance.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <CheckCircle2 size={12} />
                <span>100% active · Valid for all 18 gateways &amp; recovery</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
              <span>Tenant: {companyName}</span>
              <span className="text-[#FC8019] font-bold">Universal</span>
            </div>
          </div>

          {/* Card 2: Validity */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">
                Active Validity
              </span>
              <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Clock size={18} />
              </span>
            </div>
            <div className="my-4">
              <div className="text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                {daysRemaining} <span className="text-lg font-normal text-slate-400">Days</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                {expiresAt
                  ? `Active through ${new Date(expiresAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`
                  : "Active wallet window maintained upon recharge"}
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Recharges extend validity automatically
            </div>
          </div>

          {/* Card 3: Active Tier / Customization Status */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">
                Active Tier
              </span>
              <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-[#FC8019]">
                <Sparkles size={18} />
              </span>
            </div>
            <div className="my-4">
              <div className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                {plan.replace("recharge_", "Tier ").replace("_", " ")}
              </div>
              <div className="text-[11px] font-mono text-[#FC8019] mt-1 font-semibold">
                Universal À La Carte Mode
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between">
              <span>Section 65B Proof</span>
              <span className="text-emerald-500 font-bold">Enabled</span>
            </div>
          </div>
        </div>

        {/* Section 2: Universal Recharge Center (13 Tiers) */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/15 text-[#FC8019] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                Pay &amp; Use Recharge Center
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Select Your Recharge Amount (13 Tiers)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Recharge starting from ₹5,000 up to ₹1,00,000+ Enterprise Customization. 100% credited to your wallet.
              </p>
            </div>

            {/* Segmented Toggle: Standard vs Customization */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setTierCategory("standard");
                  setSelectedTier(RECHARGE_TIERS[1]); // 10k
                }}
                className={`py-1.5 px-3.5 rounded-lg transition ${
                  tierCategory === "standard"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Standard (₹5k – ₹40k)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTierCategory("customization");
                  setSelectedTier(RECHARGE_TIERS[7]); // 50k
                }}
                className={`py-1.5 px-3.5 rounded-lg transition flex items-center gap-1.5 ${
                  tierCategory === "customization"
                    ? "bg-[#FC8019] text-white shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-[#FC8019]"
                }`}
              >
                <Sparkles size={12} />
                <span>Customization (₹50k – ₹100k+)</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Tiers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {RECHARGE_TIERS.filter((t) =>
                tierCategory === "standard" ? !t.isCustomization : t.isCustomization
              ).map((tier) => {
                const isSelected = selectedTier.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? tier.isCustomization
                          ? "border-amber-500 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent dark:from-orange-500/25 dark:via-amber-500/15 ring-2 ring-amber-500/50 shadow-md"
                          : "border-[#FC8019] bg-orange-50/80 dark:bg-orange-500/15 ring-2 ring-[#FC8019]/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {tier.isCustomization && (
                      <span className="absolute -top-2 right-2 text-[9px] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full font-mono font-bold shadow-xs flex items-center gap-0.5">
                        <Sparkles size={9} />
                        <span>CUSTOM</span>
                      </span>
                    )}
                    <div>
                      <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                        ₹{tier.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs font-bold text-[#FC8019] mt-0.5">
                        {tier.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                        {tier.validityText}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                      {tier.recommendedFor}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Tier Action Box & Customization Highlight */}
            <div className="p-6 rounded-2xl border-2 border-orange-500/30 bg-gradient-to-r from-orange-50/50 via-amber-50/30 to-yellow-50/20 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    ₹{selectedTier.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] px-2.5 py-0.5 font-bold">
                    100% Credited (₹{selectedTier.amount.toLocaleString("en-IN")})
                  </span>
                  <span className="rounded-full bg-orange-100 dark:bg-orange-950/80 text-[#FC8019] font-mono text-[10px] px-2.5 py-0.5 font-bold">
                    {selectedTier.validityText}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {selectedTier.tagline}
                </p>

                {/* If Customization, display highlight perks */}
                {selectedTier.isCustomization && (
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-700/60 shadow-sm space-y-2">
                    <div className="text-xs font-mono font-bold text-[#FC8019] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span>Included Enterprise Customization Highlights:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                      {selectedTier.customizationPerks?.map((perk, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <Check size={13} className="text-[#FC8019] shrink-0 mt-0.5" strokeWidth={3} />
                          <span className="leading-snug">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={recharging}
                  className="py-3 px-6 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 font-sans"
                >
                  <CreditCard size={15} />
                  <span>Recharge ₹{selectedTier.amount.toLocaleString("en-IN")} Now</span>
                  <ArrowRight size={14} />
                </button>

                <Link
                  href={`/subscription#contact?plan=${encodeURIComponent(selectedTier.name)}`}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition text-center"
                >
                  Generate Proforma / Invoice
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Universal À La Carte Rate Card (All 18 Services) */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                Transparent Rate Schedule
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                À La Carte Rate Card (All 18 Services)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standard unit rates deducted from your wallet balance per API check or connected recovery call.
              </p>
            </div>

            {/* Category Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search service..."
                  value={rateCardSearch}
                  onChange={(e) => setRateCardSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019] transition w-44 font-mono"
                />
              </div>

              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-mono font-semibold">
                <button
                  type="button"
                  onClick={() => setRateCardCategory("all")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    rateCardCategory === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All (18)
                </button>
                <button
                  type="button"
                  onClick={() => setRateCardCategory("verification")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    rateCardCategory === "verification"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  KYC &amp; Tax
                </button>
                <button
                  type="button"
                  onClick={() => setRateCardCategory("recovery")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    rateCardCategory === "recovery"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Voice Calls
                </button>
                <button
                  type="button"
                  onClick={() => setRateCardCategory("legal")}
                  className={`px-2.5 py-1 rounded-md transition ${
                    rateCardCategory === "legal"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Legal &amp; Addons
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-bold">Service / Gateway Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Billing Unit</th>
                  <th className="py-3 px-4 text-right font-bold text-[#FC8019]">Unit Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {filteredRateCard.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {item.description}
                      </div>
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
        </section>

        {/* Section 4: Real-time Transaction Ledger & Usage History */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                Audit Trail
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Wallet Transaction Ledger
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time record of all credits, recharges, and gateway service deductions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {ledger.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500 dark:text-slate-400 space-y-2">
                <AlertCircle size={24} className="mx-auto text-slate-400" />
                <div>No recent deductions logged in this session yet.</div>
                <div className="text-[11px] text-slate-400">
                  Transactions will appear here when you run credit verifications or voice calls.
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                    <th className="py-3 px-4">Transaction / Feature</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {ledger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {new Date(tx.createdAt).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            tx.type === "credit"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black ${
                          tx.type === "credit"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ₹{tx.balanceAfter.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019] shrink-0 shadow-sm">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Confirm Wallet Recharge
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Universal Pay &amp; Use Recharge
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tier:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedTier.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Recharge Amount:</span>
                <span className="font-black text-lg text-[#FC8019]">₹{selectedTier.amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Wallet Credit (100%):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{selectedTier.amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Validity Extension:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">+{selectedTier.validityDays} Days</span>
              </div>
              {selectedTier.isCustomization && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 font-sans">
                  ✨ Includes Enterprise Customization perks (custom dialer cadences &amp; legal dockets).
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteRecharge(selectedTier)}
                disabled={recharging}
                className="flex-1 py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50"
              >
                {recharging ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Confirm &amp; Recharge</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
