import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeftRight, ArrowRight, BadgeCheck, CheckCircle2, Handshake, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { ThemeSwitch } from "@/components/shell/theme-switch";
import { HeaderAction } from "@/components/site/header-action";
import { Pricing } from "@/components/site/pricing";
import { buttonClass, Skeleton } from "@/components/ui";
import { cn } from "@/components/ui/cn";

// The landing page (/): what ChaanBean does, the four tools (PRD v3.0 sections 6 to 8), how it works, why it is fair,
// the plans and pay-per-use prices read live from the price list (Appendix A), and questions. Sign-up starts at /login.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return { title: { absolute: t("metaTitle") }, description: t("metaDescription") };
}

const FEATURES = [
  { key: "credit", icon: ShieldCheck },
  { key: "cases", icon: Scale },
  { key: "security", icon: ArrowLeftRight },
  { key: "settlement", icon: Handshake },
] as const;

const section = "mx-auto w-full max-w-[1200px] px-5 md:px-8";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const strip = t.raw("strip") as string[];
  const steps = t.raw("how.steps") as { title: string; body: string }[];
  const trust = t.raw("trust.items") as { title: string; body: string }[];
  const faq = t.raw("faq.items") as { q: string; a: string }[];
  const signals = t.raw("mock.signals") as string[];

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] bg-[linear-gradient(180deg,rgba(255,128,40,0.14),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,82,0,0.18),transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] bg-[radial-gradient(var(--dot)_1.2px,transparent_1.2px)] bg-[length:24px_24px] [mask-image:linear-gradient(180deg,#000,transparent)]" aria-hidden="true" />

      <header className="sticky top-0 z-40 bg-[var(--nav-bg)] shadow-[0_1px_0_var(--border)] backdrop-blur-xl backdrop-saturate-150">
        <div className={cn(section, "flex h-[66px] items-center justify-between gap-3 md:h-[72px]")}>
          <Logo href="/" taglineClassName="hidden sm:block" />
          <nav aria-label={t("nav.menu")} className="hidden items-center gap-1 lg:flex">
            {(["features", "how", "pricing", "faq"] as const).map((k) => (
              <a key={k} href={`#${k}`} className="rounded-xl px-3 py-2 text-sm font-semibold text-text-2 hover:bg-surface-muted hover:text-primary-text">{t(`nav.${k}`)}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block"><ThemeSwitch /></span>
            <Suspense fallback={<Skeleton className="h-10 w-28 rounded-xl" />}>
              <HeaderAction />
            </Suspense>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className={cn(section, "grid gap-10 pb-14 pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:pb-20 lg:pt-16")}>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-line bg-primary-soft px-3.5 py-1.5 text-[0.8rem] font-bold text-primary-text">
              <Sparkles size={14} aria-hidden="true" /> {t("hero.chip")}
            </span>
            <h1 className="mt-5 text-[clamp(2.1rem,1.3rem+3.2vw,3.6rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-text [text-wrap:balance]">
              {t.rich("hero.title", { accent: (c) => <span className="bg-[image:var(--grad-brand)] bg-clip-text text-transparent">{c}</span> })}
            </h1>
            <p className="mt-5 max-w-[560px] text-[1.08rem] leading-relaxed text-text-2">{t("hero.lead")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className={buttonClass("primary", "md", "h-12 gap-2 px-6")}>{t("hero.primary")} <ArrowRight size={16} aria-hidden="true" /></Link>
              <a href="#pricing" className={buttonClass("secondary", "md", "h-12 px-6")}>{t("hero.secondary")}</a>
            </div>
            <p className="mt-4 text-sm text-muted">{t("hero.note")}</p>
          </div>

          {/* A sample report and sealed agreement, drawn with markup (illustration only). */}
          <div className="relative mx-auto mb-6 w-full max-w-[460px]" aria-hidden="true">
            <div className="rounded-[28px] border border-border bg-surface p-5 pb-16 shadow-[0_30px_60px_-30px_rgba(255,82,0,0.45)] sm:p-6 sm:pb-16">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-subtle">{t("mock.title")}</p>
                  <p className="mt-1 text-lg font-extrabold text-text">{t("mock.buyer")}</p>
                </div>
                <span className="rounded-lg bg-success-bg px-2.5 py-1 text-xs font-bold text-success-fg">{t("mock.risk")}</span>
              </div>
              <div className="mt-4 rounded-2xl bg-[image:var(--grad-brand)] p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-white/85">{t("mock.range")}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{t("mock.rangeValue")}</p>
                <p className="mt-1 text-xs text-white/85">{t("mock.rangeNote")}</p>
              </div>
              <ul className="mt-4 space-y-2">
                {signals.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-text-2"><CheckCircle2 size={16} className="shrink-0 text-success-fg" /> {s}</li>
                ))}
              </ul>
            </div>
            <div className="absolute -bottom-6 -left-3 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:-left-8">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-text"><BadgeCheck size={18} /></span>
              <span>
                <span className="block text-sm font-bold text-text">{t("mock.sealed")}</span>
                <span className="block text-xs text-muted">{t("mock.sealedSub")}</span>
              </span>
            </div>
          </div>
        </section>

        {/* Promise strip */}
        <section className="border-y border-border bg-surface-muted">
          <ul className={cn(section, "grid grid-cols-2 gap-4 py-5 md:grid-cols-4")}>
            {strip.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm font-semibold text-text-2"><CheckCircle2 size={16} className="shrink-0 text-primary" aria-hidden="true" /> {s}</li>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section id="features" className={cn(section, "scroll-mt-24 py-16 lg:py-24")}>
          <Heading eyebrow={t("features.eyebrow")} title={t("features.title")} lead={t("features.lead")} />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {FEATURES.map(({ key, icon: Icon }) => {
              const points = t.raw(`features.items.${key}.points`) as string[];
              return (
                <article key={key} className="flex flex-col rounded-[24px] border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[image:var(--grad-brand)] text-white shadow-[var(--shadow-orange)]" aria-hidden="true"><Icon size={20} /></span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary-text">{t(`features.items.${key}.tag`)}</p>
                      <h3 className="text-xl font-extrabold tracking-tight text-text">{t(`features.items.${key}.name`)}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-text-2">{t(`features.items.${key}.lead`)}</p>
                  <ul className="mt-4 space-y-2">
                    {points.map((p) => (
                      <li key={p} className="flex gap-2 text-sm text-text-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> {p}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 bg-surface-muted py-16 lg:py-24">
          <div className={section}>
            <Heading eyebrow={t("how.eyebrow")} title={t("how.title")} />
            <ol className="mt-10 grid gap-4 md:grid-cols-5">
              {steps.map((s, i) => (
                <li key={s.title} className="rounded-[20px] border border-border bg-surface p-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{i + 1}</span>
                  <h3 className="mt-3 font-bold text-text">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Trust */}
        <section className={cn(section, "py-16 lg:py-24")}>
          <Heading eyebrow={t("trust.eyebrow")} title={t("trust.title")} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((x) => (
              <div key={x.title} className="rounded-[20px] border border-border bg-surface p-5">
                <h3 className="font-bold text-text">{x.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{x.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/v" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text underline-offset-4 hover:underline">
              {t("trust.verify")} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 bg-surface-muted py-16 lg:py-24">
          <div className={section}>
            <Heading eyebrow={t("pricing.eyebrow")} title={t("pricing.title")} lead={t("pricing.lead")} />
            <Suspense fallback={<div className="mt-10 grid gap-5 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-96 rounded-[24px]" />)}</div>}>
              <Pricing />
            </Suspense>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={cn(section, "scroll-mt-24 py-16 lg:py-24")}>
          <Heading title={t("faq.title")} />
          <div className="mx-auto mt-8 max-w-[820px] divide-y divide-border rounded-[24px] border border-border bg-surface">
            {faq.map((f) => (
              <details key={f.q} className="group px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-text [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-text-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <section className={cn(section, "pb-16 lg:pb-24")}>
          <div className="bg-brand relative isolate overflow-hidden rounded-[28px] px-6 py-10 text-center text-white shadow-[0_30px_60px_-34px_rgba(255,82,0,0.75)] sm:px-10 sm:py-14 dark:bg-[linear-gradient(160deg,#2a1206_0%,#0b0b0b_55%)]">
            <h2 className="text-[clamp(1.6rem,1.1rem+2vw,2.4rem)] font-extrabold tracking-tight">{t("cta.title")}</h2>
            <p className="mt-2 text-white/90">{t("cta.lead")}</p>
            <Link href="/login" className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-[#e64a00] shadow-sm hover:bg-white/90">
              {t("cta.button")} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className={cn(section, "flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted sm:flex-row")}>
          <Logo href="/" tagline={false} />
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/legal/terms" className="hover:text-primary-text">{t("footer.terms")}</Link>
            <Link href="/legal/privacy" className="hover:text-primary-text">{t("footer.privacy")}</Link>
            <Link href="/v" className="hover:text-primary-text">{t("footer.verify")}</Link>
          </nav>
          <Suspense fallback={null}>
            <Year label={t.raw("footer.rights") as string} />
          </Suspense>
        </div>
      </footer>
    </>
  );
}

function Heading({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-[720px] text-center">
      {eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary-text">{eyebrow}</p> : null}
      <h2 className="mt-2 text-[clamp(1.7rem,1.2rem+2vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em] text-text [text-wrap:balance]">{title}</h2>
      {lead ? <p className="mt-3 text-text-2">{lead}</p> : null}
    </div>
  );
}

async function Year({ label }: { label: string }) {
  "use cache";
  return <span>{label.replace("{year}", String(new Date().getFullYear()))}</span>;
}
