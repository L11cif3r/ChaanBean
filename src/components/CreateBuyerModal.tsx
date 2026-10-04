"use client";

import React, { useState } from "react";
import { UserPlus, CheckCircle2, Zap } from "lucide-react";

export function CreateBuyerModal({ onCreated }: { onCreated?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [mobile, setMobile] = useState("");
  const [language, setLanguage] = useState("en");
  const [initialAmount, setInitialAmount] = useState("250000");
  const [overdueDays, setOverdueDays] = useState("15");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          pan: pan.toUpperCase(),
          gstin: gstin.toUpperCase(),
          mobile: [mobile || "9876543210"],
          language,
          initialAmount,
          overdueDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(
          `Buyer created! Verification bundle executed. Computed flag: ${data.riskFlag?.flag?.toUpperCase()} (${data.riskFlag?.compositeScore?.toFixed(1)}/100).`
        );
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
          window.location.reload();
        }, 1800);
      } else {
        setMessage(data.error || "Failed to create buyer.");
      }
    } catch {
      setMessage("Network error creating buyer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-chaan-accent px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition shadow-[0_0_12px_rgba(56,189,248,0.2)]"
        >
          <UserPlus size={14} />
          Add New Buyer Debtor
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-chaan-border bg-chaan-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-chaan-border pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <UserPlus className="text-chaan-accent" size={18} />
                <span>Onboard Buyer & Run Instant Verification</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Creating a buyer triggers parallel fan-out across 11 verification providers and deterministically computes the Green/Amber/Red risk flag immediately.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Company / Buyer Trade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Western Infra Projects LLP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-slate-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AABCP1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">PAN</label>
                  <input
                    type="text"
                    placeholder="AABCP1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-slate-300 mb-1">Primary Mobile Number</label>
                  <input
                    type="text"
                    placeholder="9820011223"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Preferred Debtor Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                  >
                    <option value="en">English (Default)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="ml">മലയാളം (Malayalam)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                    <option value="tu">ತುಳು (Tulu)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-slate-300 mb-1">Initial Invoice Outstanding (INR)</label>
                  <input
                    type="number"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Days Overdue</label>
                  <input
                    type="number"
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              {message && (
                <div className="rounded-lg bg-emerald-950/70 border border-emerald-800/70 p-3 text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-chaan-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50"
                >
                  <Zap size={14} />
                  {loading ? "Verifying & Scoring..." : "Verify & Onboard Buyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
