"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import s from "./site.module.css";
import l from "./landing.module.css";
import { Brand, ThemeSwitch } from "./SiteShell";
import { PILLARS, SECONDARY } from "./content";

const NAV_LINKS = [
  { href: "#loans", label: "Loans" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

export function Navbar({ onEnquire }: { onEnquire: (product: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!servicesOpen && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        setMobileOpen(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setServicesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [servicesOpen, mobileOpen]);

  useEffect(() => {
    // Mobile browsers fire resize when the URL bar collapses, so only close once the desktop nav shows.
    const onResize = () => {
      if (window.innerWidth >= 1100) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeAll = () => {
    setServicesOpen(false);
    setMobileOpen(false);
  };

  const enquire = (product: string) => {
    closeAll();
    onEnquire(product);
  };

  return (
    <header className={s.header}>
      <div className={`${s.navBar} ${scrolled || mobileOpen ? s.navScrolled : ""}`}>
        <nav className={`${s.container} ${s.navInner}`} aria-label="Main">
          <Link href="/landing" className={s.brand} aria-label="ChaanBean home">
            <Brand />
          </Link>

          <div className={s.navLinks}>
            <div
              className={s.navDrop}
              ref={dropRef}
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button
                type="button"
                className={`${s.navLink} ${servicesOpen ? s.navLinkOpen : ""}`}
                aria-expanded={servicesOpen}
                aria-controls="services-menu"
                onClick={() => setServicesOpen((v) => !v)}
              >
                Services <ChevronDown size={16} className={s.navChevron} />
              </button>
              {servicesOpen && (
                <div id="services-menu" className={s.mega}>
                  <div>
                    <span className={s.megaLabel}>Core services</span>
                    <div className={s.megaGrid}>
                      {PILLARS.map((p) => {
                        const Icon = p.icon;
                        return (
                          <a key={p.id} href={`#${p.id}`} className={`${l.tone} ${s.megaItem}`} data-tone={p.tone} onClick={closeAll}>
                            <span className={s.megaIcon}>
                              <Icon size={19} />
                            </span>
                            <span>
                              <span className={s.megaItemTitle}>{p.label}</span>
                              <span className={s.megaItemText}>{p.tileLine}</span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                  <div className={s.megaSide}>
                    <span className={s.megaLabel}>More from ChaanBean</span>
                    {SECONDARY.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button key={p.id} type="button" className={s.megaSideItem} onClick={() => enquire(p.title)}>
                          <Icon size={16} />
                          {p.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={s.navLink}>
                {link.label}
              </a>
            ))}
          </div>

          <div className={s.navActions}>
            <ThemeSwitch />
            <Link href="/landing/login" className={s.loginLink}>
              Log In
            </Link>
            <Link href="/landing/subscription" className={`${s.btn} ${s.btnPrimary} ${s.btnSmall} ${s.navCta}`}>
              Explore Plans <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              className={s.menuBtn}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div id="mobile-menu" className={s.mobilePanel}>
            <div className={`${s.container} ${s.mobileInner}`}>
              <div className={s.mobilePillars}>
                {PILLARS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <a key={p.id} href={`#${p.id}`} className={`${l.tone} ${s.mobilePillar}`} data-tone={p.tone} onClick={closeAll}>
                      <span className={s.megaIcon} style={{ width: 36, height: 36, borderRadius: 10 }}>
                        <Icon size={18} />
                      </span>
                      {p.label}
                    </a>
                  );
                })}
              </div>
              <a href="#more" className={s.mobileLink} onClick={closeAll}>
                More from ChaanBean
              </a>
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className={s.mobileLink} onClick={closeAll}>
                  {link.label}
                </a>
              ))}
              <div className={s.mobileActions}>
                <Link href="/landing/login" className={`${s.btn} ${s.btnGhost}`} onClick={closeAll}>
                  Log In
                </Link>
                <Link href="/landing/subscription" className={`${s.btn} ${s.btnPrimary}`} onClick={closeAll}>
                  Explore Plans
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
