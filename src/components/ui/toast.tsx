"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "./cn";
import type { Tone } from "./display";

interface Toast {
  id: number;
  tone: Tone;
  message: ReactNode;
}

const ToastContext = createContext<((message: ReactNode, tone?: Tone) => void) | null>(null);

const toneClass: Record<Tone, string> = {
  success: "border-success-fg/20 bg-success-bg text-success-fg",
  warning: "border-warning-fg/20 bg-warning-bg text-warning-fg",
  danger: "border-danger-fg/20 bg-danger-bg text-danger-fg",
  info: "border-info-fg/20 bg-info-bg text-info-fg",
  neutral: "border-border bg-surface text-text",
};

/** Short confirmations ("Saved") and non-blocking errors. Announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: ReactNode, tone: Tone = "neutral") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:items-end">
        {toasts.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 text-sm font-semibold shadow-md", toneClass[t.tone])}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
