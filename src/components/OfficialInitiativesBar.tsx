"use client";

import React from "react";

interface InitiativeItem {
  id: string;
  name: string;
  href: string;
  logoSrc: string;
  alt: string;
  heightClass: string;
  badge: string;
}

const INITIATIVES: InitiativeItem[] = [
  {
    id: "gem",
    name: "Government e-Marketplace (GeM)",
    href: "https://gem.gov.in/",
    logoSrc: "/logos/gem-logo.svg",
    alt: "Government e-Marketplace (GeM) Official Portal",
    heightClass: "h-6 sm:h-7",
    badge: "GeM SPV",
  },
  {
    id: "make-in-india",
    name: "Make in India",
    href: "https://www.makeinindia.com/",
    logoSrc: "/logos/make-in-india.png",
    alt: "Make in India Official Portal",
    heightClass: "h-6 sm:h-7",
    badge: "National Pride",
  },
  {
    id: "ministry-commerce",
    name: "Ministry of Commerce & Industry",
    href: "https://commerce.gov.in/",
    logoSrc: "/logos/ministry-commerce.svg",
    alt: "Ministry of Commerce and Industry",
    heightClass: "h-6 sm:h-7",
    badge: "Dept. of Commerce",
  },
  {
    id: "msme",
    name: "Ministry of MSME",
    href: "https://msme.gov.in/",
    logoSrc: "/logos/msme.svg",
    alt: "Ministry of Micro, Small & Medium Enterprises",
    heightClass: "h-6 sm:h-7",
    badge: "MSMED Act 2006",
  },
  {
    id: "digital-india",
    name: "Digital India",
    href: "https://www.digitalindia.gov.in/",
    logoSrc: "/logos/digital-india.svg",
    alt: "Digital India Official Portal",
    heightClass: "h-5 sm:h-6",
    badge: "Digital Public Goods",
  },
  {
    id: "gst",
    name: "Goods and Services Tax",
    href: "https://www.gst.gov.in/",
    logoSrc: "/logos/gst.svg",
    alt: "Goods and Services Tax (GSTN) Official Portal",
    heightClass: "h-5 sm:h-6",
    badge: "GSTN · Sec 43B(h)",
  },
];

interface OfficialInitiativesBarProps {
  className?: string;
}

export function OfficialInitiativesBar({ className = "" }: OfficialInitiativesBarProps) {
  return (
    <div
      aria-label="National Statutory & Digital Trust Ecosystem"
      className={`w-full rounded-xl border border-slate-200 dark:border-slate-300 bg-white dark:bg-white px-4 sm:px-6 py-3 transition-colors ${className}`}
    >
      {/* 1. THIN LOGO STRIP WITH HYPERLINKS */}
      <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6 py-1">
        {INITIATIVES.map((item) => (
          <a
            key={item.id}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${item.name} — ${item.badge} (Opens in new tab)`}
            className="group relative flex items-center justify-center p-1.5 rounded-lg opacity-100 transition-transform duration-200 ease-out hover:scale-105 focus:outline-none focus:ring-1 focus:ring-[#FC8019]/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.logoSrc}
              alt={item.alt}
              className={`${item.heightClass} w-auto max-w-[130px] sm:max-w-[160px] object-contain`}
              loading="lazy"
            />
            <span className="sr-only">{item.name}</span>
          </a>
        ))}
      </div>

      {/* 2. THIN STATUTORY & COMPLIANCE LINE */}
      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-200 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Live Registry Rails: MCA21 · GSTN · GeM · MSME Udyam</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-500">
          <a
            href="https://msme.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-600 transition"
          >
            Section 43B(h) Ready
          </a>
          <span className="text-slate-300">·</span>
          <a
            href="https://msme.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-600 transition"
          >
            MSMED Rule §16-18
          </a>
          <span className="text-slate-300">·</span>
          <span>DPDP Act 2023</span>
          <span className="text-slate-300">·</span>
          <a
            href="https://gem.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-600 transition"
          >
            GeM SPV
          </a>
        </div>
      </div>
    </div>
  );
}
