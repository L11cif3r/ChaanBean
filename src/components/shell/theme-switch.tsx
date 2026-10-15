"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useTheme } from "@/lib/theme";

/** Light/dark pill switch with the gradient knob (sign-in and public pages, as on the redesigned site). */
export function ThemeSwitch({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={cn(
        "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-border bg-surface-muted p-[3px] transition-colors hover:border-primary-line",
        className,
      )}
    >
      <span className="flex w-full justify-between px-1.5 text-subtle" aria-hidden="true">
        <Sun size={14} />
        <Moon size={14} />
      </span>
      <span
        className={cn(
          "bg-brand absolute left-[3px] top-[3px] inline-flex h-7 w-7 items-center justify-center rounded-full text-white shadow-[0_4px_12px_-4px_rgba(255,82,0,0.7)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
          isDark && "translate-x-7",
        )}
        aria-hidden="true"
      >
        {isDark ? <Moon size={15} /> : <Sun size={15} />}
      </span>
    </button>
  );
}

/** Square icon toggle for the signed-in top bar (the portal's ThemeToggle on the redesigned branch). */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-line bg-primary-soft text-primary shadow-sm transition-all hover:brightness-95"
    >
      {isDark ? (
        <Sun size={16} className="transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon size={16} className="transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
