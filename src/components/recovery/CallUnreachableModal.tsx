"use client";

import React, { useState } from "react";
import {
  PhoneOff,
  PhoneCall,
  PhoneForwarded,
  MessageSquare,
  Mail,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Smartphone,
  Building2,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Radio,
} from "lucide-react";
import Link from "next/link";

export interface OutboundDidOption {
  did: string;
  name: string;
  location: string;
  type: string;
  connectRate: string;
}

export const OUTBOUND_CALLER_LINES: OutboundDidOption[] = [
  {
    did: "+91 80 4719 2000",
    name: "Bengaluru HQ Primary Trunk",
    location: "Karnataka (KA)",
    type: "Enterprise SIP PRI",
    connectRate: "89% Pickup Rate",
  },
  {
    did: "+91 22 6912 3400",
    name: "Mumbai Commercial Regional Desk",
    location: "Maharashtra (MH)",
    type: "Financial District Direct",
    connectRate: "93% Pickup Rate",
  },
  {
    did: "+91 11 4084 5500",
    name: "Delhi NCR Recovery Line",
    location: "National Capital (DL)",
    type: "Commercial Gateway",
    connectRate: "86% Pickup Rate",
  },
  {
    did: "1800 890 4422",
    name: "All-India Toll-Free Priority Desk",
    location: "National Toll-Free",
    type: "TRAI Verified 1800",
    connectRate: "95% Pickup Rate",
  },
  {
    did: "+91 44 2811 9000",
    name: "Chennai South Zone Trunk",
    location: "Tamil Nadu (TN)",
    type: "Regional Telephony",
    connectRate: "88% Pickup Rate",
  },
];

export interface SkipTracedPhone {
  number: string;
  source: string;
  category: string;
  activeStatus: string;
  lastUsed: string;
}

interface CallUnreachableModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtorName: string;
  targetPhone: string;
  creditAccountId: string;
  currentCallerDid?: string;
  failureReason?: string;
  onRetryCall: (selectedDid: string, alternatePhone?: string) => Promise<void> | void;
  onDispatchWhatsApp?: () => Promise<void> | void;
  onDispatchSms?: () => Promise<void> | void;
  onDispatchEmail?: () => Promise<void> | void;
  alternateNumbers?: SkipTracedPhone[];
}

