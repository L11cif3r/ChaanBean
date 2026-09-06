"use client";

import { useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Upload, FileText, CheckCircle, AlertTriangle, XCircle, Clock, X } from "lucide-react";

const CATEGORIES = [
  { value: "PNL", label: "Profit & Loss Statement" },
  { value: "BALANCE_SHEET", label: "Balance Sheet" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "GST_RETURN", label: "GST Return (GSTR-3B)" },
  { value: "IT_RETURN", label: "Income Tax Return" },
  { value: "UDYAM_CERT", label: "Udyam Certificate" },
  { value: "MCA_EXTRACT", label: "MCA Extract" },
  { value: "OTHER", label: "Other" },
];

const FISCAL_YEARS = ["FY2024-25", "FY2023-24", "FY2022-23", "FY2021-22", "FY2020-21"];

interface UploadedFile {
  id: string;
  originalName: string;
  category: string;
  fiscalYear?: string | null;
  processingStatus: string;
  uploadedAt: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "FAILED") return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === "MANUAL_REVIEW_REQUIRED") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (status === "PROCESSING") return <div className="w-4 h-4 border-2 border-[var(--chaan-brand)] border-t-transparent rounded-full animate-spin" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

export default function DocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [category, setCategory] = useState("PNL");
  const [fiscalYear, setFiscalYear] = useState("FY2023-24");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const handleFileDrop = useCallback((file: File) => {
    setPendingFile(file);
    setError("");
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
  };

  const upload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", pendingFile);
    fd.append("category", category);
    fd.append("fiscalYear", fiscalYear);

    try {
      const res = await fetch(`/api/businesses/${id}/documents`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setUploads(prev => [data.document, ...prev]);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Poll for status updates
      pollStatus(data.document.id);
    } finally {
      setUploading(false);
    }
  };

  const pollStatus = (docId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 20) { clearInterval(interval); return; }
      try {
        const res = await fetch(`/api/businesses/${id}/documents/${docId}`);
        const data = await res.json();
        const status = data.document?.processingStatus;
        setUploads(prev => prev.map(u => u.id === docId ? { ...u, processingStatus: status } : u));
        if (status === "COMPLETED" || status === "FAILED" || status === "MANUAL_REVIEW_REQUIRED") {
          clearInterval(interval);
        }
      } catch { clearInterval(interval); }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--chaan-bg)] text-[var(--chaan-text)]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <Link href={`/business-check/${id}`} className="flex items-center gap-1.5 text-sm text-[var(--chaan-text-muted)] hover:text-[var(--chaan-brand)] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Profile
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--chaan-text)]">Upload Financial Documents</h1>
          <p className="text-sm text-[var(--chaan-text-muted)] mt-1">
            Supported: PDF, XLSX, CSV (processed automatically) · PNG, JPG (manual entry required)
          </p>
        </div>

        {/* Category & Year Selection */}
        <div className="bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl p-5 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">Document Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)]"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">Fiscal Year</label>
              <select
                value={fiscalYear}
                onChange={e => setFiscalYear(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)]"
              >
                {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-[var(--chaan-brand)] bg-[var(--chaan-brand)]/5"
                : "border-[var(--chaan-border)] hover:border-[var(--chaan-brand)] hover:bg-[var(--chaan-brand)]/5"
            }`}
          >
            <input ref={fileInputRef} type="file" onChange={handleFileInput} className="hidden"
              accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" />
            <Upload className="w-8 h-8 mx-auto mb-3 text-[var(--chaan-brand)]" />
            {pendingFile ? (
              <div>
                <div className="flex items-center justify-center gap-2 text-[var(--chaan-text)] font-medium">
                  <FileText className="w-4 h-4 text-[var(--chaan-brand)]" />
                  {pendingFile.name}
                  <button onClick={e => { e.stopPropagation(); setPendingFile(null); }} className="text-[var(--chaan-text-muted)] hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[var(--chaan-text-muted)] mt-1">
                  {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <p className="text-[var(--chaan-text-muted)] text-sm">Drag &amp; drop a file here, or click to browse</p>
                <p className="text-xs text-[var(--chaan-text-muted)] mt-1">PDF, XLSX, CSV, PNG, JPG · Max 20MB</p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={upload}
              disabled={!pendingFile || uploading}
              className="px-5 py-2.5 bg-[var(--chaan-brand)] hover:bg-[var(--chaan-brand-dark)] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading…" : "Upload & Process"}
            </button>
            <p className="text-xs text-[var(--chaan-text-muted)]">
              PDF &amp; XLSX files are processed automatically. Images require manual data entry.
            </p>
          </div>
        </div>

        {/* Uploaded Files */}
        {uploads.length > 0 && (
          <div className="bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl p-5">
            <h3 className="font-semibold text-[var(--chaan-text)] mb-3">This Session</h3>
            <div className="space-y-2">
              {uploads.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-[var(--chaan-bg)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={doc.processingStatus} />
                    <div>
                      <div className="text-sm font-medium text-[var(--chaan-text)] truncate max-w-xs">{doc.originalName}</div>
                      <div className="text-xs text-[var(--chaan-text-muted)]">{doc.category} · {doc.fiscalYear}</div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--chaan-text-muted)]">{doc.processingStatus.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
