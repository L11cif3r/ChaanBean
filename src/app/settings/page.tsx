"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  User,
  Building2,
  Users,
  CreditCard,
  KeyRound,
  HelpCircle,
  Headphones,
  MessageSquarePlus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Star,
  Send,
  Zap,
  Cpu,
  Activity,
  PlusCircle,
  Check,
} from "lucide-react";

export type SettingsTabId =
  | "profile"
  | "company"
  | "department"
  | "billing"
  | "password"
  | "faqs"
  | "support"
  | "feedback";

interface TabDef {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const SETTINGS_TABS: TabDef[] = [
  { id: "profile", label: "Your Profile", icon: User, description: "Personal credentials, name, email & communication preferences" },
  { id: "company", label: "Your Company Profile", icon: Building2, description: "Statutory trade details, GSTIN, CIN, PAN & MSME Udyam" },
  { id: "department", label: "Department", icon: Users, description: "Organizational roles, team seat allocation & member governance" },
  { id: "billing", label: "Billing", icon: CreditCard, description: "Subscription plan, wallet balance, consumption ledger & invoices" },
  { id: "password", label: "Change Password", icon: KeyRound, description: "Security credentials, 2-factor authentication & active sessions" },
  { id: "faqs", label: "FAQs", icon: HelpCircle, description: "Statutory compliance, voice cadence & platform knowledgebase" },
  { id: "support", label: "Support", icon: Headphones, description: "24/7 Priority regulatory & technical resolution desk" },
  { id: "feedback", label: "Feedback", icon: MessageSquarePlus, description: "Share your experience, feature requests & product feedback" },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTabId) || "profile";
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as SettingsTabId;
    if (tabFromUrl && SETTINGS_TABS.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Toast / notification state
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // 1. Profile State
  const [profileName, setProfileName] = useState("Rajesh Nair");
  const [profileEmail, setProfileEmail] = useState("owner@chaanbean.in");
  const [profilePhone, setProfilePhone] = useState("+91 98765 43210");
  const [profileDesignation, setProfileDesignation] = useState("Chief Financial Officer (CFO)");
  const [profileDepartment, setProfileDepartment] = useState("Finance & Accounts");

  // 2. Company Profile State
  const [companyName, setCompanyName] = useState("Acme Traders Pvt Ltd");
  const [cinNumber, setCinNumber] = useState("U72900MH2020PTC123456");
  const [gstin, setGstin] = useState("27AAECG1234H1Z5");
  const [pan, setPan] = useState("AAECG1234H");
  const [udyam, setUdyam] = useState("UDYAM-MH-12-0012345");
  const [address, setAddress] = useState("402, Trade Square, Bandra Kurla Complex, Mumbai, Maharashtra - 400051");
  const [primaryBank, setPrimaryBank] = useState("HDFC Bank Ltd · A/C 50200012345678 (IFSC: HDFC0000123)");

  // 3. Department & Seats State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Credit Analyst");
  const [teamMembers, setTeamMembers] = useState([
    { name: "Rajesh Nair", email: "owner@chaanbean.in", role: "Account Owner (Admin)", department: "Finance & Accounts", status: "Active" },
    { name: "Priya Sharma", email: "priya.s@chaanbean.in", role: "Credit Analyst", department: "Risk Underwriting", status: "Active" },
    { name: "Amit Patel", email: "rep@chaanbean.in", role: "Recovery Operations Agent", department: "Collections", status: "Active" },
  ]);

  // 4. Billing State
  const [walletBalance, setWalletBalance] = useState(100000);
  const [planName, setPlanName] = useState("Retail Plan (Growth)");
  const [daysRemaining, setDaysRemaining] = useState(90);

  useEffect(() => {
    fetch("/api/wallet")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.walletBalance === "number") setWalletBalance(data.walletBalance);
        if (typeof data.daysRemaining === "number") setDaysRemaining(data.daysRemaining);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.plan) {
          if (data.plan.startsWith("alacarte")) {
            setPlanName("À La Carte (Call Service)");
          } else if (data.plan === "enterprise") {
            setPlanName("Enterprise Plan");
          } else {
            setPlanName("Retail Plan (Growth)");
          }
        }
      })
      .catch(() => {});
  }, []);

  // 5. Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorActive, setTwoFactorActive] = useState(true);

  // 6. FAQs State
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does Section 15 of the MSMED Act enforce the mandatory 45-day payment rule?",
      a: "Under Section 15 of the MSMED Act 2006, the buyer is statutorily required to make payment on or before the agreed date, which cannot exceed 45 days from delivery. If the buyer defaults, Section 16 mandates monthly compound interest at 3x the RBI bank rate.",
    },
    {
      q: "What is the Section 43B(h) Income Tax disallowance for delayed MSME payments?",
      a: "Section 43B(h) of the Income Tax Act disallows tax deductions for business expenses or purchases made from registered MSMEs (Micro/Small) if payment is not cleared within 45 days. The entire unpaid sum is added back to taxable income, triggering severe corporate tax liabilities.",
    },
    {
      q: "How do GST DRC-01A and Section 16(4) notifications apply recovery leverage?",
      a: "If a debtor has claimed Input Tax Credit (ITC) on your invoice but fails to pay you within 180 days under Section 16(2) proviso, they are statutorily required to reverse the ITC with 18% penal interest. Serving a DRC-01A warning flags their delinquency on the GSTN registry.",
    },
    {
      q: "How does the Asterisk Voice AI call cadence work in Payment Automation?",
      a: "The automated telephony engine dials the debtor's verified phone number on escalating cadences (every 1m, 2m, 5m, 30m, 1h) with multilingual voice AI (English, Hindi, Malayalam, Tamil, Tulu). It records Promise-to-Pay (PTP) commitments and logs audio transcripts admissible under Section 63 BSA.",
    },
    {
      q: "Why is recovery calling ₹1 only when the debtor picks up the call?",
      a: "ChaanBean enforces transparent, performance-grounded pricing: unanswered, busy, or unreachable calls are 100% free of charge (₹0 deducted). Exactly ₹1 is deducted from your subscription wallet only upon active call pickup and human interaction.",
    },
    {
      q: "How does the 30-day cache-first architecture prevent duplicate credit deductions?",
      a: "When you pull a statutory report (GST turnover, e-Courts, MSME Udyam, MCA DIN), the verified report is cached with a cryptographic hash. Re-querying the same entity within 30 days is completely free and instant, preserving your wallet balance.",
    },
    {
      q: "How do ChaanBean Loans & Invoice Discounting work?",
      a: "Because your GSTR-3B filings and debtor invoices are verified directly on ChaanBean, partner banks and NBFCs pre-approve working capital up to ₹50 Lakhs without physical collateral. Invoices can be discounted up to 85% with 4-hour disbursal.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  // 7. Support State
  const [supportSubject, setSupportSubject] = useState("");
  const [supportCategory, setSupportCategory] = useState("Statutory Legal Notice");
  const [supportMessage, setSupportMessage] = useState("");
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSuccess(true);
    setTimeout(() => {
      setTicketSuccess(false);
      setSupportSubject("");
      setSupportMessage("");
    }, 4000);
  };

  // 8. Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState("AI Credit Check");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSuccess(true);
    setTimeout(() => {
      setFeedbackSuccess(false);
      setFeedbackText("");
    }, 4000);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FC8019]/10 border border-[#FC8019]/25 flex items-center justify-center text-[#FC8019]">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Account Settings &amp; Governance Hub
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Manage your credentials, company identity, departmental seats, billing &amp; customer care
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">Active Workspace:</span>
          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {companyName}
          </span>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 size={16} />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout: Left Tabs Sidebar & Right Settings Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Tabs Pill List (Left 4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 space-y-1.5 shadow-sm">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 mb-1">
            Settings Modules (8 Options)
          </div>

          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 ${
                  isSelected
                    ? "bg-[#FC8019] text-white shadow-md shadow-orange-500/20 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{tab.label}</div>
                  <div
                    className={`text-[10px] line-clamp-1 mt-0.5 ${
                      isSelected ? "text-orange-100" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Detail View (Right 8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm min-h-[520px]">
          {/* ------------------------------------------------------------- */}
          {/* 1. YOUR PROFILE */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-[#FC8019]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Profile</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your personal identity, contact numbers, and corporate authorizations on ChaanBean.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast("Profile details saved successfully!");
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Mobile Number (+91)</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Corporate Designation</label>
                    <input
                      type="text"
                      value={profileDesignation}
                      onChange={(e) => setProfileDesignation(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Primary Department</label>
                  <select
                    value={profileDepartment}
                    onChange={(e) => setProfileDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-medium outline-none focus:border-[#FC8019]"
                  >
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="Credit & Risk Underwriting">Credit &amp; Risk Underwriting</option>
                    <option value="Legal & Dispute Docket">Legal &amp; Dispute Docket</option>
                    <option value="Collections & Telephony">Collections &amp; Telephony</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 2. YOUR COMPANY PROFILE */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "company" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-[#FC8019]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Company Profile</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Statutory corporate identifiers used to generate admissible legal notices and verify credit limits.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast("Company profile updated successfully!");
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Company Legal Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-bold outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Corporate CIN (MCA21)</label>
                    <input
                      type="text"
                      value={cinNumber}
                      onChange={(e) => setCinNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold uppercase outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1 font-sans">GSTIN (15 Digits)</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-bold uppercase outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1 font-sans">PAN Number</label>
                    <input
                      type="text"
                      value={pan}
                      onChange={(e) => setPan(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-bold uppercase outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1 font-sans">MSME Udyam Number</label>
                    <input
                      type="text"
                      value={udyam}
                      onChange={(e) => setUdyam(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-bold uppercase outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Registered Office Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Primary Settlement Bank Account</label>
                  <input
                    type="text"
                    value={primaryBank}
                    onChange={(e) => setPrimaryBank(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white font-mono outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <span>Statutory Verification Status: <strong>Fully Authenticated with MCA21 &amp; GSTN</strong></span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded font-bold">
                    Tier A1
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
                  >
                    Save Company Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 3. DEPARTMENT & TEAM SEATS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "department" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#FC8019]" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Department &amp; User Seats</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage departmental access roles (Credit Analyst, Recovery Agent, Legal Desk) and member seats.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setInviteModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
                >
                  <PlusCircle size={14} />
                  <span>Invite Department Member</span>
                </button>
              </div>

              {/* Seat Quota Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Plan Seat Quota</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    3 Seats (Retail Included)
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Occupied Seats</span>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {teamMembers.length} of 3 Active
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Enterprise Capacity</span>
                  <div className="text-lg font-black text-[#FC8019] mt-1">
                    5 Seats on Upgrade
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 font-mono uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Role / Permissions</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {teamMembers.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{m.name}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{m.email}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-orange-50 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
                            {m.role}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{m.department}</td>
                        <td className="p-3">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                            <Check size={12} /> {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invite Modal */}
              {inviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                  <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Invite Department Member
                      </h3>
                      <button
                        type="button"
                        onClick={() => setInviteModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (inviteEmail) {
                          setTeamMembers((prev) => [
                            ...prev,
                            {
                              name: inviteEmail.split("@")[0],
                              email: inviteEmail,
                              role: inviteRole,
                              department: "Risk & Recovery",
                              status: "Invited",
                            },
                          ]);
                          showToast(`Invitation dispatched to ${inviteEmail}!`);
                          setInviteEmail("");
                          setInviteModalOpen(false);
                        }
                      }}
                      className="space-y-3 text-xs"
                    >
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Colleague Email</label>
                        <input
                          type="email"
                          placeholder="analyst@yourcompany.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Access Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                        >
                          <option value="Credit Analyst">Credit Analyst</option>
                          <option value="Recovery Operations Agent">Recovery Operations Agent</option>
                          <option value="Legal & Dispute Counsel">Legal &amp; Dispute Counsel</option>
                          <option value="Auditor / Viewer">Auditor / Viewer</option>
                        </select>
                      </div>

                      <div className="pt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setInviteModalOpen(false)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FC8019] text-white hover:bg-[#e67312]"
                        >
                          Send Invitation
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 4. BILLING */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-[#FC8019]" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Billing &amp; Subscription</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage active subscription plan, wallet balance, and invoices.
                  </p>
                </div>

                <Link
                  href="/subscription"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
                >
                  <Zap size={14} />
                  <span>Upgrade or Change Plan</span>
                </Link>
              </div>

              {/* Active Plan Card */}
              <div className="rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 via-white to-amber-50 dark:from-orange-950/20 dark:via-[#111827] dark:to-amber-950/10 p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#FC8019] bg-orange-100 dark:bg-orange-900/60 px-2 py-0.5 rounded">
                    Active Subscription
                  </span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {planName}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Valid for {daysRemaining} days remaining · 14 statutory adapters + automated voice dialer
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Wallet Balance</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{walletBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Invoice Receipts */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase font-mono text-slate-400">
                  Recent Invoices &amp; Tax Receipts
                </h3>

                <div className="space-y-2">
                  {[
                    { id: "INV-2026-0901", date: "01-Sep-2026", amount: "₹9,899", desc: "Retail Plan (Growth) - 3 Months Subscription", gst: "₹1,781.82 (18% IGST)" },
                    { id: "INV-2026-0601", date: "01-Jun-2026", amount: "₹4,500", desc: "À La Carte - 3,000 Voice Recovery Calls", gst: "₹810.00 (18% IGST)" },
                  ].map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{inv.desc}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {inv.id} · {inv.date} · Incl. {inv.gst}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{inv.amount}</span>
                        <button
                          type="button"
                          onClick={() => showToast(`Downloaded invoice ${inv.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-[#FC8019] transition"
                        >
                          <Download size={12} />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 5. CHANGE PASSWORD */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "password" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-[#FC8019]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Change Password &amp; Security</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Update your authentication credentials and manage two-factor authentication safeguards.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newPassword !== confirmPassword) {
                    showToast("Error: Passwords do not match!");
                    return;
                  }
                  if (newPassword.length < 8) {
                    showToast("Error: Password must be at least 8 characters!");
                    return;
                  }
                  showToast("Password updated successfully!");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="space-y-4 max-w-md"
              >
                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                {/* 2FA Toggle */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Lock size={16} className="text-[#FC8019]" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</div>
                      <div className="text-[10px] text-slate-500">Require SMS OTP confirmation on sensitive operations</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactorActive}
                    onChange={(e) => {
                      setTwoFactorActive(e.target.checked);
                      showToast(e.target.checked ? "2FA Enabled" : "2FA Disabled");
                    }}
                    className="h-4 w-4 accent-[#FC8019] rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 6. FAQS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "faqs" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-[#FC8019]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Statutory guidelines, MSMED Act 45-day rules, recovery voice cadence &amp; billing explanations.
                </p>
              </div>

              {/* FAQ Search */}
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQs (e.g. 'MSME', '45 days', 'DRC-01A', '₹1 call')..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
              />

              {/* Accordion */}
              <div className="space-y-3">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 flex items-center justify-between text-left gap-3"
                      >
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp size={16} className="text-[#FC8019] shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400 shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 7. SUPPORT */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "support" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Headphones size={18} className="text-[#FC8019]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Customer Support Desk</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  24/7 dedicated assistance for statutory recovery cases, legal dispute filing, and API integration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">WhatsApp Helpline</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">+91 98200 12345</div>
                  <span className="text-[10px] text-emerald-500 font-mono">Instant Response</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Legal Advocate Desk</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">+91 22 6800 1234</div>
                  <span className="text-[10px] text-slate-400 font-mono">10:00 - 18:00 IST</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Support Email</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">support@chaanbean.in</div>
                  <span className="text-[10px] text-slate-400 font-mono">SLA &lt; 30 Minutes</span>
                </div>
              </div>

              {/* Submit Ticket Form */}
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Issue Category</label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    >
                      <option value="Statutory Legal Notice">Statutory Legal Notice</option>
                      <option value="Payment Recovery Telephony">Payment Recovery Telephony</option>
                      <option value="AI Credit Check Adapter">AI Credit Check Adapter</option>
                      <option value="Loans & Working Capital">Loans &amp; Working Capital</option>
                      <option value="Billing & Wallet Deduction">Billing &amp; Wallet Deduction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="Brief summary of request..."
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                      required
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Message Details</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your issue or dispute in detail..."
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                {ticketSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Support ticket created! A specialist has been assigned and will reach out shortly.</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm flex items-center gap-2"
                  >
                    <Send size={13} />
                    <span>Submit Priority Ticket</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 8. FEEDBACK */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "feedback" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus size={18} className="text-[#FC8019]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Product Feedback &amp; Suggestions</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  We are continuously evolving ChaanBean. Tell us what features you would like to see next.
                </p>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-500 font-medium">How would you rate your experience?</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className={`p-2 rounded-xl transition ${
                          feedbackRating >= star
                            ? "text-[#FC8019] bg-orange-50 dark:bg-orange-950/60"
                            : "text-slate-300 dark:text-slate-700 bg-slate-50 dark:bg-slate-800"
                        }`}
                      >
                        <Star size={20} fill={feedbackRating >= star ? "#FC8019" : "none"} />
                      </button>
                    ))}
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 ml-2">
                      {feedbackRating === 5 ? "Excellent (5/5)" : feedbackRating === 4 ? "Very Good (4/5)" : `${feedbackRating}/5`}
                    </span>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Feedback Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                  >
                    <option value="AI Credit Check">AI Credit Check</option>
                    <option value="AI Business Security">AI Business Security</option>
                    <option value="Payment Automation">Payment Automation</option>
                    <option value="Legal Infrastructure">Legal Infrastructure</option>
                    <option value="Loans & Working Capital">Loans &amp; Working Capital</option>
                    <option value="Settings & Account Experience">Settings &amp; Account Experience</option>
                  </select>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-500 font-medium mb-1">Your Detailed Feedback &amp; Ideas</label>
                  <textarea
                    rows={4}
                    placeholder="Share what works great, or feature requests you need for your business..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3.5 text-slate-900 dark:text-white outline-none focus:border-[#FC8019]"
                    required
                  />
                </div>

                {feedbackSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Thank you for your valuable feedback! Our engineering and product team reviews every submission.</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#FC8019] hover:bg-[#e67312] text-white transition shadow-sm flex items-center gap-2"
                  >
                    <Send size={13} />
                    <span>Send Product Feedback</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          Loading Settings Hub...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
