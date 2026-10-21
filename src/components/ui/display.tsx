import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { NumberRoll } from "./number-roll";

// Presentational building blocks (design v2): white cards with soft depth, small section labels, soft rectangle
// status tags, thin progress bars, skeletons, empty states and page headers with a gradient headline word.

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("min-w-0 rounded-2xl border border-border bg-surface shadow-sm", className)}>{children}</section>;
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-[52px] items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5", className)}>
      <h2 className="text-[15px] font-bold tracking-tight text-text">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-4 py-4 sm:px-5", className)}>{children}</div>;
}

/** Small uppercase label above a group, as in the ObsidianUI sidebar and dashboards. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-semibold uppercase leading-none tracking-[1.2px] text-subtle", className)}>{children}</p>;
}

/** Dashboard summary card (S04 marker 2). Numbers roll into place. Links to the filtered list when `href` is set. */
export function StatCard({ label, value, hint, href, icon }: { label: ReactNode; value: ReactNode; hint?: ReactNode; href?: string; icon?: ReactNode }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        {icon ? <span className="flex size-8 items-center justify-center rounded-lg bg-soft text-primary-text [&_svg]:size-4" aria-hidden="true">{icon}</span> : null}
      </div>
      <p className="mt-3 font-head text-[1.85rem] font-bold leading-none tracking-tight text-text">
        {typeof value === "string" || typeof value === "number" ? <NumberRoll value={value} /> : value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-2xl border border-border bg-surface p-4 shadow-sm";
  return href ? (
    <Link href={href} className={cn(cls, "transition-[border-color,box-shadow,translate,scale] duration-200 hover:-translate-y-0.5 hover:border-primary-line hover:shadow-md active:scale-[0.99]")}>
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

/** Status tag: a soft rectangle with a small dot in the tone colour. */
export function Tag({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11.5px] font-semibold leading-none", tones[tone], className)}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Top-bar pill (wallet). */
export function Pill({ children, href, className }: { children: ReactNode; href?: string; className?: string }) {
  const cls = cn(
    "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-surface px-2.5 text-xs font-semibold text-text shadow-sm",
    className,
  );
  return href ? (
    <Link href={href} className={cn(cls, "transition-[background-color,scale] duration-150 hover:bg-surface-strong active:scale-[0.97]")}>
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
        <span className="font-medium text-text">{label}</span>
        <span className="tabular-nums text-muted">
          {value} of {max}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-strong"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={cn("h-full origin-left animate-[cb-grow-x_0.8s_cubic-bezier(0.2,0.7,0.2,1)_both] rounded-full", pct >= 90 ? "bg-danger" : "bg-brand")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-strong", className)} aria-hidden="true" />;
}

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-soft text-primary-text">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 9.5h17M8 13.5h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <p className="mt-4 font-head text-base font-bold text-text">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <SectionLabel className="mb-2">{eyebrow}</SectionLabel> : null}
        <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-[1.9rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** A headline word in the brand gradient: <PageHeader title={<>Check a <GradientText>buyer</GradientText></>} />. */
export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-gradient", className)}>{children}</span>;
}
