"use client";

/*
 * Flip Text, from ObsidianUI (https://obsidianui.dev/docs/flip-text).
 * MIT License, Copyright (c) 2026 ObsidianUI.
 * Adapted for ChaanBean:
 *  - screen readers get the plain text instead of single letters;
 *  - per-letter delays are rounded so server and client render identical markup;
 *  - `mode="reveal"` flips the letters in once on mount and replays the original
 *    ObsidianUI cube flip when the text (or its `replayOn` ancestor) is hovered,
 *    instead of looping forever. Between flips it renders plain inline text, so
 *    it wraps with the sentence around it and copies cleanly.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./utils";
import "./flip-text.css";

interface FlipTextProps {
  className?: string;
  /** Text to animate; split into words by `separator`. */
  children: string;
  /** Seconds per flip cycle. */
  duration?: number;
  /** Seconds before the first flip. */
  delay?: number;
  loop?: boolean;
  separator?: string;
  /** Flip every letter at once instead of in a wave. */
  together?: boolean;
  /** "loop" is the original ObsidianUI behaviour; "reveal" flips in once, then replays on hover. */
  mode?: "loop" | "reveal";
  /** CSS selector of an ancestor whose hover replays the flip (reveal mode). Defaults to the text itself. */
  replayOn?: string;
}

type Phase = "in" | "flip" | "rest";

export function FlipText({
  className,
  children,
  duration = 2.2,
  delay = 0,
  loop = true,
  separator = " ",
  together = false,
  mode = "loop",
  replayOn,
}: FlipTextProps) {
  const words = useMemo(() => children.split(separator), [children, separator]);
  const totalChars = children.length;
  const rootRef = useRef<HTMLSpanElement>(null);
  // Bumping the key remounts the letters, which restarts their CSS animation.
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("in");
  const reveal = mode === "reveal";

  // After the flip-in, drop the animation so the letters render as plain, crisp text.
  useEffect(() => {
    if (!reveal) return;
    const done = window.setTimeout(
      () => setPhase((p) => (p === "in" ? "rest" : p)),
      (delay + duration * 0.35 + duration * 0.45) * 1000 + 150
    );
    return () => window.clearTimeout(done);
  }, [reveal, delay, duration]);

  useEffect(() => {
    if (!reveal) return;
    const root = rootRef.current;
    const target = (replayOn && root?.closest(replayOn)) || root;
    if (!target) return;
    let busy = false;
    let timer: number | undefined;
    const replay = () => {
      if (busy || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      busy = true;
      setPhase("flip");
      setRun((r) => r + 1);
      // Wave plus one flip, then settle back to plain letters.
      timer = window.setTimeout(() => {
        setPhase("rest");
        busy = false;
      }, duration * 1000 * 0.9 + 100);
    };
    target.addEventListener("mouseenter", replay);
    return () => {
      target.removeEventListener("mouseenter", replay);
      window.clearTimeout(timer);
    };
  }, [reveal, replayOn, duration]);

  const getCharIndex = (wordIndex: number, charIndex: number) => {
    let index = 0;
    for (let i = 0; i < wordIndex; i++) {
      index += words[i].length + (separator === " " ? 1 : separator.length);
    }
    return index + charIndex;
  };

  // Reveal timings: the flip-in uses a wider wave; a hover replay starts immediately.
  const charDuration = reveal ? duration * (phase === "in" ? 0.45 : 0.55) : duration;
  const wave = reveal ? duration * 0.35 : duration * 0.25;
  const startDelay = reveal && phase !== "in" ? 0 : delay;
  const charClass = reveal ? `flip-char--${phase === "flip" ? "once" : phase}` : undefined;

  // Reveal mode at rest: plain text, so it wraps, copies and reads like any other text.
  if (reveal && phase === "rest") {
    return (
      <span ref={rootRef} className={cn("flip-text--reveal", className)}>
        {children}
      </span>
    );
  }

  return (
    <span
      ref={rootRef}
      className={cn(reveal ? "flip-text--reveal" : "inline-block leading-none", className)}
      style={reveal ? undefined : { perspective: "1000px" }}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden key={run} style={reveal ? undefined : { transformStyle: "preserve-3d" }}>
        {words.map((word, wordIndex) => (
          <React.Fragment key={wordIndex}>
            <span className="inline-block whitespace-nowrap" style={{ transformStyle: "preserve-3d", perspective: "1000px" }}>
              {word.split("").map((char, charIndex) => {
                const globalIndex = getCharIndex(wordIndex, charIndex);
                const charDelay = together
                  ? startDelay
                  : Math.sin((globalIndex / totalChars) * (Math.PI / 2)) * wave + startDelay;
                return (
                  <span
                    key={charIndex}
                    className={cn("flip-char relative inline-block", charClass)}
                    data-char={char}
                    style={
                      {
                        "--flip-duration": `${charDuration.toFixed(3)}s`,
                        // Rounded: server and browser Math.sin can differ in the last digit, which breaks hydration.
                        "--flip-delay": `${charDelay.toFixed(3)}s`,
                        "--flip-iteration": loop && !reveal ? "infinite" : "1",
                        transformStyle: "preserve-3d",
                      } as React.CSSProperties
                    }
                  >
                    {char}
                  </span>
                );
              })}
              {/* Loop mode keeps the space inside the word, as in the original component. */}
              {!reveal && wordIndex < words.length - 1 && (
                <span className="inline-block">{separator === " " ? "\u00A0" : separator}</span>
              )}
            </span>
            {/* Reveal mode uses a real space so the words wrap like normal text. */}
            {reveal && wordIndex < words.length - 1 && (separator === " " ? " " : separator)}
          </React.Fragment>
        ))}
      </span>
    </span>
  );
}

export default FlipText;
