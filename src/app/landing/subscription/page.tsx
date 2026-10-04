"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  CheckCircle2,
  Coins,
  Crown,
  LayoutGrid,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
  ReceiptIndianRupee,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Brand, SiteShell, ThemeSwitch } from "@/components/marketing/SiteShell";
import s from "@/components/marketing/site.module.css";
import p from "@/components/marketing/pages.module.css";
import { Modal } from "@/components/marketing/Modal";
import { useInPageLinks } from "@/components/marketing/useInPageLinks";
import { CONTACT, FOOTER, noDash, whatsappLink } from "@/components/marketing/content";
import { FlipText } from "@/components/obsidian/FlipText";
import { RECHARGE_TIERS, DEFAULT_RATE_CARD } from "@/lib/pricing/recharge-plans";

interface Bundle {
  id: "growth" | "enterprise";
  priceKey: string;
  name: string;
  blurb: string;
  defaultPrice: number;
  grossPrice: number;
  popular?: boolean;
  highlights: [string, string][];
}

// 3-month bundles. Full inclusions are in COMPARE below.
const BUNDLES: Bundle[] = [
  {
    id: "growth",
    priceKey: "growth_subscription",
    name: "Retail Plan (Growth)",
    blurb: "For small and mid-sized businesses.",
    defaultPrice: 9899,
    grossPrice: 49200,
    popular: true,
    highlights: [
      ["10", "Director KYC checks"],
      ["10", "Udyam (MSME) reports"],
      ["40", "GST turnover checks"],
      ["30", "Court case reports"],
      ["3,500", "Recovery voice calls"],
      ["5", "Legal notices"],
    ],
  },
  {
    id: "enterprise",
    priceKey: "enterprise_subscription",
    name: "Enterprise Plan",
    blurb: "Higher limits and a dedicated legal desk.",
    defaultPrice: 17599,
    grossPrice: 85950,
    highlights: [
      ["20", "Director KYC checks"],
      ["20", "Udyam (MSME) reports"],
      ["65", "GST turnover checks"],
      ["50", "Court case reports"],
      ["6,000", "Recovery voice calls"],
      ["10", "Legal notices"],
    ],
  },
];

const COMPARE: { group: string; rows: [string, string, string][] }[] = [
  {
    group: "Credit checks",
    rows: [
      ["Director details (DIN KYC and disqualification)", "10", "20"],
      ["MSME reports (Udyam classification)", "10", "20"],
      ["GST slab and tax bracket checks", "40", "65"],
      ["GST turnover filed (GSTR-3B and GSTR-9)", "40", "65"],
      ["GST monthly filing calendar", "40", "65"],
      ["PAN to GST lookups, all states", "40", "65"],
      ["Mobile to PAN lookups", "40", "65"],
      ["Mobile identity (alternate numbers)", "10", "25"],
      ["Court case history and FIR reports", "30", "50"],
      ["Import export reports (DGFT IEC)", "40", "65"],
    ],
  },
  {
    group: "Recovery and legal",
    rows: [
      ["Recovery voice calls", "3,500", "6,000"],
      ["Payment follow-ups (promise to pay)", "500", "1,000"],
      ["Legal notices (§43B(h), DRC-01A, MSMED)", "5", "10"],
    ],
  },
  {
    group: "Account",
    rows: [
      ["User seats", "3", "5"],
      ["Extra company profile", "1", "1"],
    ],
  },
];

interface CallPack {
  id: string;
  calls: string;
  price: number;
  months: number;
  perCall: string;
  popular?: boolean;
}

const CALL_PACKS: CallPack[] = [
  { id: "alacarte_3k", calls: "3,000", price: 4500, months: 3, perCall: "₹1.50" },
  { id: "alacarte_8k", calls: "8,000", price: 10000, months: 6, perCall: "₹1.25", popular: true },
  { id: "alacarte_14k", calls: "14,000", price: 15000, months: 9, perCall: "₹1.07" },
  { id: "alacarte_19k", calls: "19,000", price: 20000, months: 12, perCall: "₹1.05" },
];

const PAY_TIERS = RECHARGE_TIERS.filter((t) => !t.isCustomization);
const CUSTOM_TIERS = RECHARGE_TIERS.filter((t) => t.isCustomization);

