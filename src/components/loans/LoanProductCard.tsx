"use client";

import React from "react";
import type { LoanProduct } from "@/lib/loans/types";
import {
  Home,
  Building,
  Building2,
  Briefcase,
  Store,
  Factory,
  Receipt,
  RotateCcw,
  Layers,
  Globe2,
  ShieldCheck,
  GraduationCap,
  Stethoscope,
  Car,
  TrendingDown,
  Activity,
  Truck,
  HardHat,
  ArrowRight,
  CheckCircle2,
  Calculator,
  Zap,
} from "lucide-react";

interface LoanProductCardProps {
  product: LoanProduct;
  isSelected: boolean;
  onSelect: (product: LoanProduct) => void;
  onApply: (product: LoanProduct) => void;
}

// Icon mapper for all 20 loan products
function getProductIcon(id: string) {
  switch (id) {
    case "home-loan":
      return Home;
    case "mortgage-loan":
      return Building2;
    case "affordable-housing-loan":
      return Home;
    case "commercial-property-loan":
      return Building;
    case "lease-rental-discounting":
      return Receipt;
    case "business-loan":
      return Briefcase;
    case "retail-shopkeeper-loan":
      return Store;
    case "sme-msme-loan":
      return Factory;
    case "vendor-finance":
      return Receipt;
    case "overdraft-loan":
      return RotateCcw;
    case "cash-credit-loan":
      return Layers;
    case "export-credit":
      return Globe2;
    case "bank-guarantee":
      return ShieldCheck;
    case "study-abroad-loan":
      return GraduationCap;
    case "doctor-loan":
      return Stethoscope;
    case "used-car-finance":
      return Car;
    case "balance-transfer-loan":
      return TrendingDown;
    case "medical-equipment-loan":
      return Activity;
    case "commercial-vehicle-loan":
      return Truck;
    case "construction-equipment-loan":
      return HardHat;
    default:
      return Briefcase;
  }
}

export function LoanProductCard({
  product,
  isSelected,
  onSelect,
  onApply,
}: LoanProductCardProps) {
  const Icon = getProductIcon(product.id);

  const formatAmountShort = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(val % 10000000 === 0 ? 0 : 1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className={`group cursor-pointer rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 relative ${
        isSelected
          ? "border-[#FC8019] bg-orange-50/40 dark:bg-orange-950/20 shadow-lg shadow-orange-500/10 ring-2 ring-[#FC8019]"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md shadow-xs"
      }`}
    >
      <div className="space-y-3.5">
        {/* Top Header: Icon + Category Badge */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold transition-transform group-hover:scale-105 shrink-0 ${
              isSelected
                ? "bg-[#FC8019] text-white shadow-md shadow-orange-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Icon size={22} />
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isSelected
                  ? "bg-[#FC8019]/20 border-[#FC8019]/40 text-[#FC8019]"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {product.badge}
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              {product.category}
            </span>
          </div>
        </div>

        {/* Title, Rate & Ticket Size */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#FC8019] transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between text-xs font-mono font-bold mt-1">
            <span className="text-[#FC8019] dark:text-orange-400">{product.rateText}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {formatAmountShort(product.minAmount)} – {formatAmountShort(product.maxAmount)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Key Features Bullet List */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {product.highlights.slice(0, 3).map((feat, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span className="truncate">{feat}</span>
            </div>
          ))}
        </div>

        {/* Matched Lender Chips */}
        <div className="flex items-center gap-1.5 pt-1 overflow-hidden">
          <span className="text-[9px] font-mono uppercase text-slate-400 font-bold shrink-0">Lenders:</span>
          {product.matchedLenders.slice(0, 3).map((lender) => (
            <span
              key={lender.id}
              className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              {lender.logoText}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            isSelected
              ? "bg-orange-100 dark:bg-orange-950/40 text-[#FC8019] border border-orange-300 dark:border-orange-800"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Calculator size={13} />
          <span>Calculate</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onApply(product);
          }}
          className="py-2 px-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
        >
          <Zap size={13} />
          <span>Apply</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
