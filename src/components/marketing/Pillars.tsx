"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Radio, Scale, ShieldAlert, ShieldCheck, Target } from "lucide-react";
import s from "./site.module.css";
import l from "./landing.module.css";
import { REMINDER_LANGUAGES } from "./copy";
import { COLLECTION_STEPS, LEGAL_NOTICE, PILLARS, PLATFORM_HEAD, PROTECTION_WATCH, VERDICT, type Pillar } from "./content";
import { Reveal } from "./Reveal";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/* ---------------------------------------------------------------------------
   Visuals, one per pillar
--------------------------------------------------------------------------- */

function CreditVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Fill the risk meters the first time the comparison is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const card = (kind: "good" | "risky") => {
    const v = VERDICT[kind];
    const good = kind === "good";
    const risk = v.matrix.find((m) => m.label === "Default risk")?.value ?? "0%";
    return (
      <article className={`${l.buyer} ${good ? l.buyerGood : l.buyerRisk}`}>
        <div className={l.buyerHead}>
          <span className={l.buyerIcon}>{good ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}</span>
          <span className={l.buyerLabel}>{good ? "Creditworthy" : "High risk"}</span>
          <span className={l.buyerGrade}>{good ? "A2" : "C3"}</span>
        </div>
        <p className={l.buyerVerdict}>{v.verdict}</p>
        <span className={l.buyerLimitLabel}>{VERDICT.limitLabel}</span>
        <strong className={l.buyerLimit}>{v.limit}</strong>
        <div className={l.meter}>
          <div className={l.meterTop}>
            <span>Default risk</span>
            <strong>{risk}</strong>
          </div>
          <span className={l.meterTrack}>
            <span className={l.meterFill} style={{ width: `${parseFloat(risk)}%` }} />
          </span>
        </div>
        <dl className={l.buyerFacts}>
          {v.matrix
            .filter((m) => m.label !== "Default risk")
            .map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
        </dl>
      </article>
    );
  };

  return (
    <>
      <div ref={ref} className={`${l.versus} ${inView ? l.meterOn : ""}`}>
        {card("good")}
        <span className={l.vs} aria-hidden>
          VS
        </span>
        {card("risky")}
      </div>
      <p className={l.stageNote}>Two sample buyers, checked side by side.</p>
    </>
  );
}

function ProtectionVisual() {
  return (
    <div className={l.mock}>
      <span className={l.mockEyebrow}>
        <Radio size={14} /> Live watch
      </span>
      <h4 className={l.mockTitle}>Credit given to cash received</h4>
      <div className={l.watch}>
        {PROTECTION_WATCH.map((item, i) => (
          <div key={item.name} className={l.watchItem} style={{ animationDelay: `${i * 120}ms` }}>
            <span className={l.watchIcon}>
              <Check size={15} strokeWidth={3} />
            </span>
            <strong>{item.name}</strong>
            <span className={l.watchStatus}>
              <span className={s.liveDot} /> {item.status}
            </span>
          </div>
        ))}
      </div>
      <div className={l.alertRow}>
        <AlertTriangle size={16} /> 1 buyer near credit limit. Review today.
      </div>
    </div>
  );
}

function CollectionsVisual() {
  const [active, setActive] = useState(0);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % COLLECTION_STEPS.length), 1600);
    return () => clearInterval(t);
  }, []);

  const current = REMINDER_LANGUAGES.find((x) => x.code === lang) ?? REMINDER_LANGUAGES[0];

  return (
    <div className={l.mock}>
      <span className={l.mockEyebrow}>One overdue invoice</span>
      <h4 className={l.mockTitle}>Followed up automatically</h4>
      <div className={l.steps}>
        {COLLECTION_STEPS.map((step, i) => (
          <span key={step} className={`${l.step} ${i < active ? l.stepDone : ""} ${i === active ? l.stepActive : ""}`}>
            <span className={l.stepNum}>{i < active ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
            {step}
          </span>
        ))}
      </div>
      <div className={l.langs} role="group" aria-label="Reminder language">
        {REMINDER_LANGUAGES.map((x) => (
          <button
            key={x.code}
            type="button"
            lang={x.code}
            className={`${l.lang} ${x.code === lang ? l.langOn : ""}`}
            aria-pressed={x.code === lang}
            onClick={() => setLang(x.code)}
          >
            {x.native}
          </button>
        ))}
      </div>
      <div className={l.voice}>
        <span className={l.voiceHead}>
          <Radio size={12} /> Voice and WhatsApp reminder · {current.name}
        </span>
        <p key={lang} lang={lang}>
          &ldquo;{current.text}&rdquo;
        </p>
      </div>
    </div>
  );
}

