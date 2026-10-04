"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

/** Portal theme toggle. Shares one setting with the public site's ThemeSwitch. */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/80 dark:bg-orange-500/15 text-[#FC8019] hover:bg-orange-100 dark:hover:bg-orange-500/25 transition-all shadow-sm group"
    >
      {isDark ? (
        <Sun size={16} className="text-[#FC8019] transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon size={16} className="text-[#FC8019] transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
