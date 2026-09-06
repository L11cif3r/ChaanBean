"use client";

import React, { useState } from "react";
import { AlertTriangle, Send, CheckCircle2 } from "lucide-react";

export function CommunityDefaultForm({ onReported }: { onReported?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [debtorName, setDebtorName] = useState("");
  const [debtorGstin, setDebtorGstin] = useState("");
  const [debtorPan, setDebtorPan] = useState("");
  const [amountDefaulted, setAmountDefaulted] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorName || !amountDefaulted) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/trust-hub/defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtorName,
          debtorGstin: debtorGstin.toUpperCase(),
          debtorPan: debtorPan.toUpperCase(),
          amountDefaulted,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Community default published successfully.");
        setDebtorName("");
        setDebtorGstin("");
        setDebtorPan("");
        setAmountDefaulted("");
        setNotes("");
        if (onReported) onReported();
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
          window.location.reload();
        }, 1500);
      } else {
        setMessage(data.error || "Failed to submit default.");
      }
    } catch {
      setMessage("Network error submitting report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
        >
          <AlertTriangle size={14} />
          Report Counterparty Default
        </button>
      ) : (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-5 mt-4">
          <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle size={16} />
              <span>Publish Peer Default Report to Trust Hub Network</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Reporting an undisputed default warns peers across the network and automatically sets the counterparty's Risk Flag to Red.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-slate-300 mb-1">Debtor Entity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Supplies"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Default Amount (INR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 850000"
                  value={amountDefaulted}
                  onChange={(e) => setAmountDefaulted(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="27AABCA1234F1Z5"
                  value={debtorGstin}
                  onChange={(e) => setDebtorGstin(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">PAN (Optional)</label>
                <input
                  type="text"
                  placeholder="AABCA1234F"
                  value={debtorPan}
                  onChange={(e) => setDebtorPan(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none uppercase font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Evidence Summary / Notes</label>
              <textarea
                rows={2}
                placeholder="Details of overdue invoice, dishonored cheque (Sec 138), or lack of response to legal notice..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
              />
            </div>

            {message && (
              <div className="rounded bg-slate-800 p-2 text-xs text-amber-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                {message}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50"
              >
                <Send size={12} />
                {loading ? "Publishing..." : "Submit Verified Default"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
