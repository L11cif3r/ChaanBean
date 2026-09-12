"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, RotateCcw } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function IntroPage() {
  const router = useRouter();
  const [animationKey, setAnimationKey] = useState(0);
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
      router.push("/login");
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [router, animationKey]);

  const handleSkip = () => {
    router.push("/login");
  };

  const handleReplay = () => {
    setProgress(0);
    setAnimationKey((k) => k + 1);
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
          onClick={handleReplay}
          className="flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
          title="Replay intro animation"
        >
          <RotateCcw size={13} />
          <span>Replay</span>
        </button>
        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 rounded-full border border-[#FC8019]/40 bg-[#FC8019]/10 px-4 py-1.5 text-xs font-semibold text-[#FC8019] hover:bg-[#FC8019]/20 transition shadow-lg shadow-[#FC8019]/10"
        >
          <span>Skip to Login</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Center Stage: Multi-Part Animated Logo Assembly */}
      <div key={animationKey} className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Animated Logo Container: 1024x742 aspect ratio */}
        <div className="relative h-44 w-60 sm:h-56 sm:w-76 md:h-64 md:w-88 animate-logo-bloom">
          {/* 1. The 'C' Element: Comes smoothly from the Left */}
          <div className="absolute inset-0 animate-fly-in-left">
            <Image
              src="/brand/logo_c.png"
              alt="ChaanBean C"
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* 2. The 'B' Body Element: Comes smoothly from the Right */}
          <div className="absolute inset-0 animate-fly-in-right">
            <Image
              src="/brand/logo_b.png"
              alt="ChaanBean B"
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* 3. Bar 1 (Leftmost on top of B): Drops from top */}
          <div className="absolute inset-0 animate-drop-in-top-1">
            <Image
              src="/brand/logo_bar1.png"
              alt="ChaanBean Bar 1"
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* 4. Bar 2 (Middle on top of B): Drops from top with delay */}
          <div className="absolute inset-0 animate-drop-in-top-2">
            <Image
              src="/brand/logo_bar2.png"
              alt="ChaanBean Bar 2"
              fill
              priority
              className="object-contain"
            />
          </div>

          {/* 5. Bar 3 (Rightmost on top of B): Drops from top with delay */}
          <div className="absolute inset-0 animate-drop-in-top-3">
            <Image
              src="/brand/logo_bar3.png"
              alt="ChaanBean Bar 3"
              fill
              priority
              className="object-contain"
            />
          </div>
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
