"use client";

import React from "react";
import {
  Shield,
  ShieldCheck,
  Search,
  ArrowRight,
  Award,
  AlertOctagon,
  Building2,
  Users,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { CommunityDefaultForm } from "@/components/CommunityDefaultForm";

interface TrustHubOverviewProps {
  profile: any;
  defaults: any[];
  vendors: any[];
  onSelectTab: (tab: "business-verification" | "verify-id") => void;
}

export function TrustHubOverview({
  profile,
  defaults,
  vendors,
  onSelectTab,
}: TrustHubOverviewProps) {
  const badges = profile?.complianceBadges
    ? JSON.parse(profile.complianceBadges)
    : [
        "GST Verified Enterprise",
        "Zero Peer Default Certified",
        "MSMED Act Registered",
        "Statutory Audit Clear",
      ];

  return (
    <div className="space-y-8">
      {/* Top Header & Subtitle matching LegAn Screen 1 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-[#F44851]">
              <Shield size={20} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Trust Hub</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            Excellent products for you (2 items) · Opt-in B2B verification exchange, verified compliance badges, and community default alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CommunityDefaultForm />
        </div>
      </div>

      {/* 2 Core Product Cards — Direct LegAn Screen 1 Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Product 1: Business Verification (Trust ID) */}
        <div
          onClick={() => onSelectTab("business-verification")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-chaan-border bg-chaan-card p-6 lg:p-7 shadow-lg hover:border-[#F44851]/70 hover:shadow-2xl hover:shadow-rose-950/20 transition-all duration-300"
        >
          {/* Subtle Shield Watermark Background */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 text-slate-800/20 group-hover:text-rose-500/10 transition-all duration-500">
            <Shield size={160} strokeWidth={1} />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-md bg-[#F44851] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                NEW
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 group-hover:bg-[#F44851] group-hover:text-white transition">
                <ArrowRight size={16} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-[#FF6B72] transition">
                Business Verification (Trust ID)
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-sm">
                Comprehensive business KYC solution with GST verification, director details, court case checks, and complete regulatory compliance reporting.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#F44851]">
              <span>Explore Centralised Verification</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Product 2: Check Verified Businesses */}
        <div
          onClick={() => onSelectTab("verify-id")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-chaan-border bg-chaan-card p-6 lg:p-7 shadow-lg hover:border-[#F44851]/70 hover:shadow-2xl hover:shadow-rose-950/20 transition-all duration-300"
        >
          {/* Subtle Shield Watermark Background */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 text-slate-800/20 group-hover:text-rose-500/10 transition-all duration-500">
            <ShieldCheck size={160} strokeWidth={1} />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-md bg-[#F44851] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                NEW
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 group-hover:bg-[#F44851] group-hover:text-white transition">
                <ArrowRight size={16} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-[#FF6B72] transition">
                Check Verified Businesses
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-sm">
                Search and verify businesses in the trust network with detailed verification status, statutory audit trails, and trust scores.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#F44851]">
              <span>Verify by Trust ID (TH-...)</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Organization Trust ID Banner */}
      {profile && (
        <div className="rounded-2xl border border-rose-900/40 bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold font-mono">
                  Active Organization Trust ID
                </span>
                <span className="rounded bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-800/60">
                  Certified
                </span>
              </div>
              <h2 className="text-2xl font-mono font-bold text-white mt-1.5">{profile.trustId}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Company: <strong className="text-slate-200">{profile.company.name}</strong> · Visibility:{" "}
                <span className="capitalize text-rose-400 font-medium">{profile.visibility}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {badges.map((badge: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-800/40 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-200 font-medium"
                >
                  <Award size={14} className="text-rose-400" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Community Default Alerts (Peer Reports) */}
      <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} className="text-rose-400" />
            <h2 className="text-base font-semibold text-white">Community Default Registry (Peer Alerts)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {defaults.length} Active Defaults Logged
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Peers in the ChaanBean network report commercial defaults. A peer-reported default automatically trips the Risk Engine override to Red.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 uppercase text-slate-400 font-mono tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Defaulting Entity</th>
                <th className="px-4 py-3 text-left">GSTIN / PAN</th>
                <th className="px-4 py-3 text-left">Amount Defaulted</th>
                <th className="px-4 py-3 text-left">Default Date</th>
                <th className="px-4 py-3 text-left">Evidence / Rationale</th>
                <th className="px-4 py-3 text-left">Network Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {defaults.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-medium text-rose-300">{d.debtorName}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{d.debtorGstin || d.debtorPan || "—"}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-200">
                    ₹{d.amountDefaulted.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(d.defaultDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{d.notes}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 px-2 py-0.5 text-[11px] font-bold text-rose-400 border border-rose-800/60">
                      Hard Red Override
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Network Verified Counterparties */}
      <section className="rounded-2xl border border-chaan-border bg-chaan-card p-6 shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-chaan-border">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-[#F44851]" />
            <h2 className="text-base font-semibold text-white">Trust Hub Verified Counterparties</h2>
          </div>
          <Link href="/vendors" className="text-xs text-[#F44851] hover:underline">
            Register New Vendor →
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-200">{v.name}</h3>
                  <span className="text-[11px] font-mono text-[#F44851]">{v.vendorTrustId}</span>
                </div>
                <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/50">
                  Score: {v.trustScore}/100
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-0.5">
                <p>Category: <span className="text-slate-200">{v.category}</span></p>
                <p>GSTIN: <span className="font-mono text-slate-300">{v.gstin || "—"}</span></p>
                <p>Turnover Range: <span className="text-slate-200">{v.turnoverRange || "—"}</span></p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
