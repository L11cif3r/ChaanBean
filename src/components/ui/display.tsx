import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

// Presentational building blocks: cards, status tags, pills, progress, skeletons, empty states, page headers.

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-3xl border border-border bg-surface shadow-sm", className)}>{children}</section>;
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6", className)}>
      <h2 className="text-[0.95rem] font-bold tracking-tight text-text">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-5 sm:px-6", className)}>{children}</div>;
}

/** Dashboard summary card (S04 marker 2). Links to the filtered list when `href` is set. */
export function StatCard({ label, value, hint, href }: { label: ReactNode; value: ReactNode; hint?: ReactNode; href?: string }) {
  const inner = (
    <>
      <p className="font-mono text-xs font-bold uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight text-text">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-3xl border border-border bg-surface px-5 py-5 shadow-sm";
  return href ? (
    <Link href={href} className={cn(cls, "transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const tones: Record<Tone, string> = {
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  neutral: "bg-neutral-bg text-neutral-fg",
};

/** Status chip: a soft pill in the site tones (orange, green, red, amber, neutral). */
export function Tag({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.74rem] font-bold leading-none", tones[tone], className)}>
      {children}
    </span>
  );
}

/** Top-bar pill (plan units, wallet). */
export function Pill({ children, href, className }: { children: ReactNode; href?: string; className?: string }) {
  const cls = cn(
    "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-primary-line bg-primary-soft px-3 text-xs font-bold text-primary-text",
    className,
  );
  return href ? (
    <Link href={href} className={cn(cls, "transition hover:border-primary hover:shadow-md")}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

/** Plan usage bar (S04 marker 4, S19). */
export function ProgressBar({ label, value, max }: { label: ReactNode; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="font-bold text-text">{label}</span>
        <span className="tabular-nums text-muted">
          {value} of {max}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-bg"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className={cn("h-full rounded-full", pct >= 90 ? "bg-danger" : "bg-brand")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-neutral-bg", className)} aria-hidden="true" />;
}

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <svg viewBox="0 0 64 64" className="h-14 w-14 rounded-2xl bg-primary-soft p-2.5 text-primary" fill="none" aria-hidden="true">
        <rect x="10" y="14" width="44" height="36" rx="6" stroke="currentColor" strokeWidth="3" />
        <path d="M10 26h44M22 36h20M22 42h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="mt-4 text-base font-bold text-text">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
