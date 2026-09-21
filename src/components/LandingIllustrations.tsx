import React from "react";

export function HeroMinimalIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[16/10] select-none pointer-events-none">
      <svg
        viewBox="0 0 520 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <linearGradient id="heroGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FC8019" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E26D0A" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="heroGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="heroCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Ambient Grid Lines */}
        <g stroke="#94A3B8" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="4 4">
          <line x1="40" y1="40" x2="480" y2="40" />
          <line x1="40" y1="120" x2="480" y2="120" />
          <line x1="40" y1="200" x2="480" y2="200" />
          <line x1="40" y1="280" x2="480" y2="280" />
          <line x1="80" y1="20" x2="80" y2="300" />
          <line x1="260" y1="20" x2="260" y2="300" />
          <line x1="440" y1="20" x2="440" y2="300" />
        </g>

        {/* Central Shield Hologram */}
        <path
          d="M260 50 L350 85 V175 C350 230 260 270 260 270 C260 270 170 230 170 175 V85 Z"
          fill="url(#heroGrad1)"
          fillOpacity="0.12"
          stroke="#FC8019"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Concentric Verified Rings */}
        <circle cx="260" cy="155" r="55" stroke="#FC8019" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="6 6" />
        <circle cx="260" cy="155" r="38" fill="#FC8019" fillOpacity="0.1" stroke="#FC8019" strokeWidth="2" />

        {/* Shield Check Emblem */}
        <path
          d="M246 155 L255 164 L275 144"
          stroke="#FC8019"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Floating Verified Node 1 (MCA21) */}
        <g transform="translate(60, 70)">
          <rect width="115" height="42" rx="12" fill="url(#heroCardGrad)" stroke="#E2E8F0" strokeWidth="1.5" />
          <circle cx="20" cy="21" r="9" fill="#10B981" fillOpacity="0.15" />
          <path d="M16 21 L19 24 L24 18" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="36" y="18" fill="#0F172A" fontSize="10" fontWeight="bold" fontFamily="sans-serif">MCA21 Live</text>
          <text x="36" y="30" fill="#64748B" fontSize="8" fontFamily="sans-serif">Active Entity</text>
        </g>
        <path d="M175 91 L210 115" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Floating Verified Node 2 (GSTIN) */}
        <g transform="translate(345, 70)">
          <rect width="120" height="42" rx="12" fill="url(#heroCardGrad)" stroke="#E2E8F0" strokeWidth="1.5" />
          <circle cx="20" cy="21" r="9" fill="#3B82F6" fillOpacity="0.15" />
          <path d="M16 21 L19 24 L24 18" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="36" y="18" fill="#0F172A" fontSize="10" fontWeight="bold" fontFamily="sans-serif">GST Regular</text>
          <text x="36" y="30" fill="#64748B" fontSize="8" fontFamily="sans-serif">Returns Filed</text>
        </g>
        <path d="M345 91 L310 115" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Floating Verified Node 3 (MSME §18 Recovery) */}
        <g transform="translate(50, 195)">
          <rect width="130" height="46" rx="12" fill="url(#heroCardGrad)" stroke="#E2E8F0" strokeWidth="1.5" />
          <circle cx="22" cy="23" r="10" fill="#F59E0B" fillOpacity="0.15" />
          <text x="18" y="27" fill="#D97706" fontSize="11" fontWeight="bold" fontFamily="sans-serif">₹</text>
          <text x="38" y="19" fill="#0F172A" fontSize="10" fontWeight="bold" fontFamily="sans-serif">₹1,500 Cr+</text>
          <text x="38" y="32" fill="#D97706" fontSize="8" fontWeight="bold" fontFamily="sans-serif">Recovered Capital</text>
        </g>
        <path d="M180 218 L220 200" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Floating Verified Node 4 (45-Day Radar) */}
        <g transform="translate(340, 195)">
          <rect width="130" height="46" rx="12" fill="url(#heroCardGrad)" stroke="#E2E8F0" strokeWidth="1.5" />
          <circle cx="22" cy="23" r="10" fill="#8B5CF6" fillOpacity="0.15" />
          <path d="M22 17 V23 H27" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="38" y="19" fill="#0F172A" fontSize="10" fontWeight="bold" fontFamily="sans-serif">45-Day Notice</text>
          <text x="38" y="32" fill="#6D28D9" fontSize="8" fontWeight="bold" fontFamily="sans-serif">MSMED Act §18</text>
        </g>
        <path d="M340 218 L300 200" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    </div>
  );
}

export function CreditCheckMinimalIllustration() {
  return (
    <svg viewBox="0 0 120 70" fill="none" className="w-full h-14 select-none">
      <rect x="10" y="10" width="100" height="50" rx="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
      <circle cx="28" cy="35" r="12" fill="#3B82F6" fillOpacity="0.15" />
      <path d="M24 35 L27 38 L33 32" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="48" y="24" width="50" height="6" rx="3" fill="#94A3B8" fillOpacity="0.4" />
      <rect x="48" y="36" width="35" height="5" rx="2.5" fill="#3B82F6" fillOpacity="0.6" />
      <circle cx="95" cy="35" r="4" fill="#10B981" />
    </svg>
  );
}

export function RiskSecurityMinimalIllustration() {
  return (
    <svg viewBox="0 0 120 70" fill="none" className="w-full h-14 select-none">
      <path d="M20 50 A 40 40 0 0 1 100 50" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
      <path d="M20 50 A 40 40 0 0 1 50 20" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
      <path d="M50 20 A 40 40 0 0 1 80 23" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" />
      <path d="M80 23 A 40 40 0 0 1 100 50" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" />
      <circle cx="60" cy="50" r="5" fill="#0F172A" />
      <line x1="60" y1="50" x2="42" y2="28" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      <text x="44" y="64" fill="#10B981" fontSize="9" fontWeight="bold" fontFamily="sans-serif">SAFE (GREEN)</text>
    </svg>
  );
}

export function PaymentCadenceMinimalIllustration() {
  return (
    <svg viewBox="0 0 120 70" fill="none" className="w-full h-14 select-none">
      <rect x="15" y="15" width="28" height="40" rx="6" fill="#F8FAFC" stroke="#10B981" strokeWidth="1.5" />
      <circle cx="29" cy="46" r="2.5" fill="#10B981" />
      <line x1="22" y1="24" x2="36" y2="24" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="30" x2="32" y2="30" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      
      {/* Soundwave/WhatsApp Arrows */}
      <path d="M50 35 H70" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M66 31 L71 35 L66 39" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      <circle cx="92" cy="35" r="14" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.5" />
      <text x="88" y="39" fill="#059669" fontSize="12" fontWeight="bold" fontFamily="sans-serif">₹</text>
    </svg>
  );
}

export function LegalDocketMinimalIllustration() {
  return (
    <svg viewBox="0 0 120 70" fill="none" className="w-full h-14 select-none">
      <line x1="60" y1="12" x2="60" y2="58" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="20" x2="95" y2="20" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M25 20 L15 38 H35 Z" fill="#F1F5F9" stroke="#8B5CF6" strokeWidth="1.5" />
      <path d="M95 20 L85 38 H105 Z" fill="#F1F5F9" stroke="#8B5CF6" strokeWidth="1.5" />
      <rect x="48" y="55" width="24" height="6" rx="3" fill="#8B5CF6" />
      <text x="44" y="46" fill="#8B5CF6" fontSize="8" fontWeight="bold" fontFamily="sans-serif">MSMED</text>
    </svg>
  );
}
