"use client";

import React from "react";
import Link from "next/link";
import { Clock, Facebook, Instagram, Linkedin, Mail, Phone } from "lucide-react";
import s from "./site.module.css";
import type { ModalType } from "@/components/FooterModals";
import { OfficialInitiativesBar } from "@/components/OfficialInitiativesBar";
import { Brand } from "./SiteShell";
import { CONTACT, FOOTER, PILLARS, SECONDARY } from "./content";

function XLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIALS = [
  { href: "https://facebook.com/chaanbean", label: "Facebook", icon: <Facebook size={16} /> },
  { href: "https://linkedin.com/company/chaanbean", label: "LinkedIn", icon: <Linkedin size={16} /> },
  { href: "https://x.com/chaanbean", label: "X", icon: <XLogo /> },
  { href: "https://instagram.com/chaanbean", label: "Instagram", icon: <Instagram size={16} /> },
];

const COMPANY_LINKS: { modal: ModalType; label: string }[] = [
  { modal: "about", label: "About Us" },
  { modal: "blogs", label: "Blog" },
  { modal: "manuals", label: "User Guides" },
  { modal: "faqs", label: "FAQs" },
  { modal: "terms", label: "Terms" },
  { modal: "privacy", label: "Privacy" },
];

interface FooterProps {
  onEnquire: (product: string) => void;
  onOpenModal: (modal: ModalType) => void;
}

export function Footer({ onEnquire, onOpenModal }: FooterProps) {
  return (
    <footer className={s.footer}>
      <div className={`${s.container} ${s.footTop}`}>
        <div>
          <Link href="/landing" className={s.brand} aria-label="ChaanBean home">
            <Brand tagline={FOOTER.tagline} nameClassName={s.footBrandName} />
          </Link>
          <p className={s.footAbout}>{FOOTER.about}</p>
          <div className={s.socials}>
            {SOCIALS.map((so) => (
              <a key={so.label} href={so.href} target="_blank" rel="noopener noreferrer" className={s.social} aria-label={so.label}>
                {so.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className={s.footHeading}>Services</h3>
          <ul className={s.footList}>
            {PILLARS.map((p) => (
              <li key={p.id}>
                <a href={`#${p.id}`} className={s.footLink}>
                  {p.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#loans" className={s.footLink}>
                Business Loans
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className={s.footHeading}>More</h3>
          <ul className={s.footList}>
            {SECONDARY.map((p) => (
              <li key={p.id}>
                <button type="button" className={s.footLink} onClick={() => onEnquire(p.title)}>
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={s.footHeading}>Company</h3>
          <ul className={s.footList}>
            {COMPANY_LINKS.map((m) => (
              <li key={m.label}>
                <button type="button" className={s.footLink} onClick={() => onOpenModal(m.modal)}>
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={s.footHeading}>Contact</h3>
          <ul className={s.footList}>
            <li>
              <a href={CONTACT.phoneHref} className={s.footLink}>
                <Phone size={14} /> {CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className={s.footLink}>
                <Mail size={14} /> {CONTACT.email}
              </a>
            </li>
            <li>
              <span className={s.footLink}>
                <Clock size={14} /> {CONTACT.hours}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className={`${s.container} ${s.initiatives}`}>
        <OfficialInitiativesBar />
      </div>

      <div className={s.container}>
        <div className={s.footBottom}>
          <span>
            {FOOTER.copyright} {FOOTER.compliance}
          </span>
          <span className={s.footBottomLinks}>
            <Link href="/landing/login" className={s.footLink}>
              Customer Log In
            </Link>
            <Link href="/landing/subscription" className={s.footLink}>
              Plans
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
