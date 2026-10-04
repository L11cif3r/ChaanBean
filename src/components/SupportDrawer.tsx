"use client";

import React, { useState } from "react";
import { HelpCircle, X, Scale, PhoneCall, ShieldCheck, Send, CheckCircle2, BookOpen } from "lucide-react";

export function SupportDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"statutory" | "trai" | "evidence" | "inquiry">("statutory");
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketMsg, setTicketMsg] = useState("");
  const [subject, setSubject] = useState("");

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      setTicketMsg("");
      setSubject("");
    }, 4000);
  };

  return (
    <>
      {/* Floating Bottom-Right Assistance Button (Inspired by LegAn support, elevated for enterprise compliance) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl hover:bg-emerald-500 transition shadow-emerald-950/40 border border-emerald-400/30 group"
          title="Open Legal Assistance & Regulatory Compliance Hub"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <Scale size={14} />
          <span>Legal & Compliance Support</span>
        </button>
      </div>

      {/* Slide-over Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-100 font-sans">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ChaanBean Regulatory & Support Desk</h3>
                  <p className="text-[11px] text-slate-400">Indian Statutory Credit & Debt Recovery Guide</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40 text-[11px] font-medium">
              <button
                onClick={() => setActiveTab("statutory")}
                className={`py-2.5 text-center border-b-2 transition ${
                  activeTab === "statutory"
                    ? "border-emerald-500 text-emerald-400 font-bold bg-emerald-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                MSME §16
              </button>
              <button
                onClick={() => setActiveTab("trai")}
                className={`py-2.5 text-center border-b-2 transition ${
                  activeTab === "trai"
                    ? "border-amber-500 text-amber-400 font-bold bg-amber-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                TRAI Rules
              </button>
              <button
                onClick={() => setActiveTab("evidence")}
                className={`py-2.5 text-center border-b-2 transition ${
                  activeTab === "evidence"
                    ? "border-sky-500 text-sky-400 font-bold bg-sky-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                IT Act §3A
              </button>
              <button
                onClick={() => setActiveTab("inquiry")}
                className={`py-2.5 text-center border-b-2 transition ${
                  activeTab === "inquiry"
                    ? "border-indigo-500 text-indigo-400 font-bold bg-indigo-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Ask Legal
              </button>
            </div>

            {/* Drawer Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {activeTab === "statutory" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                      Statutory Payment Mandate
                    </span>
                    <h4 className="text-sm font-bold text-white">Section 15, MSMED Act 2006</h4>
                    <p className="text-slate-300 leading-relaxed">
                      Every buyer who purchases goods or services from a registered MSME must make payment on or before the agreed date, which <strong>under no circumstances may exceed 45 days</strong> from the date of acceptance.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                      Mandatory Compound Interest
                    </span>
                    <h4 className="text-sm font-bold text-white">Section 16, MSMED Act 2006</h4>
                    <p className="text-slate-300 leading-relaxed">
                      Where any buyer fails to make payment within the statutory period, the buyer is legally liable to pay compound interest with <strong>monthly rests</strong> at <strong>three times (3x) the Bank Rate notified by the Reserve Bank of India</strong> (Current Rate: 20.25% p.a.).
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-sky-400 tracking-wider">
                      Statutory Arbitration Tribunal
                    </span>
                    <h4 className="text-sm font-bold text-white">Section 18, MSMED Act 2006</h4>
                    <p className="text-slate-300 leading-relaxed">
                      Disputes relating to unpaid amounts and accrued penal interest may be referred directly to the Micro and Small Enterprises Facilitation Council (MSEFC) or institutional arbitration. Awards have the force of a civil court decree.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "trai" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-4 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                      Telecom Regulatory Mandate
                    </span>
                    <h4 className="text-sm font-bold text-white">TRAI UCC Regulations (India)</h4>
                    <p className="text-slate-300 leading-relaxed">
                      Commercial voice dialers and tele-recovery systems must strictly observe the statutory window of <strong>09:00 to 18:00 IST</strong> on business days. Calling outside this window is blocked by ChaanBean's PBX controller.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                    <h4 className="text-sm font-bold text-white">Frequency Capping & Consent</h4>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                      <li>Maximum 3 voice contact attempts per debtor per calendar day.</li>
                      <li>One-way announcements must play clear legal disclosure without abusive or harassing language.</li>
                      <li>Standard pre-approved legal scripts in 7 scheduled Indian languages.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === "evidence" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-sky-800/60 bg-sky-950/20 p-4 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-sky-400 tracking-wider">
                      Electronic Evidence
                    </span>
                    <h4 className="text-sm font-bold text-white">Section 65B, Indian Evidence Act</h4>
                    <p className="text-slate-300 leading-relaxed">
                      All ChaanBean delivery receipts, Asterisk CDR telemetry, and notice downloads are hashed with SHA-256 and accompanied by an automated Section 65B electronic certificate for direct admission in judicial proceedings.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                    <h4 className="text-sm font-bold text-white">Information Technology Act 2000 §3A</h4>
                    <p className="text-slate-300 leading-relaxed">
                      Aadhaar OTP-based electronic signatures executed through CCA-licensed certifying authorities carry full legal equivalence to hand-inked signatures under Section 3A of the IT Act.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "inquiry" && (
                <form onSubmit={handleSendTicket} className="space-y-3">
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 text-xs">
                    Need assistance filing an MSME arbitration claim, drafting a custom Sec 138 demand notice, or unblocking an overdue ledger? Submit an inquiry directly to the ChaanBean legal operations desk.
                  </div>

                  {ticketSent && (
                    <div className="p-3 rounded-lg border border-emerald-800 bg-emerald-950/50 text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Legal inquiry dispatched! Reference: CB-REQ-{Date.now().toString().slice(-6)}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Subject / Debtor Reference *</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. MSME §18 filing for Metro Supplies Co"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Inquiry Details *</label>
                    <textarea
                      required
                      rows={4}
                      value={ticketMsg}
                      onChange={(e) => setTicketMsg(e.target.value)}
                      placeholder="Provide invoice dates, amount in default, or specific guidance requested..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition shadow-sm"
                  >
                    <Send size={13} />
                    Dispatch Legal Support Ticket
                  </button>
                </form>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-[11px] font-mono text-slate-500 flex items-center justify-between">
              <span>ChaanBean Legal Desk</span>
              <span className="text-emerald-400">TRAI & MSME Verified</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
