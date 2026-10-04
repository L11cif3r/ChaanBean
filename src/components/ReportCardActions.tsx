"use client";

import { useState } from "react";
import type { ReportType } from "@/lib/verification-gateway/types";

export function ReportCardActions({
  reportType,
  companyId,
}: {
  reportType: ReportType;
  companyId: string;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runReport() {
    if (!subjectId.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectType: "business",
        subjectId: subjectId.trim(),
        reportTypes: [reportType],
        companyId,
      }),
    });
    const data = await res.json();
    setResult(data.reports?.[0]?.status === "pending" ? "Pending OTP" : "Completed (cached on hit)");
    setLoading(false);
  }

  return (
    <div className="mt-4 space-y-2">
      <input
        className="w-full rounded border px-2 py-1.5 text-xs"
        placeholder="GSTIN / PAN / subject ID"
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
      />
      <button
        onClick={runReport}
        disabled={loading}
        className="w-full rounded-lg bg-chaan-navy py-1.5 text-xs text-white disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Report"}
      </button>
      {result && <p className="text-xs text-green-600">{result}</p>}
    </div>
  );
}
