"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, FileText, Shield, AlertTriangle, CheckCircle, XCircle,
  Clock, ExternalLink, ChevronLeft, Upload, RefreshCw, Info,
  Banknote, Scale, Award, BarChart2, Activity, ChevronDown, ChevronUp
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Business {
  id: string;
  companyName: string;
  gstin?: string | null;
  cin?: string | null;
  pan?: string | null;
  udyamNo?: string | null;
  phone?: string | null;
  registeredAddr?: string | null;
  incorporatedOn?: string | null;
  enterpriseType?: string | null;
  primaryActivity?: string | null;
  overallStatus: string;
  createdAt: string;
  identifiers: Array<{ id: string; identifierType: string; value: string; sourceStatus: string }>;
  sourceRecords: Array<{ id: string; sourceType: string; sourceStatus: string; parsedFields?: string | null; fetchedAt: string }>;
  financialDocuments: Array<{ id: string; originalName: string; category: string; fiscalYear?: string | null; processingStatus: string; uploadedAt: string }>;
  yearSummaries: Array<{
    fiscalYear: string; revenue?: number | null; netProfit?: number | null;
    ebitda?: number | null; totalLiabilities?: number | null; grossMarginPct?: number | null;
    netMarginPct?: number | null; currentRatio?: number | null; debtToEquity?: number | null;
    dataCompleteness: number;
  }>;
  consistencyChecks: Array<{ checkName: string; fiscalYear?: string | null; result: string; note?: string | null; discrepancyPct?: number | null }>;
  riskSignals: Array<{ signalCode: string; label: string; color: string; score: number; rationale: string }>;
  riskFlag?: { flag: string; compositeScore: number; recommendedLimit: number; recommendedTenor: number; hardRedFlags?: string | null } | null;
  creditRec?: { creditLimit: number; tenor: number; flag: string; rationale: string; isBlocked: boolean; blockReason?: string | null } | null;
  courtCases: Array<{ id: string; caseNumber?: string | null; courtName?: string | null; caseType?: string | null; status?: string | null; partyRole?: string | null }>;
  verificationTasks: Array<{ taskType: string; status: string }>;
  manualReviews: Array<{ id: string; reviewType: string; promptText: string; portalUrl?: string | null }>;
  auditLogs: Array<{ id: string; eventType: string; description: string; createdAt: string; actor?: string | null }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val?: number | null): string {
  if (val == null) return "—";
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function pct(val?: number | null): string {
  if (val == null) return "—";
  return `${val.toFixed(1)}%`;
}

const FLAG_COLOR: Record<string, string> = {
  GREEN: "text-emerald-600 dark:text-emerald-400",
  AMBER: "text-amber-600 dark:text-amber-400",
  RED: "text-red-600 dark:text-red-400",
  GREY: "text-slate-500",
};

const FLAG_BG: Record<string, string> = {
  GREEN: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  AMBER: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  RED: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  PENDING: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700",
};

function FlagBadge({ flag, size = "sm" }: { flag: string; size?: "sm" | "lg" }) {
  const icons: Record<string, React.ReactNode> = {
    GREEN: <CheckCircle className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />,
    AMBER: <AlertTriangle className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />,
    RED: <XCircle className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />,
    PENDING: <Clock className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />,
  };
  const pad = size === "lg" ? "px-4 py-2 text-sm" : "px-2 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${pad} ${FLAG_COLOR[flag] || FLAG_COLOR.PENDING} ${FLAG_BG[flag] || FLAG_BG.PENDING}`}>
      {icons[flag] || icons.PENDING}
      {flag}
    </span>
  );
}

function SourceBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    LIVE: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    PUBLIC_LOOKUP: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    USER_PROVIDED: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
    MANUAL_VERIFICATION: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    UNAVAILABLE: "bg-slate-100 dark:bg-slate-800 text-slate-500",
    DEMO: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
    PENDING: "bg-slate-100 dark:bg-slate-800 text-slate-500",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${styles[status] || styles.PENDING}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);
  const color = score >= 65 ? "#10b981" : score >= 35 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={size * 0.06} className="text-slate-200 dark:text-slate-700" />
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke={color}
          strokeWidth={size * 0.07} strokeDasharray={circumference}
          strokeDashoffset={dashOffset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-[var(--chaan-text)]" style={{ fontSize: size * 0.2 }}>{score}</span>
        <span className="text-[var(--chaan-text-muted)]" style={{ fontSize: size * 0.1 }}>/100</span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--chaan-bg)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[var(--chaan-brand)]">{icon}</span>
          <span className="font-semibold text-[var(--chaan-text)]">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--chaan-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--chaan-text-muted)]" />}
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// ─── Manual Verification Panel ────────────────────────────────────────────────

function ManualVerifyPanel({ review, businessId, onDone }: {
  review: Business["manualReviews"][0];
  businessId: string;
  onDone: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Simple JSON textarea for raw data entry
  const [rawJson, setRawJson] = useState("{}");
  const type = review.reviewType.replace("_MANUAL", "").replace("_EXTRACTION", "");

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let payload: unknown;
      try { payload = JSON.parse(rawJson); } catch { payload = { rawText: rawJson }; }

      await fetch(`/api/businesses/${businessId}/manual-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
      setSubmitted(true);
      setTimeout(onDone, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm">
        <CheckCircle className="w-4 h-4" /> Data submitted. Refreshing…
      </div>
    );
  }

  return (
    <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Manual Verification Required: {type}</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-amber-600 dark:text-amber-400 underline">
          {expanded ? "Collapse" : "Enter Data"}
        </button>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">{review.promptText}</p>
      {review.portalUrl && (
        <a
          href={review.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--chaan-brand)] hover:bg-[var(--chaan-brand-dark)] text-white text-xs font-medium rounded-lg mb-3 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open Official {type} Portal
        </a>
      )}
      {expanded && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            Paste the data you found (JSON or plain text):
          </label>
          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            rows={6}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--chaan-border)] bg-[var(--chaan-bg)] text-[var(--chaan-text)] focus:outline-none focus:ring-2 focus:ring-[var(--chaan-brand)] resize-y"
            placeholder={`{"${type === "ECOURTS" ? "cases" : "companyName"}": "...", ...}`}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 px-4 py-2 bg-[var(--chaan-brand)] hover:bg-[var(--chaan-brand-dark)] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Submit Verified Data"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BusinessProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);

  const fetchBusiness = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${id}`);
      if (!res.ok) { router.push("/business-check"); return; }
      const data = await res.json();
      setBusiness(data.business);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  const rerunVerification = async () => {
    setRerunning(true);
    await fetch(`/api/businesses/${id}/verify`, { method: "POST" });
    setTimeout(() => { fetchBusiness(); setRerunning(false); }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--chaan-bg)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--chaan-brand)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!business) return null;

  const riskFlag = business.riskFlag;
  const creditRec = business.creditRec;
  const chartData = business.yearSummaries.map(s => ({
    year: s.fiscalYear.replace("FY", ""),
    revenue: s.revenue ? s.revenue / 100000 : null,
    netProfit: s.netProfit ? s.netProfit / 100000 : null,
    ebitda: s.ebitda ? s.ebitda / 100000 : null,
    liabilities: s.totalLiabilities ? s.totalLiabilities / 100000 : null,
  }));

  const mcaRecord = business.sourceRecords.find(r => r.sourceType === "MCA");
  const gstRecord = business.sourceRecords.find(r => r.sourceType === "GST");
  const udyamRecord = business.sourceRecords.find(r => r.sourceType === "UDYAM");
  const eCourtsRecord = business.sourceRecords.find(r => r.sourceType === "ECOURTS");

  const verifyTaskMap: Record<string, string> = {};
  for (const t of business.verificationTasks) verifyTaskMap[t.taskType] = t.status;

  return (
    <div className="min-h-screen bg-[var(--chaan-bg)] text-[var(--chaan-text)]">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Back & Actions ── */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/business-check" className="flex items-center gap-2 text-sm text-[var(--chaan-text-muted)] hover:text-[var(--chaan-brand)] transition-colors">
            <ChevronLeft className="w-4 h-4" /> All Businesses
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/business-check/${id}/documents`}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--chaan-brand)] text-[var(--chaan-brand)] rounded-lg hover:bg-[var(--chaan-brand)] hover:text-white transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload Documents
            </Link>
            <button
              onClick={rerunVerification}
              disabled={rerunning}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--chaan-brand)] text-white rounded-lg hover:bg-[var(--chaan-brand-dark)] transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${rerunning ? "animate-spin" : ""}`} />
              {rerunning ? "Running…" : "Re-run Analysis"}
            </button>
          </div>
        </div>

        <div className="space-y-4">

          {/* ── Section 1: Header ── */}
          <div className="bg-[var(--chaan-card)] border border-[var(--chaan-border)] rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--chaan-text)]">{business.companyName}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {business.gstin && <span className="text-xs font-mono text-[var(--chaan-text-muted)] bg-[var(--chaan-bg)] px-2 py-1 rounded">GSTIN: {business.gstin}</span>}
                  {business.cin && <span className="text-xs font-mono text-[var(--chaan-text-muted)] bg-[var(--chaan-bg)] px-2 py-1 rounded">CIN: {business.cin}</span>}
                  {business.pan && <span className="text-xs font-mono text-[var(--chaan-text-muted)] bg-[var(--chaan-bg)] px-2 py-1 rounded">PAN: {business.pan}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {riskFlag ? (
                  <>
                    <ScoreGauge score={riskFlag.compositeScore} size={90} />
                    <div className="text-right">
                      <FlagBadge flag={riskFlag.flag} size="lg" />
                      <div className="mt-2 text-sm text-[var(--chaan-text-muted)]">
                        Credit: <span className={`font-bold ${riskFlag.flag === "RED" ? "text-red-500" : "text-[var(--chaan-text)]"}`}>
                          {riskFlag.flag === "RED" ? "BLOCKED" : fmt(riskFlag.recommendedLimit)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-[var(--chaan-text-muted)]">
                    <Clock className="w-8 h-8 mx-auto mb-1 animate-pulse" />
                    <span className="text-sm">Analysis pending…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Open Manual Reviews */}
            {business.manualReviews.length > 0 && (
              <div className="mt-4 space-y-3">
                {business.manualReviews.map(review => (
                  <ManualVerifyPanel key={review.id} review={review} businessId={id} onDone={fetchBusiness} />
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Identity ── */}
          <SectionCard title="Business Identity" icon={<Shield className="w-5 h-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {[
                { label: "GSTIN", value: business.gstin, type: "GST" },
                { label: "CIN", value: business.cin, type: "MCA" },
                { label: "PAN", value: business.pan, type: null },
                { label: "Udyam No.", value: business.udyamNo, type: "UDYAM" },
                { label: "Phone", value: business.phone, type: null },
                { label: "Registered Address", value: business.registeredAddr, type: null },
              ].map(field => (
                <div key={field.label} className="p-3 bg-[var(--chaan-bg)] rounded-lg">
                  <div className="text-xs text-[var(--chaan-text-muted)] mb-1">{field.label}</div>
                  <div className="font-mono text-sm text-[var(--chaan-text)] break-all">
                    {field.value || <span className="text-[var(--chaan-text-muted)] font-sans">Not provided</span>}
                  </div>
                  {field.type && (
                    <div className="mt-1">
                      <SourceBadge status={
                        business.sourceRecords.find(r => r.sourceType === field.type)?.sourceStatus || "UNAVAILABLE"
                      } />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Section 3: Financial Health ── */}
          <SectionCard title="Financial Health" icon={<Activity className="w-5 h-5" />}>
            {business.yearSummaries.length === 0 ? (
              <div className="text-center py-8 text-[var(--chaan-text-muted)]">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No financial documents processed yet.</p>
                <Link href={`/business-check/${id}/documents`} className="text-[var(--chaan-brand)] text-sm underline mt-1 inline-block">
                  Upload documents →
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Latest Revenue", value: fmt(business.yearSummaries.at(-1)?.revenue) },
                    { label: "Net Margin", value: pct(business.yearSummaries.at(-1)?.netMarginPct) },
                    { label: "Current Ratio", value: business.yearSummaries.at(-1)?.currentRatio?.toFixed(2) || "—" },
                    { label: "D/E Ratio", value: business.yearSummaries.at(-1)?.debtToEquity?.toFixed(2) || "—" },
                  ].map(m => (
                    <div key={m.label} className="text-center p-3 bg-[var(--chaan-bg)] rounded-xl">
                      <div className="text-xs text-[var(--chaan-text-muted)] mb-1">{m.label}</div>
                      <div className="font-bold text-[var(--chaan-text)]">{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Revenue & Profit Chart */}
                {chartData.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-[var(--chaan-text-muted)] mb-3">Revenue & Net Profit (₹ Lakhs)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--chaan-text-muted)" }} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--chaan-text-muted)" }} />
                        <Tooltip
                          formatter={(val: any) => [`₹${Number(val || 0).toFixed(2)}L`, ""]}
                          contentStyle={{ background: "var(--chaan-card)", border: "1px solid var(--chaan-border)", borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="revenue" name="Revenue" fill="#F44851" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="netProfit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          {/* ── Sections 4-6: GST, MCA, Udyam ── */}
          {[
            {
              title: "GST Verification",
              icon: <FileText className="w-5 h-5" />,
              taskType: "GST",
              record: gstRecord,
              portalUrl: "https://services.gst.gov.in/services/searchtp",
              portalLabel: "Open GST Portal",
            },
            {
              title: "MCA Details",
              icon: <Building2 className="w-5 h-5" />,
              taskType: "MCA",
              record: mcaRecord,
              portalUrl: "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html",
              portalLabel: "Open MCA21 Portal",
            },
            {
              title: "Udyam / MSME",
              icon: <Award className="w-5 h-5" />,
              taskType: "UDYAM",
              record: udyamRecord,
              portalUrl: "https://udyamregistration.gov.in/UdyamVerifyRegistration/UdyamVerifyRegistration.aspx",
              portalLabel: "Open Udyam Portal",
            },
          ].map(sec => {
            const taskStatus = verifyTaskMap[sec.taskType] || "PENDING";
            const parsed = sec.record?.parsedFields ? JSON.parse(sec.record.parsedFields) : null;
            return (
              <SectionCard key={sec.title} title={sec.title} icon={sec.icon} defaultOpen={false}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <SourceBadge status={sec.record?.sourceStatus || "UNAVAILABLE"} />
                    <span className="text-xs text-[var(--chaan-text-muted)]">Task: {taskStatus}</span>
                  </div>
                  <a
                    href={sec.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--chaan-brand)] text-[var(--chaan-brand)] rounded-lg hover:bg-[var(--chaan-brand)] hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> {sec.portalLabel}
                  </a>
                </div>
                {parsed ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(parsed).filter(([, v]) => v && typeof v !== "object").map(([k, v]) => (
                      <div key={k} className="p-2 bg-[var(--chaan-bg)] rounded-lg">
                        <div className="text-[10px] text-[var(--chaan-text-muted)] uppercase tracking-wide">{k.replace(/([A-Z])/g, " $1")}</div>
                        <div className="text-sm text-[var(--chaan-text)] font-medium">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--chaan-text-muted)] italic">
                    No data yet. Open the portal above, look up the business, and use the manual verification form in the header to submit findings.
                  </div>
                )}
              </SectionCard>
            );
          })}

          {/* ── Section 7: Court Records ── */}
          <SectionCard title="Court Records" icon={<Scale className="w-5 h-5" />} defaultOpen={false}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SourceBadge status={eCourtsRecord?.sourceStatus || "UNAVAILABLE"} />
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>eCourts requires CAPTCHA — manual search only</span>
                </div>
              </div>
              <a
                href="https://ecourts.gov.in/ecourts_home/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--chaan-brand)] text-[var(--chaan-brand)] rounded-lg hover:bg-[var(--chaan-brand)] hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Open eCourts Search
              </a>
            </div>
            {business.courtCases.length === 0 ? (
              <p className="text-sm text-[var(--chaan-text-muted)] italic">No court cases entered yet.</p>
            ) : (
              <div className="space-y-2">
                {business.courtCases.map(c => (
                  <div key={c.id} className="p-3 bg-[var(--chaan-bg)] rounded-lg flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-[var(--chaan-text)]">{c.caseNumber || "Case #unknown"}</div>
                      <div className="text-xs text-[var(--chaan-text-muted)]">{c.courtName} · {c.caseType} · Role: {c.partyRole}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === "ACTIVE" || c.status === "PENDING" ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Section 8: Documents ── */}
          <SectionCard title="Documents" icon={<FileText className="w-5 h-5" />} defaultOpen={false}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[var(--chaan-text-muted)]">{business.financialDocuments.length} document(s)</span>
              <Link
                href={`/business-check/${id}/documents`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--chaan-brand)] text-white rounded-lg hover:bg-[var(--chaan-brand-dark)] transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload More
              </Link>
            </div>
            {business.financialDocuments.length === 0 ? (
              <p className="text-sm text-[var(--chaan-text-muted)] italic">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {business.financialDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-[var(--chaan-bg)] rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-[var(--chaan-text)] truncate max-w-xs">{doc.originalName}</div>
                      <div className="text-xs text-[var(--chaan-text-muted)]">{doc.category} · {doc.fiscalYear || "Year not set"}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      doc.processingStatus === "COMPLETED" ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" :
                      doc.processingStatus === "FAILED" ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                      doc.processingStatus === "MANUAL_REVIEW_REQUIRED" ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                      "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}>
                      {doc.processingStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Section 9: Revenue Trend Chart ── */}
          {chartData.length >= 2 && (
            <SectionCard title="Financial Timeline" icon={<BarChart2 className="w-5 h-5" />} defaultOpen={false}>
              <div className="mb-5">
                <p className="text-sm font-medium text-[var(--chaan-text-muted)] mb-3">EBITDA & Liabilities Trend (₹ Lakhs)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--chaan-text-muted)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--chaan-text-muted)" }} />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val || 0).toFixed(2)}L`, ""]}
                      contentStyle={{ background: "var(--chaan-card)", border: "1px solid var(--chaan-border)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="liabilities" name="Total Liabilities" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Year Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[var(--chaan-text-muted)] border-b border-[var(--chaan-border)]">
                      <th className="text-left py-2 pr-4">FY</th>
                      <th className="text-right py-2 pr-4">Revenue</th>
                      <th className="text-right py-2 pr-4">Net Profit</th>
                      <th className="text-right py-2 pr-4">Net Margin</th>
                      <th className="text-right py-2 pr-4">Total Assets</th>
                      <th className="text-right py-2">Completeness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {business.yearSummaries.map(s => (
                      <tr key={s.fiscalYear} className="border-b border-[var(--chaan-border)] last:border-0">
                        <td className="py-2 pr-4 font-medium">{s.fiscalYear}</td>
                        <td className="text-right py-2 pr-4">{fmt(s.revenue)}</td>
                        <td className={`text-right py-2 pr-4 ${(s.netProfit ?? 0) < 0 ? "text-red-500" : ""}`}>{fmt(s.netProfit)}</td>
                        <td className={`text-right py-2 pr-4 ${(s.netMarginPct ?? 0) < 0 ? "text-red-500" : ""}`}>{pct(s.netMarginPct)}</td>
                        <td className="text-right py-2 pr-4">{fmt((s as {totalAssets?: number | null}).totalAssets)}</td>
                        <td className="text-right py-2">
                          <div className="flex items-center justify-end gap-1">
                            <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--chaan-brand)] rounded-full" style={{ width: `${s.dataCompleteness * 100}%` }} />
                            </div>
                            <span className="text-xs text-[var(--chaan-text-muted)]">{Math.round(s.dataCompleteness * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Section 10: Risk Signals ── */}
          <SectionCard title="Risk Signals" icon={<AlertTriangle className="w-5 h-5" />}>
            {riskFlag?.hardRedFlags && JSON.parse(riskFlag.hardRedFlags).length > 0 && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm mb-1">
                  <XCircle className="w-4 h-4" /> Hard Red Flags Active
                </div>
                <div className="flex flex-wrap gap-2">
                  {(JSON.parse(riskFlag.hardRedFlags) as string[]).map((f: string) => (
                    <span key={f} className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-mono">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Consistency Check Warnings */}
            {business.consistencyChecks.filter(c => c.result === "REVIEW_REQUIRED").length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">Cross-Document Discrepancies (Review Required)</div>
                {business.consistencyChecks.filter(c => c.result === "REVIEW_REQUIRED").map((c, i) => (
                  <div key={i} className="text-xs text-amber-700 dark:text-amber-300 mb-1">• {c.note}</div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {business.riskSignals.length === 0 ? (
                <p className="text-sm text-[var(--chaan-text-muted)] italic">Risk signals not yet computed.</p>
              ) : (
                business.riskSignals.map(sig => (
                  <div key={sig.signalCode} className="flex items-start gap-3 p-3 bg-[var(--chaan-bg)] rounded-xl">
                    <div className="mt-0.5 shrink-0">
                      {sig.color === "GREEN" && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {sig.color === "AMBER" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                      {sig.color === "RED" && <XCircle className="w-5 h-5 text-red-500" />}
                      {sig.color === "GREY" && <Clock className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[var(--chaan-text)]">{sig.label}</span>
                        <span className={`text-xs font-bold shrink-0 ${FLAG_COLOR[sig.color] || FLAG_COLOR.GREY}`}>{sig.score}/100</span>
                      </div>
                      <p className="text-xs text-[var(--chaan-text-muted)] mt-0.5">{sig.rationale}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* ── Section 11: Credit Recommendation ── */}
          <SectionCard title="Credit Recommendation" icon={<Banknote className="w-5 h-5" />}>
            {!creditRec ? (
              <p className="text-sm text-[var(--chaan-text-muted)] italic">Credit recommendation not yet computed.</p>
            ) : (
              <div>
                <div className={`p-5 rounded-xl border mb-4 ${FLAG_BG[creditRec.flag] || FLAG_BG.PENDING}`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <FlagBadge flag={creditRec.flag} size="lg" />
                      {creditRec.isBlocked ? (
                        <div className="mt-3">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">CREDIT BLOCKED</div>
                          <div className="text-sm text-red-600 dark:text-red-400 mt-1">{creditRec.blockReason}</div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <div className="text-3xl font-bold text-[var(--chaan-text)]">{fmt(creditRec.creditLimit)}</div>
                          <div className="text-sm text-[var(--chaan-text-muted)]">Recommended credit limit · {creditRec.tenor} days tenor</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--chaan-bg)] rounded-xl">
                  <div className="text-xs font-semibold text-[var(--chaan-text-muted)] uppercase tracking-wide mb-2">WHY?</div>
                  <p className="text-sm text-[var(--chaan-text)] leading-relaxed">{creditRec.rationale}</p>
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Section 12: Audit Trail ── */}
          <SectionCard title="Audit Trail" icon={<Clock className="w-5 h-5" />} defaultOpen={false}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {business.auditLogs.length === 0 ? (
                <p className="text-sm text-[var(--chaan-text-muted)] italic">No events yet.</p>
              ) : (
                business.auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-[var(--chaan-border)] last:border-0">
                    <div className="text-[10px] font-mono text-[var(--chaan-text-muted)] shrink-0 pt-0.5 w-28">
                      {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--chaan-bg)] text-[var(--chaan-text-muted)] rounded font-mono mr-2">{log.eventType}</span>
                      <span className="text-xs text-[var(--chaan-text)]">{log.description}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
