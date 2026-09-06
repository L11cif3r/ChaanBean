"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Building2,
  Lock,
  Share2,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

interface VerifyBusinessViewProps {
  initialTrustId?: string;
}

export function VerifyBusinessView({ initialTrustId = "" }: VerifyBusinessViewProps) {
  const [trustIdInput, setTrustIdInput] = useState(initialTrustId.replace(/^TH-/, ""));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // If initialTrustId passed, auto-run verify
  useEffect(() => {
    if (initialTrustId) {
      handleVerify(initialTrustId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTrustId]);

  const handleVerify = async (queryId?: string) => {
    const rawId = queryId || trustIdInput.trim();
    if (!rawId) {
      setError("Please enter a Trust ID to verify.");
      return;
    }

    setLoading(true);
    setError(null);

    // Format query
    const fullId = rawId.startsWith("TH-") || rawId.startsWith("TRUST-") || rawId.startsWith("VTID-")
      ? rawId
      : `TH-${rawId}`;

    try {
      const res = await fetch(`/api/trust-hub/verify?trustId=${encodeURIComponent(fullId)}`);
      const data = await res.json();

      if (!res.ok) {
        setResult(null);
        setError(data.error || "No verified business found for this Trust ID.");
      } else {
        setResult(data);
        setError(null);
      }
    } catch {
      setError("Network error occurred while querying the Trust Network registry.");
    } finally {
      setLoading(false);
    }
  };

  const copyShareableLink = () => {
    if (!result?.trustId) return;
    const url = `${window.location.origin}/trust-hub?tab=verify&id=${encodeURIComponent(result.trustId)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-chaan-border pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">TrustHub — Verify Business</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Check verified businesses on ChaanBean Platform using their Trust ID
        </p>
      </div>

      {/* Center Search Card — Direct LegAn Look & Feel */}
      <div className="max-w-xl mx-auto rounded-2xl border border-chaan-border bg-chaan-card p-6 lg:p-8 shadow-xl text-center space-y-5">
        {/* Circular Shield Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-[#F44851]">
          <ShieldCheck size={32} />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white">Verify Business</h3>
          <p className="text-xs text-slate-400 mt-1">
            Enter Trust ID to check business verification status
          </p>
        </div>

        {/* Input Form with TH- Prefix */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-4 text-left"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Trust ID
            </label>
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 overflow-hidden focus-within:border-[#F44851] focus-within:ring-1 focus-within:ring-[#F44851] transition shadow-inner">
              <span className="bg-slate-800/80 px-3.5 py-3 text-xs font-mono font-bold text-slate-300 border-r border-slate-700 select-none">
                TH-
              </span>
              <input
                type="text"
                value={trustIdInput}
                onChange={(e) => setTrustIdInput(e.target.value)}
                placeholder="1234-5678 or CB-ACME-001"
                className="w-full bg-transparent px-3.5 py-3 text-xs font-mono text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F44851] py-3 text-xs font-bold text-white hover:bg-[#D9303A] disabled:opacity-50 transition shadow-md"
          >
            {loading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Querying Trust Network...</span>
              </>
            ) : (
              <>
                <Search size={15} />
                <span>Check Business</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Chips */}
        <div className="pt-2 border-t border-slate-800/80 text-left">
          <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
            Quick verified test samples:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {["TRUST-CB-ACME-001", "VTID-1000", "VTID-1001", "VTID-2004"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setTrustIdInput(chip.replace(/^TH-/, ""));
                  handleVerify(chip);
                }}
                className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-2 py-1 text-[11px] font-mono text-[#FF6B72] hover:bg-slate-800 hover:border-[#F44851] transition"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 pt-1">
          Trust ID is shareable and helps verify business credibility across commercial counterparties.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-xl mx-auto rounded-xl border border-rose-800/60 bg-rose-950/20 p-4 text-xs text-rose-300 flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-rose-200">Verification Lookup Failed</h4>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Verified Business Credential Dossier (The Improvisation) */}
      {result && (
        <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-700/60 bg-chaan-card p-6 lg:p-8 shadow-2xl space-y-6">
          {/* Certificate Top Banner */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-900/50 pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-700/60">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>VERIFIED TRUST NETWORK CREDENTIAL</span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{result.entityName}</h3>
              <p className="text-xs text-slate-400 font-mono">
                Trust ID: <strong className="text-emerald-400 font-bold">{result.trustId}</strong> · Entity: {result.entityType}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Credibility Score
              </span>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/50 bg-emerald-950/80 px-3.5 py-1 mt-0.5">
                <span className="text-xl font-mono font-bold text-emerald-400">
                  {result.trustScore}/100
                </span>
                <span className="text-[10px] text-emerald-300 font-medium">({result.scoreTier})</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {result.badges?.map((badge: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300 font-medium"
              >
                <Award size={13} className="text-emerald-400" />
                <span>{badge}</span>
              </div>
            ))}
          </div>

          {/* Entity Identifiers Grid */}
          <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">PAN Number</span>
              <p className="font-mono font-bold text-slate-200 mt-0.5">{result.pan}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">GST Registration</span>
              <p className="font-mono font-bold text-slate-200 mt-0.5">{result.gstin}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">CIN / Registration</span>
              <p className="font-mono font-bold text-slate-200 mt-0.5">{result.cin || "Registered Trade Entity"}</p>
            </div>
          </div>

          {/* Adverse Defaults Warning if applicable */}
          {result.adverseDefaultsCount > 0 ? (
            <div className="rounded-xl border border-rose-800/80 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-start gap-3">
              <ShieldAlert size={20} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-200">Adverse Default Alert Recorded</h4>
                <p className="mt-0.5">
                  {result.adverseDefaultsCount} undisputed peer commercial default(s) reported in the ChaanBean Community Registry.
                  Exercise caution prior to extending unsecured trade credit.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Zero peer defaults reported. Entity holds clean payment standing across the ChaanBean Trust Network.</span>
            </div>
          )}

          {/* Audited Checkpoints Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Audited Verification Checkpoints
            </h4>
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/40">
              {result.checkpoints?.map((cp: any, idx: number) => (
                <div key={idx} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-200">{cp.label}</span>
                    <p className="text-[11px] text-slate-400">{cp.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold border ${
                      cp.status === "passed"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800/60"
                        : cp.status === "warning"
                        ? "bg-amber-950 text-amber-400 border-amber-800/60"
                        : "bg-rose-950 text-rose-400 border-rose-800/60"
                    }`}
                  >
                    {cp.status === "passed" ? "PASSED" : cp.status === "warning" ? "FLAGGED" : "FAILED"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Evidence & Certificate Hash */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Lock size={13} className="text-emerald-400" />
                <span>IT Act 2000 Section 65B Digital Evidence Seal</span>
              </span>
              <span className="font-mono text-emerald-400">SHA-256 Validated</span>
            </div>
            <p className="font-mono break-all text-[10px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
              {result.certificateHash}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span>Authority: <strong className="text-slate-200">{result.verificationAuthority}</strong></span>
              <span>Valid Until: <strong className="text-slate-200">{new Date(result.validUntil).toLocaleDateString("en-IN")}</strong></span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={copyShareableLink}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span>{copiedLink ? "Link Copied to Clipboard!" : "Share Verification Link"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl bg-[#F44851] px-5 py-2 text-xs font-semibold text-white hover:bg-[#D9303A] transition shadow-md"
            >
              <Download size={14} />
              <span>Print Credential Certificate</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
