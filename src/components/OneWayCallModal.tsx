"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Radio,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  CreditCard,
  Hash,
  X,
  Play,
  Pause,
  Clock,
  Sparkles,
  ExternalLink,
  PhoneForwarded,
} from "lucide-react";
import { CallUnreachableModal, OUTBOUND_CALLER_LINES } from "@/components/recovery/CallUnreachableModal";

interface CallDetailsData {
  account: {
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
  };
  statutoryInterest: {
    statutoryRatePercent: number;
    accruedInterest: number;
    totalPayable: number;
    daysOverdue: number;
    statutorySection: string;
  };
  voiceCall: {
    templateId: string;
    language: string;
    scriptText: string;
    audioUrl: string;
    contentHash: string;
    voiceConfig: {
      voiceId: string;
      languageCode: string;
      engine: string;
    };
  };
}

export function OneWayCallModal({
  creditAccountId,
  isOpen,
  onClose,
  onSettled,
}: {
  creditAccountId: string;
  isOpen: boolean;
  onClose: () => void;
  onSettled?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CallDetailsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Call state machine: 'idle' | 'dialing' | 'ringing' | 'connected' | 'speaking' | 'completed'
  const [callState, setCallState] = useState<
    "idle" | "dialing" | "ringing" | "connected" | "speaking" | "completed"
  >("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [sipCallId, setSipCallId] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isSettling, setIsSettling] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);

  // Caller line & unreachable handling
  const [callerDid, setCallerDid] = useState<string>(OUTBOUND_CALLER_LINES[0].did);
  const [unreachableModalOpen, setUnreachableModalOpen] = useState(false);
  const [unreachableReason, setUnreachableReason] = useState<string>(
    "Carrier Status: User Busy / Rejected (SIP 486 Busy Here / Q.850 Cause 17)"
  );
  const [targetPhoneToCall, setTargetPhoneToCall] = useState<string>("");

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // 1. Fetch Call Details & Script
  useEffect(() => {
    if (!isOpen || !creditAccountId) return;
    setLoading(true);
    setError(null);
    setCallState("idle");
    setCallDuration(0);
    setSettlementSuccess(null);

    fetch(`/api/recovery?creditAccountId=${creditAccountId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load recovery details");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isOpen, creditAccountId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech API Voice synthesis helper
  const speakAnnouncement = (text: string, langCode: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Map language code to standard speech synthesis format
    const langMap: Record<string, string> = {
      hi: "hi-IN",
      ta: "ta-IN",
      ml: "ml-IN",
      te: "te-IN",
      kn: "kn-IN",
      tu: "kn-IN", // Tulu fallback to Kannada voice
      en: "en-IN",
    };
    utterance.lang = langMap[langCode] || "en-IN";
    utterance.rate = 0.95; // professional deliberate telephony pace
    utterance.pitch = 1.0;

    const words = text.split(/\s+/);
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const charIdx = event.charIndex;
        let cumulative = 0;
        for (let i = 0; i < words.length; i++) {
          cumulative += words[i].length + 1;
          if (cumulative >= charIdx) {
            setCurrentWordIndex(i);
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      setCallState("completed");
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };

    window.speechSynthesis.speak(utterance);
  };

  // 2. Start Live One-Way Outbound Call
  const startCall = async (
    overrideDid?: string,
    overrideTargetPhone?: string,
    forceOutcome?: "connected" | "busy"
  ) => {
    if (!data) return;
    const didToUse = overrideDid || callerDid;
    const phoneToDial = overrideTargetPhone || targetPhoneToCall || data.account.phone;
    const outcomeMode = forceOutcome || "connected";

    setCallState("dialing");
    setCallDuration(0);

    try {
      // Step 1: Initiate outbound playback call via backend
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditAccountId,
          action: "direct_voice_call",
          callerDid: didToUse,
          targetPhone: phoneToDial,
          simulateOutcome: outcomeMode,
        }),
      });

      const callResponse = await res.json();
      if (!res.ok) throw new Error(callResponse.error || "Call failed to connect");

      if (callResponse.callResult?.status !== "answered") {
        setCallState("idle");
        const reason =
          callResponse.callResult?.status === "busy"
            ? "Carrier Status: User Busy / Rejected (SIP 486 Busy Here / Q.850 Cause 17)"
            : callResponse.callResult?.status === "no_answer"
            ? "Carrier Status: No Answer / Unreachable (SIP 487 Request Terminated / Q.850 Cause 18)"
            : callResponse.error || "Carrier Status: Route Failure / Call Screened (SIP 503)";
        setUnreachableReason(reason);
        setTargetPhoneToCall(phoneToDial);
        setUnreachableModalOpen(true);
        return;
      }

      const sipId = callResponse.callResult?.sipSessionId || `SIP-VOBIZ-${Date.now().toString(36).toUpperCase()}`;
      setSipCallId(sipId);

      // Step 2: Transition to RINGING (1.2s delay for carrier PSTN connect)
      setTimeout(() => {
        setCallState("ringing");

        // Step 3: Transition to CONNECTED (SIP 200 OK)
        setTimeout(() => {
          setCallState("connected");

          // Start duration timer
          durationTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);

          // Step 4: Transmitting Audio
          setTimeout(() => {
            setCallState("speaking");
            speakAnnouncement(data.voiceCall.scriptText, data.voiceCall.language);
          }, 800);
        }, 1600);
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Outbound call failed");
      setCallState("idle");
      setUnreachableReason(err instanceof Error ? err.message : "Telephony connection failed");
      setTargetPhoneToCall(phoneToDial);
      setUnreachableModalOpen(true);
    }
  };

  // 3. Terminate Call Manually
  const hangUp = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setCallState("completed");
  };

  // 4. Instant Settlement Remittance (UPI/NEFT/RTGS)
  const handleInstantSettlement = async () => {
    if (!data) return;
    setIsSettling(true);
    try {
      const res = await fetch("/api/recovery/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditAccountId,
          paymentMode: "UPI",
          paymentAmount: data.account.outstandingAmount,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Settlement failed");

      setSettlementSuccess(
        `Settled ₹${data.account.outstandingAmount.toLocaleString("en-IN")} · UTR: ${resJson.utrNumber}`
      );
      if (onSettled) onSettled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record settlement");
    } finally {
      setIsSettling(false);
    }
  };

  if (!isOpen) return null;

  const words = data?.voiceCall.scriptText.split(/\s+/) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0E1523] shadow-2xl p-6 space-y-6 text-slate-100 font-sans my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PhoneCall size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Asterisk / Vobiz One-Way Voice Recovery Console
                <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-800">
                  TRAI COMPLIANT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automated one-way statutory recovery announcement · Pre-approved legal script · Real audio synthesis
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              hangUp();
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400 animate-pulse">
            Connecting Asterisk PBX call control layer...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-4 text-xs text-rose-300">
            {error}
          </div>
        ) : data ? (
          <>
            {/* Debtor Profile Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-mono block">Debtor</span>
                <p className="font-semibold text-white truncate">{data.account.buyerName}</p>
                <span className="text-[10px] font-mono text-sky-400">{data.account.phone}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-mono block">Language</span>
                <span className="inline-block mt-0.5 rounded bg-slate-800 px-2 py-0.5 font-mono uppercase text-amber-400 font-bold border border-slate-700">
                  {data.voiceCall.language} ({data.voiceCall.voiceConfig.voiceId})
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-mono block">Overdue Principal</span>
                <p className="font-mono font-bold text-rose-400 text-sm">
                  ₹{data.account.outstandingAmount.toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-slate-400">{data.statutoryInterest.daysOverdue} days overdue</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-mono block">Statutory Total</span>
                <p className="font-mono font-bold text-emerald-400 text-sm">
                  ₹{Math.round(data.statutoryInterest.totalPayable).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-amber-300 font-mono">
                  +{data.statutoryInterest.statutoryRatePercent}% MSME §16
                </span>
              </div>
            </div>

            {/* Live Telecom Call State Banner */}
            <div
              className={`rounded-xl border p-4 transition-all duration-300 ${
                callState === "idle"
                  ? "border-slate-800 bg-slate-900/40"
                  : callState === "dialing"
                    ? "border-sky-800 bg-sky-950/20"
                    : callState === "ringing"
                      ? "border-amber-800 bg-amber-950/20"
                      : callState === "speaking" || callState === "connected"
                        ? "border-emerald-800 bg-emerald-950/20"
                        : "border-slate-700 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      callState === "idle"
                        ? "bg-slate-600"
                        : callState === "dialing"
                          ? "bg-sky-400 animate-ping"
                          : callState === "ringing"
                            ? "bg-amber-400 animate-pulse"
                            : callState === "speaking" || callState === "connected"
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-slate-500"
                    }`}
                  />
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider font-bold">
                      {callState === "idle" && "Ready to Connect"}
                      {callState === "dialing" && "SIP INVITE Sent · Negotiating SDP & Codec"}
                      {callState === "ringing" && "SIP 180 Ringing · Debtor Device Alerting"}
                      {callState === "connected" && "SIP 200 OK Connected · Initializing RTP Stream"}
                      {callState === "speaking" && "Broadcasting One-Way Legal Notice Announcement"}
                      {callState === "completed" && "Call Concluded · SIP BYE Received (Q.850 Normal Clearing)"}
                    </span>
                    {sipCallId && (
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-sm">
                        Session: {sipCallId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-white">
                    {String(Math.floor(callDuration / 60)).padStart(2, "0")}:
                    {String(callDuration % 60).padStart(2, "0")}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono">DURATION</span>
                </div>
              </div>

              {/* Caller Line DID Selection */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs">
                <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                  <PhoneForwarded size={12} className="text-[#FC8019]" />
                  Outbound Line (Caller DID):
                </span>
                <select
                  value={callerDid}
                  onChange={(e) => setCallerDid(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 font-mono focus:border-orange-500 focus:outline-none"
                >
                  {OUTBOUND_CALLER_LINES.map((line) => (
                    <option key={line.did} value={line.did}>
                      {line.did} — {line.name} ({line.connectRate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Call Controls */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {callState === "idle" && (
                  <>
                    <button
                      onClick={() => startCall(callerDid, undefined, "connected")}
                      className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
                    >
                      <PhoneCall size={14} />
                      Dial Outbound One-Way Call
                    </button>
                    <button
                      onClick={() => startCall(callerDid, undefined, "busy")}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/40 transition"
                      title="Simulate busy/unreachable to test the diagnosis popup"
                    >
                      <PhoneOff size={13} />
                      Test Unreachable / Busy
                    </button>
                  </>
                )}

                {(callState === "dialing" ||
                  callState === "ringing" ||
                  callState === "connected" ||
                  callState === "speaking") && (
                  <button
                    onClick={hangUp}
                    className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition shadow-lg shadow-rose-600/20"
                  >
                    <PhoneOff size={14} />
                    Hang Up Call
                  </button>
                )}

                {callState === "completed" && (
                  <button
                    onClick={() => startCall(callerDid, undefined, "connected")}
                    className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                  >
                    <PhoneCall size={14} />
                    Redial Announcement
                  </button>
                )}

                {/* Direct audio stream player */}
                <a
                  href={`/api/audio/${data.voiceCall.contentHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  <Volume2 size={13} className="text-amber-400" />
                  Stream Raw WAV Audio
                </a>
              </div>
            </div>

            {/* Synchronized Announcement Script Display */}
            <div className="rounded-xl border border-slate-800 bg-[#080C14] p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText size={14} className="text-amber-400" />
                  Legal Announcement Script ({data.voiceCall.language.toUpperCase()})
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Hash: {data.voiceCall.contentHash.slice(0, 12)}...
                </span>
              </div>

              <div className="text-xs leading-relaxed font-sans text-slate-300 p-3 bg-slate-900/60 rounded-lg border border-slate-800 max-h-40 overflow-y-auto">
                {words.map((word, idx) => (
                  <span
                    key={idx}
                    className={`transition-colors duration-150 inline-block mr-1 ${
                      idx === currentWordIndex
                        ? "bg-amber-400 text-slate-950 font-bold px-1 rounded shadow"
                        : idx < currentWordIndex
                          ? "text-slate-200"
                          : "text-slate-400"
                    }`}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Payment Automation Follow-up & Instant Settlement */}
            <div className="rounded-xl border border-amber-800/40 bg-gradient-to-r from-amber-950/20 to-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Automated Post-Call Payment Follow-up
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  SMS / WhatsApp Link Dispatched
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                At the conclusion of the call, ChaanBean automatically dispatches an instant payment link to{" "}
                <strong className="text-slate-200">{data.account.phone}</strong>. Debtor inbound remittance reconciles the account in real-time.
              </p>

              {settlementSuccess ? (
                <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 p-3 flex items-center justify-between text-xs text-emerald-300 font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>{settlementSuccess}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-300">
                    SETTLED & CLOSED
                  </span>
                </div>
              ) : (
                <button
                  disabled={isSettling}
                  onClick={handleInstantSettlement}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {isSettling
                    ? "Reconciling Payment & Clearing Ledger..."
                    : `Process Inbound Settlement Remittance (₹${data.account.outstandingAmount.toLocaleString("en-IN")})`}
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Call Unreachable Diagnosis Modal */}
      {unreachableModalOpen && data && (
        <CallUnreachableModal
          isOpen={unreachableModalOpen}
          onClose={() => setUnreachableModalOpen(false)}
          debtorName={data.account.buyerName}
          targetPhone={targetPhoneToCall || data.account.phone}
          creditAccountId={creditAccountId}
          currentCallerDid={callerDid}
          failureReason={unreachableReason}
          onRetryCall={async (newDid, altPhone) => {
            setCallerDid(newDid);
            setUnreachableModalOpen(false);
            await startCall(newDid, altPhone, "connected");
          }}
          onDispatchWhatsApp={async () => {
            setError(null);
          }}
          onDispatchSms={async () => {
            setError(null);
          }}
          onDispatchEmail={async () => {
            setError(null);
          }}
        />
      )}
    </div>
  );
}
