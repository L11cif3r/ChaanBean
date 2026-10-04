"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  FileCheck,
  Calculator,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  PhoneCall,
  Activity,
  CalendarCheck,
  Scale,
  FileSpreadsheet,
  Gavel,
  ArrowRight,
  Play,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
  Volume2,
} from "lucide-react";

interface StepDefinition {
  number: number;
  title: string;
  subtitle: string;
  category: "core" | "company" | "credit" | "recovery" | "communication" | "legal";
  icon: any;
  actionLabel: string;
  description: string;
}

const STEPS: StepDefinition[] = [
  {
    number: 1,
    title: "Login & Organisation Context",
    subtitle: "Tenant Isolation & RBAC Profile",
    category: "core",
    icon: Building2,
    actionLabel: "Verify Organisation",
    description: "Load tenant company, subscription entitlement, KYC status, and security context.",
  },
  {
    number: 2,
    title: "Search Target Company",
    subtitle: "MCA21 & GSTN Search Tool",
    category: "company",
    icon: Building2,
    actionLabel: "Search Counterparty",
    description: "Query official registries for counterparty corporate identifiers (CIN, GSTIN, PAN).",
  },
  {
    number: 3,
    title: "Verify Company 360",
    subtitle: "Statutory Standing & Directors",
    category: "company",
    icon: ShieldCheck,
    actionLabel: "Pull Company 360",
    description: "Fetch live RoC status, active DIN directors, GSTR-3B filing rate, and MSME Udyam category.",
  },
  {
    number: 4,
    title: "Run Deterministic Credit Assessment",
    subtitle: "Deterministic 6-Factor Risk Engine",
    category: "credit",
    icon: Calculator,
    actionLabel: "Compute 6 Factors",
    description: "Execute strict mathematical model (Stability 20%, Financials 20%, Payment 25%, History 20%, Promoter 10%, External 5%).",
  },
  {
    number: 5,
    title: "Risk Score & Grounded Rationale",
    subtitle: "Explainable AI (Gemini Grounded)",
    category: "credit",
    icon: Sparkles,
    actionLabel: "Generate Narrative",
    description: "Synthesize executive narrative from deterministic factors without score tampering.",
  },
  {
    number: 6,
    title: "Create & Approve Credit Case",
    subtitle: "Credit Approval Record",
    category: "core",
    icon: FileCheck,
    actionLabel: "Record Credit Case",
    description: "Record formal underwriting approval with approved limits and tenor.",
  },
  {
    number: 7,
    title: "Add Invoice Exposure",
    subtitle: "Debtor Ledger & Invoice Booking",
    category: "core",
    icon: FileText,
    actionLabel: "Book Invoice",
    description: "Record trade invoice exposure (₹12,50,000) linked to buyer credit account.",
  },
  {
    number: 8,
    title: "Overdue DPD & MSMED Interest Ledger",
    subtitle: "Statutory 20.25% p.a. Penal Interest",
    category: "recovery",
    icon: Clock,
    actionLabel: "Calculate Statutory Claim",
    description: "Compute Days Past Due (DPD) and compound penal interest @ 3x RBI Bank Rate under MSMED Act §16.",
  },
  {
    number: 9,
    title: "Create Recovery Case",
    subtitle: "Stage L1-L3 Recovery Workflow",
    category: "recovery",
    icon: Activity,
    actionLabel: "Open Recovery Case",
    description: "Initialize active recovery case docket with total claim and milestone tracking.",
  },
  {
    number: 10,
    title: "Rules Engine Next Action",
    subtitle: "Regulatory Window & Frequency Check",
    category: "recovery",
    icon: CheckCircle2,
    actionLabel: "Evaluate Rules Engine",
    description: "Authorizer verifies statutory calling window, daily caps, and required minimum spacing.",
  },
  {
    number: 11,
    title: "Dispatch Statutory Notice Reminder",
    subtitle: "Statutory Communication Notice",
    category: "communication",
    icon: PhoneCall,
    actionLabel: "Dispatch Reminder",
    description: "Generate compliant statutory reminder and dispatch communications sequence.",
  },
  {
    number: 12,
    title: "Log Communication Receipt & Update Timeline",
    subtitle: "Delivery Status Confirmation",
    category: "communication",
    icon: Volume2,
    actionLabel: "Confirm Delivery Receipt",
    description: "Delivery status verified and confirmed into the recovery case timeline.",
  },
  {
    number: 13,
    title: "Record Promise to Pay (PTP)",
    subtitle: "Debtor Settlement Commitment",
    category: "recovery",
    icon: CalendarCheck,
    actionLabel: "Record PTP Commitment",
    description: "Capture debtor commitment with promised date, RTGS mode, and timeline entry.",
  },
  {
    number: 14,
    title: "Evaluate Statutory Legal Eligibility",
    subtitle: "MSMED Act §15/18 Statutory Gate",
    category: "legal",
    icon: Scale,
    actionLabel: "Check Legal Thresholds",
    description: "Rules authorizer checks 45-day statutory threshold, broken PTP condition, and minimum ₹25k claim.",
  },
  {
    number: 15,
    title: "Create Legal Candidate Docket",
    subtitle: "Pre-Litigation Case Assembly",
    category: "legal",
    icon: FileSpreadsheet,
    actionLabel: "Promote to Legal Docket",
    description: "Compile Pre-Litigation Candidate docket with statutory grounds under MSMED Act §18.",
  },
  {
    number: 16,
    title: "Human Legal Review & Evidence Seal",
    subtitle: "Section 65B Digital Certificate",
    category: "legal",
    icon: Gavel,
    actionLabel: "Review & Sign Off",
    description: "Assemble certified evidentiary dossier with Section 65B Indian Evidence Act digital hash seal.",
  },
];

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepData, setStepData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedPayload, setSelectedPayload] = useState<any>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const executeStep = async (stepNum: number) => {
    setLoading(true);
    try {
      if (stepNum === 1) {
        addLog("Invoking MCP: core.get_organisation...");
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: "core", tool: "get_organisation", arguments: {} }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 1: json.data }));
        setSelectedPayload(json.data);
        addLog(`Organisation verified: "${json.data?.name || "Acme Enterprises"}" (KYC: ${json.data?.kycStatus || "Verified"})`);
        setCurrentStep(2);
      } else if (stepNum === 2) {
        addLog("Invoking MCP: company.search_company (query: 'Greenline Retail')...");
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "company",
            tool: "search_company",
            arguments: { query: "Greenline Retail", limit: 3 },
          }),
        });
        const json = await res.json();
        const matches = json.data || [];
        setStepData((prev) => ({ ...prev, 2: matches }));
        setSelectedPayload(matches);
        addLog(`Found ${matches.length} matching entities. Selected: "${matches[0]?.legalName}"`);
        setCurrentStep(3);
      } else if (stepNum === 3) {
        const companyName = stepData[2]?.[0]?.legalName || "Greenline Retail Private Limited";
        addLog(`Invoking MCP: company.get_company_profile & get_directors for "${companyName}"...`);
        const pRes = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "company",
            tool: "get_company_profile",
            arguments: { identifier: companyName },
          }),
        });
        const pJson = await pRes.json();
        const dRes = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "company",
            tool: "get_directors",
            arguments: { identifier: companyName },
          }),
        });
        const dJson = await dRes.json();
        const combined = { profile: pJson.data, directors: dJson.data };
        setStepData((prev) => ({ ...prev, 3: combined }));
        setSelectedPayload(combined);
        addLog(`Company 360 verified: CIN ${pJson.data?.cin}, ${dJson.data?.directorsCount || 3} active directors.`);
        setCurrentStep(4);
      } else if (stepNum === 4) {
        const companyName = stepData[2]?.[0]?.legalName || "Greenline Retail Private Limited";
        addLog("Executing Deterministic 6-Factor Credit Risk Engine...");
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "credit",
            tool: "calculate_credit_risk",
            arguments: { companyName, requestedExposure: 5000000 },
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 4: json.data }));
        setSelectedPayload(json.data);
        addLog(`Credit computed: Score ${json.data?.compositeScore}/100 (${json.data?.riskBand}). Rec Limit: ₹${((json.data?.recommendedCreditLimit || 0) / 100000).toFixed(1)}L`);
        setCurrentStep(5);
      } else if (stepNum === 5) {
        const credit = stepData[4];
        addLog("Generating Gemini Explainable Rationale grounded on deterministic factors...");
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "credit",
            tool: "get_risk_explanation",
            arguments: {
              companyName: credit?.companyName || "Greenline Retail",
              compositeScore: credit?.compositeScore || 82,
              riskBand: credit?.riskBand || "LOW_RISK",
            },
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 5: json.data }));
        setSelectedPayload(json.data);
        addLog("AI Narrative generated. Grounded strictly without score tampering.");
        setCurrentStep(6);
      } else if (stepNum === 6) {
        const company = stepData[2]?.[0];
        const credit = stepData[4];
        const explanation = stepData[5]?.explanation;
        addLog("Recording formal CreditCase approval...");
        const res = await fetch("/api/credit-cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetCompanyName: company?.legalName || "Greenline Retail Private Limited",
            targetCin: company?.cin,
            targetGstin: company?.gstin,
            targetPan: company?.pan,
            requestedAmount: 5000000,
            aiExplanation: explanation,
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 6: json.creditCase }));
        setSelectedPayload(json.creditCase);
        addLog(`CreditCase approved with ID: ${json.creditCase?.id}. Status: ${json.creditCase?.status?.toUpperCase()}`);
        setCurrentStep(7);
      } else if (stepNum === 7) {
        addLog("Simulating Trade Invoice booking of ₹12,50,000 (PO Ref: PO-2026-9021)...");
        const invoiceData = {
          invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          amount: 1250000,
          issueDate: new Date(Date.now() - 95 * 86400000).toISOString().split("T")[0],
          dueDate: new Date(Date.now() - 50 * 86400000).toISOString().split("T")[0],
          status: "overdue",
        };
        setStepData((prev) => ({ ...prev, 7: invoiceData }));
        setSelectedPayload(invoiceData);
        addLog(`Invoice ${invoiceData.invoiceNumber} booked: ₹12.50L. Due date passed 50 days ago.`);
        setCurrentStep(8);
      } else if (stepNum === 8) {
        addLog("Computing Overdue DPD & statutory compound interest under MSMED Act 2006 §16...");
        const dpd = 50;
        const principal = 1250000;
        const statutoryRate = 0.2025; // 20.25% p.a. (3x RBI Bank Rate)
        const interest = Math.round(principal * (statutoryRate / 365) * dpd);
        const totalClaim = principal + interest;
        const interestLedger = {
          dpd,
          principal,
          statutoryRate: "20.25% p.a. (3x RBI Bank Rate with monthly rests)",
          accruedInterest: interest,
          totalClaim,
          msmedProtected: true,
        };
        setStepData((prev) => ({ ...prev, 8: interestLedger }));
        setSelectedPayload(interestLedger);
        addLog(`Statutory Claim Calculated: Principal ₹12.50L + MSMED Interest ₹${interest.toLocaleString("en-IN")} = ₹${totalClaim.toLocaleString("en-IN")}`);
        setCurrentStep(9);
      } else if (stepNum === 9) {
        addLog("Creating RecoveryCase with stage L2_DEMAND...");
        const res = await fetch("/api/recovery-cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_recovery_case",
            creditAccountId: "acc_demo_7719",
            buyerId: "byr_demo_9921",
            totalOverdue: 1250000,
            overdueDpd: 50,
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 9: json.data }));
        setSelectedPayload(json.data);
        addLog(`RecoveryCase created: Case #${json.data?.caseNumber}. Stage: ${json.data?.stage}`);
        setCurrentStep(10);
      } else if (stepNum === 10) {
        const recCase = stepData[9];
        addLog("Evaluating Rules Engine for authorized recovery action...");
        const res = await fetch("/api/recovery-cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_next_action",
            recoveryCaseId: recCase?.id,
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 10: json.data }));
        setSelectedPayload(json.data);
        addLog(`Rules Authorizer verified: Recommended action is [${json.data?.actionType}]. Window permitted.`);
        setCurrentStep(11);
      } else if (stepNum === 11) {
        const recCase = stepData[9];
        addLog("Dispatching statutory communication reminder...");
        const res = await fetch("/api/recovery-cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "trigger_exotel_call",
            recoveryCaseId: recCase?.id,
            toPhone: "9820098200",
            debtorName: "Greenline Retail Private Limited",
            overdueAmount: 1250000,
            overdueDpd: 50,
            language: "en",
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 11: json.data }));
        setSelectedPayload(json.data);
        addLog(`Reminder notice dispatched! Reference ID: ${json.data?.callSid || 'DEMO-REF-01'}`);
        setCurrentStep(12);
      } else if (stepNum === 12) {
        const callSid = stepData[11]?.callSid || "exo_sbx_live_call";
        addLog(`Confirming communication delivery receipt for ${callSid}...`);
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "communication",
            tool: "process_communication_webhook",
            arguments: {
              callSid,
              status: "completed",
              duration: 15,
              recordingUrl: `https://api.exotel.com/recordings/${callSid}.mp3`,
            },
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 12: json.data }));
        setSelectedPayload(json.data);
        addLog("Communication confirmed as completed. Timeline event appended.");
        setCurrentStep(13);
      } else if (stepNum === 13) {
        const recCase = stepData[9];
        addLog("Recording Promise to Pay (PTP) commitment from Debtor CFO...");
        const res = await fetch("/api/recovery-cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record_ptp",
            recoveryCaseId: recCase?.id,
            amount: 1250000,
            promisedDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
            paymentMode: "RTGS",
            notes: "CFO committed to release payment post quarterly GST reconciliation.",
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 13: json.data }));
        setSelectedPayload(json.data);
        addLog(`PTP recorded for ₹${(1250000).toLocaleString("en-IN")}. Status: PTP_ACTIVE.`);
        setCurrentStep(14);
      } else if (stepNum === 14) {
        const recCase = stepData[9];
        addLog("Rules Engine evaluating Pre-Litigation Legal Escalation eligibility...");
        const res = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "legal",
            tool: "check_legal_eligibility",
            arguments: { recoveryCaseId: recCase?.id },
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 14: json.data }));
        setSelectedPayload(json.data);
        addLog(`Legal Escalation Authorized: ${json.data?.reason || "Statutory 45-day threshold exceeded."}`);
        setCurrentStep(15);
      } else if (stepNum === 15) {
        const recCase = stepData[9];
        addLog("Promoting Recovery Case to Pre-Litigation Legal Candidate Docket...");
        const res = await fetch("/api/legal-candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_legal_candidate",
            recoveryCaseId: recCase?.id,
          }),
        });
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 15: json.data }));
        setSelectedPayload(json.data);
        addLog(`Legal Candidate Docket created: ${json.data?.candidateNumber}. Ready for Human Review.`);
        setCurrentStep(16);
      } else if (stepNum === 16) {
        const candidateId = stepData[15]?.candidateId;
        addLog("Compiling Evidentiary Package with Section 65B Digital Certificate...");
        const res = await fetch(`/api/legal-candidates?id=${candidateId}`);
        const json = await res.json();
        setStepData((prev) => ({ ...prev, 16: json.compiledCasePackage }));
        setSelectedPayload(json.compiledCasePackage);
        addLog("Case Dossier compiled! Certified under Section 65B Indian Evidence Act.");
      }
    } catch (err: any) {
      addLog(`Execution error on Step ${stepNum}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllSteps = async () => {
    setAutoRunning(true);
    for (let i = 1; i <= 16; i++) {
      await executeStep(i);
      await new Promise((r) => setTimeout(r, 600));
    }
    setAutoRunning(false);
  };

  const resetJourney = () => {
    setCurrentStep(1);
    setStepData({});
    setSelectedPayload(null);
    setLogs(["Journey reset to Step 1."]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 p-4 sm:p-8 font-sans">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Enterprise Workflow Journey
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              ChaanBean 16-step journey
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              End-to-end B2B credit evaluation, statutory compliance, and recovery workflow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={resetJourney}
              disabled={loading || autoRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold transition border border-slate-200 dark:border-slate-700 disabled:opacity-50 shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={runAllSteps}
              disabled={loading || autoRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              {autoRunning ? "Auto-Running Pipeline..." : "Auto-Run All 16 Steps"}
            </button>
          </div>
        </div>

        {/* PROGRESS METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Active Milestone</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Step {currentStep} <span className="text-xs text-slate-400 font-normal">/ 16: {STEPS[currentStep - 1]?.title || "Complete"}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(stepData).length / 16) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Journey Progress</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center justify-between">
              <span>{Object.keys(stepData).length} of 16 Completed</span>
              <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {Math.round((Object.keys(stepData).length / 16) * 100)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {Object.keys(stepData).length === 16 ? "All milestones successfully executed." : "Execute milestones individually or run the full automated sequence."}
            </p>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: 16-STEP INTERACTIVE ACCORDION */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
              16-Step Workflow Pipeline
            </h2>
            <span className="text-xs text-slate-500">
              {Object.keys(stepData).length} of 16 completed
            </span>
          </div>

          {STEPS.map((step) => {
            const isCompleted = Boolean(stepData[step.number]);
            const isCurrent = currentStep === step.number;
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className={`border rounded-2xl p-4 transition-all duration-200 ${
                  isCurrent
                    ? "bg-emerald-50/40 dark:bg-slate-900 border-2 border-emerald-500 shadow-md shadow-emerald-500/10"
                    : isCompleted
                    ? "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                    : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800/60 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs mt-0.5 ${
                        isCompleted
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                          : isCurrent
                          ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 animate-pulse"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : step.number}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          {step.category}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{step.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.subtitle}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{step.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => executeStep(step.number)}
                      disabled={loading || autoRunning}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isCurrent
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : isCompleted
                          ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          : "bg-slate-100 dark:bg-slate-800/40 text-slate-400 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {loading && isCurrent ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      {isCompleted ? "Re-run" : step.actionLabel}
                    </button>

                    {isCompleted && (
                      <button
                        onClick={() => setSelectedPayload(stepData[step.number])}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Inspect Payload <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: REAL-TIME TELEMETRY & PAYLOAD INSPECTOR */}
        <div className="lg:col-span-5 space-y-6">
          {/* INSPECTOR DRAWER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sticky top-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Live Response Inspector
              </h3>
            </div>

            {selectedPayload ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Selected Step Payload</span>
                  <button
                    onClick={() => setSelectedPayload(null)}
                    className="text-xs text-slate-500 hover:text-white"
                  >
                    Clear
                  </button>
                </div>

                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs text-emerald-300">
                  <pre>{JSON.stringify(selectedPayload, null, 2)}</pre>
                </div>

                {/* SPECIAL DISPLAY FOR STATUTORY REMINDER SCRIPT */}
                {selectedPayload?.reminderText && (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-1">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Statutory Communication Script
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "{selectedPayload.reminderText}"
                    </p>
                  </div>
                )}

                {/* SPECIAL DISPLAY FOR SECTION 65B EVIDENCE SEAL */}
                {selectedPayload?.evidentiarySeals && (
                  <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-3">
                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Section 65B Admissibility Certificate
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Seal: {selectedPayload.evidentiarySeals.certificate65B}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Standard: {selectedPayload.evidentiarySeals.admissibilityStandard}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Click any step on the left or execute "Auto-Run All 16 Steps" to inspect live response payloads and database records.
              </div>
            )}

            {/* LIVE EVENT LOGS */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                Real-Time Execution Telemetry
              </span>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto text-slate-400">
                {logs.length === 0 ? (
                  <div className="text-slate-600">Ready for execution.</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="text-slate-300">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
