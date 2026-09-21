"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";

export interface InfoTooltipProps {
  text: string;
  align?: "left" | "center" | "right";
  size?: number;
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({
  text,
  align = "center",
  size = 13,
  className = "",
  iconClassName = "text-slate-400 hover:text-[#FC8019]",
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  }[align];

  return (
    <span
      className={`relative inline-flex items-center group cursor-help ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      tabIndex={0}
      role="button"
      aria-label="More information"
      title={text}
    >
      <Info
        size={size}
        className={`shrink-0 transition-colors ${iconClassName}`}
      />
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full mb-2 z-50 w-56 sm:w-64 p-2.5 rounded-xl bg-slate-950/95 dark:bg-slate-800/95 text-[11px] font-normal font-sans leading-relaxed text-slate-200 border border-slate-800 dark:border-slate-700 shadow-2xl backdrop-blur-sm transition-all duration-150 ${alignClasses} ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 visible"
            : "opacity-0 scale-95 translate-y-1 invisible"
        }`}
      >
        {text}
        {/* Subtle arrowhead pointing down */}
        <span
          className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-950/95 dark:border-t-slate-800/95 ${
            align === "left"
              ? "left-3"
              : align === "right"
              ? "right-3"
              : "left-1/2 -translate-x-1/2"
          }`}
        />
      </span>
    </span>
  );
}
