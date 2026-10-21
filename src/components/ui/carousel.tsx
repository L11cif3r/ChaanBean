"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";

// Swipeable carousel on CSS scroll snapping: drag or swipe on touch, arrows and dots on a pointer, arrow keys when
// focused. `slide` sets each slide's width (Tailwind classes), so one component serves a full-width banner and a row
// of cards. `autoPlay` moves on every N ms, pauses on hover, focus and touch, and is off for reduced motion.

export function Carousel({
  children, label, slide = "basis-full", gap = "gap-3", autoPlay, className, controls = "both",
}: {
  children: ReactNode;
  label: string;
  slide?: string;
  gap?: string;
  autoPlay?: number;
  className?: string;
  controls?: "both" | "dots" | "arrows" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [pages, setPages] = useState(items.length);
  const paused = useRef(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth : el.clientWidth;
    const perView = Math.max(1, Math.round(el.clientWidth / Math.max(1, step)));
    setPages(Math.max(1, items.length - perView + 1));
    setIndex(Math.round(el.scrollLeft / Math.max(1, step)));
  }, [items.length]);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const go = useCallback((i: number) => {
    const el = ref.current;
    const target = el?.children[i] as HTMLElement | undefined;
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!autoPlay || pages < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!paused.current) go(index + 1 >= pages ? 0 : index + 1);
    }, autoPlay);
    return () => clearInterval(timer);
  }, [autoPlay, pages, index, go]);

  const arrows = (controls === "both" || controls === "arrows") && pages > 1;
  const dots = (controls === "both" || controls === "dots") && pages > 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("relative", className)}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }}
      onBlur={() => { paused.current = false; }}
      onTouchStart={() => { paused.current = true; }}
    >
      <div
        ref={ref}
        tabIndex={0}
        onScroll={measure}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(Math.min(pages - 1, index + 1)); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(Math.max(0, index - 1)); }
        }}
        className={cn("snap-carousel -mx-1 px-1 py-1 outline-none", gap)}
      >
        {items.map((child, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${items.length}`} className={cn("shrink-0 snap-start", slide)}>
            {child}
          </div>
        ))}
      </div>
      {arrows ? (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(Math.max(0, index - 1))}
            disabled={index === 0}
            className="absolute -left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-md transition-opacity hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-0 md:flex"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(Math.min(pages - 1, index + 1))}
            disabled={index >= pages - 1}
            className="absolute -right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-md transition-opacity hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-0 md:flex"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </>
      ) : null}
      {dots ? (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to ${i + 1}`}
              aria-current={i === index || undefined}
              onClick={() => go(i)}
              className={cn("h-1.5 rounded-full transition-all duration-300", i === index ? "w-5 bg-[image:var(--grad-brand)]" : "w-1.5 bg-border-strong hover:bg-subtle")}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
