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
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400">
        <Sun size={16} />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/80 dark:bg-orange-500/15 text-[#FC8019] hover:bg-orange-100 dark:hover:bg-orange-500/25 transition-all shadow-sm group"
    >
      {isDark ? (
        <Sun
          size={16}
          className="text-[#FC8019] transition-transform duration-300 group-hover:rotate-45"
        />
      ) : (
        <Moon
          size={16}
          className="text-[#FC8019] transition-transform duration-300 group-hover:-rotate-12"
        />
      )}
    </button>
  );
}
