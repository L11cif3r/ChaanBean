"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Coins,
  Sparkles,
  Search,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  Edit2,
  RotateCcw,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { RECHARGE_TIERS, RechargeTier, DEFAULT_RATE_CARD } from "@/lib/pricing/recharge-plans";

interface CompanyWalletRow {
  id: string;
  name: string;
  plan: string;
  walletBalance: number;
  subscriptionExpiresAt: string | null;
  daysRemaining: number;
  isExpired: boolean;
  kycStatus: string;
  healthScore: string;
  lastActiveAt: string;
  signupDate: string;
  ledgerCount: number;
}

interface FeaturePriceItem {
  key: string;
  name: string;
  category: string;
  price: number;
  defaultPrice: number;
  description: string;
}

export default function AdminWalletsPage() {
  const [activeTab, setActiveTab] = useState<"tenants" | "rateCard" | "tiers">("tenants");
  const [companies, setCompanies] = useState<CompanyWalletRow[]>([]);
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalWalletLiabilities: 0,
    customizationCount: 0,
    payAndUseCount: 0,
  });
  const [pricing, setPricing] = useState<Record<string, FeaturePriceItem>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Adjust Balance Modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWalletRow | null>(null);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState<number>(5000);
  const [adjustReason, setAdjustReason] = useState<string>("Bank NEFT / Wire Transfer Payment Received");
  const [adjustSubmitting, setAdjustSubmitting] = useState<boolean>(false);

  // Edit Rate Card Price Modal state
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState<number>(0);
  const [priceSubmitting, setPriceSubmitting] = useState<boolean>(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/wallets");
      const data = await res.json();
      if (Array.isArray(data.companies)) {
        setCompanies(data.companies);
      }
      if (data.stats) {
        setStats(data.stats);
      }
      if (data.pricing) {
        setPricing(data.pricing);
      }
    } catch (err) {
      console.error("Failed to load admin wallet data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setAdjustSubmitting(true);
    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_balance",
          companyId: selectedCompany.id,
          amount: adjustAmount,
          type: adjustType,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          `Successfully ${adjustType === "credit" ? "credited" : "debited"} ₹${adjustAmount.toLocaleString(
            "en-IN"
          )} for ${selectedCompany.name}`
        );
        setAdjustModalOpen(false);
        await fetchData();
      } else {
        alert(data.error || "Failed to adjust balance");
      }
    } catch (err) {
      console.error("Adjust error:", err);
      alert("Network error adjusting balance");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleSavePrice = async (key: string) => {
    setPriceSubmitting(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          key,
          price: editingPriceVal,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Updated price for ${key} to ₹${editingPriceVal.toLocaleString("en-IN")}`);
        setEditingPriceKey(null);
        await fetchData();
      } else {
        alert(data.error || "Failed to update price");
      }
    } catch (err) {
      console.error("Save price error:", err);
      alert("Network error saving price");
    } finally {
      setPriceSubmitting(false);
    }
  };

  const handleResetPrice = async (key: string) => {
    if (!confirm(`Reset ${key} to statutory default price?`)) return;

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          key,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Reset ${key} to default price`);
        await fetchData();
      }
    } catch (err) {
      console.error("Reset price error:", err);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.plan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
            Financial &amp; Pricing Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Wallet className="text-[#FC8019]" size={28} />
            <span>À La Carte &amp; Wallet Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic rate card unit costs, manage 13 universal recharge tiers, inspect tenant balances, and apply administrative adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-[#FC8019]" : ""} />
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:opacity-80">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0B0F17] flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Total Platform Liabilities</span>
          <div className="text-2xl font-black text-[#FC8019] my-2">
            ₹{stats.totalWalletLiabilities.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-slate-500 font-sans">Active tenant wallet balances</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0B0F17] flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Registered Tenants</span>
          <div className="text-2xl font-black text-white my-2">
            {stats.totalTenants}
          </div>
          <span className="text-[10px] text-slate-500 font-sans">Organizations onboarded</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0B0F17] flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Customization Accounts</span>
          <div className="text-2xl font-black text-amber-400 my-2 flex items-center gap-1.5">
            <Sparkles size={20} />
            <span>{stats.customizationCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-sans">₹50k – ₹100k+ bespoke tiers</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0B0F17] flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Universal Pay &amp; Use</span>
          <div className="text-2xl font-black text-emerald-400 my-2">
            {stats.payAndUseCount}
          </div>
          <span className="text-[10px] text-slate-500 font-sans">Active on à la carte recharges</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-mono font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("tenants")}
          className={`py-2 px-4 rounded-xl transition flex items-center gap-2 ${
            activeTab === "tenants"
              ? "bg-[#FC8019] text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Building2 size={15} />
          <span>Tenant Wallets ({companies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rateCard")}
          className={`py-2 px-4 rounded-xl transition flex items-center gap-2 ${
            activeTab === "rateCard"
              ? "bg-[#FC8019] text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Sliders size={15} />
          <span>Master Rate Card Editor (18 Gateways)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tiers")}
          className={`py-2 px-4 rounded-xl transition flex items-center gap-2 ${
            activeTab === "tiers"
              ? "bg-[#FC8019] text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Coins size={15} />
          <span>Recharge &amp; Customization Tiers (13)</span>
        </button>
      </div>

      {/* TAB 1: TENANT WALLETS */}
      {activeTab === "tenants" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search tenant name or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#FC8019] font-mono"
              />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredCompanies.length} of {companies.length} tenants
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B0F17] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">Tenant Name</th>
                    <th className="py-3 px-3">Active Plan</th>
                    <th className="py-3 px-4 text-right font-bold text-[#FC8019]">Wallet Balance</th>
                    <th className="py-3 px-3">Validity</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.id}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                          {c.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-[#FC8019]">
                        ₹{c.walletBalance.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {c.daysRemaining} days left
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                          <CheckCircle2 size={11} />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompany(c);
                            setAdjustModalOpen(true);
                          }}
                          className="py-1 px-3 rounded-lg border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-[#FC8019] text-xs font-mono font-bold transition inline-flex items-center gap-1"
                        >
                          <Coins size={12} />
                          <span>Adjust Balance</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER RATE CARD EDITOR */}
      {activeTab === "rateCard" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0B0F17] flex items-center justify-between text-xs text-slate-400 font-mono">
            <div>
              Edit unit costs live across the platform. Deductions apply immediately to all tenant wallet transactions.
            </div>
            <span className="text-[#FC8019] font-bold">18 Gateway Handlers Active</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B0F17] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">Feature Key</th>
                    <th className="py-3 px-4">Feature Name</th>
                    <th className="py-3 px-3 text-right">Default Rate</th>
                    <th className="py-3 px-4 text-right font-bold text-[#FC8019]">Current Active Rate</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {DEFAULT_RATE_CARD.map((item) => {
                    const activeItem = pricing[item.key];
                    const activePrice = activeItem ? activeItem.price : item.price;
                    const defaultPrice = item.price;
                    const isEditing = editingPriceKey === item.key;

                    return (
                      <tr key={item.key} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {item.key}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.description}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-400">
                          {defaultPrice === 0 ? "FREE" : `₹${defaultPrice.toLocaleString("en-IN")}`}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm text-[#FC8019]">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingPriceVal}
                              onChange={(e) => setEditingPriceVal(Number(e.target.value))}
                              className="w-24 px-2 py-1 bg-slate-900 border border-[#FC8019] rounded text-right text-white font-mono text-xs outline-none"
                              autoFocus
                            />
                          ) : (
                            activePrice === 0 ? "FREE" : `₹${activePrice.toLocaleString("en-IN")}`
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5 font-mono text-xs">
                              <button
                                type="button"
                                onClick={() => handleSavePrice(item.key)}
                                disabled={priceSubmitting}
                                className="px-2.5 py-1 rounded bg-[#FC8019] hover:bg-[#e67312] text-white font-bold text-[11px] transition"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceKey(null)}
                                className="px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-white text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 font-mono text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPriceKey(item.key);
                                  setEditingPriceVal(activePrice);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-[#FC8019] transition"
                                title="Edit Price"
                              >
                                <Edit2 size={14} />
                              </button>
                              {activePrice !== defaultPrice && (
                                <button
                                  type="button"
                                  onClick={() => handleResetPrice(item.key)}
                                  className="p-1 rounded text-slate-400 hover:text-amber-400 transition"
                                  title="Reset to Default"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECHARGE & CUSTOMIZATION TIERS (13 TIERS) */}
      {activeTab === "tiers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RECHARGE_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  tier.isCustomization
                    ? "border-amber-500/40 bg-gradient-to-br from-[#0B0F17] via-amber-950/15 to-[#0B0F17] shadow-md shadow-amber-500/5"
                    : "border-slate-800 bg-[#0B0F17]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                      {tier.id}
                    </span>
                    {tier.isCustomization && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#FC8019] text-white flex items-center gap-1">
                        <Sparkles size={10} />
                        <span>CUSTOMIZATION</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-2xl font-black font-mono text-white">
                      ₹{tier.amount.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs font-bold text-[#FC8019] mt-0.5">
                      {tier.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {tier.validityText} (+{tier.validityDays} days)
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">
                    {tier.tagline}
                  </p>

                  {tier.customizationPerks && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#FC8019] block">
                        Enterprise Highlights:
                      </span>
                      {tier.customizationPerks.map((p, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                          <Check size={11} className="text-[#FC8019] shrink-0 mt-0.5" strokeWidth={3} />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
                  Recommended: {tier.recommendedFor}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0E131F] shadow-2xl p-6 space-y-5 font-sans">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#FC8019] shrink-0">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Manual Wallet Adjustment</h3>
                  <p className="text-xs text-slate-400">{selectedCompany.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block font-mono uppercase">
                  Operation Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("credit")}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition flex items-center justify-center gap-2 ${
                      adjustType === "credit"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    <PlusCircle size={14} />
                    <span>Credit (Add Funds)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("debit")}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition flex items-center justify-center gap-2 ${
                      adjustType === "debit"
                        ? "border-rose-500 bg-rose-500/20 text-rose-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    <MinusCircle size={14} />
                    <span>Debit (Deduct Funds)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block font-mono uppercase">
                  Adjustment Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-[#FC8019]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block font-mono uppercase">
                  Reason / Audit Reference *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Wire transfer NEFT-839218 or SLA goodwill"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FC8019]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 font-bold text-xs hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#FC8019] hover:bg-[#e67312] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {adjustSubmitting ? (
                    <span>Applying...</span>
                  ) : (
                    <>
                      <span>Apply {adjustType === "credit" ? "Credit" : "Debit"}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
