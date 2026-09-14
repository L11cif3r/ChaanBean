"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Link as LinkIcon,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Plus,
  RefreshCw,
  ExternalLink,
  Receipt,
  Search,
} from "lucide-react";

export default function CollectionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPtpModal, setShowPtpModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [ptpForm, setPtpForm] = useState({
    creditAccountId: "",
    buyerId: "",
    amount: "",
    promisedDate: "",
    paymentMode: "NEFT/RTGS",
    notes: "",
  });

  const [reconcileForm, setReconcileForm] = useState({
    invoiceId: "",
    amountPaid: "",
    referenceNo: "",
    paymentMode: "bank_transfer",
    notes: "",
  });

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/collections");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCreatePtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promise_to_pay", ...ptpForm }),
      });
      setShowPtpModal(false);
      setPtpForm({ creditAccountId: "", buyerId: "", amount: "", promisedDate: "", paymentMode: "NEFT/RTGS", notes: "" });
      await fetchCollections();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile", ...reconcileForm }),
      });
      setShowReconcileModal(false);
      setReconcileForm({ invoiceId: "", amountPaid: "", referenceNo: "", paymentMode: "bank_transfer", notes: "" });
      await fetchCollections();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleGeneratePaymentLink = async (creditAccountId: string, invoiceId: string, amount: number) => {
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment_link", creditAccountId, invoiceId, amount }),
      });
      if (res.ok) {
        await fetchCollections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-[#FC8019]" />
          <span>Loading Collections Workbench & Ageing Buckets...</span>
        </div>
      </div>
    );
  }

  const { ageing = {}, invoices = [], promises = [], reconciliations = [], summary = {} } = data || {};

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
              PHASE 4: PAYMENT AUTOMATION
            </span>
            <span className="text-xs text-slate-500 font-mono">DSO & RECONCILIATION</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5">
            Collections & Payment Automation Desk
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Overdue ageing buckets, Promise-to-Pay (PTP) commitments, and bank statement reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReconcileModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Receipt size={14} />
            Reconcile Payment
          </button>
          <button
            onClick={() => setShowPtpModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#FC8019] text-white hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20"
          >
            <Plus size={14} />
            Record Promise to Pay
          </button>
        </div>
      </div>

      {/* Ageing Buckets Bar */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center justify-between">
          <span>Invoice Ageing Distribution (Total Outstanding: ₹{ageing.totalOutstanding?.toLocaleString("en-IN")})</span>
          <span className="text-xs text-red-600 dark:text-red-400 font-bold">
            Total Overdue: ₹{ageing.totalOverdue?.toLocaleString("en-IN")}
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">CURRENT (NOT DUE)</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              ₹{ageing.current?.toLocaleString("en-IN") || 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">1–30 DAYS</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              ₹{ageing.bucket1to30?.toLocaleString("en-IN") || 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-bold">31–60 DAYS</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              ₹{ageing.bucket31to60?.toLocaleString("en-IN") || 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-bold">61–90 DAYS</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              ₹{ageing.bucket61to90?.toLocaleString("en-IN") || 0}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20">
            <div className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold">90+ DAYS (STATUTORY)</div>
            <div className="text-lg font-bold text-red-700 dark:text-red-300 mt-1">
              ₹{ageing.bucket90Plus?.toLocaleString("en-IN") || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Promises to Pay & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Promises to Pay Tracker */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-[#FC8019]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Promise to Pay (PTP)</h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              ₹{summary.promisesPendingAmount?.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {promises.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No promises recorded yet.</div>
            ) : (
              promises.map((ptp: any) => (
                <div
                  key={ptp.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{ptp.buyer?.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold uppercase">
                      {ptp.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{ptp.amount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px]">Due: {new Date(ptp.promisedDate).toLocaleDateString()}</span>
                  </div>
                  {ptp.notes && <p className="text-[11px] text-slate-500 italic mt-1">&quot;{ptp.notes}&quot;</p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoices & Dynamic Payment Links */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-[#FC8019]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Debtor Invoices</h3>
            </div>
            <span className="text-xs text-slate-500">{invoices.length} active invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
                <tr>
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Debtor</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Payment Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {invoices.map((inv: any) => {
                  const hasLink = inv.paymentLinks && inv.paymentLinks.length > 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-mono font-semibold">{inv.invoiceNumber}</td>
                      <td className="py-3">{inv.buyer?.name}</td>
                      <td className="py-3 font-mono font-bold">₹{inv.amount.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : inv.status === "overdue"
                              ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {hasLink ? (
                          <a
                            href={inv.paymentLinks[0].linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FC8019] hover:underline"
                          >
                            Copy Link <ExternalLink size={10} />
                          </a>
                        ) : (
                          <button
                            onClick={() =>
                              handleGeneratePaymentLink(inv.creditAccountId, inv.id, inv.amount - inv.paidAmount)
                            }
                            className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Generate Link
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Reconciliation Ledger */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment Reconciliations</h3>
          </div>
          <span className="text-xs text-slate-500">Automated & Manual Bank Matches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="pb-2.5">Reference / UTR</th>
                <th className="pb-2.5">Debtor</th>
                <th className="pb-2.5">Allocated Invoice</th>
                <th className="pb-2.5">Amount Reconciled</th>
                <th className="pb-2.5">Mode</th>
                <th className="pb-2.5">Reconciled On</th>
                <th className="pb-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {reconciliations.map((rec: any) => (
                <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 font-mono font-semibold text-slate-900 dark:text-white">{rec.referenceNo}</td>
                  <td className="py-3">{rec.creditAccount?.buyer?.name || "General Ledger"}</td>
                  <td className="py-3 font-mono text-slate-500">{rec.invoice?.invoiceNumber || "Bulk Allocation"}</td>
                  <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{rec.amountPaid.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 uppercase text-[10px] font-mono">{rec.paymentMode}</td>
                  <td className="py-3 text-slate-500">{new Date(rec.reconciledAt).toLocaleDateString()}</td>
                  <td className="py-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold uppercase">
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Promise to Pay Modal */}
      {showPtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Promise to Pay</h3>
            <form onSubmit={handleCreatePtp} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Debtor / Account</label>
                <select
                  required
                  value={ptpForm.creditAccountId}
                  onChange={(e) => {
                    const inv = invoices.find((i: any) => i.creditAccountId === e.target.value);
                    setPtpForm({
                      ...ptpForm,
                      creditAccountId: e.target.value,
                      buyerId: inv?.buyerId || "",
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Select Debtor...</option>
                  {invoices.map((inv: any) => (
                    <option key={inv.id} value={inv.creditAccountId}>
                      {inv.buyer?.name} (Inv: {inv.invoiceNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Committed Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 250000"
                  value={ptpForm.amount}
                  onChange={(e) => setPtpForm({ ...ptpForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Promised Date</label>
                <input
                  type="date"
                  required
                  value={ptpForm.promisedDate}
                  onChange={(e) => setPtpForm({ ...ptpForm, promisedDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Notes / Call Transcript</label>
                <textarea
                  rows={2}
                  placeholder="Customer confirmed bank RTGS transfer date..."
                  value={ptpForm.notes}
                  onChange={(e) => setPtpForm({ ...ptpForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPtpModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl bg-[#FC8019] text-white font-semibold disabled:opacity-50"
                >
                  {formLoading ? "Recording..." : "Save Commitment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Reconcile Inbound Payment</h3>
            <form onSubmit={handleCreateReconciliation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Select Invoice to Allocate</label>
                <select
                  value={reconcileForm.invoiceId}
                  onChange={(e) => setReconcileForm({ ...reconcileForm, invoiceId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">General Ledger Match</option>
                  {invoices.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.buyer?.name} - {inv.invoiceNumber} (₹{inv.amount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 100000"
                  value={reconcileForm.amountPaid}
                  onChange={(e) => setReconcileForm({ ...reconcileForm, amountPaid: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  required
                  placeholder="UTR-HDFC-991200"
                  value={reconcileForm.referenceNo}
                  onChange={(e) => setReconcileForm({ ...reconcileForm, referenceNo: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
                >
                  {formLoading ? "Matching..." : "Confirm Reconciliation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
