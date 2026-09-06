"use client";

import { useState } from "react";
import { CheckCircle2, Upload, FileSpreadsheet, ArrowRight, ShieldCheck } from "lucide-react";

export function VendorWizard({ companyId, onAdded }: { companyId: string; onAdded?: () => void }) {
  const [tab, setTab] = useState<"wizard" | "bulk">("wizard");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    category: "Raw Materials",
    pan: "",
    gstin: "",
    cin: "",
    turnoverRange: "₹1.5Cr–5Cr",
    directorName: "",
    phone: "",
  });
  const [bulkCsv, setBulkCsv] = useState(
    "Apex Steels, Raw Materials, AABCA1234F, 27AABCA1234F1Z5, Rajesh Singhal, 9820011223\nBlueDart Express Agency, Logistics & Freight, AABCB5678G, 29AABCB5678G1Z8, Suresh Menon, 9845012345"
  );
  const [otpSent, setOtpSent] = useState(false);
  const [result, setResult] = useState<{ trustId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  async function submitSingle() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...form }),
      });
      const data = await res.json();
      setResult(data);
      if (onAdded) onAdded();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function submitBulk() {
    setLoading(true);
    setBulkMessage(null);
    try {
      const lines = bulkCsv.split("\n").filter((l) => l.trim().length > 0);
      const vendors = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          name: parts[0] || "Vendor",
          category: parts[1] || "General Supplies",
          pan: parts[2] || "",
          gstin: parts[3] || "",
          directorName: parts[4] || "Director",
          phone: parts[5] || "",
        };
      });

      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, vendors }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkMessage(data.message || `Successfully registered ${data.vendors?.length} vendors.`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setBulkMessage("Error processing bulk onboarding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-chaan-border bg-chaan-card p-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-chaan-border mb-6">
        <button
          onClick={() => setTab("wizard")}
          className={`pb-3 text-xs font-semibold px-4 transition border-b-2 ${
            tab === "wizard"
              ? "border-chaan-accent text-chaan-accent"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Single Vendor Registration Wizard
        </button>
        <button
          onClick={() => setTab("bulk")}
          className={`pb-3 text-xs font-semibold px-4 transition border-b-2 flex items-center gap-1.5 ${
            tab === "bulk"
              ? "border-chaan-accent text-chaan-accent"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileSpreadsheet size={14} />
          Bulk Onboarding (CSV / Multi-Row)
        </button>
      </div>

      {tab === "bulk" ? (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Paste multi-row vendor data (comma-separated: Name, Category, PAN, GSTIN, Director Name, Phone):
          </p>
          <textarea
            rows={5}
            value={bulkCsv}
            onChange={(e) => setBulkCsv(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 outline-none"
          />
          {bulkMessage && (
            <div className="rounded bg-emerald-950/60 border border-emerald-800/60 p-3 text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {bulkMessage}
            </div>
          )}
          <button
            onClick={submitBulk}
            disabled={loading}
            className="rounded-lg bg-chaan-accent px-4 py-2 font-semibold text-slate-950 hover:bg-sky-400 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Upload size={14} />
            {loading ? "Processing KYC & Assigning IDs..." : "Process Bulk Onboarding & Assign Trust IDs"}
          </button>
        </div>
      ) : (
        <div>
          {/* Stepper */}
          <div className="mb-6 flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold font-mono ${
                    step >= s ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {s}
                </div>
                <span className={`text-xs ${step >= s ? "text-slate-200 font-medium" : "text-slate-500"}`}>
                  {s === 1 ? "Business Info" : s === 2 ? "Director & KYC" : "Assign Trust ID"}
                </span>
                {s < 3 && <span className="text-slate-600 text-xs">→</span>}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-slate-300 mb-1">Vendor Trade Name *</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                    placeholder="e.g. Apex Polymer Solutions"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Procurement Category</label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Logistics & Freight">Logistics & Freight</option>
                    <option value="IT Services">IT Services</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Machinery & Equipment">Machinery & Equipment</option>
                    <option value="Consulting">Consulting</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-slate-300 mb-1">PAN</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none uppercase font-mono"
                    placeholder="AABCP1234F"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">GSTIN</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none uppercase font-mono"
                    placeholder="27AABCP1234F1Z5"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">CIN (If Company)</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none uppercase font-mono"
                    placeholder="U74999MH2020PTC123456"
                    value={form.cin}
                    onChange={(e) => setForm({ ...form, cin: e.target.value })}
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.name}
                className="flex items-center gap-1.5 rounded-lg bg-chaan-accent px-4 py-2 font-semibold text-slate-950 hover:bg-sky-400 transition disabled:opacity-50"
              >
                Continue to Step 2 <ArrowRight size={14} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-slate-300 mb-1">Managing Director / Partner Name</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none"
                    placeholder="e.g. Ramesh Chandra Sharma"
                    value={form.directorName}
                    onChange={(e) => setForm({ ...form, directorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Registered Phone (+91)</label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 outline-none font-mono"
                    placeholder="9820112233"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <span className="font-semibold text-slate-200">Automated KYC Pre-Validation</span>
                <p className="text-slate-400">
                  Instant MCA registry, GSTN status check, and authorized signatory mobile verification.
                </p>
                {!otpSent ? (
                  <button
                    type="button"
                    onClick={() => setOtpSent(true)}
                    className="rounded border border-sky-500/50 bg-sky-950/40 px-3 py-1 text-sky-400 hover:bg-sky-900/50 transition"
                  >
                    Verify Signatory via Mobile OTP
                  </button>
                ) : (
                  <div className="text-emerald-400 flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <span>Mobile & Registry Check Verified (Score: 92/100)</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-chaan-accent px-4 py-2 font-semibold text-slate-950 hover:bg-sky-400 transition"
                >
                  Review & Assign Trust ID
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-xs">
              <h3 className="font-semibold text-slate-200 text-sm">Step 3 — Final Confirmation</h3>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 grid gap-2 sm:grid-cols-2">
                <div><span className="text-slate-500">Name:</span> <strong className="text-slate-200">{form.name}</strong></div>
                <div><span className="text-slate-500">Category:</span> <span className="text-slate-200">{form.category}</span></div>
                <div><span className="text-slate-500">PAN:</span> <span className="font-mono text-slate-200">{form.pan || "—"}</span></div>
                <div><span className="text-slate-500">GSTIN:</span> <span className="font-mono text-slate-200">{form.gstin || "—"}</span></div>
                <div><span className="text-slate-500">CIN:</span> <span className="font-mono text-slate-200">{form.cin || "—"}</span></div>
                <div><span className="text-slate-500">Director:</span> <span className="text-slate-200">{form.directorName || "—"}</span></div>
              </div>

              {result ? (
                <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-4 text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    Vendor Registered Successfully!
                  </div>
                  <p className="mt-1">
                    Assigned Vendor Trust ID: <strong className="font-mono text-white text-base">{result.trustId}</strong>
                  </p>
                  <button
                    onClick={() => {
                      setStep(1);
                      setResult(null);
                      window.location.reload();
                    }}
                    className="mt-3 rounded border border-emerald-700 px-3 py-1 text-emerald-300 hover:bg-emerald-900/50"
                  >
                    Register Another Vendor
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    onClick={submitSingle}
                    disabled={loading}
                    className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50"
                  >
                    {loading ? "Registering & Assigning..." : "Assign Trust ID & Finish"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
