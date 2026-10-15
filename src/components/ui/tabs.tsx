"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem {
  key: string;
  label: ReactNode;
  /** Shown in brackets after the label (S07: "Counts in brackets"). */
  count?: number;
  content: ReactNode;
}

/** Accessible tabs: arrow keys move between tabs, Home/End jump to the ends. */
export function Tabs({ items, initial, className }: { items: TabItem[]; initial?: string; className?: string }) {
  const [active, setActive] = useState(initial ?? items[0]?.key);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const next = e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(items[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((t, i) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold transition-colors",
                selected ? "border-primary text-primary-text" : "border-transparent text-muted hover:text-text",
              )}
            >
              {t.label}
              {t.count !== undefined ? <span className="ml-1 tabular-nums">({t.count})</span> : null}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`${base}-panel-${t.key}`}
          aria-labelledby={`${base}-tab-${t.key}`}
          hidden={t.key !== active}
          className="pt-4"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
