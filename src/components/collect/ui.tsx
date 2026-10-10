"use client";

import { useEffect, type ReactNode } from "react";
import s from "./collect.module.css";
import type { Tone } from "./client";

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`${s.chip} ${s[`c${tone}`]}`}>{children}</span>;
}

export function Toast({ kind, message, onDone }: { kind: "ok" | "err"; message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div role="status" aria-live="polite" className={`${s.toast} ${kind === "ok" ? s.bannerInfo : s.bannerErr}`}>
      {message}
    </div>
  );
}

export function ProviderBanner({ provider }: { provider: { name: string; ready: boolean; reason?: string } | null }) {
  if (!provider) return null;
  if (!provider.ready) {
    return (
      <div className={`${s.banner} ${s.bannerWarn}`} role="alert">
        <span>
          <b>Calling is not active.</b> {provider.reason} No calls will be placed until this is configured.
        </span>
      </div>
    );
  }
  if (provider.name === "MOCK") {
    return (
      <div className={`${s.banner} ${s.bannerInfo}`}>
        <span>
          <b>Simulated calling.</b> This environment uses a mock provider: no real phone is ever called. Outcomes are
          derived from the last digit of the number (0-4 answered, 5-6 no answer, 7 busy, 8 failed, 9 rejected).
        </span>
      </div>
    );
  }
  return null;
}
