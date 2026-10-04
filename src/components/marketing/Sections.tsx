"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, LogIn, Mail, MapPin, MessageCircle, Phone, Rocket } from "lucide-react";
import s from "./site.module.css";
import l from "./landing.module.css";
import { CONTACT, LOANS, PLAN_CARDS, PRICING_HEAD, SECONDARY, SECONDARY_HEAD, START, whatsappLink } from "./content";
import { Reveal } from "./Reveal";

/* ---------------------------------------------------------------------------
   More from ChaanBean (secondary products)
--------------------------------------------------------------------------- */

export function SecondarySection({ onEnquire }: { onEnquire: (product: string) => void }) {
  return (
    <div className={l.band}>
      <section id="more" className={s.section} style={{ paddingBlock: 88 }}>
        <div className={s.container}>
          <Reveal className={l.secHead}>
            <div>
              <span className={s.eyebrow}>{SECONDARY_HEAD.eyebrow}</span>
              <h2 className={l.secTitle}>{SECONDARY_HEAD.title}</h2>
            </div>
            <p className={l.secLead}>{SECONDARY_HEAD.lead}</p>
          </Reveal>
          <div className={l.secGrid}>
            {SECONDARY.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.id} delay={i * 70}>
                  <div className={l.secCard}>
                    <span className={l.secIcon}>
                      <Icon size={20} />
                    </span>
                    <h3 className={l.secName}>{p.title}</h3>
                    <p className={l.secLine}>{p.line}</p>
                    <div className={l.secCta}>
                      <button type="button" className={s.textLink} onClick={() => onEnquire(p.title)}>
                        Enquire <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Loans (secondary)
--------------------------------------------------------------------------- */

export function LoansSection() {
  return (
    <section id="loans" className={s.section}>
      <div className={s.container}>
        <Reveal className={`${s.sectionHead} ${s.center}`} >
          <span className={s.eyebrow}>Capital Access</span>
          <h2 className={s.sectionTitle}>{LOANS.title}</h2>
          <p className={s.sectionLead}>{LOANS.lead}</p>
        </Reveal>
        <div className={l.loanGrid}>
          {LOANS.items.map((loan, i) => {
            const Icon = loan.icon;
            return (
              <Reveal key={loan.title} delay={i * 70}>
                <div className={l.loan}>
                  <span className={l.secIcon}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{loan.title}</h3>
                    <p className={l.loanAmount}>{loan.amount}</p>
                    <p className={l.loanRate}>{loan.rate}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
        <div className={l.loanFoot}>
          <Link href="/landing/subscription" className={`${s.btn} ${s.btnGhost}`}>
            {LOANS.cta} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Pricing
--------------------------------------------------------------------------- */

export function PricingSection() {
  return (
    <section id="pricing" className={s.section} style={{ paddingTop: 0 }}>
      <div className={s.container}>
        <Reveal className={`${s.sectionHead} ${s.center}`}>
          <span className={s.eyebrow}>{PRICING_HEAD.eyebrow}</span>
          <h2 className={s.sectionTitle}>{PRICING_HEAD.title}</h2>
          <p className={s.sectionLead}>{PRICING_HEAD.lead}</p>
        </Reveal>
        <div className={l.plans}>
          {PLAN_CARDS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90}>
              <div className={`${l.plan} ${plan.featured ? l.planFeatured : ""}`}>
                {plan.badge && <span className={l.planBadge}>{plan.badge}</span>}
                <h3 className={l.planName}>{plan.name}</h3>
                <p className={l.planBlurb}>{plan.blurb}</p>
                <div className={l.planPrice}>
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </div>
                <span className={l.planValue}>{plan.value}</span>
                <ul className={l.planList}>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={16} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/landing/subscription"
                  className={`${s.btn} ${s.btnBlock} ${l.planCta} ${plan.featured ? s.btnPrimary : s.btnGhost}`}
                >
                  View plan details <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Get started: two clear doors, new customers and existing customers
--------------------------------------------------------------------------- */

export function StartSection() {
  return (
    <section className={s.section} style={{ paddingTop: 0 }}>
      <div className={s.container}>
        <Reveal>
          <h2 className={l.startTitle}>{START.title}</h2>
          <div className={l.doors}>
            <Link href="/landing/subscription" className={`${l.door} ${l.doorNew}`}>
              <span className={l.doorPattern} aria-hidden />
              <span className={l.doorIcon}>
                <Rocket size={24} />
              </span>
              <span className={l.doorTitle}>{START.newTitle}</span>
              <span className={l.doorText}>{START.newText}</span>
              <span className={l.doorCta}>
                {START.newTag}
                <span className={l.doorArrow}>
                  <ArrowRight size={16} />
                </span>
              </span>
            </Link>
            <Link href="/landing/login" className={`${l.door} ${l.doorExisting}`}>
              <span className={l.doorPattern} aria-hidden />
              <span className={l.doorIcon}>
                <LogIn size={24} />
              </span>
              <span className={l.doorTitle}>{START.existingTitle}</span>
              <span className={l.doorText}>{START.existingText}</span>
              <span className={l.doorCta}>
                {START.existingTag}
                <span className={l.doorArrow}>
                  <ArrowRight size={16} />
                </span>
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Contact
--------------------------------------------------------------------------- */

interface ContactData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export function contactMessage(d: ContactData, topic?: string) {
  return [
    topic ? `Enquiry: ${topic}` : "Enquiry from the ChaanBean website",
    `Name / Business: ${d.name}`,
    `Phone: ${d.phone}`,
    d.email ? `Email: ${d.email}` : "",
    d.message ? `Message: ${d.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function ContactSection() {
  const [sent, setSent] = useState<ContactData | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSent({
      name: String(f.get("name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      message: String(f.get("message") ?? "").trim(),
    });
  };

  return (
    <section id="contact" className={s.section} style={{ paddingTop: 0 }}>
      <div className={s.container}>
        <Reveal className={`${s.sectionHead} ${s.center}`}>
          <span className={s.eyebrow}>{CONTACT.eyebrow}</span>
          <h2 className={s.sectionTitle}>{CONTACT.title}</h2>
          <p className={s.sectionLead}>{CONTACT.lead}</p>
        </Reveal>
        <div className={l.contactGrid}>
          <Reveal>
            <div className={l.contactInfo}>
              <div className={l.contactList}>
                <div className={l.contactRow}>
                  <span className={l.contactIcon}>
                    <Phone size={18} />
                  </span>
                  <div>
                    <small>Phone & WhatsApp</small>
                    <a className={l.contactValue} href={CONTACT.phoneHref}>
                      {CONTACT.phoneDisplay}
                    </a>
                  </div>
                </div>
                <div className={l.contactRow}>
                  <span className={l.contactIcon}>
                    <Mail size={18} />
                  </span>
                  <div>
                    <small>Email</small>
                    <a className={l.contactValue} href={`mailto:${CONTACT.email}`}>
                      {CONTACT.email}
                    </a>
                  </div>
                </div>
                <div className={l.contactRow}>
                  <span className={l.contactIcon}>
                    <Clock size={18} />
                  </span>
                  <div>
                    <small>Hours</small>
                    <span className={l.contactValue}>{CONTACT.hours}</span>
                  </div>
                </div>
                {CONTACT.offices.map((o) => (
                  <div key={o.city} className={l.contactRow}>
                    <span className={l.contactIcon}>
                      <MapPin size={18} />
                    </span>
                    <div>
                      <small>{o.city} office</small>
                      <span className={`${l.contactValue} ${l.contactAddress}`}>{o.address}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className={l.formCard}>
              <h3>{CONTACT.formTitle}</h3>
              <p>{CONTACT.formLead}</p>
              {sent ? (
                <div className={s.success} role="status">
                  <span className={s.successIcon}>
                    <CheckCircle2 size={32} />
                  </span>
                  <h4>{CONTACT.successTitle}</h4>
                  <p>{CONTACT.successText}</p>
                  <div className={s.successActions}>
                    <a
                      href={whatsappLink(contactMessage(sent))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${s.btn} ${s.whatsBtn}`}
                    >
                      <MessageCircle size={18} /> Also send on WhatsApp
                    </a>
                    <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setSent(null)}>
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form className={s.form} onSubmit={onSubmit}>
                  <div>
                    <label className={s.label} htmlFor="contact-name">
                      Your name / business
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      className={s.field}
                      required
                      autoComplete="name"
                      placeholder="e.g. Ramesh Kumar (Agro Traders)"
                    />
                  </div>
                  <div className={s.formRow}>
                    <div>
                      <label className={s.label} htmlFor="contact-phone">
                        Phone
                      </label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        className={s.field}
                        required
                        autoComplete="tel"
                        placeholder="+91 98XXX XXXXX"
                      />
                    </div>
                    <div>
                      <label className={s.label} htmlFor="contact-email">
                        Email <span className={s.optional}>(optional)</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        className={s.field}
                        autoComplete="email"
                        placeholder="you@company.in"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={s.label} htmlFor="contact-message">
                      How can we help? <span className={s.optional}>(optional)</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      className={s.field}
                      placeholder="e.g. Need to check buyers or recover overdue payments"
                    />
                  </div>
                  <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`}>
                    {CONTACT.submit} <ArrowRight size={17} />
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
