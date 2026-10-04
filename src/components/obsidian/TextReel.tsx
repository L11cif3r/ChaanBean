"use client";

/*
 * Text Reel ("text-stream"), from ObsidianUI (https://obsidianui.dev/docs/text-stream).
 * MIT License, Copyright (c) 2026 ObsidianUI.
 * Adapted: converted to TypeScript, colours and font come from the site tokens,
 * and the list is exposed to screen readers once instead of as a moving reel.
 */

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { cn } from "./utils";
import "./text-reel.css";

interface TextReelProps {
  items: string[];
  prefix?: string;
  fontSize?: string;
  fontWeight?: number;
  height?: string | number;
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function TextReel({
  items,
  prefix,
  fontSize = "clamp(1.5rem, 3.4vw, 2.4rem)",
  fontWeight = 800,
  height = "auto",
  paused = false,
  className,
  style,
}: TextReelProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copyCount, setCopyCount] = useState(2);
  const metrics = useRef({ currentY: 0, distance: 0, currentVelocity: 0.4, targetVelocity: 0.4, lastDirection: 1 });
  const scrollTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    const track = trackRef.current;
    const content = contentRef.current;
    const container = containerRef.current;
    if (!track || !content || !container || paused || !items.length) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const baseSpeed = 0.4;
      const maxBoost = 8;
      let lastScrollY = window.scrollY;

      const start = () => {
        const distance = content.offsetHeight;
        const containerHeight = container.offsetHeight;
        if (!distance || !containerHeight) return;
        const next = Math.max(2, Math.ceil(containerHeight / distance) + 2);
        setCopyCount((c) => (c === next ? c : next));
        metrics.current.distance = distance;
        metrics.current.currentY = gsap.utils.wrap(-distance, 0, metrics.current.currentY);
        gsap.set(track, { y: metrics.current.currentY });
      };

      const tick = (_time: number, deltaTime: number) => {
        const m = metrics.current;
        if (!m.distance) return;
        const frameFactor = deltaTime / (1000 / 60);
        m.currentVelocity = gsap.utils.interpolate(m.currentVelocity, m.targetVelocity, 0.14);
        m.currentY = gsap.utils.wrap(-m.distance, 0, m.currentY + m.currentVelocity * frameFactor);
        gsap.set(track, { y: m.currentY });
      };

      // Page scrolling briefly speeds the reel up in the scroll direction.
      const nudge = (delta: number) => {
        if (!delta) return;
        const direction = delta > 0 ? -1 : 1;
        metrics.current.lastDirection = direction;
        metrics.current.targetVelocity = direction * Math.min(maxBoost, baseSpeed + Math.pow(Math.abs(delta), 1.2) * 0.06);
        window.clearTimeout(scrollTimeout.current);
        scrollTimeout.current = window.setTimeout(() => {
          metrics.current.targetVelocity = metrics.current.lastDirection * baseSpeed;
        }, 120);
      };
      const onScroll = () => {
        const next = window.scrollY;
        nudge(next - lastScrollY);
        lastScrollY = next;
      };

      start();
      gsap.ticker.add(tick);
      const ro = new ResizeObserver(start);
      ro.observe(content);
      ro.observe(container);
      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.clearTimeout(scrollTimeout.current);
        gsap.ticker.remove(tick);
      };
    }, containerRef);

    return () => media.revert();
  }, [items, paused]);

  if (!items.length) return null;

  const lineHeight = `calc(${fontSize} * 2.4)`;

  return (
    <div
      className={cn("obsidian-text-reel", className)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height, gap: "0.5rem", ...style }}
    >
      {prefix && <p className="obsidian-text-reel__prefix">{prefix}</p>}
      <ul className="sr-only">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div ref={containerRef} className="obsidian-text-reel__viewport" style={{ height: lineHeight }} aria-hidden>
        <div ref={trackRef} className="obsidian-text-reel__track" style={{ fontSize, fontWeight }}>
          {Array.from({ length: copyCount }, (_, copyIndex) => (
            <div key={copyIndex} ref={copyIndex === 0 ? contentRef : null} className="obsidian-text-reel__copy">
              {items.map((text, i) => (
                <div key={`${copyIndex}-${i}`} className="obsidian-text-reel__item">
                  {text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TextReel;
