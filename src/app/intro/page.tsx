"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function IntroPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 2.8s total duration for intro, with progress updates
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 3.5;
      });
    }, 100);

    const timer = setTimeout(() => {
      router.push("/landing");
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [router]);

  const handleSkip = () => {
    router.push("/landing");
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-white transition-colors duration-200">
      {/* Ambient Crimson Halo Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[140px] opacity-15 dark:opacity-30"
        style={{ background: "radial-gradient(circle, #FC8019 0%, rgba(252, 128, 25,0) 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[450px] w-[700px] -translate-x-1/2 rounded-full blur-[160px] opacity-10 dark:opacity-20"
        style={{ background: "radial-gradient(circle, #E26D0A 0%, rgba(11,15,23,0) 80%)" }}
      />

      {/* Top Header Bar with Theme Switcher and Skip Trigger */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 rounded-full border border-[#FC8019]/40 bg-[#FC8019]/10 px-4 py-1.5 text-xs font-semibold text-[#FC8019] hover:bg-[#FC8019]/20 transition shadow-lg shadow-[#FC8019]/10"
        >
          <span>Skip to Overview</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Center Stage: Multi-Part Animated Logo Assembly */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Official Animated Logo Container: 1024x742 aspect ratio */}
        <div className="relative h-44 w-60 sm:h-56 sm:w-76 md:h-64 md:w-88 animate-logo-bloom">
          <Image
            src="/logo.png"
            alt="ChaanBean Logo"
            fill
            priority
            className="object-contain drop-shadow-[0_10px_35px_rgba(252,128,25,0.35)]"
          />
        </div>

        {/* Wordmark & Brand Mission fading in after assembly */}
        <div className="mt-8 space-y-2 animate-fadeIn" style={{ animationDelay: "1.2s", animationFillMode: "both" }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="text-slate-900 dark:text-white">Chaan</span>
            <span className="bg-gradient-to-r from-[#FC8019] to-[#FFA34D] bg-clip-text text-transparent">
              Bean
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium tracking-wide">
            B2B Credit Recovery & Verification Engine
          </p>
        </div>

        {/* Dynamic Transition Progress Bar */}
        <div className="mt-8 w-48 sm:w-64 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FC8019] to-[#FFA34D] transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono font-medium">
            <span>Loading Portal...</span>
            <span>{Math.min(100, Math.round(progress))}%</span>
          </div>
        </div>
      </div>

      {/* Footer Legal Subtext */}
      <div className="absolute bottom-6 text-center text-[11px] text-slate-500 dark:text-slate-600 font-mono">
        Statutory MSMED Act 2006 & TRAI Compliant · Section 65B Certified
      </div>
    </div>
  );
}
