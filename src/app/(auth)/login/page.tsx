import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, FileSignature, Handshake, Lock, Scale, ShieldCheck, Sparkles, Store } from "lucide-react";
import { Carousel, Tag, type Tone } from "@/components/ui";
import { LoginForm } from "./login-form";

// S01: sign in or start sign-up with a mobile number and a one-time password. Split layout: the brand panel with an
// auto-playing benefit carousel on the left (desktop), the form on the right. On phones the form comes first and a
// compact carousel follows it.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S01.title") };
}

const SLIDES = [
  { key: "creditCheck", icon: ShieldCheck, tone: "success" },
  { key: "caseCheck", icon: Scale, tone: "info" },
  { key: "transactions", icon: FileSignature, tone: "success" },
  { key: "settlements", icon: Handshake, tone: "warning" },
] as const satisfies readonly { key: string; icon: unknown; tone: Tone }[];

const TRUST = [
  { key: "trustOtp", icon: Lock },
  { key: "trustEncrypted", icon: BadgeCheck },
  { key: "trustIndia", icon: Store },
] as const;

export default async function LoginPage() {
  const t = await getTranslations("login");
  return (
    <div className="grid grid-cols-1 gap-5 lg:min-h-[calc(100dvh-190px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10">
      {/* Brand panel: beside the form on desktop, a compact carousel under it on phones. */}
      <aside
        aria-label={t("asideLabel")}
        className="relative isolate order-2 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6 lg:order-none lg:rounded-3xl lg:p-10"
      >
        <span className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <span className="absolute inset-0 bg-soft" />
          <span className="animate-drift absolute -left-24 -top-28 size-80 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.26),transparent_65%)] blur-2xl" />
          <span className="animate-drift-back absolute -bottom-32 -right-20 size-96 rounded-full bg-[radial-gradient(circle,rgba(180,92,255,0.2),transparent_65%)] blur-2xl" />
          <span className="absolute inset-0 bg-[radial-gradient(var(--dot)_1px,transparent_1px)] bg-[length:18px_18px] [mask-image:radial-gradient(ellipse_at_top_left,#000_10%,transparent_70%)]" />
        </span>

        <div className="hidden lg:block">
          <span className="animate-rise inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-semibold text-text-2 shadow-sm backdrop-blur">
            <Sparkles size={13} className="text-primary-text" aria-hidden="true" /> {t("asideChip")}
          </span>
          <p className="animate-rise mt-5 font-head text-[clamp(2rem,1.2rem+2vw,2.9rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-text [animation-delay:60ms] [text-wrap:balance]">
            {t.rich("asideTitle", { accent: (c) => <span className="text-gradient">{c}</span> })}
          </p>
          <p className="animate-rise mt-3 max-w-md text-[15px] text-muted [animation-delay:120ms]">{t("asideLead")}</p>
        </div>

        <p className="mb-3 text-[11px] font-semibold uppercase leading-none tracking-[1.2px] text-subtle lg:mb-3.5 lg:mt-8">{t("loginFor")}</p>
        <Carousel label={t("slidesLabel")} autoPlay={4500} slide="basis-[88%] sm:basis-[60%] lg:basis-full" controls="dots" className="animate-rise [animation-delay:180ms]">
          {SLIDES.map(({ key, icon: Icon, tone }) => (
            <div key={key} className="flex h-full items-center gap-3.5 rounded-2xl border border-border bg-surface/90 p-4 shadow-sm backdrop-blur lg:p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-orange lg:size-12" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="font-head text-[15px] font-bold text-text lg:text-base">{t(`modules.${key}`)}</span>
                  <Tag tone={tone}>{t(`slides.${key}.tag`)}</Tag>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{t(`slides.${key}.line`)}</span>
              </span>
            </div>
          ))}
        </Carousel>

        <ul className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-text-2 lg:flex">
          {TRUST.map(({ key, icon: Icon }) => (
            <li key={key} className="inline-flex items-center gap-1.5">
              <Icon size={15} className="text-primary-text" aria-hidden="true" /> {t(key)}
            </li>
          ))}
        </ul>
      </aside>

      <div className="mx-auto w-full min-w-0 max-w-md lg:max-w-none">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
