"use client";

import { useState } from "react";
import { Calculator, FileCheck, PenTool, CheckCircle2 } from "lucide-react";

export function ArbitrationActions({
  caseId,
  creditAccountId,
  eSignStatus,
}: {
  caseId: string;
  creditAccountId: string;
  eSignStatus?: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function performAction(action: "recalculate_interest" | "generate_settlement" | "e_sign") {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/arbitration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          action,
          signatoryName: "Harish Parekh",
          signatoryRole: "Authorized Signatory (Claimant)",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMsg(data.error || "Action failed.");
      }
    } catch {
      setMsg("Network execution error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => performAction("recalculate_interest")}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition border border-slate-700/80 disabled:opacity-50"
        >
          <Calculator size={13} className="text-amber-400" />
          Recompute MSME Interest (§16)
        </button>

        <button
          onClick={() => performAction("generate_settlement")}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-chaan-brand hover:bg-[#D9303A] text-white px-3.5 py-2 text-xs font-bold transition shadow-sm shadow-[#F44851]/20 disabled:opacity-50"
        >
          <FileCheck size={13} />
          Draft Settlement Terms
        </button>

        <button
          onClick={() => performAction("e_sign")}
          disabled={loading || eSignStatus === "fully_signed"}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm disabled:opacity-50 ${
            eSignStatus === "fully_signed"
              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80"
              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
          }`}
        >
          <PenTool size={13} />
          {eSignStatus === "fully_signed" ? "Fully e-Signed" : "Execute Aadhaar e-Sign"}
        </button>
      </div>

      {msg && (
        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
          <CheckCircle2 size={12} className="shrink-0" />
          <span>{msg}</span>
        </div>
      )}
    </div>
  );
}
