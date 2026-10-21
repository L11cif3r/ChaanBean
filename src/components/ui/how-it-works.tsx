import type { ReactNode } from "react";
import { cn } from "./cn";

// Three plain steps for a feature a new user has not used yet, in the ObsidianUI card style.

export function HowItWorks({ steps, stepLabel, className }: { steps: { icon: ReactNode; title: ReactNode; body: ReactNode }[]; stepLabel: (n: number) => ReactNode; className?: string }) {
  return (
    <ol className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text [&_svg]:size-[17px]" aria-hidden="true">{s.icon}</span>
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-[1px] text-subtle">{stepLabel(i + 1)}</span>
            <span className="mt-1 block text-sm font-semibold text-text">{s.title}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{s.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Segmented filter (All / Waiting / …) as in the ObsidianUI shell tabs. */
export function Segmented<K extends string>({ items, value, onChange, label }: { items: { key: K; label: ReactNode }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-strong p-1">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          aria-pressed={value === it.key}
          onClick={() => onChange(it.key)}
          className={cn(
            "h-9 shrink-0 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[0.97]",
            value === it.key ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
