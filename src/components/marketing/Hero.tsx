"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { FlipText } from "@/components/obsidian/FlipText";
import { TextReel } from "@/components/obsidian/TextReel";
import s from "./site.module.css";
import l from "./landing.module.css";
import { BUILT_FOR, HERO, PILLARS } from "./content";
import { HeroDeck } from "./HeroDeck";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <>
      <div className={l.heroWrap}>
        <div className={`${s.container} ${l.hero}`}>
          <div>
            <span className={l.heroBadge}>
              <span className={l.heroBadgeIcon}>
                <Sparkles size={14} />
              </span>
              {HERO.badge}
            </span>
            <h1 className={l.heroTitle}>
              {HERO.titleLead}
              <span className={l.heroAccent}>
                <FlipText mode="reveal" duration={2.2} delay={0.45}>
                  {HERO.titleAccent}
                </FlipText>
              </span>
            </h1>
            <p className={l.heroLead}>{HERO.lead}</p>
            <div className={l.heroCtas}>
              <Link href="/landing/subscription" className={`${s.btn} ${s.btnLight} ${l.heroPrimary}`}>
                {HERO.primaryCta} <ArrowRight size={18} />
              </Link>
              <Link href="/landing/login" className={`${s.btn} ${s.btnGlass}`}>
                <Lock size={16} /> {HERO.secondaryCta}
              </Link>
            </div>
            <ul className={l.heroPoints}>
              {HERO.points.map((point) => (
                <li key={point}>
                  <CheckCircle2 size={17} /> {point}
                </li>
              ))}
            </ul>
          </div>

          <div className={l.heroVisual}>
            <HeroDeck />
          </div>
        </div>
      </div>

      <div className={`${s.container} ${l.tilesWrap}`}>
        <div className={l.tiles}>
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.id} delay={i * 90}>
                <a href={`#${p.id}`} className={`${l.tone} ${l.tile}`} data-tone={p.tone}>
                  <div className={l.tileTop}>
                    <span className={l.tileIcon}>
                      <Icon size={25} />
                    </span>
                    <span className={l.tileNum}>0{i + 1}</span>
                  </div>
                  <span className={l.tileLabel}>{p.label}</span>
                  <h3 className={l.tileName}>{p.title}</h3>
                  <p className={l.tileLine}>{p.tileLine}</p>
                  <span className={l.tileFoot}>
                    <span className={l.tileFootText}>Learn more</span>
                    <span className={l.tileArrow}>
                      <ArrowRight size={15} />
                    </span>
                  </span>
                </a>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className={l.builtFor}>
            <div>
              <span className={s.eyebrow}>{BUILT_FOR.eyebrow}</span>
              <h2 className={l.builtForTitle}>{BUILT_FOR.title}</h2>
              <p className={l.builtForText}>{BUILT_FOR.text}</p>
            </div>
            <TextReel items={BUILT_FOR.items} prefix={BUILT_FOR.prefix} fontSize="clamp(1.05rem, 0.7rem + 2vw, 2rem)" />
          </div>
        </Reveal>
      </div>
    </>
  );
}
