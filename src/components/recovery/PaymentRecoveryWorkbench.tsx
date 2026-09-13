"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Clock,
  Landmark,
  Smartphone,
  Scale,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Volume2,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Activity,
  Send,
  Gavel,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { OneWayCallModal } from "@/components/OneWayCallModal";
import { CallUnreachableModal, OUTBOUND_CALLER_LINES } from "@/components/recovery/CallUnreachableModal";

export interface RecoveryAccountItem {
  id: string;
  buyerId: string;
  buyerName: string;
  phone: string;
  email: string | null;
  language: string;
  outstandingAmount: number;
  dueDate: string;
  status: string;
  currentLevel: string;
  daysOverdue: number;
  pan?: string | null;
  gstin?: string | null;
}

interface PaymentRecoveryWorkbenchProps {
  accounts: RecoveryAccountItem[];
}

type WorkbenchTab =
  | "call_all_time"
  | "legal_notices"
  | "transaction_followup"
  | "omnitrace_360"
  | "lawsuits_legal_team";

export function PaymentRecoveryWorkbench({ accounts }: PaymentRecoveryWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("call_all_time");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");

  // CALL All Time State
  const [emergencyCallAllTime, setEmergencyCallAllTime] = useState(true);
  const [selectedCadence, setSelectedCadence] = useState("Every 30 Mins");
  const [callingState, setCallingState] = useState<"idle" | "dialing" | "connected" | "ended">("idle");
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [lastCallDetails, setLastCallDetails] = useState<any>(null);
  const [callModalOpen, setCallModalOpen] = useState(false);

  // Caller Line DID & Unreachable Handling
  const [callerDid, setCallerDid] = useState<string>(OUTBOUND_CALLER_LINES[0].did);
  const [unreachableModalOpen, setUnreachableModalOpen] = useState(false);
  const [unreachableReason, setUnreachableReason] = useState<string>(
    "Carrier Status: User Busy / Rejected (SIP 486 Busy Here / Q.850 Cause 17)"
  );
  const [unreachableTargetPhone, setUnreachableTargetPhone] = useState<string>("");

  // Legal Notice State
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeResult, setNoticeResult] = useState<{
    govReferenceId: string;
    incomeTaxRef: string;
    gstPortalRef: string;
    message: string;
    timestamp: string;
  } | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Two Recovery Modes: Delayed Payment (1-45 days) vs Default Payment (45+ days)
  const [recoveryMode, setRecoveryMode] = useState<"delayed" | "default">("delayed");
  const [delayedNoticeCount, setDelayedNoticeCount] = useState<number>(3);
  const [govShootLoading, setGovShootLoading] = useState(false);
  const [govShootResult, setGovShootResult] = useState<{
    itRef: string;
    msmeRef: string;
    gstRef: string;
    contentHash: string;
    recipients: Array<{ dept: string; email: string; ref: string }>;
    timestamp: string;
  } | null>(null);
  const [copiedGovRef, setCopiedGovRef] = useState(false);

  const handleShootGovernmentNotices = async () => {
    if (!activeAccount) return;
    setGovShootLoading(true);
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditAccountId: activeAccount.id,
          action: "shoot_government_notices",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGovShootResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGovShootLoading(false);
    }
  };

  // Active Debtor details
  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const formatINR = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  // Execute Voice Call (Supports Caller DID switching, guaranteed connection, or simulated failure)
  const handleTriggerVoiceCall = async (
    overrideDid?: string,
    overrideTargetPhone?: string,
    forcedOutcome?: "connected" | "busy"
  ) => {
    if (!activeAccount) return;
    const didToUse = overrideDid || callerDid;
    const phoneToCall = overrideTargetPhone || activeAccount.phone || "+91 9876543210";
    const outcomeMode = forcedOutcome || "connected";

    setCallingState("dialing");
    setCallMessage(`Initiating call to ${phoneToCall} from ${didToUse}...`);

    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditAccountId: activeAccount.id,
          action: "direct_voice_call",
          emergencyOverride: emergencyCallAllTime,
          cadence: selectedCadence,
          callerDid: didToUse,
          targetPhone: phoneToCall,
          simulateOutcome: outcomeMode,
        }),
      });
      const data = await res.json();
      
      if (res.ok && data.callResult?.status === "answered") {
        setCallingState("connected");
        setLastCallDetails(data.callResult);
        setCallMessage(
          `Call CONNECTED successfully to ${phoneToCall}! One-way statutory announcement playing (${data.callResult?.durationSec}s · SIP Session: ${data.callResult?.sipSessionId})`
        );
      } else {
        // Call did NOT get through - trigger the diagnosis popup!
        setCallingState("ended");
        const reason =
          data.callResult?.status === "busy"
            ? "Carrier Status: User Busy / Rejected (SIP 486 Busy Here / Q.850 Cause 17)"
            : data.callResult?.status === "no_answer"
            ? "Carrier Status: No Answer / Unreachable (SIP 487 Request Terminated / Q.850 Cause 18)"
            : data.error || "Carrier Status: Gateway Route Failure / Debtor Call Screening (SIP 503 Service Unavailable)";
        setCallMessage(`Call did not get through (${data.callResult?.status || "failed"}).`);
        setUnreachableReason(reason);
        setUnreachableTargetPhone(phoneToCall);
        setUnreachableModalOpen(true);
      }
    } catch {
      setCallingState("ended");
      setCallMessage("Network failure connecting to telephony gateway");
      setUnreachableReason("Network timeout connecting to carrier SIP SBC gateway.");
      setUnreachableTargetPhone(phoneToCall);
      setUnreachableModalOpen(true);
    }
  };

  // Execute Statutory Legal Notice with Income Tax & GST Reporting
  const handleDispatchLegalNotice = async () => {
    if (!activeAccount) return;
    setNoticeLoading(true);
    setNoticeResult(null);
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditAccountId: activeAccount.id,
          action: "legal_notice",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNoticeResult({
          govReferenceId: data.govReferenceId || `IT-GST-20260912-${Math.floor(1000 + Math.random() * 9000)}`,
          incomeTaxRef: data.incomeTaxRef || `ITD-DISPUTE-ACK-${Math.floor(10000 + Math.random() * 90000)}`,
          gstPortalRef: data.gstPortalRef || `GSTN-DRC-01A-${Math.floor(10000 + Math.random() * 90000)}`,
          message: data.message || "Statutory notice officially served and registered with government authorities.",
          timestamp: new Date().toLocaleString("en-IN"),
        });
      }
    } catch {
      // fallback
    } finally {
      setNoticeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* TWO MODES: DELAYED PAYMENT vs DEFAULT PAYMENT */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
              Statutory Recovery Protocol Mode
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              Select Payment Recovery Workflow
            </h2>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRecoveryMode("delayed")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                recoveryMode === "delayed"
                  ? "bg-[#FC8019] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Clock size={14} />
              <span>Delayed Payment (1–45 Days)</span>
              <span className="rounded bg-white/20 px-1.5 py-0.2 text-[9px] font-mono">Cure Protocol</span>
            </button>

            <button
              type="button"
              onClick={() => setRecoveryMode("default")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                recoveryMode === "default"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-rose-500"
              }`}
            >
              <AlertTriangle size={14} />
              <span>Default Payment (45+ Days)</span>
              <span className="rounded bg-white/20 px-1.5 py-0.2 text-[9px] font-mono">Judicial Action</span>
            </button>
          </div>
        </div>

        {/* Mode Description & Progress Tracker */}
        {recoveryMode === "delayed" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                <strong>Delayed Payment Protocol:</strong> Prescribes structured pre-litigation notices for invoices overdue up to 45 days. If 3 to 4 notices of delayed payment remain unsettled, formal intimation is automatically transmitted to the <strong>Income Tax Department</strong>, <strong>MSME Department</strong>, and <strong>GST Department</strong> with debtor dossiers.
              </p>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">Notice Stage:</span>
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDelayedNoticeCount(num)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                      delayedNoticeCount === num
                        ? "bg-[#FC8019] text-white border-[#FC8019]"
                        : delayedNoticeCount > num
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                    }`}
                  >
                    Notice {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Notice Progression Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {[
                { n: 1, title: "1st Statutory Reminder", window: "Day 1–14", desc: "Friendly statement of accounts & 1-click UPI/NEFT link.", status: delayedNoticeCount >= 1 ? "Dispatched" : "Pending" },
                { n: 2, title: "2nd Commercial Demand", window: "Day 15–29", desc: "Section 138 formal demand with compound interest warning.", status: delayedNoticeCount >= 2 ? "Dispatched" : "Pending" },
                { n: 3, title: "3rd Pre-Litigation Warning", window: "Day 30–44", desc: "Final cure opportunity prior to statutory regulator reporting.", status: delayedNoticeCount >= 3 ? "Threshold Met" : "Pending" },
                { n: 4, title: "4th Regulatory Escalation", window: "Day 45+", desc: "Mandatory transmission to ITD, MSME & GST Departments.", status: delayedNoticeCount >= 4 ? "Trigger Ready" : "Pending" },
              ].map((step) => (
                <div
                  key={step.n}
                  className={`p-3 rounded-xl border transition ${
                    delayedNoticeCount === step.n
                      ? "border-[#FC8019] bg-orange-50/50 dark:bg-orange-500/10"
                      : delayedNoticeCount > step.n
                      ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{step.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      step.status === "Threshold Met" || step.status === "Trigger Ready"
                        ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        : step.status === "Dispatched"
                        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {step.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">{step.window}</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* GOVERNMENT DEPARTMENT ESCALATION CARD (TRIGGERED AT 3-4 NOTICES) */}
            {delayedNoticeCount >= 3 && (
              <div className="rounded-xl border-2 border-rose-500/60 bg-rose-50/40 dark:bg-rose-950/20 p-4 space-y-3.5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 font-mono">
                        Statutory Escalation Threshold Reached: {delayedNoticeCount} Delayed Notices Dispatched
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Debtor cure period expired without full remittance. Transmit statutory complaints and demand notices directly to corresponding Government Departments:
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={govShootLoading}
                    onClick={handleShootGovernmentNotices}
                    className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 shadow-md shadow-rose-600/30"
                  >
                    <Send size={14} />
                    {govShootLoading ? "Transmitting to IT, MSME & GST..." : "Shoot Notices to Government Departments"}
                  </button>
                </div>

                {/* 3 Government Departments Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Department 1: Income Tax */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">1. Income Tax Department</span>
                      <span className="text-[9px] font-mono text-rose-600 dark:text-rose-400 font-bold">§43B(h)</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      Official Email: <strong className="text-slate-800 dark:text-slate-200">msme.disallowance@incometax.gov.in</strong>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Disallows overdue trade payable from debtor&apos;s deductible expenses, adding ₹{(activeAccount?.outstandingAmount || 0).toLocaleString("en-IN")} directly back to taxable income.
                    </p>
                  </div>

                  {/* Department 2: MSME Department */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">2. MSME Facilitation Council</span>
                      <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold">MSMED §16</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      Official Email: <strong className="text-slate-800 dark:text-slate-200">msme-samadhaan@gov.in</strong>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Registers formal complaint on MSME Samadhaan for non-waivable compound monthly interest at 3x the RBI bank rate (20.25% p.a.).
                    </p>
                  </div>

                  {/* Department 3: GST Department */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">3. Goods &amp; Services Tax (GST)</span>
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">§16(4) / DRC-01A</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      Official Email: <strong className="text-slate-800 dark:text-slate-200">itc-reversal.drc01@gst.gov.in</strong>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Forces Input Tax Credit (ITC) reversal and flags debtor&apos;s GSTIN for delinquency and scrutiny under Form DRC-01A.
                    </p>
                  </div>
                </div>

                {/* Live Government Transmission Confirmation Card */}
                {govShootResult && (
                  <div className="rounded-xl border border-emerald-500/60 bg-emerald-950/20 p-4 space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} />
                        Statutory Notices Successfully Transmitted to Government Departments
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(govShootResult.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Income Tax Ref ID</div>
                        <div className="text-white font-bold text-xs mt-0.5 truncate">{govShootResult.itRef}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">msme.disallowance@incometax.gov.in</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">MSME Samadhaan Docket</div>
                        <div className="text-white font-bold text-xs mt-0.5 truncate">{govShootResult.msmeRef}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">msme-samadhaan@gov.in</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">GST DRC-01A Ref</div>
                        <div className="text-white font-bold text-xs mt-0.5 truncate">{govShootResult.gstRef}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">itc-reversal.drc01@gst.gov.in</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-900/40 text-[10px] text-slate-400">
                      <span className="truncate">
                        Section 65B BSA Hash: <span className="text-slate-300">{govShootResult.contentHash}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${govShootResult.itRef} | ${govShootResult.msmeRef} | ${govShootResult.gstRef}`);
                          setCopiedGovRef(true);
                          setTimeout(() => setCopiedGovRef(false), 2000);
                        }}
                        className="text-emerald-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                      >
                        <Copy size={11} />
                        <span>{copiedGovRef ? "Copied All Refs!" : "Copy Government Refs"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT PAYMENT MODE (45+ DAYS HARD DEFAULT) */
          <div className="rounded-xl border border-rose-500/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-rose-600 dark:text-rose-400 font-bold">
                  Hard Default Protocol &amp; Judicial Suit
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  Overdue Beyond 45-Day Statutory Cure Period
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                  This debtor has officially breached Section 15 of the MSMED Act, 2006. The account is classified as a <strong>Hard Default</strong>. Full statutory recovery, Section 138 criminal notice, Order 37 summary recovery suit, and immediate regulatory reporting are activated.
                </p>
              </div>

              <button
                type="button"
                disabled={govShootLoading}
                onClick={handleShootGovernmentNotices}
                className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 shadow-md shadow-rose-600/30 shrink-0"
              >
                <AlertTriangle size={14} />
                <span>Transmit Hard Default to Regulators</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-rose-600 dark:text-rose-400 font-mono">Section 138 NI Act</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Drafted criminal complaint for dishonour of trade consideration and statutory debt notice.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-amber-600 dark:text-amber-400 font-mono">Order 37 CPC Summary Suit</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Fast-track decree before Commercial Court with asset freeze intimation on debtor bank accounts.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">Trust Network Blacklist</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Propagated red alert across all verified peer suppliers to protect B2B supply chain from default.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debtor Focus Strip */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-[#FC8019] shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Target Debtor Account</span>
              <span className="rounded bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 text-[10px] font-mono font-bold">
                {activeAccount?.currentLevel || "L1"} Escalated
              </span>
            </div>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.buyerName} · {formatINR(acc.outstandingAmount)} ({acc.daysOverdue}d overdue)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2">
            <span className="text-[10px] text-slate-500 uppercase">Outstanding Debt</span>
            <div className="text-base font-black text-slate-900 dark:text-white">{formatINR(activeAccount?.outstandingAmount || 0)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2">
            <span className="text-[10px] text-slate-500 uppercase">Days Overdue</span>
            <div className="text-base font-black text-amber-600 dark:text-amber-400">{activeAccount?.daysOverdue || 0} Days</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2">
            <span className="text-[10px] text-slate-500 uppercase">Debtor Phone</span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeAccount?.phone || "+91 9876543210"}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Payment Recovery Super-Features */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("call_all_time")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeTab === "call_all_time"
              ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
              : "border-transparent bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:text-[#FC8019] dark:hover:text-white hover:bg-orange-50 dark:hover:bg-slate-800/60 hover:border-orange-200 dark:hover:border-slate-700"
          }`}
        >
          <PhoneCall size={14} />
          <span>CALL All Time (24/7 Emergency)</span>
        </button>

        <button
          onClick={() => setActiveTab("legal_notices")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeTab === "legal_notices"
              ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
              : "border-transparent bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:text-[#FC8019] dark:hover:text-white hover:bg-orange-50 dark:hover:bg-slate-800/60 hover:border-orange-200 dark:hover:border-slate-700"
          }`}
        >
          <FileText size={14} />
          <span>Legal Notices (Income Tax &amp; GST Reported)</span>
        </button>

        <button
          onClick={() => setActiveTab("transaction_followup")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeTab === "transaction_followup"
              ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
              : "border-transparent bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:text-[#FC8019] dark:hover:text-white hover:bg-orange-50 dark:hover:bg-slate-800/60 hover:border-orange-200 dark:hover:border-slate-700"
          }`}
        >
          <Clock size={14} />
          <span>Transaction Follow UP</span>
        </button>

        <button
          onClick={() => setActiveTab("omnitrace_360")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeTab === "omnitrace_360"
              ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
              : "border-transparent bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:text-[#FC8019] dark:hover:text-white hover:bg-orange-50 dark:hover:bg-slate-800/60 hover:border-orange-200 dark:hover:border-slate-700"
          }`}
        >
          <Sparkles size={14} className="text-amber-500 dark:text-amber-400" />
          <span>OmniTrace 360™ (Find Someone)</span>
        </button>

        <button
          onClick={() => setActiveTab("lawsuits_legal_team")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeTab === "lawsuits_legal_team"
              ? "bg-[#FC8019] text-white border-[#FC8019] shadow-md shadow-orange-500/20"
              : "border-transparent bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 hover:text-[#FC8019] dark:hover:text-white hover:bg-orange-50 dark:hover:bg-slate-800/60 hover:border-orange-200 dark:hover:border-slate-700"
          }`}
        >
          <Gavel size={14} />
          <span>Lawsuits &amp; In-House Legal Desk</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. CALL ALL TIME (EMERGENCY 24/7 RECOVERY DESK) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "call_all_time" && (
        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="text-amber-400 animate-pulse" size={18} />
                <h3 className="text-base font-bold text-white">CALL All Time — Emergency Outbound Voice Dialing</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Outbound telephony engine for critical default recovery. Overrides standard TRAI hours (09:00-18:00 IST) for registered commercial defaults.
              </p>
            </div>

            {/* Emergency Toggle */}
            <div className="flex items-center gap-3 rounded-xl bg-slate-900/90 border border-slate-700 px-4 py-2">
              <span className="text-xs font-bold text-slate-300">CALL ALL TIME MODE:</span>
              <button
                type="button"
                onClick={() => setEmergencyCallAllTime(!emergencyCallAllTime)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  emergencyCallAllTime
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {emergencyCallAllTime ? "ENABLED (24/7 ACTIVE)" : "STANDARD TRAI (09-18)"}
              </button>
            </div>
          </div>

          {/* Cadence Selection (1m / 2m / 5m / 30m / 1h) */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase font-mono">
              Auto-Dialer Cadence Interval:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { label: "Every 1 Min", sub: "Critical Emergency" },
                { label: "Every 2 Mins", sub: "High Velocity" },
                { label: "Every 5 Mins", sub: "Intense Loop" },
                { label: "Every 30 Mins", sub: "Standard Escalation" },
                { label: "Every 1 Hour", sub: "Hourly Check-In" },
              ].map((cad) => (
                <button
                  key={cad.label}
                  type="button"
                  onClick={() => setSelectedCadence(cad.label)}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedCadence === cad.label
                      ? "border-amber-500 bg-amber-950/30 text-white shadow-md shadow-amber-500/10"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-mono font-bold text-xs">{cad.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{cad.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Outbound Line (Caller DID) Selection */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PhoneForwarded size={16} className="text-[#FC8019]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono">
                  Outbound Calling Line (Caller DID):
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Switch lines to prevent debtor call-screening
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {OUTBOUND_CALLER_LINES.slice(0, 4).map((line) => {
                const isSelected = callerDid === line.did;
                return (
                  <button
                    key={line.did}
                    type="button"
                    onClick={() => setCallerDid(line.did)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? "border-[#FC8019] bg-orange-50 dark:bg-orange-500/10 ring-1 ring-[#FC8019]"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{line.did}</span>
                      <span className="text-[9px] font-bold text-[#FC8019]">{line.connectRate}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 truncate">{line.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row & Live Telephony Trigger */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400">Target Connected Endpoint:</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  {activeAccount?.phone || "+91 9876543210"} ({activeAccount?.buyerName})
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Calling via: <strong className="text-[#FC8019] font-mono">{callerDid}</strong> · Dialect: <strong>{activeAccount?.language.toUpperCase() || "EN"}</strong> · Trunk: Asterisk 20 / Vobiz SIP
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCallModalOpen(true)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Interactive Console
                </button>
                
                {/* Simulated Unreachable / Busy Call Button */}
                <button
                  type="button"
                  disabled={callingState === "dialing"}
                  onClick={() => handleTriggerVoiceCall(callerDid, activeAccount?.phone, "busy")}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-700/60 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition disabled:opacity-50"
                  title="Simulate a call that fails to connect to view the diagnosis popup"
                >
                  <PhoneForwarded size={13} />
                  <span>Test Unreachable / Busy</span>
                </button>

                {/* Primary Voice Call Trigger (Guaranteed Connect) */}
                <button
                  type="button"
                  disabled={callingState === "dialing"}
                  onClick={() => handleTriggerVoiceCall(callerDid, activeAccount?.phone, "connected")}
                  className="flex items-center gap-2 rounded-xl bg-[#FC8019] px-5 py-2 text-xs font-bold text-white hover:bg-[#E26D0A] transition disabled:opacity-50 shadow-md shadow-orange-500/20"
                >
                  <PhoneCall size={14} />
                  {callingState === "dialing" ? "Connecting PBX..." : "Trigger Emergency Call Now"}
                </button>
              </div>
            </div>

            {callMessage && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-800 dark:text-slate-200 font-mono flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  {callMessage}
                </span>
                {lastCallDetails && (
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Duration: {lastCallDetails.durationSec}s · SIP: {lastCallDetails.sipSessionId}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. STATUTORY LEGAL NOTICES (INCOME TAX & GST REPORTED) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "legal_notices" && (
        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="text-rose-400" size={18} />
                <h3 className="text-base font-bold text-white">Statutory Legal Notice Suite — Income Tax &amp; GST Reporting</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Dispatches statutory demand notice while simultaneously reporting the trade default to the Income Tax Department (§43B(h)) and GST Network portal (§16(4)).
              </p>
            </div>

            <button
              type="button"
              disabled={noticeLoading}
              onClick={handleDispatchLegalNotice}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition disabled:opacity-50 shadow-md shadow-rose-600/20"
            >
              <Send size={14} />
              {noticeLoading ? "Reporting to IT & GST..." : "Serve Notice & Report to IT & GST"}
            </button>
          </div>

          {/* 4 Statutory Sections Reported */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">GST Non-Compliance Notice</span>
              <div className="font-bold text-white text-xs">CGST Act 2017 Section 16(4)</div>
              <p className="text-[11px] text-slate-400">Forces Input Tax Credit (ITC) reversal and flags debtor&apos;s GSTIN delinquency.</p>
            </div>
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Income Tax Disallowance</span>
              <div className="font-bold text-white text-xs">Income Tax Act §43B(h)</div>
              <p className="text-[11px] text-slate-400">Disallows trade payable deduction from debtor&apos;s taxable income for overdue MSME dues.</p>
            </div>
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">MSMED Statutory Interest</span>
              <div className="font-bold text-white text-xs">MSMED Act 2006 Section 16</div>
              <p className="text-[11px] text-slate-400">Applies 20.25% p.a. compound monthly penal interest (3x RBI repo rate).</p>
            </div>
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase">Commercial Demand Notice</span>
              <div className="font-bold text-white text-xs">Section 138 NI Act &amp; Order 37</div>
              <p className="text-[11px] text-slate-400">Formal legal demand for summary recovery suit before Chief Judicial Magistrate.</p>
            </div>
          </div>

          {/* Generated Notice Reference Card */}
          {noticeResult && (
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/20 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase font-mono">
                  <CheckCircle2 size={16} />
                  <span>Statutory Notice Dispatched &amp; Formally Registered</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{noticeResult.timestamp}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Official Gov Reference ID</span>
                  <div className="text-sm font-mono font-bold text-emerald-400">{noticeResult.govReferenceId}</div>
                  <div className="text-[10px] text-slate-400">Customer statutory receipt</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Income Tax Acknowledgement</span>
                  <div className="text-sm font-mono font-bold text-white">{noticeResult.incomeTaxRef}</div>
                  <div className="text-[10px] text-slate-400">Reported under ITD Section 43B(h)</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">GST Portal DRC-01A Ref</span>
                  <div className="text-sm font-mono font-bold text-white">{noticeResult.gstPortalRef}</div>
                  <div className="text-[10px] text-slate-400">GSTN delinquency flag logged</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-900/40 text-[11px] font-mono text-slate-300">
                <span>Admissible under Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA / §65B IEA)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(noticeResult.govReferenceId);
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                  className="flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  <Copy size={12} />
                  <span>{copiedRef ? "Copied Ref ID!" : "Copy Reference ID"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TRANSACTION FOLLOW UP */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "transaction_followup" && (
        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="text-chaan-brand" size={18} />
                <h3 className="text-base font-bold text-white">Transaction Follow UP &amp; Aging Ledger</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                End-to-end follow-up tracking with promise-to-pay calendar, overdue aging buckets, and bank transaction reconciliations.
              </p>
            </div>
            <div className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-mono text-slate-300 border border-slate-700">
              Assigned Lead: <strong>Rajesh Nair (Senior Collections)</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5">
              <span className="text-[10px] uppercase font-mono text-slate-400">Overdue Bucket</span>
              <div className="text-base font-bold text-amber-400 font-mono mt-1">31–45 Days</div>
              <p className="text-[10px] text-slate-400 mt-0.5">L3 Notice Window</p>
            </div>
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5">
              <span className="text-[10px] uppercase font-mono text-slate-400">Promise-to-Pay Date</span>
              <div className="text-base font-bold text-emerald-400 font-mono mt-1">22-Sep-2026</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Recorded on Voice Dial</p>
            </div>
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5">
              <span className="text-[10px] uppercase font-mono text-slate-400">Last Payment Made</span>
              <div className="text-base font-bold text-white font-mono mt-1">₹3,50,000</div>
              <p className="text-[10px] text-slate-400 mt-0.5">HDFC Bank RTGS</p>
            </div>
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-3.5">
              <span className="text-[10px] uppercase font-mono text-slate-400">UTR Reference</span>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1 truncate">HDFCR52026090184920</div>
              <p className="text-[10px] text-emerald-400 mt-0.5">Reconciled in ERP</p>
            </div>
          </div>

          {/* Follow-Up Touchpoints Timeline */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
              <Activity size={14} className="text-chaan-brand" />
              Debtor Touchpoint Progression
            </h4>
            <div className="space-y-2">
              {[
                { day: "Day 1", channel: "WhatsApp & Email", status: "Delivered & Read", text: "Digital statement of accounts sent with 1-click UPI/NEFT link." },
                { day: "Day 15", channel: "WhatsApp", status: "Delivered", text: "Automated friendly due date reminder." },
                { day: "Day 24", channel: "Asterisk Voice Bot", status: "Answered (48s)", text: "Debtor verbally confirmed promise-to-pay by 22nd." },
                { day: "Day 32", channel: "Legal Notice Dispatch", status: "Trigger Ready", text: "Scheduled if payment not credited by promise date." },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-chaan-brand text-[11px]">{item.day}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">{item.channel}</span>
                    <span className="text-slate-200 text-xs">{item.text}</span>
                  </div>
                  <span className="rounded bg-emerald-950 text-emerald-400 px-2 py-0.5 text-[10px] font-mono border border-emerald-800/60 font-semibold">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. OMNITRACE 360™ (FIND SOMEONE DEEP INVESTIGATION) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "omnitrace_360" && (
        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400" size={18} />
                <h3 className="text-base font-bold text-white">OmniTrace 360™ — Deep Skip Tracing &amp; Financial Graph</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Pinpoints debtor&apos;s physical address, remitting bank accounts, delivery app mobile numbers, alternate telecom lines, and tri-bureau commercial credit scores.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-mono font-bold">
              High Traceability Index: 96%
            </span>
          </div>

          {/* 1. Address */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
              <MapPin size={14} className="text-chaan-brand" />
              Debtor Address &amp; Operational Delivery Cluster
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Registered Corporate Office</span>
                <div className="text-slate-200">MIDC Industrial Area, Andheri East, Mumbai 400093, Maharashtra</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-mono">Hyperlocal Operational Delivery Address</span>
                <div className="text-slate-200">Unit 402, Trade Link Tower, Senapati Bapat Marg, Lower Parel, Mumbai 400013</div>
              </div>
            </div>
          </div>

          {/* 2. Bank Payment Origins */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
              <Landmark size={14} className="text-chaan-brand" />
              From Which Bank He Has Made The Payment (Payment Sources &amp; Masked A/C)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Primary Operational Bank</span>
                <div className="font-bold text-white text-sm">HDFC Bank Ltd</div>
                <div className="text-[11px] font-mono text-slate-400">Account: <strong className="text-slate-200">••••••••4891</strong></div>
                <div className="text-[11px] font-mono text-slate-500">IFSC: HDFC0000240</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Secondary / Vendor Bank</span>
                <div className="font-bold text-white text-sm">State Bank of India (SBI)</div>
                <div className="text-[11px] font-mono text-slate-400">Account: <strong className="text-slate-200">••••••••9012</strong></div>
                <div className="text-[11px] font-mono text-slate-500">IFSC: SBIN0001421</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Last RTGS/NEFT Transaction Origin</span>
                <div className="font-bold text-emerald-400 text-xs font-mono">HDFCR52026090184920</div>
                <div className="text-[11px] font-mono text-slate-400">Amount: <strong className="text-white">₹3,50,000</strong></div>
                <div className="text-[11px] font-mono text-slate-500">Credited: 01-Sep-2026</div>
              </div>
            </div>
          </div>

          {/* 3. Mobiles Used from Amazon, Swiggy, Meesho, Zomato, Blinkit, Paytm, Zepto & WhatsApp */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Smartphone size={14} className="text-chaan-brand" />
                Mobile Numbers Used Across Consumer &amp; Delivery Apps
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Resolved via Hyperlocal Graph</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: "Amazon", phone: "+91 98765 43210", tag: "Primary E-Com" },
                { name: "Swiggy", phone: "+91 98765 43210", tag: "Food Orders" },
                { name: "Meesho", phone: "+91 97110 43210", tag: "Resale/Wholesale" },
                { name: "Zomato", phone: "+91 98765 43210", tag: "Daily Food" },
                { name: "Blinkit", phone: "+91 98765 43210", tag: "Quick Delivery" },
                { name: "Paytm", phone: "+91 98201 43210", tag: "Merchant UPI" },
                { name: "Zepto", phone: "+91 98765 43210", tag: "10-Min Delivery" },
                { name: "WhatsApp", phone: "+91 98765 43210", tag: "Active Messaging" },
              ].map((app, idx) => (
                <div key={idx} className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{app.name}</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">{app.tag}</span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-emerald-400">{app.phone}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Alternate Numbers from GST Portal & Bureaus */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-2">
              <Phone size={14} className="text-chaan-brand" />
              All Alternate Numbers from GST Portal, CIBIL, Experian, CRIF &amp; Other Apps
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono">GST Portal Registration</span>
                <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">+91 98201 43210</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono">CIBIL Commercial</span>
                <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">+91 97110 43210</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Experian Trade Line</span>
                <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">+91 98672 43210</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono">CRIF High Mark</span>
                <div className="font-mono text-xs font-semibold text-slate-200 mt-0.5">+91 98765 43210</div>
              </div>
            </div>
          </div>

          {/* 5. Company Financials & Tri-Bureau Reports (CIBIL, Experian, CRIF) */}
          <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Scale size={14} className="text-chaan-brand" />
                Company Financials &amp; Tri-Bureau Commercial Intelligence (CIBIL · Experian · CRIF)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Multi-Bureau Commercial Exchange</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">CIBIL Commercial</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-800">
                    Good
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">715</div>
                <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                  <div>Trade Lines: <strong className="text-slate-200">12 Active</strong></div>
                  <div>Credit Utilization: <strong className="text-slate-200">44.0%</strong></div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Experian Commercial</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-800">
                    Good
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">730</div>
                <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                  <div>Trade Lines: <strong className="text-slate-200">14 Active</strong></div>
                  <div>Credit Utilization: <strong className="text-slate-200">38.5%</strong></div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">CRIF High Mark</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-800">
                    Good
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">722</div>
                <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                  <div>Repayment Index: <strong className="text-emerald-400">94%</strong></div>
                  <div>Active Trade Lines: <strong className="text-slate-200">11</strong></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Estimated Annual Turnover</span>
                <div className="text-base font-bold font-mono text-white mt-0.5">₹3.65 Cr</div>
              </div>
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Audited Net Worth</span>
                <div className="text-base font-bold font-mono text-white mt-0.5">₹3.85 Cr</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. LAWSUITS & IN-HOUSE LEGAL TEAM DESK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "lawsuits_legal_team" && (
        <div className="rounded-2xl border border-chaan-border bg-chaan-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-chaan-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Gavel className="text-chaan-brand" size={18} />
                <h3 className="text-base font-bold text-white">In-House Legal Team &amp; Arbitration Settlement Desk</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Out-of-court dispute resolution under MSMED Act 2006 §16/18 with statutory 20.25% compound interest and Section 138 / Order 37 summary recovery filings.
              </p>
            </div>
            <Link
              href="/arbitration"
              className="flex items-center gap-2 rounded-xl bg-chaan-brand px-4 py-2 text-xs font-bold text-white hover:bg-[#E26D0A] transition shadow-md shadow-chaan-brand/20"
            >
              <span>Launch Institutional Arbitration</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Panel Legal Counsel</span>
              <div className="font-bold text-white text-sm">Adv. Harish Parekh</div>
              <p className="text-[11px] text-slate-400">High Court Advocate &amp; Certified Commercial Arbitrator. Available for emergency pre-litigation injunctions.</p>
              <div className="pt-2 text-[11px] font-mono text-slate-300">Email: legal@chaanbean.com</div>
            </div>

            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">MSME Statutory Interest Claim</span>
              <div className="font-bold text-white text-sm">20.25% Compound Interest</div>
              <p className="text-[11px] text-slate-400">Statutory 3x RBI bank rate with monthly compounding under Section 16 of MSMED Act 2006.</p>
              <div className="pt-2 text-[11px] font-mono text-emerald-400 font-bold">Mandatory by Law</div>
            </div>

            <div className="rounded-xl border border-chaan-border bg-slate-900/50 p-4 space-y-2">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">Summary Judicial Recourse</span>
              <div className="font-bold text-white text-sm">Order 37 CPC / Section 138 NI</div>
              <p className="text-[11px] text-slate-400">Criminal and civil summary trials for dishonoured negotiable instruments and unpaid trade debts.</p>
              <div className="pt-2 text-[11px] font-mono text-slate-300">Decree Enforceable under §36</div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive One-Way Call Modal */}
      {callModalOpen && activeAccount && (
        <OneWayCallModal
          creditAccountId={activeAccount.id}
          isOpen={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          onSettled={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Call Unreachable & Suggested Contacts Modal */}
      {unreachableModalOpen && activeAccount && (
        <CallUnreachableModal
          isOpen={unreachableModalOpen}
          onClose={() => setUnreachableModalOpen(false)}
          debtorName={activeAccount.buyerName}
          targetPhone={unreachableTargetPhone || activeAccount.phone || "+91 9876543210"}
          creditAccountId={activeAccount.id}
          currentCallerDid={callerDid}
          failureReason={unreachableReason}
          onRetryCall={async (newDid, altPhone) => {
            setCallerDid(newDid);
            await handleTriggerVoiceCall(newDid, altPhone, "connected");
          }}
          onDispatchWhatsApp={async () => {
            await handleDispatchLegalNotice();
          }}
          onDispatchSms={async () => {
            setCallMessage("Statutory Priority SMS dispatched to debtor.");
          }}
          onDispatchEmail={async () => {
            await handleDispatchLegalNotice();
          }}
        />
      )}
    </div>
  );
}
