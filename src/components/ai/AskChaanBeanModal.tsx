"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  Scale,
  Landmark,
  Layers,
  Coins,
  Cpu,
  Bot,
  CheckCircle2,
  X,
  Send,
  Zap,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import { logAuditEvent } from "@/lib/events/audit-events";

interface AgentMessage {
  id: string;
  sender: "user" | "agent";
  agentName?: string;
  role?: string;
  text: string;
  recommendation?: {
    title: string;
    description: string;
    route: string;
    actionLabel: string;
    intentData?: Record<string, any>;
    estimatedCost?: number;
    walletSavings?: number;
  };
  timestamp: string;
}

const SAMPLE_INTENTS = [
  {
    label: "Check ABC Ltd before I give credit",
    query: "Check ABC Ltd before I give credit.",
    agent: "Credit Agent",
  },
  {
    label: "I want to give ₹50L credit",
    query: "I want to give them ₹50L. Which reports do I need?",
    agent: "Spend Agent",
  },
  {
    label: "Show overdue customers",
    query: "Show my overdue customers.",
    agent: "Protection Agent",
  },
  {
    label: "Start collection for ABC",
    query: "Start collection for ABC.",
    agent: "Collection Agent",
  },
  {
    label: "Connect Tally / ERP",
    query: "Connect Tally.",
    agent: "Automation Agent",
  },
  {
    label: "What needs my attention?",
    query: "What needs my attention today?",
    agent: "Intelligence Agent",
  },
];

