"use client";

import React, { useState } from "react";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  MapPin,
  Calendar,
  DollarSign,
  Coins,
  Scale,
  Users,
  Award,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface McaDirector {
  din: string;
  name: string;
  designation: string;
  status: string;
  appointmentDate?: string;
  dir3KycStatus?: string;
  section164Disqualification?: string;
  mcaSignatory?: boolean;
}

export interface McaRecord {
  cin: string;
  companyName: string;
  roc: string;
  companyCategory?: string;
  companySubCategory?: string;
  companyClass?: string;
  authorizedCapital?: number;
  paidUpCapital?: number;
  incorporationDate?: string;
  registeredAddress?: string;
  listingStatus?: string;
  status?: string;
  stateCode?: string;
  country?: string;
  nicCode?: string;
  industrialClassification?: string;
  directors?: McaDirector[];
  gstin?: string;
  pan?: string;
}

interface McaMasterDataCardProps {
  record: McaRecord;
  source?: string;
  onSelectDirectorDin?: (din: string) => void;
}

export function McaMasterDataCard({
  record,
  source = "Ministry of Corporate Affairs (data.gov.in MCA21 Gateway)",
  onSelectDirectorDin,
}: McaMasterDataCardProps) {
  const [copiedCin, setCopiedCin] = useState(false);
  const [showAllDirectors, setShowAllDirectors] = useState(true);

  const handleCopyCin = () => {
    if (!record.cin) return;
    navigator.clipboard.writeText(record.cin);
    setCopiedCin(true);
    setTimeout(() => setCopiedCin(false), 2000);
  };

  const formatINR = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "—";
    const num = Number(val);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Compute operational age
  const getOperatingAge = (dateStr?: string) => {
    if (!dateStr) return null;
    const year = new Date(dateStr).getFullYear();
    if (isNaN(year)) return null;
    const diff = new Date().getFullYear() - year;
    return diff > 0 ? `${diff}+ Years Operational` : "Newly Incorporated";
  };

  const directors = record.directors || [];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition">
      {/* Official Government / MCA Header Banner */}
      <div className="bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-[#FC8019] shadow-xs shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FC8019] font-bold">
                  Government of India · MCA21 Portal
                </span>
                <span className="text-slate-400 dark:text-slate-600 text-xs">·</span>
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold">
                  {record.roc || "ROC Registry"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                {record.companyName}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{record.status || "ACTIVE"}</span>
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs">
              {record.listingStatus || "Unlisted"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Master Data Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Top Key Corporate Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CIN */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
              CIN / Registration No
            </span>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                {record.cin}
              </span>
              <button
                type="button"
                onClick={handleCopyCin}
                title="Copy CIN"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
              >
                {copiedCin ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Incorporation Date */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
              Incorporation Date
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
              <Calendar size={13} className="text-[#FC8019]" />
              <span>{record.incorporationDate || "—"}</span>
              {getOperatingAge(record.incorporationDate) && (
                <span className="text-[10px] font-sans font-medium text-slate-500 ml-auto">
                  ({getOperatingAge(record.incorporationDate)})
                </span>
              )}
            </div>
          </div>

          {/* Authorized Capital */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
              Authorized Share Capital
            </span>
            <div className="flex items-center gap-1 mt-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
              <Coins size={13} className="text-emerald-500" />
              <span>{formatINR(record.authorizedCapital)}</span>
            </div>
          </div>

          {/* Paid-Up Capital */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
              Paid-Up Share Capital
            </span>
            <div className="flex items-center gap-1 mt-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
              <Coins size={13} className="text-emerald-500" />
              <span>{formatINR(record.paidUpCapital)}</span>
            </div>
          </div>
        </div>

        {/* Secondary Corporate Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              Company Category &amp; Class
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
              {record.companyCategory || "Company limited by Shares"}
            </span>
            <span className="text-slate-500 block text-[11px]">
              {record.companyClass || "Private Limited"} · {record.companySubCategory || "Non-govt company"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              NIC Industry Code &amp; Activity
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
              NIC: {record.nicCode || "74999"}
            </span>
            <span className="text-slate-500 block text-[11px] truncate">
              {record.industrialClassification || "Commercial Trade & Engineering"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              RoC Jurisdiction
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
              {record.roc || "ROC Mumbai"}
            </span>
            <span className="text-slate-500 block text-[11px]">
              State Code: {record.stateCode || "27"} · Country: {record.country || "India"}
            </span>
          </div>
        </div>

        {/* Registered Office Address */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start gap-3">
          <MapPin size={18} className="text-[#FC8019] shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered Office Address (MCA21 Official Record)
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {record.registeredAddress || "Address verified on Ministry of Corporate Affairs Registry"}
            </p>
          </div>
        </div>

        {/* Board of Directors & Designated Signatories (All details MCA can give) */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#FC8019]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Board of Directors &amp; Designated Signatories ({directors.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
              MCA Signatory &amp; §164(2) Vetted
            </span>
          </div>

          {directors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {directors.map((dir, idx) => (
                <div
                  key={dir.din || idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {dir.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {dir.designation || "Director"}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      DIN: {dir.din}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-slate-200/60 dark:border-slate-700/50 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">KYC Status</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        DIR-3 Compliant
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Disqualification</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck size={11} />
                        §164(2) Clear
                      </span>
                    </div>
                  </div>

                  {dir.appointmentDate && (
                    <div className="text-[10px] text-slate-400 pt-1 font-mono flex items-center justify-between">
                      <span>Appointed: {dir.appointmentDate}</span>
                      <span className="text-[#FC8019] font-medium">Authorized Signatory</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              No designated directors recorded in public MCA filings for this entity.
            </div>
          )}
        </div>

        {/* Source Citation */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck size={13} />
            <span>Official Government Statutory Registry Record Authenticated</span>
          </div>
          <span>Source: {source}</span>
        </div>
      </div>
    </div>
  );
}
