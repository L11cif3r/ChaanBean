"use client";

import { useState } from "react";
import { FileText, CheckCircle2, PhoneCall, Volume2 } from "lucide-react";
import { OneWayCallModal } from "./OneWayCallModal";

export function RecoveryActions({ creditAccountId }: { creditAccountId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);

  async function runTick(action: "tick" | "legal_notice") {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditAccountId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message ?? "Action completed successfully.");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMsg(data.error || "Execution failed.");
      }
    } catch {
      setMsg("Network execution error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCallModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition shadow-sm"
        >
          <Volume2 size={12} />
          Launch One-Way Call
        </button>

        <button
          disabled={loading}
          onClick={() => runTick("tick")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-chaan-brand hover:bg-[#E26D0A] text-white px-3 py-1.5 text-xs font-semibold transition shadow-sm shadow-[#FC8019]/20 disabled:opacity-50"
        >
          <PhoneCall size={12} />
          Execute Policy Tick
        </button>

        <button
          disabled={loading}
          onClick={() => runTick("legal_notice")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-sm disabled:opacity-50"
        >
          <FileText size={12} />
          Legal Notice
        </button>
      </div>

      {msg && (
        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
          <CheckCircle2 size={12} className="shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {callModalOpen && (
        <OneWayCallModal
          creditAccountId={creditAccountId}
          isOpen={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          onSettled={() => {
            setMsg("Account settled successfully.");
            setTimeout(() => window.location.reload(), 1200);
          }}
        />
      )}
    </div>
  );
}
