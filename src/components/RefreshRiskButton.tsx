"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function RefreshRiskButton({ buyerId }: { buyerId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function refresh() {
    setLoading(true);
    try {
      await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId }),
      });
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={refresh}
      disabled={loading}
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
    >
      <RefreshCw size={12} className={loading ? "animate-spin text-chaan-accent" : ""} />
      {loading ? "Re-computing Signals..." : "Re-compute Risk Flag"}
    </button>
  );
}
