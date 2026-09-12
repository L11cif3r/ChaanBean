"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("chaanbean_theme") as "dark" | "light") || "light";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (t: "dark" | "light") => {
    const root = document.documentElement;
    if (t === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("chaanbean_theme", nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400">
        <Sun size={13} />
        <span>Bright Mode</span>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="White & Swiggy Orange Theme"
      className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50/80 px-2.5 py-1 text-xs font-semibold text-[#FC8019] hover:bg-orange-100 transition shadow-sm"
      title="Active Theme: White & Swiggy Orange (#FC8019)"
    >
      <span className="h-2 w-2 rounded-full bg-[#FC8019] animate-pulse" />
      <span className="font-medium text-slate-800">Swiggy Orange</span>
    </button>
  );
}
