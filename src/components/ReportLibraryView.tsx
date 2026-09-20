"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Building2,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  Coins,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ReportResultView } from "./verification/ReportResultView";
import type { NormalizedReport } from "@/lib/verification-gateway/types";

interface LibraryItem {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectType: string;
  reportType: string;
  reportTitle: string;
  costPaid: number;
  downloadedAt: string | null;
  createdAt: string;
  data: NormalizedReport;
}

interface ReportLibraryViewProps {
  onSelectFeatureTab?: (tabKey: string) => void;
}

export function ReportLibraryView({ onSelectFeatureTab }: ReportLibraryViewProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<LibraryItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/library");
      const data = await res.json();
      if (data.reports) {
        setItems(data.reports);
      }
    } catch (err) {
      console.error("Failed to load library:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleDownload = async (item: LibraryItem) => {
    setDownloadingId(item.id);
    try {
      // Mark downloaded in API
      await fetch("/api/reports/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: item.subjectId,
          reportType: item.reportType,
          isDownload: true,
        }),
      });

      // Generate downloadable JSON file
      const blob = new Blob([JSON.stringify(item.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ChaanBean-${item.reportType}-${item.subjectId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update local state
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, downloadedAt: new Date().toISOString() } : i))
      );
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesQ =
      !searchQ.trim() ||
      item.subjectName.toLowerCase().includes(searchQ.toLowerCase()) ||
      item.subjectId.toLowerCase().includes(searchQ.toLowerCase()) ||
      item.reportTitle.toLowerCase().includes(searchQ.toLowerCase());

    const matchesType = typeFilter === "all" || item.reportType === typeFilter;
    return matchesQ && matchesType;
  });

  const totalValueSaved = items.reduce((sum, i) => sum + (i.costPaid || 99), 0);

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FC8019] border border-orange-200 dark:border-orange-800">
                <FileText size={18} />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Personal Report Library
              </h2>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {items.length} Dossiers Saved
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All statutory reports fetched or downloaded stay permanently in your library. Re-open, inspect, or download anytime at ₹0 repeat cost.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLibrary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#FC8019] transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-700 dark:text-emerald-400">
              <span className="text-slate-500 mr-1">Stored Value:</span>
              <span className="font-bold">₹{totalValueSaved.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, GSTIN, PAN, or report title..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FC8019]"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Filter size={13} className="text-slate-400 mr-1" />
            {["all", "director_details", "msme_report", "gst_slab_check", "court_case_history"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                  typeFilter === type
                    ? "bg-[#FC8019] text-white font-bold shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {type === "all" ? "All Types" : type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-mono">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#FC8019]" />
          Loading your purchased reports...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-3 bg-white dark:bg-[#0D1322]/50">
          <div className="h-12 w-12 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FC8019] flex items-center justify-center mx-auto">
            <FileText size={22} />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {searchQ ? "No matching reports found" : "Your Report Library is Currently Empty"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQ
              ? "Try adjusting your search query or filter tags."
              : "Whenever you run an AI Credit Check or download a statutory dossier, it is permanently saved right here for instant, zero-cost access."}
          </p>
          {onSelectFeatureTab && (
            <button
              onClick={() => onSelectFeatureTab("all")}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FC8019] text-white text-xs font-bold hover:bg-[#E26D0A] transition"
            >
              <span>Run First AI Credit Check</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const formattedDate = new Date(item.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 flex flex-col justify-between space-y-3 hover:border-[#FC8019]/40 hover:shadow-md transition group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/50 text-[#FC8019] border border-orange-200 dark:border-orange-900/50 font-bold uppercase">
                      {item.reportTitle}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 size={10} />
                      Paid (₹0 Access)
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={item.subjectName}>
                      {item.subjectName}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      ID: {item.subjectId}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formattedDate}
                    </span>
                    <span>Fee: ₹{item.costPaid}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    onClick={() => setSelectedReport(item)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#FC8019] hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Eye size={12} />
                    <span>View Dossier</span>
                  </button>

                  <button
                    onClick={() => handleDownload(item)}
                    disabled={downloadingId === item.id}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#FC8019] hover:text-[#FC8019] text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    title="Download Report JSON/PDF"
                  >
                    <Download size={12} className={downloadingId === item.id ? "animate-bounce" : ""} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Report Inspection Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#FC8019] border border-orange-200 dark:border-orange-800">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedReport.subjectName} · {selectedReport.reportTitle}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Subject ID: {selectedReport.subjectId} · Permanent Library Asset
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedReport)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FC8019] text-white text-xs font-semibold hover:bg-[#E26D0A]"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white font-mono text-xs"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedReport.data && selectedReport.data.data ? (
                <ReportResultView report={selectedReport.data} />
              ) : (
                <pre className="text-xs font-mono bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto">
                  {JSON.stringify(selectedReport.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
