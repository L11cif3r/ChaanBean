"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Scale,
  Target,
  Compass,
  Star,
  Quote,
  Coins,
  Briefcase,
  Home,
  TrendingUp,
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BookOpen,
  FileText,
  Facebook,
  Linkedin,
  Instagram,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  HeroMinimalIllustration,
  CreditCheckMinimalIllustration,
  RiskSecurityMinimalIllustration,
  PaymentCadenceMinimalIllustration,
  LegalDocketMinimalIllustration,
} from "@/components/LandingIllustrations";
import { FooterModals, ModalType } from "@/components/FooterModals";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const milestones = [
    {
      value: "4 Years",
      label: "Years of Service",
      subtext: "Protecting Indian MSMEs & trade credit since 2022",
      icon: Clock,
      color: "text-[#FC8019]",
      bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
    },
    {
      value: "₹1,500+ Cr",
      label: "Crore Received",
      subtext: "Overdue commercial capital credited directly into client bank accounts",
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    },
    {
      value: "2,000+",
      label: "Recovered Cases",
      subtext: "Delinquent payment defaults resolved without courtroom litigation",
      icon: Award,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    },
    {
      value: "100,000+",
      label: "Company Data",
      subtext: "Active corporate, GST, and MSME entity profiles continuously audited",
      icon: ShieldCheck,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    },
  ];

  const loanProducts = [
    {
      title: "Business & Working Capital Loan",
      badge: "Fast MSME Disbursal",
      amount: "Up to ₹50 Lakhs",
      rate: "From 12.60% p.a.",
      description:
        "Collateral-free working capital loan for manufacturers, traders, and service providers. Fuel inventory purchase, machinery expansion, and raw materials.",
      highlights: ["100% paperless approval", "Disbursal within 24-48 hours", "Flexible tenure 1 to 5 years"],
      icon: Briefcase,
    },
    {
      title: "Invoice & Trade Financing",
      badge: "Instant Liquidity",
      amount: "Up to 90% Invoice Value",
      rate: "Competitive Trade Rates",
      description:
        "Don't wait 45 to 90 days for buyers to pay your bills. Get an immediate cash advance against your verified trade invoices and keep cash flow uninterrupted.",
      highlights: ["Cash advance against unpaid bills", "Zero impact on balance sheet", "Repaid when buyer settles"],
      icon: TrendingUp,
    },
    {
      title: "Gold Loan for Enterprise",
      badge: "Zero Income Proof",
      amount: "Up to ₹1.5 Crore",
      rate: "From 9.50% p.a. (0.79%/mo)",
      description:
        "Unlock immediate business capital against gold jewellery with highest per-gram valuation and bank-grade secure vault storage.",
      highlights: ["Same-day bank disbursal", "No ITR or balance sheet needed", "Free insured vault protection"],
      icon: Coins,
    },
    {
      title: "Commercial & Property Loan",
      badge: "Lowest Interest Rate",
      amount: "Up to ₹5 Crore",
      rate: "From 8.35% p.a.",
      description:
        "Finance factory purchase, commercial office space, or transfer your existing high-cost business loan at significantly lower EMIs.",
      highlights: ["Tenure up to 30 years", "Low processing fees", "Balance transfer savings"],
      icon: Home,
    },
  ];

  const testimonials = [
    {
      quote:
        "A garment distributor in Delhi owed our textile mill ₹42.8 Lakhs for over 14 months and stopped answering our calls. After enrolling on ChaanBean, their automated multilingual voice follow-ups and MSMED §18 notice docket brought the buyer to the table. The full principal plus interest was credited within 35 days without stepping into court.",
      name: "Kishore Mehra",
      role: "Managing Partner",
      company: "Shree Balaji Fabrics & Textiles",
      location: "Surat, Gujarat",
      recoveredAmount: "₹42.8 Lakhs Recovered",
      timeline: "Settled in 35 Days",
      rating: 5,
    },
    {
      quote:
        "In the auto component industry, delayed payments kill cash flow. When two tier-2 vendors delayed payments citing liquidity, ChaanBean automatically computed the 3x compound penal interest and generated ready-to-file legal evidence packs. The buyers quickly settled ₹64.5 Lakhs to avoid legal blacklisting under MSMED Act.",
      name: "Sunil Kulkarni",
      role: "Founder & Managing Director",
      company: "Apex Precision Tooling & Dies",
      location: "Pune, Maharashtra",
      recoveredAmount: "₹64.5 Lakhs Recovered",
      timeline: "3 Delinquent Accounts Cleared",
      rating: 5,
    },
    {
      quote:
        "We were about to dispatch two truckloads of agricultural chemicals on 60-day credit to a new buyer. ChaanBean's AI Credit Check revealed three active cheque-bounce cases and court disputes against the directors. We immediately insisted on 100% advance payment, saving our business from an ₹85 Lakh catastrophic default.",
      name: "Dinesh Patidar",
      role: "Director",
      company: "Rameshwar Agro & Chemicals",
      location: "Indore, Madhya Pradesh",
      recoveredAmount: "₹85 Lakhs Loss Prevented",
      timeline: "Instant 1-Click Verification",
      rating: 5,
    },
    {
      quote:
        "The automated WhatsApp reminders and polite voice calls remove all personal awkwardness between old business friends. Our buyers receive clear invoice summaries with payment links and 45-day statutory deadline alerts. Over 90% of our invoices are now cleared on time.",
      name: "Venkatesh Rao",
      role: "Chief Financial Officer",
      company: "Kalyani Polychem Industries",
      location: "Hyderabad, Telangana",
      recoveredAmount: "₹27.3 Lakhs Recovered",
      timeline: "Average Collection Down to 21 Days",
      rating: 5,
    },
  ];
  const pillars = [
    {
      id: "ai-credit-check",
      title: "AI Credit Check",
      tagline: "Verify Any Buyer Before Giving Credit",
      description:
        "Check if a new or existing buyer is genuine before supplying goods on credit. In seconds, verify their official company registration, GST filing record, and whether they have any court disputes or police cases.",
      badge: "Buyer Verification",
      benefit: "Instant 1-Click Check",
      highlights: [
        "Verify real company & director details",
        "Check active GST and on-time tax returns",
        "Search court cases and dispute history",
        "Confirm authentic address and registration",
      ],
    },
    {
      id: "business-security",
      title: "AI Business Security",
      tagline: "Know How Much Credit is Safe to Give",
      description:
        "Never get stuck with heavy unpaid bills. Get a simple Green, Yellow, or Red safety rating and a recommended credit limit so you know exactly how much credit is safe for each party.",
      badge: "Credit Guidance",
      benefit: "Safe Credit Limit",
      highlights: [
        "Simple Green, Yellow, or Red risk signal",
        "Recommended safe credit amount for each buyer",
        "Early warning if a party delays payments elsewhere",
        "Protects your working capital from bad debts",
      ],
    },
    {
      id: "payment-automation",
      title: "Payment Automation",
      tagline: "Polite, Automatic Payment Follow-ups",
      description:
        "Stop running after buyers for payments. The system sends polite reminder phone calls in Hindi and regional languages, WhatsApp messages with quick pay links, and formal 45-day payment reminders.",
      badge: "Payment Assistant",
      benefit: "Calls & WhatsApp",
      highlights: [
        "Automated polite reminder calls in local languages",
        "Instant WhatsApp payment links sent to buyers",
        "Official 45-day MSME payment due reminders",
        "Records payment dates and agreements automatically",
      ],
    },
    {
      id: "legal-infrastructure",
      title: "Legal Infrastructure",
      tagline: "Recover Stuck Money Under MSME Law",
      description:
        "If a buyer delays or refuses payment, take quick legal action. Easily calculate 3x compound interest under MSME rules, generate legal notice papers, and settle disputes through fast arbitration.",
      badge: "Legal Protection",
      benefit: "MSME Law Backed",
      highlights: [
        "Calculate compound interest legally owed to you",
        "Generate ready-to-sign legal demand notices",
        "Collect digital proof of bills, delivery, and chats",
        "Fast-track resolution through certified arbitrators",
      ],
    },
  ];

  const faqs = [
    {
      question: "What is the MSME 45-day payment rule under Indian law?",
      answer:
        "Under Section 15 of the MSMED Act 2006 and Income Tax Section 43B(h), buyers must clear dues to MSME suppliers within the agreed credit period or within a statutory maximum of 45 days. If a buyer fails to pay within 45 days, they are legally liable to pay compound interest with monthly rests at three times the RBI Bank Rate, and the buyer cannot claim the unpaid invoice as a business tax deduction.",
    },
    {
      question: "How does ChaanBean verify whether a buyer is safe before I give credit?",
      answer:
        "ChaanBean audits multiple public and judicial registries in seconds: MCA21 corporate filings, GST return regularity, court litigations and cheque bounce dockets, and national commercial credit records. The platform synthesizes these into a simple Green, Amber, or Red safety badge along with an exact safe rupee credit limit recommendation.",
    },
    {
      question: "Will automated reminders damage my personal relationship with buyers?",
      answer:
        "No. ChaanBean's automated calls and WhatsApp reminders are crafted with courteous, professional language in Hindi, English, and regional Indian languages. They frame payment follow-ups around mutual statutory accounting and Section 43B(h) compliance, preserving healthy commercial relationships while ensuring timely receivables.",
    },
    {
      question: "How does the legal arbitration process work if a buyer refuses to pay?",
      answer:
        "When an invoice becomes persistently overdue, ChaanBean automatically builds an admissible digital evidence docket with your e-invoices, e-way bills, proof of delivery, and communication history. You can then issue statutory legal notices and submit claims to institutional MSMED Section 18 fast-track arbitration councils without spending months or heavy fees in traditional civil courts.",
    },
    {
      question: "How can I apply for the Business Loans and Invoice Financing on ChaanBean?",
      answer:
        "Registered ChaanBean clients can apply directly from their portal. Because your counterparty verifications and sales ledgers are already validated on our platform, our partner banks and NBFCs can disburse working capital and invoice advances within 24 to 48 hours with minimal documentation.",
    },
    {
      question: "Is my business, buyer, and ledger data secure and confidential?",
      answer:
        "Yes, absolutely. All client records are secured with bank-grade AES-256 encryption at rest and TLS 1.3 in transit, hosted on ISO 27001-certified Indian cloud infrastructure. We strictly abide by the Digital Personal Data Protection (DPDP) Act 2023 and never share or monetize your private ledger data.",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Micro-dot Watermark Security Matrix */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#FC8019_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.035] dark:opacity-[0.06] z-0" />

      {/* Ambient Crimson / Orange Halo Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full blur-[160px] opacity-15 dark:opacity-25 z-0"
        style={{ background: "radial-gradient(circle, #FC8019 0%, rgba(252, 128, 25,0) 70%)" }}
      />

      {/* GLOBAL HERO WATERMARKS */}
      {/* 1. Large Top-Right Floating Watermark Logo */}
      <div className="pointer-events-none absolute -top-16 -right-20 sm:-right-8 lg:right-6 w-[340px] sm:w-[500px] lg:w-[620px] h-[340px] sm:h-[500px] lg:h-[620px] select-none opacity-[0.045] dark:opacity-[0.07] rotate-12 z-0">
        <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
      </div>

      {/* 2. Top-Left Floating Watermark Logo */}
      <div className="pointer-events-none absolute top-28 -left-28 sm:-left-12 lg:left-4 w-[260px] sm:w-[380px] lg:w-[460px] h-[260px] sm:h-[380px] lg:h-[460px] select-none opacity-[0.035] dark:opacity-[0.055] -rotate-12 z-0">
        <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
      </div>

      {/* 3. Hero Center Background Watermark */}
      <div className="pointer-events-none absolute top-72 left-1/2 -translate-x-1/2 w-[380px] sm:w-[580px] h-[380px] sm:h-[580px] select-none opacity-[0.025] dark:opacity-[0.04] rotate-3 z-0">
        <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
      </div>

      {/* 4. Diagonal Faint Typographic Watermark Ribbon */}
      <div className="pointer-events-none absolute top-20 left-0 right-0 overflow-hidden select-none opacity-[0.025] dark:opacity-[0.04] z-0 -rotate-2">
        <div className="flex whitespace-nowrap text-xs font-mono tracking-[0.35em] uppercase font-black text-[#FC8019] py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="mx-8">
              CHAANBEAN · CREDIT &amp; RECOVERY OS · STATUTORY INTELLIGENCE ·
            </span>
          ))}
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-3 group">
            <div className="relative h-9 w-12 shrink-0 group-hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" priority />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight">
                Chaan<span className="text-[#FC8019]">Bean</span>
              </span>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Credit &amp; Recovery OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Menu Bar */}
          <nav className="hidden xl:flex items-center gap-6 text-sm font-bold text-slate-700 dark:text-slate-200">
            <a href="#services" className="hover:text-[#FC8019] transition-colors">
              Services
            </a>
            <a href="#milestones" className="hover:text-[#FC8019] transition-colors">
              Track Record
            </a>
            <a href="#loans" className="hover:text-[#FC8019] transition-colors">
              Loans
            </a>
            <a href="#testimonials" className="hover:text-[#FC8019] transition-colors">
              Testimonials
            </a>
            <a href="#about" className="hover:text-[#FC8019] transition-colors">
              About Us
            </a>
            <a href="#faqs" className="hover:text-[#FC8019] transition-colors">
              FAQs
            </a>
            <a href="#contact" className="hover:text-[#FC8019] transition-colors">
              Contact Us
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FC8019] hover:text-[#FC8019] dark:hover:border-[#FC8019] dark:hover:text-[#FC8019] transition shadow-sm"
            >
              Already a Customer? Log In
            </Link>
            <Link
              href="/subscription"
              className="flex items-center gap-1.5 rounded-xl bg-[#FC8019] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
            >
              <span>Explore Plans</span>
              <ArrowRight size={14} />
            </Link>
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17] px-6 py-4 space-y-3">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Services
            </a>
            <a
              href="#milestones"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Track Record & Proof
            </a>
            <a
              href="#loans"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Business & Working Capital Loans
            </a>
            <a
              href="#testimonials"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Client Testimonials
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              About Us
            </a>
            <a
              href="#faqs"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              FAQs
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
            >
              Contact Us
            </a>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#FC8019]"
              >
                Customer Log In →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 text-center lg:pt-24 lg:pb-28 z-10">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Announcement Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FC8019]/30 bg-[#FC8019]/10 px-4 py-1.5 text-xs font-semibold text-[#FC8019] shadow-sm">
            <Zap size={13} />
            <span>Next-Generation B2B Credit Risk & Recovery Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white">
            Smarter Credit Assessment.
            <br />
            <span className="bg-gradient-to-r from-[#FC8019] to-orange-400 bg-clip-text text-transparent">
              Automated Payment Recovery.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            ChaanBean is the unified operating system for Indian commercial trade credit.
            Verify counterparty credibility in seconds, underwrite risk with deterministic intelligence,
            automate debt collections, and enforce statutory arbitration under MSMED Act §18.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/subscription"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[#FC8019] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-[#FC8019]/25 hover:bg-[#E26D0A] hover:scale-[1.02] transition"
            >
              <span>Get Started & Choose Plan</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/login"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-4 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm transition"
            >
              <Lock size={15} className="text-[#FC8019]" />
              <span>Already a Customer? Log In</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>MSME Payment Protection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>45-Day Payment Rule Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>Official Government Records</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>100% Safe & Confidential</span>
            </div>
          </div>

          {/* Minimalist Visual Illustration */}
          <div className="pt-6 sm:pt-10">
            <HeroMinimalIllustration />
          </div>
        </div>
      </section>

      {/* Proof & Milestones Section */}
      <section id="milestones" className="relative overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17]/90 px-6 py-16 scroll-mt-16 z-10">
        <div className="relative mx-auto max-w-7xl z-10">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
              <BadgeCheck size={14} />
              <span>Proven Track Record &amp; Capabilities</span>
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Real Numbers. Verified Recoveries.
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Over the last 4 years, ChaanBean has delivered decisive recovery outcomes and credit intelligence for Indian businesses.
            </p>
          </div>

          {/* 4 Big Milestone Stat Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {milestones.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div
                  key={idx}
                  className={`relative rounded-3xl border-2 ${m.bg} p-6 sm:p-7 shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm ${m.color}`}>
                        <Icon size={24} />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Milestone 0{idx + 1}
                      </span>
                    </div>
                    <div>
                      <div className={`text-3xl sm:text-4xl font-black tracking-tight ${m.color}`}>
                        {m.value}
                      </div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                        {m.label}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                      {m.subtext}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Verified Platform Metric</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section id="services" className="relative overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 px-6 py-20 scroll-mt-16">
        {/* Pillars Background Watermarks */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] select-none opacity-[0.035] dark:opacity-[0.06] -rotate-12 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        <div className="pointer-events-none absolute top-1/2 -right-24 w-[420px] sm:w-[540px] h-[420px] sm:h-[540px] select-none opacity-[0.035] dark:opacity-[0.06] rotate-12 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        <div className="pointer-events-none absolute -bottom-20 left-1/4 w-[340px] h-[340px] select-none opacity-[0.025] dark:opacity-[0.045] -rotate-6 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>

        {/* Pillars Watermark Ribbon */}
        <div className="pointer-events-none absolute top-4 left-0 right-0 overflow-hidden select-none opacity-[0.02] dark:opacity-[0.035] z-0">
          <div className="flex whitespace-nowrap text-[11px] font-mono tracking-[0.3em] uppercase font-bold text-[#FC8019]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="mx-8">
                CHAANBEAN · CREDIT CHECK · BUSINESS SECURITY · PAYMENT RECOVERY · LEGAL RESOLUTION ·
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl z-10">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              How ChaanBean Protects Your Business
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Four Easy Steps to Protect Your Money
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Everything an MSME business needs to check buyers, give credit safely, and recover payments on time without hassle.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, idx) => (
              <div
                key={pillar.id}
                className="relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-md hover:shadow-xl hover:border-[#FC8019] transition-all duration-300 group"
              >
                <div className="space-y-4">
                  {/* Top Header: Step Indicator & Category Tag (No top-left icon) */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-orange-100 text-[#FC8019] dark:bg-orange-950/60 dark:text-orange-400 border border-orange-300/60 dark:border-orange-800">
                      Step 0{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      {pillar.badge}
                    </span>
                  </div>

                  {/* Minimal Illustration Accent */}
                  <div className="py-2.5 px-3 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                    {pillar.id === "ai-credit-check" && <CreditCheckMinimalIllustration />}
                    {pillar.id === "business-security" && <RiskSecurityMinimalIllustration />}
                    {pillar.id === "payment-automation" && <PaymentCadenceMinimalIllustration />}
                    {pillar.id === "legal-infrastructure" && <LegalDocketMinimalIllustration />}
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-[#FC8019] transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-sm font-bold text-[#FC8019] mt-1">
                      {pillar.tagline}
                    </p>
                  </div>

                  {/* Description - High visibility & clear font */}
                  <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                    {pillar.description}
                  </p>

                  {/* Bullet Highlights */}
                  <ul className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    {pillar.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Reassurance Benefit */}
                <div className="pt-4 mt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-slate-500 dark:text-slate-400">{pillar.badge}</span>
                  <span className="text-[#FC8019] dark:text-orange-400">{pillar.benefit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MSME Loans & Credit Section */}
      <section id="loans" className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17]/80 scroll-mt-16">
        <div className="relative mx-auto max-w-7xl z-10 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
              <Briefcase size={14} />
              <span>MSME Financial Solutions</span>
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Working Capital &amp; Business Loans
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Never let delayed buyer payments stop your factory production or supply chain. Access collateral-free working capital, trade invoice discounting, and asset-backed credit with same-day approvals.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {loanProducts.map((loan, idx) => {
              const Icon = loan.icon;
              return (
                <div
                  key={idx}
                  className="relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 sm:p-7 shadow-md hover:shadow-xl hover:border-[#FC8019] transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019]">
                        <Icon size={22} />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {loan.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#FC8019] transition-colors">
                        {loan.title}
                      </h3>
                      <div className="text-xl font-black text-[#FC8019] mt-1">
                        {loan.amount}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {loan.rate}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                      {loan.description}
                    </p>

                    <ul className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      {loan.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
                    <Link
                      href="/loans"
                      className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-[#FC8019] hover:text-[#FC8019] transition shadow-sm"
                    >
                      <span>Check Eligibility &amp; Apply</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border-2 border-[#FC8019]/30 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/80 dark:from-orange-950/20 dark:via-slate-900 dark:to-orange-950/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">Need an Instant Working Capital or Machinery Loan?</h4>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Use our interactive EMI calculator, compare rates, and submit an application with zero physical paperwork.
              </p>
            </div>
            <Link
              href="/loans"
              className="shrink-0 flex items-center gap-2 rounded-2xl bg-[#FC8019] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
            >
              <span>Explore Loan Portal &amp; Calculator</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 scroll-mt-16">
        <div className="relative mx-auto max-w-7xl z-10 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
              <Star size={14} className="fill-[#FC8019]" />
              <span>Verified Client Recoveries</span>
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Trusted by 2,000+ Indian Businesses
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Read how MSME manufacturers, traders, and suppliers recovered crores in long-overdue receivables without courtroom friction.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid gap-8 md:grid-cols-2">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="relative flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-md hover:shadow-xl hover:border-[#FC8019]/60 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Top Quote Icon & Recovery Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 size={12} />
                      <span>{t.recoveredAmount}</span>
                    </span>
                  </div>

                  {/* Quote Text */}
                  <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                {/* Author & Verification Card */}
                <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-black text-sm border border-orange-300/60 dark:border-orange-800">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {t.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.role}, <span className="font-semibold text-slate-700 dark:text-slate-300">{t.company}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {t.location}
                      </p>
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="inline-block text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {t.timeline}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof Trust Bar */}
          <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-bold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>4.9 / 5.0 Star Verified Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>₹1,500+ Cr Successfully Recovered</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>100% MSMED Act §18 Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17]/60 scroll-mt-16">
        <div className="relative mx-auto max-w-5xl z-10">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              About ChaanBean
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Protecting India&apos;s MSMEs from Trade Credit Defaults
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Every month, thousands of manufacturers, suppliers, and distributors across India face severe working capital loss due to delayed payments and untraceable buyers. ChaanBean was created to give MSME business owners the same institutional-grade credit intelligence and recovery infrastructure used by large commercial banks.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">100% Statutory Verification</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Direct government records from MCA, GST, e-Courts, and Udyam to ensure you only deal with authentic, verified businesses.
              </p>
            </div>

            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                <Clock size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">45-Day Payment Discipline</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Automated reminders and statutory notices under MSMED Act §15-18 ensure payments arrive on time without awkward personal friction.
              </p>
            </div>

            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                <Scale size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lawful Dispute Resolution</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                If a counterparty refuses to pay, get automatic compound interest calculation at 3x RBI bank rate and legal arbitration backing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40">
        <div className="relative mx-auto max-w-5xl z-10 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              Purpose &amp; Direction
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Our Mission &amp; Vision
            </h2>
            <p className="text-base text-slate-700 dark:text-slate-300 font-medium">
              Committed to creating a secure, transparent commercial credit ecosystem for India.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Mission Card */}
            <div id="mission" className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-4 shadow-md scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                  <Target size={24} />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">Our Mission</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Zero Bad Debts for Every MSME</h3>
                </div>
              </div>
              <p className="text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                To eliminate trade credit defaults across Indian commercial supply chains. We give every small and medium business owner the intelligence to assess buyers upfront, the tools to recover money politely, and the legal power to enforce statutory rights without expensive lawyer fees.
              </p>
              <ul className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Protect business working capital and avoid liquidity crunches</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Provide bank-grade risk assessment to small enterprises</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Restore certainty and trust in B2B credit commerce</span>
                </li>
              </ul>
            </div>

            {/* Vision Card */}
            <div id="vision" className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-4 shadow-md scroll-mt-24">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center font-bold">
                  <Compass size={24} />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">Our Vision</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">A Reliable &amp; Disciplined Trade Economy</h3>
                </div>
              </div>
              <p className="text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                To build India&apos;s most trusted trade network where payment discipline is the national norm, 45-day MSME statutory deadlines are universally respected, and honest entrepreneurs can expand their businesses with complete peace of mind.
              </p>
              <ul className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>100% adherence to statutory 45-day payment rules</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Make deliberate payment defaults practically impossible</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Empower India&apos;s 63M+ MSMEs to scale without fear of unpaid bills</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17]/60 scroll-mt-16">
        <div className="relative mx-auto max-w-5xl z-10 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              Get In Touch
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Contact Us
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Have questions about verifying a buyer or recovering unpaid dues? Our team is here to assist you.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Contact Details Card */}
            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-8 space-y-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Reach Our Helpline</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                Connect directly with our credit verification and recovery advisory team. We assist businesses across all Indian states.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Phone &amp; WhatsApp</span>
                    <a href="tel:+919820012345" className="text-base font-bold text-slate-900 dark:text-white hover:text-[#FC8019] transition">
                      +91 (022) 4893 2100 / +91 98200 12345
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Email Support</span>
                    <a href="mailto:support@chaanbean.in" className="text-base font-bold text-slate-900 dark:text-white hover:text-[#FC8019] transition">
                      support@chaanbean.in
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Registered Corporate Desk</span>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      ChaanBean Credit OS · Nariman Point &amp; Connaught Place, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Operating Hours</span>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Monday to Saturday · 9:30 AM – 6:30 PM IST
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-md">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Send Us a Direct Message</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-6">
                Fill in your details and an advisor will contact you within 2 business hours.
              </p>

              {contactSent ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-2">
                  <div className="inline-flex h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">Message Received!</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Thank you. Our recovery and verification team will reach out to you shortly.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSent(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Your Name / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar (Agro Traders)"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98XXX XXXXX"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="you@company.in"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      How Can We Help You?
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Need help running credit checks on buyers or recovering overdue receivables..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FC8019] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#FC8019] py-3 text-sm font-bold text-white shadow-md shadow-[#FC8019]/25 hover:bg-[#E26D0A] transition"
                  >
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B0F17]/70 scroll-mt-16">
        <div className="relative mx-auto max-w-4xl z-10 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-[#FC8019] border border-orange-200 dark:border-orange-800">
              <HelpCircle size={14} />
              <span>Answers &amp; Clarity</span>
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Everything you need to know about checking buyer risk, MSMED statutory rights, and automated debt recovery.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden shadow-sm hover:border-[#FC8019]"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-base sm:text-lg text-slate-900 dark:text-white hover:text-[#FC8019] transition"
                  >
                    <span>{faq.question}</span>
                    <span className="ml-4 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Card */}
      <section className="relative overflow-hidden px-6 py-16 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-b from-transparent to-orange-50/50 dark:to-orange-950/10">
        {/* Section Watermark Logos */}
        <div className="pointer-events-none absolute -top-24 -left-16 w-[450px] h-[450px] select-none opacity-[0.035] dark:opacity-[0.06] -rotate-12 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        <div className="pointer-events-none absolute -bottom-28 -right-16 w-[520px] h-[520px] select-none opacity-[0.045] dark:opacity-[0.07] rotate-15 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>

        <div className="relative mx-auto max-w-4xl rounded-3xl border border-[#FC8019]/30 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-xl shadow-[#FC8019]/5 overflow-hidden z-10">
          {/* Card Inner Watermark Emblems */}
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 sm:w-80 h-64 sm:h-80 select-none opacity-[0.045] dark:opacity-[0.07] rotate-12 z-0">
            <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
          </div>
          <div className="pointer-events-none absolute -top-12 -left-12 w-48 sm:w-60 h-48 sm:h-60 select-none opacity-[0.03] dark:opacity-[0.05] -rotate-12 z-0">
            <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
          </div>

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Ready to Protect Your Working Capital?
            </h2>
            <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-300 mt-3 mb-8">
              Choose your enterprise subscription plan to access full counterparty checks, automated voice recovery cadences, and statutory legal arbitration.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/subscription"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[#FC8019] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FC8019]/20 hover:bg-[#E26D0A] transition"
              >
                <span>Explore Subscription Plans</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 transition"
              >
                <span>Already a Customer? Log In</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Rich Footer */}
      <footer className="border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070A0F] text-slate-600 dark:text-slate-400 pt-16 pb-12 px-6">
        <div className="mx-auto max-w-7xl space-y-12">
          {/* 5-Column Grid */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Col 1: Company Info */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <Link href="/landing" className="flex items-center gap-2.5">
                <div className="relative h-8 w-10 shrink-0">
                  <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" />
                </div>
                <div>
                  <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Chaan<span className="text-[#FC8019]">Bean</span>
                  </span>
                  <span className="block text-[8px] font-mono uppercase tracking-widest text-slate-400">
                    Credit &amp; Recovery OS
                  </span>
                </div>
              </Link>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Autonomous trade credit underwriting, debtor verification, automated communication cadences, and statutory arbitration under MSMED Act §18.
              </p>
              <div className="pt-1 text-xs space-y-1 text-slate-500 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Registered Corporate Desk:</p>
                <p>Nariman Point &amp; Connaught Place, India</p>
                <p>CIN: U72900MH2022PTC384129</p>
              </div>
            </div>

            {/* Col 2: Services Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Services
              </h4>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    AI Credit Check
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    AI Business Security
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    Payment Automation
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    Legal Infrastructure
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    Skip-Tracing Intelligence
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    Arbitration Dockets
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Solutions Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Solutions
              </h4>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For Manufacturers &amp; Mills
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For Wholesalers &amp; Distributors
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For B2B Traders &amp; Exporters
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#FC8019] transition">
                    For MSME Vendors &amp; Suppliers
                  </a>
                </li>
                <li>
                  <a href="#loans" className="hover:text-[#FC8019] transition">
                    Working Capital Loans
                  </a>
                </li>
                <li>
                  <a href="#loans" className="hover:text-[#FC8019] transition">
                    Invoice Discounting &amp; Factoring
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Other Pages Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Other Pages &amp; Legal
              </h4>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <button
                    onClick={() => setActiveModal("terms")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    Terms and Conditions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("privacy")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("manuals")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    User Manuals &amp; Guides
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal("blogs")}
                    className="hover:text-[#FC8019] transition text-left"
                  >
                    Our Blogs &amp; Case Studies
                  </button>
                </li>
                <li>
                  <a href="#faqs" className="hover:text-[#FC8019] transition">
                    Frequently Asked Questions (FAQs)
                  </a>
                </li>
                <li>
                  <Link href="/subscription" className="hover:text-[#FC8019] transition">
                    Enterprise Subscription Plans
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Contact Us & Social Media */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Contact Us &amp; Community
              </h4>
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-2">
                  <Phone size={13} className="text-[#FC8019] shrink-0" />
                  <a href="tel:+919820012345" className="hover:text-[#FC8019] transition font-semibold">
                    +91 98200 12345
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={13} className="text-[#FC8019] shrink-0" />
                  <a href="mailto:support@chaanbean.in" className="hover:text-[#FC8019] transition font-semibold">
                    support@chaanbean.in
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={13} className="text-[#FC8019] shrink-0" />
                  <span>Mon – Sat: 9:30 AM – 6:30 PM</span>
                </p>
              </div>

              {/* Social Media Options: Facebook, LinkedIn, X, Instagram */}
              <div className="pt-2">
                <span className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Follow Us
                </span>
                <div className="flex items-center gap-2.5">
                  <a
                    href="https://facebook.com/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1877F2] hover:border-[#1877F2] transition"
                  >
                    <Facebook size={15} />
                  </a>
                  <a
                    href="https://linkedin.com/company/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#0A66C2] hover:border-[#0A66C2] transition"
                  >
                    <Linkedin size={15} />
                  </a>
                  <a
                    href="https://x.com/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="X (formerly Twitter)"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://instagram.com/chaanbean"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="h-8 w-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#E4405F] hover:border-[#E4405F] transition"
                  >
                    <Instagram size={15} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Compliance */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <p>© 2026 ChaanBean Technologies Pvt Ltd. All rights reserved.</p>
            <p className="text-center text-[11px] text-slate-400">
              Statutory Compliance: MSMED Act 2006 · Section 43B(h) · RBI Fair Practices Code · DPDP Act 2023
            </p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/login" className="hover:text-[#FC8019] transition">
                Client Portal
              </Link>
              <span>·</span>
              <Link href="/subscription" className="hover:text-[#FC8019] transition">
                Plans
              </Link>
              <span>·</span>
              <a href="#services" className="hover:text-[#FC8019] transition">
                Back to Top ↑
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Footer Interactive Modal Dialogs */}
      <FooterModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
