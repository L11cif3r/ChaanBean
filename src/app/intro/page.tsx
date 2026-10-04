"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SiteShell, ThemeSwitch } from "@/components/marketing/SiteShell";
import { PILLARS } from "@/components/marketing/content";
import i from "@/components/marketing/intro.module.css";

const DURATION = 3000;
const WORD = ["C", "h", "a", "a", "n", "B", "e", "a", "n"];
const STATUS_WORDS = PILLARS.map((p) => p.label);

export default function IntroPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const goToLanding = () => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    setTimeout(() => router.push("/landing"), 420);
  };

  useEffect(() => {
    router.prefetch("/landing");
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      // Ease out so the bar settles gently at 100%.
      setProgress(Math.round((1 - Math.pow(1 - p, 2.2)) * 100));
      if (p < 1) frame = requestAnimationFrame(tick);
      else goToLanding();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusIndex = Math.min(STATUS_WORDS.length - 1, Math.floor((progress / 100) * STATUS_WORDS.length));

  return (
    <SiteShell>
      <div className={`${i.screen} ${leaving ? i.leaving : ""}`}>
        <div className={i.topBar}>
          <ThemeSwitch />
          <button type="button" className={i.skip} onClick={goToLanding}>
            Skip to Overview <ArrowRight size={14} />
          </button>
        </div>

        <div className={i.stage} aria-hidden>
          <span className={i.glow} />
          <span className={i.ring} />
          <span className={i.ringInner} />
          <span className={i.orbit}>
            <span />
            <span />
            <span />
          </span>
          <div className={i.logoCard}>
            <span className={i.logoImg}>
              <Image src="/logo.png" alt="" fill sizes="96px" style={{ objectFit: "contain" }} priority />
            </span>
            <span className={i.shine} />
          </div>
        </div>

        <h1 className={i.word} aria-label="ChaanBean">
          {WORD.map((ch, idx) => (
            <span
              key={idx}
              aria-hidden
              className={`${i.letter} ${idx >= 5 ? i.letterAccent : ""}`}
              style={{ animationDelay: `${450 + idx * 55}ms` }}
            >
              {ch}
            </span>
          ))}
        </h1>
        <p className={i.tagline}>B2B Credit Recovery &amp; Verification Engine</p>

        <div className={i.progress}>
          <div className={i.status}>
            <span key={statusIndex} className={i.statusWord}>
              {STATUS_WORDS[statusIndex]}
            </span>
            <span className={i.pct}>{progress}%</span>
          </div>
          <div
            className={i.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Loading"
          >
            <div className={i.bar} style={{ width: `${progress}%` }} />
          </div>
          <p className={i.loadingLabel}>Loading Portal...</p>
        </div>

        <p className={i.footer}>Statutory MSMED Act 2006 &amp; TRAI Compliant · Section 65B Certified</p>
      </div>
    </SiteShell>
  );
}