export function CallUnreachableModal({
  isOpen,
  onClose,
  debtorName,
  targetPhone,
  creditAccountId,
  currentCallerDid = "+91 80 4719 2000",
  failureReason = "Carrier Status: User Busy / Unreachable / Call-Screened (SIP 486 Busy Here / Q.850 Cause 17)",
  onRetryCall,
  onDispatchWhatsApp,
  onDispatchSms,
  onDispatchEmail,
  alternateNumbers,
}: CallUnreachableModalProps) {
  const [selectedDid, setSelectedDid] = useState<string>(
    OUTBOUND_CALLER_LINES.find((l) => l.did !== currentCallerDid)?.did || OUTBOUND_CALLER_LINES[1].did
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Default skip-traced alternate numbers if not passed from Find Someone
  const fallbackAlternateNumbers: SkipTracedPhone[] = [
    {
      number: "+91 98201 44882",
      source: "Swiggy / Zomato Delivery Active",
      category: "Consumer Food App",
      activeStatus: "Active within 48 hrs",
      lastUsed: "Yesterday, 8:45 PM",
    },
    {
      number: "+91 98450 12933",
      source: "Amazon / Flipkart Business Account",
      category: "E-Commerce Logistics",
      activeStatus: "Active last week",
      lastUsed: "3 days ago",
    },
    {
      number: "+91 98110 55677",
      source: "MCA21 Director Master Registry",
      category: "Statutory KYC",
      activeStatus: "Verified DIN Link",
      lastUsed: "Active Telecom Circle",
    },
    {
      number: "+91 94480 33211",
      source: "Blinkit / Zepto Rapid Delivery Cluster",
      category: "Quick-Commerce",
      activeStatus: "Verified Address Match",
      lastUsed: "4 days ago",
    },
  ];

  const phonesToDisplay = (alternateNumbers && alternateNumbers.length > 0)
    ? alternateNumbers
    : fallbackAlternateNumbers;

  if (!isOpen) return null;

  const handleRetryWithNewDid = async (phoneToCall?: string) => {
    setIsRetrying(true);
    setActionSuccessMessage(null);
    try {
      await onRetryCall(selectedDid, phoneToCall || targetPhone);
      setActionSuccessMessage(
        `Dialing ${phoneToCall || targetPhone} via ${selectedDid}...`
      );
      setTimeout(() => {
        setIsRetrying(false);
        onClose();
      }, 1200);
    } catch {
      setIsRetrying(false);
    }
  };

  const handleQuickChannel = async (channel: "whatsapp" | "sms" | "email") => {
    setActionSuccessMessage(null);
    if (channel === "whatsapp" && onDispatchWhatsApp) {
      await onDispatchWhatsApp();
      setActionSuccessMessage("Statutory Legal Notice dispatched to Debtor WhatsApp (+ delivery receipt requested).");
    } else if (channel === "sms" && onDispatchSms) {
      await onDispatchSms();
      setActionSuccessMessage("Priority TRAI DLT statutory recovery SMS queued with MSME §16 interest warning.");
    } else if (channel === "email" && onDispatchEmail) {
      await onDispatchEmail();
      setActionSuccessMessage("Formal Legal Demand Notice email served with timestamped delivery headers.");
    } else {
      setActionSuccessMessage(`Alternate communication queued via ${channel.toUpperCase()}.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl rounded-2xl border border-red-500/40 bg-white dark:bg-[#0E1523] shadow-2xl p-6 space-y-6 text-slate-800 dark:text-slate-100 my-8">
        
        {/* Header Alert Strip */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-700/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 animate-pulse">
              <PhoneOff size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Call Not Getting Through
                </h3>
                <span className="rounded-md bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 px-2 py-0.5 text-[10px] font-mono font-bold text-red-700 dark:text-red-300 uppercase">
                  Unreachable / Busy
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                The telephony gateway could not connect the voice announcement to <strong className="text-slate-700 dark:text-slate-200">{debtorName}</strong> ({targetPhone}).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Carrier Diagnosis Box */}
        <div className="rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 p-3.5 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
            <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Carrier Diagnostic Reason:</span>
          </div>
          <div className="font-mono text-[11px] text-amber-900 dark:text-amber-200 pl-5">
            {failureReason}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
            Current Outbound Calling Line: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{currentCallerDid}</span>. Debtor may have call-screened or auto-blocked this number.
          </div>
        </div>

        {actionSuccessMessage && (
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* SUGGESTION 1: CHANGE OUTBOUND CALLING NUMBER */}
        <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PhoneForwarded size={16} className="text-[#FC8019]" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Suggestion 1: Change The Number You Are Calling From
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#FC8019] font-bold">Bypass Debtor Call-Screening</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Switch your outbound caller line (DID) to a regional desk or our TRAI-verified toll-free priority line. Debtors are 3x more likely to answer unknown regional numbers:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {OUTBOUND_CALLER_LINES.map((line) => {
              const isSelected = selectedDid === line.did;
              return (
                <button
                  key={line.did}
                  type="button"
                  onClick={() => setSelectedDid(line.did)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition flex flex-col justify-between gap-1 ${
                    isSelected
                      ? "border-[#FC8019] bg-white dark:bg-slate-800/90 shadow-sm ring-1 ring-[#FC8019]"
                      : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-orange-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">{line.did}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-orange-100 dark:bg-orange-500/20 text-[#FC8019]"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}>
                      {line.connectRate}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">{line.name}</div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500">{line.location} · {line.type}</div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => handleRetryWithNewDid(targetPhone)}
              className="flex items-center gap-2 rounded-xl bg-[#FC8019] px-4 py-2 text-xs font-bold text-white hover:bg-[#E26D0A] transition disabled:opacity-50 shadow-md shadow-orange-500/20"
            >
              <RefreshCw size={13} className={isRetrying ? "animate-spin" : ""} />
              <span>Retry Call With Selected DID ({selectedDid})</span>
            </button>
          </div>
        </div>

        {/* SUGGESTION 2: ALTERNATE WAYS TO CONTACT */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-emerald-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Suggestion 2: Alternate Ways To Contact
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            If debtor phone voice calls remain unanswered, dispatch legally admissible statutory demand notices through alternate channels:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={() => handleQuickChannel("whatsapp")}
              className="group p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-500 dark:hover:border-emerald-500 transition text-left flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase">WhatsApp Legal</span>
                <MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">1-Click WhatsApp Notice</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Green-tick statutory demand with instant payment link &amp; read receipt.</p>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                Dispatch WhatsApp <ArrowRight size={10} />
              </span>
            </button>

            {/* SMS */}
            <button
              type="button"
              onClick={() => handleQuickChannel("sms")}
              className="group p-3 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 hover:border-sky-500 dark:hover:border-sky-500 transition text-left flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 uppercase">Priority SMS</span>
                <Smartphone size={14} className="text-sky-600 dark:text-sky-400 group-hover:scale-110 transition" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">DLT Statutory SMS</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">TRAI header-approved SMS warning of MSMED §16 20.25% interest.</p>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-1">
                Send Priority SMS <ArrowRight size={10} />
              </span>
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={() => handleQuickChannel("email")}
              className="group p-3 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 hover:border-purple-500 dark:hover:border-purple-500 transition text-left flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-400 uppercase">Demand Email</span>
                <Mail size={14} className="text-purple-600 dark:text-purple-400 group-hover:scale-110 transition" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Registered Email Notice</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Formal PDF demand notice with Section 138 NI Act statutory legal draft.</p>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-1">
                Send Email Notice <ArrowRight size={10} />
              </span>
            </button>
          </div>
        </div>

        {/* SUGGESTION 3: DIAL ALTERNATE NUMBERS FROM "FIND SOMEONE" */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-[#FC8019]" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Suggestion 3: Dial Alternate Numbers (From Find Someone)
              </h4>
            </div>
            <Link
              href={`/find-someone?q=${encodeURIComponent(debtorName)}`}
              target="_blank"
              className="text-[10px] font-bold text-[#FC8019] hover:underline flex items-center gap-1"
            >
              <span>Open OmniTrace 360™</span>
              <ExternalLink size={10} />
            </Link>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Skip-traced numbers from delivery apps (Swiggy, Amazon, Zomato, Blinkit) and MCA21 director filings:
          </p>

          <div className="space-y-2">
            {phonesToDisplay.map((phone, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-[#FC8019] flex items-center justify-center font-bold text-xs">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{phone.number}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-[#FC8019] font-bold">
                        {phone.source}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {phone.category} · {phone.activeStatus} ({phone.lastUsed})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isRetrying}
                  onClick={() => handleRetryWithNewDid(phone.number)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <PhoneCall size={12} />
                  <span>Call This Number</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 font-mono">
            TRAI DLT &amp; Asterisk PBX 20 Telecom Gateway
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700"
          >
            Close Dialog
          </button>
        </div>

      </div>
    </div>
  );
}