export function AskChaanBeanModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "initial-greeting",
      sender: "agent",
      agentName: "Navigator Agent",
      role: "Orchestration & Workflow Copilot",
      text: "Tell me what you are trying to accomplish. I can guide you to the right check, estimate the wallet cost, and take you through the workflow.",
      timestamp: "Just now",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const rawQuery = (textToSend || query).trim();
    if (!rawQuery) return;

    setQuery("");
    const userMsg: AgentMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: rawQuery,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    logAuditEvent("RECOMMENDATION_SHOWN", {
      metadata: { query: rawQuery },
    });

    // Intelligent agent matching per Section 6 & 22
    setTimeout(() => {
      const q = rawQuery.toLowerCase();
      let response: AgentMessage;

      if (q.includes("check") || q.includes("due diligence") || q.includes("abc ltd")) {
        const companyMatched = q.includes("abc") ? "Acme Traders Pvt Ltd" : "Tata Motors Limited";
        response = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentName: "Credit Agent",
          role: "Statutory Due Diligence Orchestrator",
          text: `I've prepared a comprehensive due diligence path for "${companyMatched}". We'll verify CIN, GSTIN filings, MCA21 statutory directorships, e-Courts litigation, and MSMED §18 payment defaults before you extend commercial credit.`,
          recommendation: {
            title: "Open Credit Due Diligence Workspace",
            description: "Review permitted company master data, initialize credit objective, and configure Smart Spend.",
            route: `/background-check?targetCompany=${encodeURIComponent(companyMatched)}`,
            actionLabel: `Investigate ${companyMatched} →`,
            intentData: { companyName: companyMatched },
            estimatedCost: 340,
            walletSavings: 440,
          },
          timestamp: "Just now",
        };
      } else if (q.includes("50l") || q.includes("which reports") || q.includes("spend")) {
        response = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentName: "Spend Agent",
          role: "Smart Spend & Wallet Optimizer",
          text: "For an intended commercial credit limit of ₹50,00,000, ChaanBean recommends 5 high-impact checks (GST Exact Turnover, MCA Director Vetting, e-Courts Litigation, Charges Hypothecation, and MSME Risk Track). Full catalogue would cost 780 credits; recommended checks cost only 340 credits.",
          recommendation: {
            title: "Configure ₹50L Smart Spend Objective",
            description: "Essential and Recommended checks preselected with ₹440 wallet savings.",
            route: "/background-check?exposure=5000000&terms=45",
            actionLabel: "View Smart Spend Allocation (Save 440 Credits) →",
            estimatedCost: 340,
            walletSavings: 440,
          },
          timestamp: "Just now",
        };
      } else if (q.includes("overdue") || q.includes("customers") || q.includes("portfolio")) {
        response = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentName: "Protection Agent",
          role: "Continuous Credit Portfolio Monitor",
          text: "You have 3 debtor accounts currently exceeding agreed payment terms with an aggregate overdue balance of ₹18,45,000. 1 account is nearing statutory MSMED 45-day threshold.",
          recommendation: {
            title: "Open Continuous Credit Protection",
            description: "Filter portfolio to overdue exposure and view days-to-due countdowns.",
            route: "/monitoring?filter=overdue",
            actionLabel: "View Overdue Portfolio (3 Accounts) →",
          },
          timestamp: "Just now",
        };
      } else if (q.includes("collection") || q.includes("collect") || q.includes("recover")) {
        response = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentName: "Collection Agent",
          role: "Autonomous Recovery Orchestrator",
          text: "I have prepared the automated collection cadence for Acme Traders. We will execute: Payment Reminder → AI Voice Call → WhatsApp/Email Payment Link → Promise to Pay Tracking.",
          recommendation: {
            title: "Launch Smart Collections Automation",
            description: "Preselects account with automated multilingual calling and instant UPI payment link.",
            route: "/payment-recovery?account=selected",
            actionLabel: "Review & Confirm Automation →",
          },
          timestamp: "Just now",
        };
      } else if (q.includes("tally") || q.includes("erp") || q.includes("connect")) {
        response = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentName: "Automation Agent",
          role: "ERP & Data Connect Orchestrator",
          text: "Connecting your TallyPrime or ERP enables automated ledger reconciliation, auto-detects overdue invoices, and continuously refreshes debtor risk flags without manual file uploads.",
          recommendation: {
            title: "Open ChaanBean Connect Hub",
            description: "Step-by-step Tally TDL connector or direct API token generation.",
            route: "/connect?provider=tally",
            actionLabel: "Launch Tally Connector Wizard →",
          },
          timestamp: "Just now",
        };
      } else if (q.includes("attention") || q.includes("today") || q.includes("summary")) {
        response = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentName: "Intelligence Agent",
          role: "Cross-Business Risk Intelligence",
          text: "Daily Executive Briefing: 3 customers are overdue (₹18.45L), ₹12.5L is due within the next 7 days, 1 debtor has new litigation registered on e-Courts, and 2 accounts require credit limit revisions.",
          recommendation: {
            title: "Open Command Centre Intelligence Feed",
            description: "Take targeted action across overdue recovery, dispute mitigation, and credit adjustment.",
            route: "/dashboard",
            actionLabel: "Review Command Centre Alerts →",
          },
          timestamp: "Just now",
        };
      } else {
        response = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentName: "Navigator Agent",
          role: "Orchestration Copilot",
          text: `I've analyzed your objective: "${rawQuery}". I can take you directly to the relevant operating station or configure the recommended workflow for you.`,
          recommendation: {
            title: "Navigate to Command Centre",
            description: "Access all 5 operating stations and cross-business intelligence.",
            route: "/dashboard",
            actionLabel: "Go to Home Command Centre →",
          },
          timestamp: "Just now",
        };
      }

      setMessages((prev) => [...prev, response]);
      setIsProcessing(false);
    }, 600);
  };

  const executeRecommendation = (rec: AgentMessage["recommendation"]) => {
    if (!rec) return;
    logAuditEvent("RECOMMENDATION_ACCEPTED_DECLINED", {
      metadata: { action: "accepted", route: rec.route, title: rec.title },
    });
    onClose();
    router.push(rec.route);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-white dark:bg-[#0D1322] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl bg-[#FC8019] text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0 ring-2 ring-orange-400/40"
              style={{ backgroundColor: "#FC8019", color: "#ffffff" }}
            >
              <Sparkles size={20} className="text-white" strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Ask ChaanBean
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
                  Agentic Orchestration Layer
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Natural-language task execution, Smart Spend advice & guided workflows
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isAgent = m.sender === "agent";
            return (
              <div
                key={m.id}
                className={clsx(
                  "flex flex-col gap-1.5",
                  isAgent ? "items-start" : "items-end"
                )}
              >
                {isAgent ? (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-bold text-[#FC8019]">
                      {m.agentName || "Ask ChaanBean"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      · {m.role}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      You
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      · {m.timestamp}
                    </span>
                  </div>
                )}
                <div
                  className={clsx(
                    "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed",
                    isAgent
                      ? "bg-slate-100 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xs"
                      : "bg-[#FC8019] text-white font-medium shadow-md shadow-orange-500/20"
                  )}
                  style={!isAgent ? { backgroundColor: "#FC8019", color: "#ffffff" } : undefined}
                >
                  <p className={!isAgent ? "text-white font-medium select-text" : "select-text"}>
                    {m.text}
                  </p>

                  {/* Recommendation Card */}
                  {m.recommendation && (
                    <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-orange-200 dark:border-orange-900/50 shadow-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {m.recommendation.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {m.recommendation.description}
                          </p>
                        </div>
                        {m.recommendation.walletSavings && (
                          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                            Save {m.recommendation.walletSavings} credits
                          </span>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {m.recommendation.estimatedCost
                            ? `Est. Cost: ${m.recommendation.estimatedCost} credits`
                            : "No instant debit required"}
                        </span>
                        <button
                          type="button"
                          onClick={() => executeRecommendation(m.recommendation)}
                          className="px-3 py-1.5 rounded-lg bg-[#FC8019] text-white text-xs font-bold hover:bg-[#e06900] transition flex items-center gap-1.5 shadow-xs"
                          style={{ backgroundColor: "#FC8019", color: "#ffffff" }}
                        >
                          {m.recommendation.actionLabel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2 font-mono">
              <RefreshCw size={14} className="animate-spin text-[#FC8019]" />
              <span>Orchestrating agent recommendations...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Intent Pills */}
        <div className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Try asking:</span>
            {SAMPLE_INTENTS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(item.query)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#FC8019] hover:text-[#FC8019] dark:hover:text-[#FC8019] hover:shadow-xs transition shrink-0"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500/80 pointer-events-none">
              <Sparkles size={16} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Tell me what you want to accomplish (e.g. 'Check Tata Motors before ₹50L credit')..."
              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FC8019] focus:border-[#FC8019] transition shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Clear"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!query.trim() || isProcessing}
            style={query.trim() && !isProcessing ? { backgroundColor: "#FC8019", color: "#ffffff" } : undefined}
            className={clsx(
              "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shrink-0",
              query.trim() && !isProcessing
                ? "bg-[#FC8019] hover:bg-[#e26d0a] text-white shadow-md shadow-orange-500/25 active:scale-95 cursor-pointer"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
            )}
          >
            <span className={query.trim() && !isProcessing ? "text-white" : "text-slate-400 dark:text-slate-500"}>
              Ask
            </span>
            <Send
              size={15}
              className={query.trim() && !isProcessing ? "text-white" : "text-slate-400 dark:text-slate-500"}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
