"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("chaanbean_theme") as "dark" | "light") || "dark";
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
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-400">
        <Sun size={13} />
        <span>Theme</span>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Dark and Bright Mode"
      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
      title={theme === "dark" ? "Switch to Bright Mode" : "Switch to Dark Mode"}
    >
      {theme === "dark" ? (
        <>
          <Sun size={13} className="text-amber-400" />
          <span>Bright Mode</span>
        </>
      ) : (
        <>
          <Moon size={13} className="text-sky-500" />
          <span className="text-slate-800">Dark Mode</span>
        </>
      )}
    </button>
  );
}
