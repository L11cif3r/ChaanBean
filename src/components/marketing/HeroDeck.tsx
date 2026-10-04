"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, BadgeCheck, Pause, Play, Scale, Zap, type LucideIcon } from "lucide-react";
import { FlipText } from "@/components/obsidian/FlipText";
import d from "./deck.module.css";
import { PROTECTION_WATCH, VERDICT } from "./content";

type Tone = "green" | "amber" | "orange" | "red";

interface DeckCard {
  id: string;
  tab: string;
  icon: LucideIcon;
  tone: Tone;
  eyebrow: string;
  question: string;
  status: string;
  headline: string;
  label: string;
  figure: string;
  cells: { label: string; value: string }[];
}

// Same maths as the landing calculator: 3x the RBI bank rate, compounded monthly.
const RBI_BANK_RATE = 6.75;
const legalInterest = Math.round(500000 * (Math.pow(1 + (RBI_BANK_RATE * 3) / 100 / 12, 6) - 1));

// Sample data, one card per service, shown in the hero as a rotating deck.
const CARDS: DeckCard[] = [
  {
    id: "credit-check",
    tab: "Credit Check",
    icon: BadgeCheck,
    tone: "green",
    eyebrow: VERDICT.eyebrow,
    question: VERDICT.question,
    status: VERDICT.good.grade,
    headline: VERDICT.good.verdict,
    label: VERDICT.limitLabel,
    figure: VERDICT.good.limit,
    cells: VERDICT.good.matrix,
  },
  {
    id: "credit-protection",
    tab: "Protection",
    icon: Activity,
    tone: "amber",
    eyebrow: "Credit Protection",
    question: "Are my buyers still safe after credit?",
    status: "Live watch · 4 signals",
    headline: "1 buyer near credit limit. Review today.",
    label: "Credit used of ₹25,00,000 limit",
    figure: "₹21,50,000",
    cells: PROTECTION_WATCH.map((w) => ({ label: w.name, value: w.status })),
  },
  {
    id: "payment-automation",
    tab: "Collections",
    icon: Zap,
    tone: "orange",
    eyebrow: "Payment Automation",
    question: "Is my overdue invoice being followed up?",
    status: "Invoice #8412 · 12 days overdue",
    headline: "Payment reminder sent on WhatsApp",
    label: "Amount due",
    figure: "₹2,40,000",
    cells: [
      { label: "Reminder", value: "Sent" },
      { label: "Voice call", value: "Answered" },
      { label: "Payment link", value: "Shared" },
      { label: "Promise to pay", value: "In 3 days" },
    ],
  },
  {
    id: "legal",
    tab: "Legal",
    icon: Scale,
    tone: "red",
    eyebrow: "Legal Recovery",
    question: "What if the buyer still doesn't pay?",
    status: "MSME demand notice sent",
    headline: "Interest at 3x the RBI bank rate is now accruing",
    label: "Interest owed on ₹5,00,000 after 6 months",
    figure: `₹${legalInterest.toLocaleString("en-IN")}`,
    cells: [
      { label: "Notice", value: "Delivered" },
      { label: "RBI bank rate", value: `${RBI_BANK_RATE}%` },
      { label: "Evidence pack", value: "Ready" },
      { label: "Section 18 filing", value: "Ready" },
    ],
  },
];

const N = CARDS.length;
/** Time each card stays in front. Keep in sync with the progress bar in deck.module.css. */
const INTERVAL_MS = 5000;

export function HeroDeck() {
  const [active, setActive] = useState(0);
  // Counts every change so the figure on the new front card flips in again.
  const [turns, setTurns] = useState(0);
  const [playing, setPlaying] = useState(true);
  const touchX = useRef<number | null>(null);

  const show = (index: number) => {
    setActive(((index % N) + N) % N);
    setTurns((t) => t + 1);
  };

  // Rotate on a timer. Restarting it on every change gives a hand-picked card its full time too.
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      setActive((a) => (a + 1) % N);
      setTurns((n) => n + 1);
    }, INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [playing, turns]);

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) show(active + (dx < 0 ? 1 : -1));
  };

  return (
    <div className={d.deckWrap}>
      <div
        className={d.deck}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        {CARDS.map((card, i) => {
          const pos = (i - active + N) % N;
          const front = pos === 0;
          const Icon = card.icon;
          return (
            <article
              key={card.id}
              id={`deck-${card.id}`}
              role="tabpanel"
              aria-labelledby={`deck-tab-${card.id}`}
              aria-hidden={!front}
              className={d.card}
              data-pos={pos}
              data-tone={card.tone}
              onClick={front ? undefined : () => show(i)}
            >
              <div className={d.head}>
                <span className={d.chip}>
                  <Icon size={14} /> {card.eyebrow}
                </span>
                <span className={d.count}>
                  0{i + 1} / 0{N}
                </span>
              </div>
              <h2 className={d.question}>{card.question}</h2>
              <div className={d.panel}>
                <span className={d.status}>
                  <span className={d.dot} /> {card.status}
                </span>
                <p className={d.headline}>{card.headline}</p>
                <span className={d.label}>{card.label}</span>
                <span className={d.figure}>
                  {front ? (
                    <FlipText key={turns} mode="reveal" duration={1.6} delay={0.15}>
                      {card.figure}
                    </FlipText>
                  ) : (
                    card.figure
                  )}
                </span>
              </div>
              <dl className={d.cells}>
                {card.cells.map((c) => (
                  <div key={c.label} className={d.cell}>
                    <dt>{c.label}</dt>
                    <dd>{c.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>

      <div className={d.tabs} role="tablist" aria-label="ChaanBean services">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          const on = i === active;
          return (
            <button
              key={card.id}
              id={`deck-tab-${card.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={card.tab}
              aria-controls={`deck-${card.id}`}
              className={`${d.tab} ${on ? d.tabOn : ""}`}
              data-tone={card.tone}
              onClick={() => show(i)}
            >
              <Icon size={15} />
              <span className={d.tabLabel}>{card.tab}</span>
              {on && playing && <span key={turns} className={d.progress} aria-hidden />}
            </button>
          );
        })}
        <button
          type="button"
          className={d.playBtn}
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? "Pause card rotation" : "Play card rotation"}
          aria-pressed={!playing}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
    </div>
  );
}
