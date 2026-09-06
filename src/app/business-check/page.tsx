"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Search, Plus, ChevronRight, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

interface BusinessSummary {
  id: string;
  companyName: string;
  gstin?: string | null;
  cin?: string | null;
  pan?: string | null;
  overallStatus: string;
  createdAt: string;
  riskFlag?: { flag: string; compositeScore: number; recommendedLimit: number } | null;
  yearSummaries?: Array<{ fiscalYear: string; revenue?: number | null }>;
  _count?: { financialDocuments: number; courtCases: number };
}

const FLAG_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  GREEN: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  AMBER: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  RED: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: <XCircle className="w-4 h-4" />,
  },
  PENDING: {
    bg: "bg-slate-50 dark:bg-slate-800/50",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    icon: <Clock className="w-4 h-4" />,
  },
};

function formatCrore(val?: number | null): string {
  if (val == null) return "—";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function BusinessCheckPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    companyName: "",
    gstin: "",
    cin: "",
    pan: "",
    udyamNo: "",
    phone: "",
  });

  const fetchBusinesses = async (q?: string) => {
    try {
      const url = q
        ? `/api/businesses/search?q=${encodeURIComponent(q)}`
        : `/api/businesses`;
      const res = await fetch(url);
      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchBusinesses(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError("Company name is required");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const authRaw = typeof window !== "undefined" ? localStorage.getItem("chaanbean_auth") : null;
      const auth = authRaw ? JSON.parse(authRaw) : {};

      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, createdBy: auth.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.existingId) {
          router.push(`/business-check/${data.existingId}`);
          return;
        }
        setError(data.error?.fieldErrors?.companyName?.[0] || data.error || "Failed to create business profile");
        return;
      }

      router.push(`/business-check/${data.business.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const flagKey = (b: BusinessSummary) => b.riskFlag?.flag || "PENDING";

  return (
    <div className="min-h-screen bg-[var(--chaan-bg)] text-[var(--chaan-text)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--chaan-brand)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--chaan-text)]">Business Check</h1>
              <p className="text-sm text-[var(--chaan-text-muted)]">
                Financial intelligence &amp; verification — real data, no mock values
              </p>
            </div>
          </div>
        </div>

        {/* New Business Form */}
        <div className="bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Plus className="w-5 h-5 text-[var(--chaan-brand)]" />
            <h2 className="text-lg font-semibold text-[var(--chaan-text)]">Run a Business Check</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="e.g. Acme Trading Pvt Ltd"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] placeholder:text-[var(--chaan-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 27AABCU9603R1ZX"
                  maxLength={15}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] placeholder:text-[var(--chaan-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">CIN</label>
                <input
                  type="text"
                  value={form.cin}
                  onChange={e => setForm(f => ({ ...f, cin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. U74999MH2020PTC345678"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] placeholder:text-[var(--chaan-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">PAN</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={e => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))}
                  placeholder="e.g. AABCU9603R"
                  maxLength={10}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] placeholder:text-[var(--chaan-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">Udyam No.</label>
                <input
                  type="text"
                  value={form.udyamNo}
                  onChange={e => setForm(f => ({ ...f, udyamNo: e.target.value.toUpperCase() }))}
                  placeholder="e.g. UDYAM-KL-00-0012345"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] placeholder:text-[var(--chaan-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--chaan-text-muted)] mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] placeholder:text-[var(--chaan-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[var(--chaan-brand)] hover:bg-[var(--chaan-brand-dark)] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating Profile…" : "Start Business Check"}
              </button>
              <p className="text-xs text-[var(--chaan-text-muted)]">
                At minimum, provide company name. More identifiers = better verification.
              </p>
            </div>
          </form>
        </div>

        {/* Business List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--chaan-text)]">
              Business Profiles
              {businesses.length > 0 && (
                <span className="ml-2 text-sm font-normal text-[var(--chaan-text-muted)]">({businesses.length})</span>
              )}
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--chaan-text-muted)]" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name, GSTIN, CIN, PAN…"
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] placeholder:text-[var(--chaan-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] w-72"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 text-[var(--chaan-text-muted)]">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No business profiles yet</p>
              <p className="text-sm mt-1">Create your first business check above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map(biz => {
                const fk = flagKey(biz);
                const style = FLAG_STYLES[fk] || FLAG_STYLES.PENDING;
                const latestRevenue = biz.yearSummaries?.[biz.yearSummaries.length - 1]?.revenue;

                return (
                  <Link
                    key={biz.id}
                    href={`/business-check/${biz.id}`}
                    className="block bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl p-5 hover:border-[var(--chaan-brand)] hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--chaan-text)] truncate group-hover:text-[var(--chaan-brand)] transition-colors">
                          {biz.companyName}
                        </h3>
                        <p className="text-xs text-[var(--chaan-text-muted)] mt-0.5 font-mono truncate">
                          {biz.gstin || biz.cin || biz.pan || "No identifiers yet"}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} ml-2 shrink-0`}>
                        {style.icon}
                        {fk}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-[var(--chaan-bg)] rounded-lg">
                        <div className="text-xs text-[var(--chaan-text-muted)]">Risk Score</div>
                        <div className="font-bold text-[var(--chaan-text)]">
                          {biz.riskFlag ? `${biz.riskFlag.compositeScore}/100` : "—"}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-[var(--chaan-bg)] rounded-lg">
                        <div className="text-xs text-[var(--chaan-text-muted)]">Latest Revenue</div>
                        <div className="font-bold text-[var(--chaan-text)]">{formatCrore(latestRevenue)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--chaan-text-muted)]">
                      <span>{biz._count?.financialDocuments ?? 0} documents</span>
                      <div className="flex items-center gap-1 group-hover:text-[var(--chaan-brand)] transition-colors">
                        View Profile <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
