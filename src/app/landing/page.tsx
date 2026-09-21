"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
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

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#FC8019] hover:text-[#FC8019] dark:hover:border-[#FC8019] dark:hover:text-[#FC8019] transition shadow-sm"
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
          </div>
        </div>
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
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section className="relative overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 px-6 py-20">
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

      {/* Interactive Workflow Section */}
      <section className="relative overflow-hidden px-6 py-20 border-t border-slate-200 dark:border-slate-800">
        {/* Workflow Giant Center Watermark Logo */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] sm:w-[720px] h-[520px] sm:h-[720px] select-none opacity-[0.025] dark:opacity-[0.045] rotate-6 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        {/* Flank Watermarks */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-64 sm:w-80 h-64 sm:h-80 select-none opacity-[0.03] dark:opacity-[0.055] -rotate-12 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>
        <div className="pointer-events-none absolute -bottom-16 -left-12 w-72 sm:w-96 h-72 sm:h-96 select-none opacity-[0.03] dark:opacity-[0.055] rotate-15 z-0">
          <Image src="/logo.png" alt="" fill className="object-contain" priority={false} />
        </div>

        {/* Workflow Typographic Watermark Ribbon */}
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 overflow-hidden select-none opacity-[0.025] dark:opacity-[0.04] z-0 rotate-1">
          <div className="flex whitespace-nowrap text-[10px] sm:text-xs font-mono tracking-[0.3em] uppercase font-bold text-[#FC8019]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="mx-8">
                CHAANBEAN PIPELINE · UNDERWRITING · ASTERISK VOICE CADENCE · LEGAL DECREE ·
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FC8019]">
              How the Process Works
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              From Verification to Safe Recovery
            </h2>
            <p className="text-base text-slate-700 dark:text-slate-300 font-medium">
              ChaanBean handles the complete process from the day you meet a buyer until final payment.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm">
              <span className="inline-block rounded-lg bg-orange-100 dark:bg-orange-950/60 px-2.5 py-1 text-xs font-bold text-[#FC8019]">
                Step 1
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">AI Credit Check</h4>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                Check company registration, GST status, and court cases before supplying goods on credit.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm">
              <span className="inline-block rounded-lg bg-orange-100 dark:bg-orange-950/60 px-2.5 py-1 text-xs font-bold text-[#FC8019]">
                Step 2
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">AI Business Security</h4>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                Get clear Green, Yellow, or Red risk signals and know exactly how much credit is safe to give.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm">
              <span className="inline-block rounded-lg bg-orange-100 dark:bg-orange-950/60 px-2.5 py-1 text-xs font-bold text-[#FC8019]">
                Step 3
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Payment Automation</h4>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                Send polite reminder phone calls in local languages and WhatsApp links for fast payment.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm">
              <span className="inline-block rounded-lg bg-orange-100 dark:bg-orange-950/60 px-2.5 py-1 text-xs font-bold text-[#FC8019]">
                Step 4
              </span>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Legal Infrastructure</h4>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                Calculate 3x compound penal interest and file MSME claims if a party delays or refuses payment.
              </p>
            </div>
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

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative h-6 w-8 shrink-0">
              <Image src="/logo.png" alt="ChaanBean Logo" fill className="object-contain" />
            </div>
            <p>© {new Date().getFullYear()} ChaanBean OS. Statutory B2B Credit Risk & Recovery Platform.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/subscription" className="hover:text-[#FC8019] transition">Subscription Plans</Link>
            <span>·</span>
            <Link href="/login" className="hover:text-[#FC8019] transition">Customer Login</Link>
            <span>·</span>
            <span>MSMED Act 2006 Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
