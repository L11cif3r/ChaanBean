"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CAPITALX_LOAN_PRODUCTS } from "@/lib/loans/loan-catalog";
import type { LoanProduct, LoanCategory, LoanApplication } from "@/lib/loans/types";
import { LoanProductCard } from "@/components/loans/LoanProductCard";
import { LoanCalculatorWidget } from "@/components/loans/LoanCalculatorWidget";
import { CapitalXApplicationModal } from "@/components/loans/CapitalXApplicationModal";
import { MyApplicationsTracker } from "@/components/loans/MyApplicationsTracker";
import {
  Landmark,
  Search,
  Zap,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  ArrowRight,
  Calculator,
  SlidersHorizontal,
  X,
  Sparkles,
} from "lucide-react";

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "applications">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<LoanCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected product for calculator simulator
  const [selectedProductId, setSelectedProductId] = useState<string>("sme-msme-loan");
  const currentProduct = useMemo(() => {
    return (
      CAPITALX_LOAN_PRODUCTS.find((p) => p.id === selectedProductId) ||
      CAPITALX_LOAN_PRODUCTS[0]
    );
  }, [selectedProductId]);

  // Calculator Amount & Tenure state
  const [amount, setAmount] = useState<number>(currentProduct.defaultAmount);
  const [tenureYears, setTenureYears] = useState<number>(currentProduct.defaultTenureYears);

  // Application Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [applyingProduct, setApplyingProduct] = useState<LoanProduct>(currentProduct);

  // Applications List state
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // Active Company Context (from portal session)
  const companyContext = useMemo(() => ({
    companyName: "Acme Traders Pvt Ltd",
    pan: "AAECG1234H",
    gstin: "27AAECG1234H1Z5",
    city: "Mumbai",
    state: "Maharashtra",
  }), []);

  // Fetch applications from API
  const fetchApplications = async () => {
    setIsLoadingApps(true);
    try {
      const res = await fetch("/api/loans/applications");
      const data = await res.json();
      if (data.applications) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error("Error fetching loan applications:", err);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // When changing product in calculator, sync defaults
  const handleSelectProduct = (prod: LoanProduct) => {
    setSelectedProductId(prod.id);
    setAmount(prod.defaultAmount);
    setTenureYears(prod.defaultTenureYears);

    // Smooth scroll to calculator widget
    const el = document.getElementById("capitalx-calculator");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // When clicking Apply on a product card
  const handleOpenApply = (prod: LoanProduct) => {
    setApplyingProduct(prod);
    setAmount(prod.defaultAmount);
    setTenureYears(prod.defaultTenureYears);
    setModalOpen(true);
  };

  // Categories list
  const categories: LoanCategory[] = [
    "All",
    "Business & MSME",
    "Property & Housing",
    "Trade & Working Capital",
    "Vehicles & Equipment",
    "Professional & Education",
  ];

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return CAPITALX_LOAN_PRODUCTS.filter((prod) => {
      if (selectedCategory !== "All" && prod.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        prod.name.toLowerCase().includes(q) ||
        prod.shortName.toLowerCase().includes(q) ||
        prod.category.toLowerCase().includes(q) ||
        prod.description.toLowerCase().includes(q) ||
        prod.highlights.some((h) => h.toLowerCase().includes(q)) ||
        prod.badge.toLowerCase().includes(q) ||
        prod.matchedLenders.some((l) => l.name.toLowerCase().includes(q) || l.logoText.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* ------------------------------------------------------------- */}
      {/* TOP HERO BANNER: CAPITALX INSTITUTIONAL CREDIT MARKETPLACE    */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-r from-orange-50/80 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#FC8019] text-white shadow-xs">
                <Landmark size={14} />
                <span>CapitalX · Institutional Lending Marketplace</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                20 Specialized Credit Facilities
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Institutional Credit &amp; Debt Financing Made Simple
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Access 20 specialized debt financing facilities — from MSME working capital &amp; CGTMSE credit to commercial property mortgages, LRD, and machinery finance with direct priority access to 40+ scheduled banks and institutional DFIs.
            </p>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0">
            <div className="text-left lg:text-right font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Max Disbursal Window
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                24 – 72 Hours
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                Direct Bank API Integration
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenApply(currentProduct)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-lg shadow-orange-500/25 active:scale-95 shrink-0"
            >
              <Zap size={16} />
              <span>Apply for Financing</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "catalog"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Explore 20 Loan Facilities</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("applications");
              fetchApplications();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition relative ${
              activeTab === "applications"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock size={15} />
            <span>My Applications</span>
            {applications.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#FC8019] text-white">
                {applications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EXPLORE ALL 20 LOAN FACILITIES                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "catalog" && (
        <div className="space-y-10">
          {/* Facility Calculator Section */}
          <div id="capitalx-calculator" className="scroll-mt-8">
            <LoanCalculatorWidget
              product={currentProduct}
              amount={amount}
              tenureYears={tenureYears}
              onAmountChange={setAmount}
              onTenureChange={setTenureYears}
              onApply={() => handleOpenApply(currentProduct)}
            />
          </div>

          {/* Catalog Search & Category Filters */}
          <div className="space-y-5 pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Comprehensive Institutional Loan Catalogue
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {filteredProducts.length} of {CAPITALX_LOAN_PRODUCTS.length} specialized financing products with transparent rate structures.
                </p>
              </div>

              {/* Live Search input */}
              <div className="relative min-w-[280px]">
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search loans (e.g. Doctor, Export, LRD, CGTMSE)..."
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#FC8019] shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count =
                  cat === "All"
                    ? CAPITALX_LOAN_PRODUCTS.length
                    : CAPITALX_LOAN_PRODUCTS.filter((p) => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                      isSelected
                        ? "bg-[#FC8019] text-white shadow-md shadow-orange-500/20"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 20 Loan Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2">
              {filteredProducts.map((prod) => (
                <LoanProductCard
                  key={prod.id}
                  product={prod}
                  isSelected={selectedProductId === prod.id}
                  onSelect={handleSelectProduct}
                  onApply={handleOpenApply}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                <Search size={32} className="mx-auto text-slate-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  No products matched &quot;{searchQuery}&quot;
                </h4>
                <p className="text-xs text-slate-500">
                  Try searching for keywords like &quot;Equipment&quot;, &quot;MSME&quot;, &quot;Vehicle&quot;, or &quot;Property&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FC8019] text-white"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Underwriting Advantages Banner */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#FC8019]" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Why Borrow Through the CapitalX Institutional Desk?
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600 dark:text-slate-400">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                  1. Pre-Underwritten via ChaanBean Dossier
                </span>
                <p>
                  Because your MCA registration, audited GSTR-9 filings, and peer trust score are already verified on our platform, partner bank risk committees expedite sanctions without physical branch visits.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                  2. Zero Silent Intermediary Markups
                </span>
                <p>
                  Direct API routing to institutional credit desks. You receive the exact wholesale lending rates published by public and private commercial banks with zero hidden broker cuts.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                  3. Multi-Lender Competitive Bidding
                </span>
                <p>
                  A single digital submission simultaneously notifies top specialized lenders, allowing you to compare and select the most competitive term sheet and lowest processing charges.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MY ACTIVE APPLICATIONS PIPELINE                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "applications" && (
        <MyApplicationsTracker
          applications={applications}
          onRefresh={fetchApplications}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4-STEP INSTITUTIONAL APPLICATION MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {modalOpen && (
        <CapitalXApplicationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          product={applyingProduct}
          initialAmount={amount}
          initialTenureYears={tenureYears}
          companyContext={companyContext}
          onApplicationSubmitted={(newApp) => {
            setApplications((prev) => [newApp, ...prev]);
            setActiveTab("applications");
          }}
        />
      )}
    </div>
  );
}