const RBI_BANK_RATE = 6.75;
const AMOUNT = { min: 50000, max: 5000000, step: 50000 };
const MONTHS = { min: 1, max: 24 };

function fill(value: number, min: number, max: number) {
  return `${((value - min) / (max - min)) * 100}%`;
}

function LegalVisual() {
  const [amount, setAmount] = useState(500000);
  const [months, setMonths] = useState(6);

  const interest = useMemo(() => {
    const monthly = (RBI_BANK_RATE * 3) / 100 / 12;
    return Math.round(amount * (Math.pow(1 + monthly, months) - 1));
  }, [amount, months]);

  return (
    <div className={l.mock}>
      <div className={l.notice}>
        <span className={l.noticeHead}>
          <Scale size={14} /> Legal notice
        </span>
        <p>{LEGAL_NOTICE}</p>
      </div>
      <div className={l.calc}>
        <span className={l.mockEyebrow}>
          <Target size={14} /> Interest your buyer owes
        </span>
        <div className={l.calcField}>
          <label htmlFor="calc-amount">
            Amount due <strong>{inr.format(amount)}</strong>
          </label>
          <input
            id="calc-amount"
            className={l.range}
            type="range"
            min={AMOUNT.min}
            max={AMOUNT.max}
            step={AMOUNT.step}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ "--fill": fill(amount, AMOUNT.min, AMOUNT.max) } as React.CSSProperties}
          />
        </div>
        <div className={l.calcField}>
          <label htmlFor="calc-months">
            Months overdue <strong>{months}</strong>
          </label>
          <input
            id="calc-months"
            className={l.range}
            type="range"
            min={MONTHS.min}
            max={MONTHS.max}
            step={1}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            style={{ "--fill": fill(months, MONTHS.min, MONTHS.max) } as React.CSSProperties}
          />
        </div>
        <div className={l.calcResult} aria-live="polite">
          <div>
            <small>Interest at 3x RBI bank rate</small>
            <span className={l.calcValue}>{inr.format(interest)}</span>
          </div>
          <div className={l.calcTotal}>
            <small>Total to recover</small>
            <strong>{inr.format(amount + interest)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

const VISUALS: Record<string, () => React.ReactElement> = {
  "credit-check": CreditVisual,
  "credit-protection": ProtectionVisual,
  "payment-automation": CollectionsVisual,
  legal: LegalVisual,
};

/* ---------------------------------------------------------------------------
   Section
--------------------------------------------------------------------------- */

function PillarRow({ pillar, index }: { pillar: Pillar; index: number }) {
  const Icon = pillar.icon;
  const Visual = VISUALS[pillar.id];
  return (
    <div
      id={pillar.id}
      className={`${l.tone} ${l.pillarRow} ${index % 2 === 1 ? l.pillarReverse : ""}`}
      data-tone={pillar.tone}
    >
      <Reveal className={l.pillarCopy}>
        <div className={l.kicker}>
          <span className={l.kickerIcon}>
            <Icon size={22} />
          </span>
          <span className={l.kickerText}>
            <strong>{pillar.title}</strong>
            <span>
              0{index + 1} · {pillar.label}
            </span>
          </span>
        </div>
        <h3 className={l.pillarTitle}>{pillar.headline}</h3>
        <p className={l.pillarDesc}>{pillar.description}</p>
        <ul className={l.checkList}>
          {pillar.points.map((point) => (
            <li key={point}>
              <span className={l.checkIcon}>
                <Check size={13} strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>
        <div className={l.pillarCtas}>
          <Link href="/landing/subscription" className={`${s.btn} ${l.toneBtn}`}>
            View Plans <ArrowRight size={18} />
          </Link>
          <Link href="/landing/login" className={s.textLink}>
            Customer Log In <ArrowRight size={16} />
          </Link>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className={l.stage}>
          <Visual />
        </div>
      </Reveal>
    </div>
  );
}

export function PillarsSection() {
  return (
    <section id="services" className={s.section}>
      <div className={s.container}>
        <Reveal className={`${s.sectionHead} ${s.center}`}>
          <span className={s.eyebrow}>{PLATFORM_HEAD.eyebrow}</span>
          <h2 className={s.sectionTitle}>
            {PLATFORM_HEAD.title} <span className={s.gradText}>{PLATFORM_HEAD.titleAccent}</span>
          </h2>
          <p className={s.sectionLead}>{PLATFORM_HEAD.lead}</p>
        </Reveal>
        <div className={l.pillars}>
          {PILLARS.map((p, i) => (
            <PillarRow key={p.id} pillar={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
