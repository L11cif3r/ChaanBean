"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

export interface InfoTooltipProps {
  text: string;
  title?: string;
  position?: "auto" | "top" | "bottom";
  align?: "auto" | "left" | "center" | "right";
  size?: number;
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({
  text,
  title,
  position = "auto",
  align = "auto",
  size = 13.5,
  className = "",
  iconClassName = "text-slate-400 hover:text-[#FC8019] dark:text-slate-500 dark:hover:text-[#FC8019]",
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [computedPlacement, setComputedPlacement] = useState<"top" | "bottom">(
    position === "auto" ? "bottom" : position
  );
  const [computedAlign, setComputedAlign] = useState<"left" | "center" | "right">(
    align === "auto" ? "center" : align
  );

  const calculatePlacement = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    // 1. Vertical placement
    if (position === "auto") {
      // If trigger is within 160px of the top of viewport, force tooltip downwards
      if (rect.top < 160) {
        setComputedPlacement("bottom");
      } else if (viewportHeight - rect.bottom < 160) {
        // If trigger is within 160px of bottom of viewport, force tooltip upwards
        setComputedPlacement("top");
      } else {
        // Default to bottom for maximum comfort and visibility under headers
        setComputedPlacement("bottom");
      }
    } else {
      setComputedPlacement(position);
    }

    // 2. Horizontal alignment
    if (align === "auto") {
      if (rect.left < 140) {
        setComputedAlign("left");
      } else if (viewportWidth - rect.right < 140) {
        setComputedAlign("right");
      } else {
        setComputedAlign("center");
      }
    } else {
      setComputedAlign(align);
    }
  };

  const handleOpen = () => {
    calculatePlacement();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Alignment classes for tooltip box
  const alignClass = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  }[computedAlign];

  // Arrow alignment styles
  const arrowAlignClass = {
    left: "left-3",
    center: "left-1/2 -translate-x-1/2",
    right: "right-3",
  }[computedAlign];

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex items-center group cursor-pointer select-none align-middle ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      tabIndex={0}
      role="button"
      aria-label="Information note"
    >
      <Info
        size={size}
        className={`shrink-0 transition-colors ${iconClassName}`}
      />

      {/* Floating Tooltip Balloon */}
      <div
        role="tooltip"
        className={`chaan-tooltip-bubble pointer-events-none absolute z-[99999] w-64 sm:w-72 p-3 rounded-xl border text-left shadow-2xl transition-all duration-150 ${
          computedPlacement === "top" ? "bottom-full mb-2.5" : "top-full mt-2.5"
        } ${alignClass} ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0 visible"
            : "opacity-0 scale-95 pointer-events-none invisible"
        }`}
        style={{
          backgroundColor: "#0b1120",
          color: "#ffffff",
          borderColor: "rgba(252, 128, 25, 0.4)",
          boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.5), 0 0 16px rgba(252, 128, 25, 0.15)",
        }}
      >
        {/* Subtle orange accent tag if provided or header indicator */}
        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono font-bold tracking-wider uppercase text-[#FC8019]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FC8019] animate-pulse shrink-0" />
          <span>{title || "System Note"}</span>
        </div>

        {/* High contrast, pure white text */}
        <p className="text-[11.5px] font-medium leading-relaxed text-white tracking-normal font-sans">
          {text}
        </p>

        {/* Arrow pointer toward icon */}
        {computedPlacement === "top" ? (
          <span
            className={`absolute top-full -mt-[1px] border-[5px] border-transparent border-t-[#0b1120] ${arrowAlignClass}`}
          />
        ) : (
          <span
            className={`absolute bottom-full -mb-[1px] border-[5px] border-transparent border-b-[#0b1120] ${arrowAlignClass}`}
          />
        )}
      </div>
    </span>
  );
}
