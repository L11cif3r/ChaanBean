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
      aria-label="Toggle Dark and Bright Mode"
      className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
      title={theme === "dark" ? "Switch to Bright Mode" : "Switch to Dark Mode"}
    >
      {theme === "dark" ? (
        <>
          <Sun size={13} className="text-amber-400" />
          <span>Bright Mode</span>
        </>
      ) : (
        <>
          <Moon size={13} className="text-sky-600 dark:text-sky-500" />
          <span className="text-slate-700 dark:text-slate-300">Dark Mode</span>
        </>
      )}
    </button>
  );
}
