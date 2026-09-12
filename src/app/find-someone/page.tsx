"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  Landmark,
  CreditCard,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Layers,
  ArrowRight,
  Activity,
  Smartphone,
  Building2,
  Building,
  Radio,
  FileText,
  BadgePercent,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Printer,
  Download,
} from "lucide-react";
import type { FindSomeoneReport } from "@/lib/find-someone/engine";

export default function FindSomeonePage() {
  const [searchInput, setSearchInput] = useState("Metro Supplies Co");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FindSomeoneReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "mobiles" | "emails" | "addresses" | "digital_age" | "bank" | "bureaus" | "pan">("all");

  const sampleEntities = [
    { name: "Metro Supplies Co", id: "9876543210", pan: "AAECM4920K", type: "Defaulted Debtor" },
    { name: "Nexus Polymers Ltd", id: "9820144102", pan: "AABCN9102L", type: "Active Debtor" },
    { name: "Shreeji Auto Components", id: "9711088219", pan: "AACCS8821R", type: "Overdue Debtor" },
    { name: "Apex Global Logistics", id: "9867255104", pan: "AAACA5510M", type: "Low Risk Client" },
  ];

  const handleSearch = async (queryToRun?: string) => {
    const q = (queryToRun || searchInput).trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/find-someone?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
      } else {
        setError(data.error || "Failed to execute skip-trace");
      }
    } catch {
      setError("Network error contacting skip-tracing engine");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleSearch("Metro Supplies Co");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Highlight Hero Strip */}
      <div className="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/40 dark:from-[#111827] dark:via-[#0D1322] dark:to-[#111827] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FC8019] text-white px-3 py-1 text-xs font-bold font-mono tracking-wider shadow-sm">
                <Sparkles size={13} />
                FEATURE HIGHLIGHT · OMNITRACE 360™
              </span>
              <span className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                BSA 2023 Section 65B Certified
              </span>
              <span className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                100% Deterministic Linkage
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Find Someone — Deep Digital Footprint &amp; Skip-Tracing Desk
            </h1>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Instantly resolve a counterparty&apos;s hidden contact vectors across consumer delivery apps (Swiggy, Amazon, Zomato, Blinkit),
              multi-registry alternate emails, geographic facilities, digital footprint age, origin bank branch address, and unified multi-bureau credit reports (CIBIL, Experian, CRIF).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/trust-hub"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FC8019] hover:border-orange-200 transition shadow-sm"
            >
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Trust Hub Registry</span>
            </Link>
            <Link
              href="/payment-recovery"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-[#FC8019] text-xs font-bold text-white hover:bg-[#E26D0A] transition shadow-md shadow-orange-500/20"
            >
              <Phone size={14} />
              <span>Outbound Recovery Desk</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Search Console & Quick Autofill Chips */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Search size={14} className="text-[#FC8019]" />
            Deep Trace Search Parameters
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Input Mobile (+91), PAN (10 chars), GSTIN (15 chars), or Entity Name
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-stretch gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. 9876543210 or AAECM4920K or Metro Supplies Co"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-4 py-3 text-sm font-mono font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-[#FC8019] focus:bg-white dark:focus:bg-slate-900 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !searchInput.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#FC8019] hover:bg-[#E26D0A] px-6 py-3 text-xs font-bold text-white transition disabled:opacity-50 shadow-md shadow-orange-500/20 shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Tracing Across 8 Networks...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Deep Trace Counterparty</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Autofill Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-medium text-slate-500 mr-1 font-mono">
            Sample Live Counterparties:
          </span>
          {sampleEntities.map((ent) => (
            <button
              key={ent.id}
              type="button"
              onClick={() => {
                setSearchInput(ent.name);
                handleSearch(ent.name);
              }}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-[#FC8019] transition font-mono"
            >
              <span className="font-sans font-semibold text-slate-800 dark:text-slate-200">{ent.name}</span>
              <span className="text-[10px] text-slate-500">({ent.pan})</span>
              <span className="rounded bg-orange-100/80 dark:bg-orange-500/20 text-[#FC8019] text-[9px] px-1.5 py-0.2 font-bold">
                {ent.type}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-mono">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Loading telemetry simulation */}
      {loading && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-white dark:bg-[#111827] p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 mx-auto rounded-full border-4 border-[#FC8019] border-t-transparent animate-spin" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">
              Querying Statutory, Telecom KYC &amp; Multi-Bureau Streams...
            </h3>
            <p className="text-xs text-slate-500">
              Correlating consumer delivery numbers, registrar contacts, physical branch IFSC, digital age, and CIBIL/Experian/CRIF reports.
            </p>
          </div>
        </div>
      )}

      {/* Report Result Container */}
      {report && !loading && (
        <div className="space-y-6">
          {/* Header Summary Strip */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019] shrink-0">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {report.subjectName}
                  </h2>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[10px] font-mono font-bold">
                    OmniTrace Verified
                  </span>
                  <span className="rounded bg-orange-50 dark:bg-orange-500/10 text-[#FC8019] border border-orange-200 dark:border-orange-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                    PAN: {report.panDetails.panNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  {report.provider} · Latency: {report.latencyMs}ms · Indexed: {new Date(report.generatedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
              >
                <Printer size={13} />
                <span>Print Dossier</span>
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(report, null, 2), "json")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FC8019] transition shadow-sm"
              >
                <Copy size={13} />
                <span>{copiedField === "json" ? "Copied JSON!" : "Copy JSON"}</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Tabs for 9 Sections */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-mono">
            {[
              { key: "all", label: "All 9 Intelligence Vectors" },
              { key: "mobiles", label: `1. Alternate Mobiles (${report.alternateMobileNumbers.length})` },
              { key: "emails", label: `2. Alternate Emails (${report.alternateEmailIds.length})` },
              { key: "addresses", label: `3. Addresses (${report.alternateAddresses.length})` },
              { key: "digital_age", label: "4. Digital Age" },
              { key: "bank", label: "5. Bank Origin & Address" },
              { key: "bureaus", label: "6-8. Tri-Bureau (CIBIL/Experian/CRIF)" },
              { key: "pan", label: "9. PAN Verification" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-[#FC8019] text-white shadow-sm font-bold"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-[#FC8019] hover:border-orange-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================================================= */}
          {/* 1. ALTERNATE MOBILE NUMBERS */}
          {/* ========================================================= */}
          {(activeTab === "all" || activeTab === "mobiles") && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019]">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      1. Alternate Mobile Numbers &amp; Delivery Accounts
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Consumer app accounts, telecom circles, and statutory GSTN/MCA linkages
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#FC8019] bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-2.5 py-1 rounded-lg">
                  {report.alternateMobileNumbers.length} Numbers Verified
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.alternateMobileNumbers.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-3.5 space-y-2 hover:border-orange-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-orange-100/80 dark:bg-orange-500/20 text-[#FC8019] text-[10px] font-mono font-bold px-2 py-0.5">
                        {m.source}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} /> {m.activeStatus}
                      </span>
                    </div>

                    <div className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      {m.number}
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                      <div>Circle: <strong className="text-slate-700 dark:text-slate-300">{m.carrierCircle}</strong></div>
                      {m.tenureYears && <div>SIM Tenure: <strong className="text-slate-700 dark:text-slate-300">{m.tenureYears} yrs</strong></div>}
                      <div className="text-[10px] text-slate-400">Activity: {m.lastUsedDate}</div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.number, `m-${idx}`)}
                        className="flex-1 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FC8019] transition"
                      >
                        {copiedField === `m-${idx}` ? "Copied!" : "Copy"}
                      </button>
                      <a
                        href={`tel:${m.number}`}
                        className="flex-1 py-1 text-center rounded-lg bg-[#FC8019] text-[11px] font-bold text-white hover:bg-[#E26D0A] transition shadow-sm"
                      >
                        Call
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* 2. ALTERNATIVE EMAIL IDS */}
          {/* ========================================================= */}
          {(activeTab === "all" || activeTab === "emails") && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019]">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Alternative Email Addresses
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Corporate, personal, billing accounts, and statutory filing emails
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#FC8019] bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-2.5 py-1 rounded-lg">
                  {report.alternateEmailIds.length} Verified Channels
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.alternateEmailIds.map((em, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-3.5 space-y-2 hover:border-orange-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold px-2 py-0.5">
                        {em.type}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {em.verifiedStatus}
                      </span>
                    </div>

                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate" title={em.email}>
                      {em.email}
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                      <div>Deliverability Score: <strong className="text-emerald-600 dark:text-emerald-400">{em.deliverabilityScore}%</strong></div>
                      <div className="text-[10px] text-slate-400">First observed: {em.firstObserved}</div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(em.email, `e-${idx}`)}
                        className="flex-1 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FC8019] transition"
                      >
                        {copiedField === `e-${idx}` ? "Copied!" : "Copy"}
                      </button>
                      <a
                        href={`mailto:${em.email}`}
                        className="flex-1 py-1 text-center rounded-lg bg-slate-900 dark:bg-slate-800 text-[11px] font-bold text-white hover:bg-[#FC8019] transition"
                      >
                        Email
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* 3. ALL ALTERNATE ADDRESSES */}
          {/* ========================================================= */}
          {(activeTab === "all" || activeTab === "addresses") && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019]">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      3. All Alternate Addresses &amp; Geographic Footprints
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Corporate headquarters, operational factory/warehouse, consumer delivery clusters, and director residence
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#FC8019] bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-2.5 py-1 rounded-lg">
                  {report.alternateAddresses.length} Verified Facilities
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {report.alternateAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 space-y-2.5 hover:border-orange-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-orange-100/80 dark:bg-orange-500/20 text-[#FC8019] text-[10px] font-mono font-bold px-2 py-0.5">
                        {addr.addressType}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {addr.confidenceScore}% Confidence
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {addr.fullAddress}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <div>City / State: <strong className="text-slate-700 dark:text-slate-300">{addr.city}, {addr.state}</strong></div>
                      <div>Pincode: <strong className="text-slate-700 dark:text-slate-300">{addr.pincode}</strong></div>
                      <div className="col-span-2 text-[10px] text-slate-400">Source: {addr.verificationSource}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(addr.fullAddress, `a-${idx}`)}
                      className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FC8019] transition flex items-center justify-center gap-1"
                    >
                      <Copy size={12} />
                      <span>{copiedField === `a-${idx}` ? "Address Copied!" : "Copy Full Address"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* 4. DIGITAL AGE & ONLINE FOOTPRINT */}
          {/* ========================================================= */}
          {(activeTab === "all" || activeTab === "digital_age") && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019]">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      4. His Digital Age &amp; Online Footprint
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Temporal registry lifespan, domain tenure, and earliest fintech/e-commerce indexing
                    </p>
                  </div>
                </div>
                <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold px-2.5 py-1">
                  {report.digitalAge.reliabilityBand}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/10 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Total Digital Age</span>
                  <div className="mt-1 text-2xl font-black text-[#FC8019]">
                    {report.digitalAge.formattedDigitalAge}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Calculated from earliest verifiable public record
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Earliest Statutory Record</span>
                  <div className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                    {report.digitalAge.earliestStatutoryDate}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {report.digitalAge.earliestSource}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Commercial Domain Tenure</span>
                  <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    {report.digitalAge.domainTenureYears} Years Active
                  </div>
                  <p className="mt-1 text-[11px] font-mono text-slate-500">
                    {report.digitalAge.domainName}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Fintech &amp; E-Commerce</span>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white space-y-0.5">
                    <div>UPI / IMPS since: <strong>{report.digitalAge.fintechAdoptionYear}</strong></div>
                    <div>E-Commerce active since: <strong>{report.digitalAge.ecommerceActiveSince}</strong></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* 5. BANK NAME AND ADDRESS WHERE PAYMENT WAS PAID */}
          {/* ========================================================= */}
          {(activeTab === "all" || activeTab === "bank") && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019]">
                    <Landmark size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      5. Bank Name &amp; Branch Physical Address Where Payment Was Paid
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Origin clearing bank, physical branch location, IFSC, masked account, and last settlement UTR
                    </p>
                  </div>
                </div>
                <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold px-2.5 py-1 flex items-center gap-1">
                  <CheckCircle2 size={12} /> {report.bankPaymentDetails.clearingStatus}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Paying Bank Name &amp; Full Branch Address</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Landmark size={18} className="text-[#FC8019]" />
                    <span>{report.bankPaymentDetails.bankName}</span>
                    <span className="text-xs font-normal text-slate-500">({report.bankPaymentDetails.branchName})</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {report.bankPaymentDetails.branchPhysicalAddress}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 space-y-1.5 font-mono text-xs">
                  <span className="text-[10px] uppercase text-slate-500">Clearing Codes</span>
                  <div>IFSC: <strong className="text-slate-900 dark:text-white">{report.bankPaymentDetails.ifscCode}</strong></div>
                  <div>MICR: <strong className="text-slate-900 dark:text-white">{report.bankPaymentDetails.micrCode}</strong></div>
                  <div>Account Type: <strong className="text-slate-700 dark:text-slate-300">{report.bankPaymentDetails.accountType}</strong></div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 space-y-1.5 font-mono text-xs">
                  <span className="text-[10px] uppercase text-slate-500">Masked Account Number</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white tracking-widest">
                    {report.bankPaymentDetails.maskedAccountNumber}
                  </div>
                  <div className="text-[11px] text-slate-500">Mode: {report.bankPaymentDetails.lastPaymentMode}</div>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/40 dark:bg-orange-500/10 p-4 space-y-1.5 font-mono text-xs">
                  <span className="text-[10px] uppercase text-slate-500">Last Payment Audit Evidence</span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      UTR: <strong className="text-slate-900 dark:text-white font-bold">{report.bankPaymentDetails.lastUtrNumber}</strong>
                    </div>
                    <div>
                      Amount: <strong className="text-[#FC8019] font-black">{formatINR(report.bankPaymentDetails.lastClearedAmount)}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {report.bankPaymentDetails.lastPaymentDate}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* 6, 7, 8. TRI-BUREAU REPORTS (CIBIL, EXPERIAN, CRIF) */}
          {/* ========================================================= */}
          {(activeTab === "all" || activeTab === "bureaus") && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019]">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      6–8. Tri-Bureau Commercial Intelligence (CIBIL, Experian &amp; CRIF)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Independent credit agency scores, delinquency aging, and credit utilization
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500">3 Independent Credit Repositories</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* 6. CIBIL */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">6. CIBIL Report</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      report.cibilReport.scoreBand === "Good" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                    }`}>
                      {report.cibilReport.scoreBand}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{report.cibilReport.score}</div>
                    <span className="text-xs font-mono text-slate-500">/ 900</span>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                    <div>Rank: <strong className="text-slate-800 dark:text-slate-200">{report.cibilReport.commercialRank}</strong></div>
                    <div>Active Trade Lines: <strong className="text-slate-800 dark:text-slate-200">{report.cibilReport.activeTradeLines}</strong></div>
                    <div>Credit Limit: <strong className="text-slate-800 dark:text-slate-200">{formatINR(report.cibilReport.totalSanctionedLimit)}</strong></div>
                    <div>Utilization: <strong className="text-slate-800 dark:text-slate-200">{report.cibilReport.creditUtilizationPct}%</strong></div>
                    {report.cibilReport.overdueAmount > 0 && (
                      <div className="text-rose-600 dark:text-rose-400 font-bold">
                        Overdue: {formatINR(report.cibilReport.overdueAmount)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Experian */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">7. Experian Report</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      report.experianReport.scoreBand === "Low Risk" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                    }`}>
                      {report.experianReport.scoreBand}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{report.experianReport.score}</div>
                    <span className="text-xs font-mono text-slate-500">/ 900</span>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                    <div>Commercial Credit Index: <strong className="text-slate-800 dark:text-slate-200">{report.experianReport.commercialCreditIndex}/10</strong></div>
                    <div>Active Banking Lines: <strong className="text-slate-800 dark:text-slate-200">{report.experianReport.activeBankingLines}</strong></div>
                    <div>Default Probability: <strong className="text-slate-800 dark:text-slate-200">{report.experianReport.defaultProbabilityPct}%</strong></div>
                    <div className="text-[10px] text-slate-500">{report.experianReport.repaymentTrack}</div>
                  </div>
                </div>

                {/* 8. CRIF */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono">8. CRIF Report</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      report.crifReport.scoreBand === "Good" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    }`}>
                      {report.crifReport.scoreBand}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{report.crifReport.score}</div>
                    <span className="text-xs font-mono text-slate-500">/ 900</span>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                    <div>Repayment Index: <strong className="text-slate-800 dark:text-slate-200">{report.crifReport.repaymentReliabilityIndex}</strong></div>
                    <div>High Credit Limit: <strong className="text-slate-800 dark:text-slate-200">{formatINR(report.crifReport.highCreditLimit)}</strong></div>
                    <div>Inquiries (6M): <strong className="text-slate-800 dark:text-slate-200">{report.crifReport.inquiriesLast6Months}</strong></div>
                    <div>Overdue Accounts: <strong className="text-slate-800 dark:text-slate-200">{report.crifReport.currentOverdueAccounts}</strong></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================= */}
          {/* 9. PAN NUMBER & STATUTORY LEGAL DETAILS */}
          {/* ========================================================= */}
          {(activeTab === "all" || activeTab === "pan") && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019]">
                    <Scale size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      9. PAN Number &amp; Income Tax Department Registry
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Permanent Account Number validity, Aadhaar linking, and multi-state registered GSTIN branches
                    </p>
                  </div>
                </div>
                <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold px-2.5 py-1 flex items-center gap-1">
                  <CheckCircle2 size={12} /> {report.panDetails.itdStatus}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">PAN Number</span>
                  <div className="mt-1 text-xl font-mono font-black text-[#FC8019] tracking-wider">
                    {report.panDetails.panNumber}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Verified with NSDL / ITD Server</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Legal Entity Name</span>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {report.panDetails.legalEntityName}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{report.panDetails.cardholderStatus}</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">PAN-Aadhaar Link Status</span>
                  <div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Linked &amp; Verified
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Section 139AA Compliant</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Linked GSTIN Branches</span>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {report.panDetails.linkedGstinCount} State Registrations
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {report.panDetails.registeredStateBranches.join(" · ")}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