const CUSTOM_PERKS = [
  "Custom voice recovery scripts in regional languages",
  "Your own branded legal notice templates",
  "Dedicated success manager, replies within 2 hours",
  "API access for Tally, SAP and Marg",
];

const SAMPLE_RATES: [string, string][] = [
  ["default_payment_voice_calls", "Recovery voice call"],
  ["gst_slab", "GST slab check"],
  ["director_details", "Director KYC check"],
  ["court_case_history", "Court case search"],
  ["legal_notices", "Legal notice"],
];

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const monthsLabel = (m: number) => (m === 12 ? "1 year" : `${m} months`);

export default function SubscriptionPage() {
  const [pricingMap, setPricingMap] = useState<Record<string, number>>({
    growth_subscription: 9899,
    enterprise_subscription: 17599,
  });
  const [payTierId, setPayTierId] = useState(PAY_TIERS[1]?.id ?? PAY_TIERS[0].id);
  const [showRateCard, setShowRateCard] = useState(false);

  // Enquiry: the selected option is stored by id so labels can follow live prices.
  const [planKey, setPlanKey] = useState<string>("growth");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useInPageLinks();

  // Prices can be changed by the owner from the admin desk.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/pricing");
        const data = await res.json();
        if (cancelled || !data?.pricing) return;
        const map: Record<string, number> = {};
        for (const key of Object.keys(data.pricing)) {
          const price = data.pricing[key]?.price;
          if (typeof price === "number") map[key] = price;
        }
        setPricingMap((prev) => ({ ...prev, ...map }));
      } catch {
        // Keep the published prices if the pricing service is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bundlePrice = (b: Bundle) => pricingMap[b.priceKey] ?? b.defaultPrice;
  const payTier = PAY_TIERS.find((t) => t.id === payTierId) ?? PAY_TIERS[0];
  const rate = (key: string) => DEFAULT_RATE_CARD.find((r) => r.key === key)?.price;

  const planLabel = (key: string): string => {
    const bundle = BUNDLES.find((b) => b.id === key);
    if (bundle) return `${bundle.name} · ${rupees(bundlePrice(bundle))}`;
    const tier = RECHARGE_TIERS.find((t) => t.id === key);
    if (tier) {
      return tier.isCustomization
        ? `Custom setup · ${rupees(tier.amount)} / year`
        : `Pay & Use · ${rupees(tier.amount)} (${monthsLabel(tier.validityMonths)})`;
    }
    const pack = CALL_PACKS.find((c) => c.id === key);
    if (pack) return `${pack.calls} recovery calls · ${rupees(pack.price)}`;
    if (key === "custom") return "Custom setup · from ₹50,000 / year";
    return "Not sure yet, please advise me";
  };

  const choosePlan = (key: string) => {
    setPlanKey(key);
    setSent(false);
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 650);
  };

  const enquiryText = () =>
    [
      `Hi ChaanBean, I would like to subscribe.`,
      `Plan: ${planLabel(planKey)}`,
      `Name: ${name}`,
      `Business: ${company}`,
      `Phone: ${phone}`,
      email ? `Email: ${email}` : "",
      message ? `Message: ${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const mailLink = () =>
    `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Plan enquiry: ${planLabel(planKey)}`)}&body=${encodeURIComponent(
      enquiryText()
    )}`;

  // There is no enquiry inbox on the server yet, so the details go straight to the team on WhatsApp.
  const handleEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(whatsappLink(enquiryText()), "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <SiteShell>
      <div className={p.page}>
        <header className={p.topbar}>
          <div className={`${s.container} ${p.topbarInner}`}>
            <Link href="/landing" className={s.brand} aria-label="ChaanBean home">
              <Brand />
            </Link>
            <div className={p.topActions}>
              <Link href="/landing" className={`${p.backLink} ${p.hideXs}`}>
                <ArrowLeft size={14} /> Home
              </Link>
              <Link href="/landing/login" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`}>
                Log In
              </Link>
              <ThemeSwitch />
            </div>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className={`${s.container} ${p.subHero}`}>
            <span className={s.eyebrow}>
              <Sparkles size={14} /> Plans &amp; Pricing
            </span>
            <h1 className={p.subTitle}>
              Choose your{" "}
              <span className={p.accentOrange}>
                <FlipText mode="reveal" duration={2} delay={0.35}>
                  Credit &amp; Recovery
                </FlipText>
              </span>{" "}
              plan
            </h1>
            <p className={p.subLead}>18 services for credit checks, recovery calls and legal notices. One wallet for all of it.</p>
            <ul className={p.assure}>
              <li>
                <CheckCircle2 size={16} /> 100% of what you pay goes to your wallet
              </li>
              <li>
                <CheckCircle2 size={16} /> Charged only when you use a service
              </li>
              <li>
                <CheckCircle2 size={16} /> Prices exclude 18% GST
              </li>
            </ul>

            <div className={p.chooser}>
              <p className={p.chooserLabel}>Which suits you?</p>
              <div className={p.paths}>
                <a href="#bundles" className={p.path}>
                  <span className={p.pathTop}>
                    <span className={p.pathIcon}>
                      <CalendarCheck size={20} />
                    </span>
                    <span className={p.pathTag}>Save 80%</span>
                  </span>
                  <strong className={p.pathTitle}>3-Month Plans</strong>
                  <span className={p.pathText}>Checks, calls and legal notices bundled together.</span>
                  <span className={p.pathFoot}>
                    <span className={p.pathPrice}>
                      <small>From</small>
                      {rupees(bundlePrice(BUNDLES[0]))}
                    </span>
                    <span className={p.pathArrow}>
                      <ArrowDown size={16} />
                    </span>
                  </span>
                </a>
                <a href="#pay-use" className={`${p.path} ${p.pathGreen}`}>
                  <span className={p.pathTop}>
                    <span className={p.pathIcon}>
                      <Wallet size={20} />
                    </span>
                    <span className={p.pathTag}>No lock-in</span>
                  </span>
                  <strong className={p.pathTitle}>Pay &amp; Use</strong>
                  <span className={p.pathText}>Recharge your wallet and pay only for what you use.</span>
                  <span className={p.pathFoot}>
                    <span className={p.pathPrice}>
                      <small>From</small>
                      {rupees(PAY_TIERS[0].amount)}
                    </span>
                    <span className={p.pathArrow}>
                      <ArrowDown size={16} />
                    </span>
                  </span>
                </a>
                <a href="#calls" className={`${p.path} ${p.pathAmber}`}>
                  <span className={p.pathTop}>
                    <span className={p.pathIcon}>
                      <PhoneCall size={20} />
                    </span>
                    <span className={p.pathTag}>9 languages</span>
                  </span>
                  <strong className={p.pathTitle}>Recovery Calls</strong>
                  <span className={p.pathText}>AI reminder call packs for overdue payments.</span>
                  <span className={p.pathFoot}>
                    <span className={p.pathPrice}>
                      <small>From</small>
                      {rupees(CALL_PACKS[0].price)}
                    </span>
                    <span className={p.pathArrow}>
                      <ArrowDown size={16} />
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </section>

          {/* 3-month bundles */}
          <section id="bundles" className={`${s.container} ${p.block}`} aria-labelledby="bundles-title">
            <div className={p.blockHead}>
              <div>
                <h2 id="bundles-title" className={p.blockTitle}>
                  3-Month Plans
                </h2>
                <p className={p.blockLead}>Everything a growing business needs to check buyers and collect on time.</p>
              </div>
              <a href="#compare" className={s.textLink}>
                Compare all features <ArrowRight size={15} />
              </a>
            </div>

            <div className={p.planGrid}>
              {BUNDLES.map((b) => {
                const price = bundlePrice(b);
                const save = Math.round(((b.grossPrice - price) / b.grossPrice) * 100);
                return (
                  <article key={b.id} className={`${p.planCard} ${b.popular ? p.planFeatured : ""}`}>
                    {b.popular && (
                      <span className={p.planBadge}>
                        <Crown size={13} /> Most popular
                      </span>
                    )}
                    <h3 className={p.planName}>{b.name}</h3>
                    <p className={p.planBlurb}>{b.blurb}</p>
                    <div className={p.priceRow}>
                      <strong className={p.price}>{rupees(price)}</strong>
                      <span className={p.per}>/ 3 months</span>
                    </div>
                    <p className={p.worth}>
                      <s>Worth {rupees(b.grossPrice)}</s>
                      <span className={`${s.chip} ${s.chipGreen}`}>Save {save}%</span>
                    </p>
                    <ul className={p.quota}>
                      {b.highlights.map(([n, label]) => (
                        <li key={label}>
                          <strong>{n}</strong>
                          <span>{label}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnBlock} ${b.popular ? s.btnPrimary : s.btnDark} ${p.planCta}`}
                      onClick={() => choosePlan(b.id)}
                    >
                      Choose {b.id === "growth" ? "Retail" : "Enterprise"} <ArrowRight size={16} />
                    </button>
                  </article>
                );
              })}

              <article className={`${p.planCard} ${p.customCard}`}>
                <span className={p.customIcon}>
                  <BadgeCheck size={20} />
                </span>
                <h3 className={p.planName}>Custom Setup</h3>
                <p className={p.planBlurb}>For large receivable books and multi-branch teams.</p>
                <div className={p.priceRow}>
                  <strong className={p.price}>{rupees(CUSTOM_TIERS[0]?.amount ?? 50000)}+</strong>
                  <span className={p.per}>/ year</span>
                </div>
                <ul className={p.customPerks}>
                  {CUSTOM_PERKS.map((perk) => (
                    <li key={perk}>
                      <Check size={15} strokeWidth={3} /> {perk}
                    </li>
                  ))}
                </ul>
                <button type="button" className={`${s.btn} ${s.btnBlock} ${s.btnLight} ${p.planCta}`} onClick={() => choosePlan("custom")}>
                  Talk to Us <ArrowRight size={16} />
                </button>
              </article>
            </div>
          </section>

          {/* Full comparison */}
          <section id="compare" className={`${s.container} ${p.block}`} aria-labelledby="compare-title">
            <div className={p.blockHead}>
              <div>
                <h2 id="compare-title" className={p.blockTitle}>
                  What&apos;s included
                </h2>
                <p className={p.blockLead}>Quantities for one 3-month plan (90 days of validity).</p>
              </div>
            </div>
            <div className={p.compareWrap}>
              <table className={p.compare}>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className={p.srOnly}>Feature</span>
                    </th>
                    {BUNDLES.map((b) => (
                      <th key={b.id} scope="col">
                        <span className={p.compareName}>{b.id === "growth" ? "Retail" : "Enterprise"}</span>
                        <span className={p.comparePrice}>{rupees(bundlePrice(b))}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                {COMPARE.map((g) => (
                  <tbody key={g.group}>
                    <tr className={p.compareGroup}>
                      <th scope="colgroup" colSpan={3}>
                        {g.group}
                      </th>
                    </tr>
                    {g.rows.map(([label, a, b]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>{a}</td>
                        <td>{b}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </section>

          {/* Pay & Use wallet */}
          <section id="pay-use" className={`${s.container} ${p.block}`} aria-labelledby="pay-title">
            <div className={p.blockHead}>
              <div>
                <h2 id="pay-title" className={p.blockTitle}>
                  Pay &amp; Use Wallet
                </h2>
                <p className={p.blockLead}>Recharge once and use any of the 18 services. Unused balance carries forward within validity.</p>
              </div>
            </div>

            <div className={p.payCard}>
              <div className={p.payPick}>
                <p className={p.pickLabel} id="pay-amount-label">
                  Choose recharge amount
                </p>
                <div className={p.tierGrid} role="radiogroup" aria-labelledby="pay-amount-label">
                  {PAY_TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={payTierId === t.id}
                      className={`${p.tier} ${payTierId === t.id ? p.tierOn : ""}`}
                      onClick={() => setPayTierId(t.id)}
                    >
                      <strong>{rupees(t.amount)}</strong>
                      <span>{monthsLabel(t.validityMonths)}</span>
                    </button>
                  ))}
                </div>
                <p className={p.bestFor}>
                  <strong>Best for:</strong> {noDash(payTier.recommendedFor)}
                </p>
                <ol className={p.howItWorks} aria-label="How Pay & Use works">
                  <li>
                    <span>
                      <Wallet size={18} />
                    </span>
                    Recharge your wallet once
                  </li>
                  <li>
                    <span>
                      <LayoutGrid size={18} />
                    </span>
                    Use any of the 18 services
                  </li>
                  <li>
                    <span>
                      <ReceiptIndianRupee size={18} />
                    </span>
                    Pay only for what you use
                  </li>
                </ol>
              </div>

              <div className={p.paySummary}>
                <div className={p.sumTop}>
                  <span>You pay</span>
                  <strong>{rupees(payTier.amount)}</strong>
                </div>
                <ul className={p.sumList}>
                  <li>
                    <span>Wallet credit</span>
                    <strong>{rupees(payTier.amount)}</strong>
                  </li>
                  <li>
                    <span>Valid for</span>
                    <strong>{monthsLabel(payTier.validityMonths)}</strong>
                  </li>
                </ul>
                <p className={p.ratesLabel}>Sample rates</p>
                <ul className={p.sumList}>
                  {SAMPLE_RATES.map(([key, label]) => {
                    const price = rate(key);
                    return price === undefined ? null : (
                      <li key={key}>
                        <span>{label}</span>
                        <strong>{rupees(price)}</strong>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className={p.rateBtn} onClick={() => setShowRateCard(true)}>
                  <Coins size={15} /> See all 18 rates
                </button>
                <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`} onClick={() => choosePlan(payTier.id)}>
                  Recharge {rupees(payTier.amount)} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* Calls only */}
          <section id="calls" className={`${s.container} ${p.block}`} aria-labelledby="calls-title">
            <div className={p.blockHead}>
              <div>
                <h2 id="calls-title" className={p.blockTitle}>
                  Only need recovery calls?
                </h2>
                <p className={p.blockLead}>AI payment reminder calls in 9 Indian languages. Unused calls roll over within validity.</p>
              </div>
            </div>
            <div className={p.callGrid}>
              {CALL_PACKS.map((c) => (
                <article key={c.id} className={`${p.callCard} ${c.popular ? p.callPopular : ""}`}>
                  {c.popular && <span className={p.callTag}>Popular</span>}
                  <span className={p.callIcon}>
                    <PhoneCall size={18} />
                  </span>
                  <strong className={p.callCalls}>{c.calls} calls</strong>
                  <span className={p.callPrice}>{rupees(c.price)}</span>
                  <span className={p.callMeta}>
                    <span>{c.perCall} per call</span>
                    <span>Valid {monthsLabel(c.months)}</span>
                  </span>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnSmall} ${s.btnBlock} ${c.popular ? s.btnPrimary : s.btnGhost}`}
                    onClick={() => choosePlan(c.id)}
                    aria-label={`Choose ${c.calls} calls pack`}
                  >
                    Choose
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* Enquiry */}
          <section id="contact" className={`${s.container} ${p.block} ${p.contactBlock}`} aria-labelledby="contact-title">
            <div className={p.contactGrid}>
              <div className={p.contactPanel}>
                <span className={p.panelGlow} aria-hidden />
                <h2 id="contact-title" className={p.contactTitle}>
                  Ready to start?
                </h2>
                <p className={p.contactLead}>Tell us the plan you want. We&apos;ll set it up for you.</p>
                <ol className={p.steps}>
                  <li>
                    <span>1</span> Send us your plan and details
                  </li>
                  <li>
                    <span>2</span> We call back within 2 business hours
                  </li>
                  <li>
                    <span>3</span> Your plan is activated
                  </li>
                </ol>
                <div className={p.channels}>
                  <a href={CONTACT.phoneHref} className={p.channel}>
                    <Phone size={16} /> {CONTACT.phoneDisplay}
                  </a>
                  <a href={`mailto:${CONTACT.email}`} className={p.channel}>
                    <Mail size={16} /> {CONTACT.email}
                  </a>
                </div>
                <p className={p.hours}>{CONTACT.hours}</p>
              </div>

              <div className={p.formCard}>
                {sent ? (
                  <div className={s.success} role="status">
                    <span className={s.successIcon}>
                      <MessageCircle size={30} />
                    </span>
                    <h4>WhatsApp is ready with your details</h4>
                    <p>
                      Press <strong>Send</strong> in WhatsApp for <strong>{planLabel(planKey)}</strong>. Our team replies within 2
                      business hours.
                    </p>
                    <div className={s.successActions}>
                      <a href={whatsappLink(enquiryText())} target="_blank" rel="noopener noreferrer" className={`${s.btn} ${s.whatsBtn}`}>
                        <MessageCircle size={18} /> Open WhatsApp Again
                      </a>
                      <a href={mailLink()} className={`${s.btn} ${s.btnGhost}`}>
                        <Mail size={17} /> Email Instead
                      </a>
                    </div>
                    <button type="button" className={p.editBtn} onClick={() => setSent(false)}>
                      Edit details
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEnquiry} className={s.form}>
                    <div>
                      <label className={s.label} htmlFor="inq-plan">
                        Plan
                      </label>
                      <select id="inq-plan" value={planKey} onChange={(e) => setPlanKey(e.target.value)} className={s.field}>
                        <optgroup label="3-Month Plans (price per 3 months)">
                          {BUNDLES.map((b) => (
                            <option key={b.id} value={b.id}>
                              {planLabel(b.id)}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Pay & Use Wallet">
                          {PAY_TIERS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {planLabel(t.id)}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Custom Setup (1 year)">
                          <option value="custom">{planLabel("custom")}</option>
                          {CUSTOM_TIERS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {planLabel(t.id)}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Recovery Calls Only">
                          {CALL_PACKS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {planLabel(c.id)}
                            </option>
                          ))}
                        </optgroup>
                        <option value="other">{planLabel("other")}</option>
                      </select>
                    </div>
                    <div className={s.formRow}>
                      <div>
                        <label className={s.label} htmlFor="inq-name">
                          Your name <span className={s.req}>*</span>
                        </label>
                        <input
                          ref={nameRef}
                          id="inq-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                          className={s.field}
                        />
                      </div>
                      <div>
                        <label className={s.label} htmlFor="inq-company">
                          Business name <span className={s.req}>*</span>
                        </label>
                        <input
                          id="inq-company"
                          type="text"
                          required
                          autoComplete="organization"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="e.g. Shree Ganesh Traders"
                          className={s.field}
                        />
                      </div>
                    </div>
                    <div className={s.formRow}>
                      <div>
                        <label className={s.label} htmlFor="inq-phone">
                          Mobile / WhatsApp <span className={s.req}>*</span>
                        </label>
                        <input
                          id="inq-phone"
                          type="tel"
                          required
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="98765 43210"
                          className={s.field}
                        />
                      </div>
                      <div>
                        <label className={s.label} htmlFor="inq-email">
                          Email <span className={s.optional}>(optional)</span>
                        </label>
                        <input
                          id="inq-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@yourbusiness.in"
                          className={s.field}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={s.label} htmlFor="inq-message">
                        Anything else? <span className={s.optional}>(optional)</span>
                      </label>
                      <textarea
                        id="inq-message"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g. number of buyers you sell to on credit"
                        className={s.field}
                      />
                    </div>
                    <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`}>
                      <MessageCircle size={17} /> Send on WhatsApp
                    </button>
                    <p className={p.formNote}>
                      Prefer email? <a href={mailLink()}>Send these details by email</a>.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className={p.miniFoot}>
          <div className={`${s.container} ${p.miniFootInner}`}>
            <span>{FOOTER.copyright}</span>
            <span>{FOOTER.compliance}</span>
          </div>
        </footer>

        {/* Universal rate card */}
        <Modal open={showRateCard} onClose={() => setShowRateCard(false)} labelledBy="rate-card-title" wide>
          <span className={s.eyebrow}>
            <Coins size={14} /> Pay &amp; Use
          </span>
          <h3 id="rate-card-title" className={s.modalTitle}>
            Rate card: all 18 services
          </h3>
          <p className={s.modalLead}>Deducted from your wallet only when a service is used. Prices exclude 18% GST.</p>
          <div className={p.rateWrap}>
            <table className={p.rateTable}>
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Billed</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_RATE_CARD.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <strong>{noDash(item.name)}</strong>
                      <small>{item.categoryLabel}</small>
                    </td>
                    <td>{item.unit}</td>
                    <td className={p.ratePrice}>{item.price === 0 ? "Free" : rupees(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={p.rateFoot}>
            <button type="button" className={`${s.btn} ${s.btnDark} ${s.btnSmall}`} onClick={() => setShowRateCard(false)}>
              Close
            </button>
          </div>
        </Modal>
      </div>
    </SiteShell>
  );
}
