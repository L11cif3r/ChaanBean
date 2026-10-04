"use client";

import React from "react";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import s from "./site.module.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

/** Wraps every public page (intro, landing, login, subscription) with the site font and design tokens. */
export function SiteShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${jakarta.variable} ${s.root} ${className}`}>{children}</div>;
}

/** Light/dark switch. Shares one platform-wide setting with the portal's ThemeToggle. */
export function ThemeSwitch() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`${s.themeSwitch} ${isDark ? s.themeSwitchDark : ""}`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className={s.themeIcons} aria-hidden>
        <Sun size={14} />
        <Moon size={14} />
      </span>
      <span className={s.themeKnob} aria-hidden>
        {isDark ? <Moon size={15} /> : <Sun size={15} />}
      </span>
    </button>
  );
}

export function Brand({ tagline = "Credit & Recovery OS", nameClassName = "" }: { tagline?: string | null; nameClassName?: string }) {
  return (
    <>
      <span className={s.brandMark}>
        <span className={s.brandMarkImg}>
          <Image src="/logo.png" alt="" fill sizes="36px" style={{ objectFit: "contain" }} priority />
        </span>
      </span>
      <span>
        <span className={`${s.brandName} ${nameClassName}`}>
          Chaan<span>Bean</span>
        </span>
        {tagline && <span className={s.brandTag}>{tagline}</span>}
      </span>
    </>
  );
}
