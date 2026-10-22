"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Clock, Gavel, ListChecks, Search, ShieldAlert, Siren, UserCheck } from "lucide-react";
import { Carousel, SectionLabel, StatCard } from "@/components/ui";
import { CompanySearch, type CompanyOption } from "@/components/checks/company-search";
import { ExampleBadge } from "@/components/checks/report-preview";
import { InteractiveMatches } from "./case-ui";

// Case Check before a company is chosen, in the Credit Worthiness start-page look: a hero with the search and three
// steps, what each search covers, then an example result whose review buttons can be tried (nothing is saved).

const CHECKS = [
  { key: "court", icon: Gavel },
  { key: "fir", icon: Siren },
  { key: "aml", icon: ShieldAlert },
] as const;
const STEPS = [
  { key: "search", icon: Search },
  { key: "tick", icon: ListChecks },
  { key: "review", icon: UserCheck },
] as const;

export function CaseStart({ companies, onPick }: { companies: CompanyOption[]; onPick: (id: string, added?: CompanyOption) => void }) {
  const t = useTranslations("cases.start");
  const tc = useTranslations("cases");
  const examples = useMemo(() => companies.slice(0, 3).map((c) => c.tradeName || c.name), [companies]);

  return (
    <div className="space-y-8">
      <section className="relative z-10 rounded-3xl border border-border bg-surface shadow-sm">
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
          <span className="absolute inset-0 bg-soft" />
          <span className="animate-drift absolute -left-20 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.28),transparent_65%)] blur-2xl" />
          <span className="animate-drift-back absolute -bottom-28 -right-16 size-80 rounded-full bg-[radial-gradient(circle,rgba(180,92,255,0.22),transparent_65%)] blur-2xl" />
          <span className="absolute inset-0 bg-[radial-gradient(var(--dot)_1px,transparent_1px)] bg-[length:18px_18px] [mask-image:radial-gradient(ellipse_at_top,#000_15%,transparent_70%)]" />
        </span>
        <div className="relative mx-auto max-w-2xl px-4 py-9 text-center sm:px-8 sm:py-12">
          <span className="animate-rise inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-semibold text-text-2 shadow-sm backdrop-blur">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-primary" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {t("chip")}
          </span>
          <h1 className="animate-rise mt-4 text-[clamp(1.75rem,1.2rem+2.2vw,2.75rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-text [animation-delay:60ms] [text-wrap:balance]">
            {t.rich("hero", { accent: (c) => <span className="text-gradient">{c}</span> })}
          </h1>
          <p className="animate-rise mx-auto mt-3 max-w-lg text-[15px] text-muted [animation-delay:120ms]">{t("lead")}</p>

          <div className="animate-rise relative z-20 mt-6 [animation-delay:180ms]">
            <label htmlFor="buyer" className="sr-only">{tc("buyer")}</label>
            <CompanySearch companies={companies} value={null} onChange={(id, added) => id && onPick(id, added)} hero examples={examples} />
          </div>

          <ol className="animate-rise mx-auto mt-7 grid max-w-xl grid-cols-3 gap-2 text-left [animation-delay:240ms]">
            {STEPS.map(({ key, icon: Icon }, i) => (
              <li key={key} className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:items-start sm:gap-2.5 sm:text-left">
                <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-text shadow-sm" aria-hidden="true">
                  <Icon size={16} />
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">{i + 1}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-text">{t(`steps.${key}.title`)}</span>
                  <span className="block text-[11.5px] leading-snug text-muted">{t(`steps.${key}.body`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Carousel label={t("checksLabel")} slide="basis-[80%] md:basis-[calc((100%-1.5rem)/3)]" controls="dots">
        {CHECKS.map(({ key, icon: Icon }, i) => (
          <div key={key} className="relative isolate h-full overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <span className="pointer-events-none absolute -right-12 -top-12 -z-10 size-36 rounded-full bg-soft blur-xl" aria-hidden="true" />
            <span className={i === 0 ? "flex size-11 items-center justify-center rounded-xl bg-brand text-white shadow-orange" : "flex size-11 items-center justify-center rounded-xl bg-soft text-primary-text"} aria-hidden="true">
              <Icon size={19} />
            </span>
            <p className="mt-3 font-head text-base font-extrabold text-text">{t(`checks.${key}.title`)}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted">{t(`checks.${key}.body`)}</p>
            <p className="mt-3 text-xs font-bold text-primary-text">{t(`checks.${key}.tag`)}</p>
          </div>
        ))}
      </Carousel>

      <section aria-labelledby="case-preview" className="space-y-3">
        <div>
          <SectionLabel>{t("previewEyebrow")}</SectionLabel>
          <h2 id="case-preview" className="mt-2 text-xl font-extrabold tracking-tight text-text">{t("previewTitle")}</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted">{t("previewLead")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
          <p className="flex flex-wrap items-center gap-2 font-head text-sm font-bold text-text">EXAMPLE TRADERS PRIVATE LIMITED <ExampleBadge /></p>
          <p className="text-xs text-muted">{t("exampleWhere")}</p>
        </div>
        <div className="snap-carousel -mx-4 gap-3 px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 [&>*]:w-[46%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
          <StatCard label={tc("count.matches")} value={4} icon={<Gavel />} />
          <StatCard label={tc("count.pending")} value={3} icon={<Clock />} />
          <StatCard label={tc("count.disposed")} value={1} icon={<CheckCircle2 />} />
          <StatCard label={tc("count.notReviewed")} value={4} icon={<AlertTriangle />} />
        </div>
        <p className="text-xs font-medium text-primary-text">{t("tryButtons")}</p>
        <InteractiveMatches className="md:grid-cols-2 xl:grid-cols-4" />
        <p className="text-xs text-muted">{tc("onlyConfirmed")}</p>
      </section>
    </div>
  );
}
