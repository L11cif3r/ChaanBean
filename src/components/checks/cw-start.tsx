"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, FileSpreadsheet, ListChecks, Plus, Search, ShieldCheck } from "lucide-react";
import { SectionLabel, Tag, type Tone } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { CompanySearch, type CompanyOption } from "./company-search";
import { ReportPreview } from "./report-preview";

// Credit Worthiness start page (S08 before a company is chosen), in the ObsidianUI style: the search at the top with
// quick picks, three plain steps, then an example report so a first-time user sees what they will get before paying,
// and recent reports with the Excel upload at the foot.

export interface RecentReport {
  id: string;
  companyId: string;
  name: string;
  /** Trade name, for the quick-pick chips. */
  shortName?: string | null;
  risk: "low" | "medium" | "high" | "not_enough_data" | null;
  createdAt: string;
}

const RISK_TONE: Record<string, Tone> = { high: "danger", medium: "warning", low: "success", not_enough_data: "neutral" };
const STEPS = [
  { key: "search", icon: Search },
  { key: "tick", icon: ListChecks },
  { key: "report", icon: ShieldCheck },
] as const;

export function CwStart({ companies, recent, onPick }: { companies: CompanyOption[]; recent: RecentReport[]; onPick: (id: string, added?: CompanyOption) => void }) {
  const t = useTranslations("checks.start");
  const tr = useTranslations("report.risk");

  // Typed into the empty box: a few saved names, a GSTIN and a city, so people see every way to search.
  const examples = useMemo(() => {
    const names = companies.slice(0, 3).map((c) => c.tradeName || c.name);
    const gstin = companies.find((c) => c.gstin)?.gstin;
    const city = companies.find((c) => c.city)?.city;
    return [...names, ...(gstin ? [gstin] : []), ...(city ? [city] : [])];
  }, [companies]);
  const quick = useMemo(() => {
    const seen = new Set<string>();
    return recent.filter((r) => (seen.has(r.companyId) ? false : (seen.add(r.companyId), true))).slice(0, 4);
  }, [recent]);

  return (
    <div className="space-y-8">
      <section className="relative z-10 overflow-visible rounded-3xl border border-border bg-surface shadow-sm">
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
            {t("chip", { count: companies.length })}
          </span>
          <h1 className="animate-rise mt-4 text-[clamp(1.75rem,1.2rem+2.2vw,2.75rem)] font-extrabold leading-[1.1] tracking-[-0.035em] text-text [animation-delay:60ms] [text-wrap:balance]">
            {t.rich("title", { accent: (c) => <span className="text-gradient">{c}</span> })}
          </h1>
          <p className="animate-rise mx-auto mt-3 max-w-lg text-[15px] text-muted [animation-delay:120ms]">{t("lead")}</p>

          <div className="animate-rise relative z-20 mt-6 [animation-delay:180ms]">
            <label htmlFor="buyer" className="sr-only">{t("searchLabel")}</label>
            <CompanySearch companies={companies} value={null} onChange={(id, added) => id && onPick(id, added)} hero examples={examples} />
          </div>

          {quick.length ? (
            <div className="animate-rise mt-5 flex flex-wrap items-center justify-center gap-1.5 [animation-delay:240ms]">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{t("recentlyChecked")}</span>
              {quick.map((r) => (
                <button
                  key={r.companyId}
                  type="button"
                  onClick={() => onPick(r.companyId)}
                  title={r.name}
                  className="h-8 max-w-[15rem] truncate rounded-full border border-border bg-surface px-3 text-xs font-semibold text-text-2 shadow-sm transition-[border-color,color,scale] duration-150 hover:border-primary-line hover:text-primary-text active:scale-[0.97]"
                >
                  {r.shortName ?? r.name}
                </button>
              ))}
            </div>
          ) : null}

          <ol className="animate-rise mx-auto mt-7 grid max-w-xl grid-cols-3 gap-2 text-left [animation-delay:300ms]">
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

          <div className="animate-rise mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-semibold [animation-delay:360ms]">
            <Link href="/counterparties/new?then=check" className="inline-flex items-center gap-1.5 text-muted hover:text-text"><Plus size={15} aria-hidden="true" /> {t("addCompany")}</Link>
            <Link href="/checks/bulk" className="inline-flex items-center gap-1.5 text-muted hover:text-text"><FileSpreadsheet size={15} aria-hidden="true" /> {t("bulk")}</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="preview-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <SectionLabel>{t("previewEyebrow")}</SectionLabel>
            <h2 id="preview-title" className="mt-2 text-xl font-extrabold tracking-tight text-text">{t("previewTitle")}</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-muted">{t("previewLead")}</p>
          </div>
        </div>
        <ReportPreview />
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <h2 className="font-head text-[15px] font-bold text-text">{t("recentReports")}</h2>
            <Link href="/checks/history" className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text">{t("seeAll")} <ArrowRight size={13} aria-hidden="true" /></Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-border">
              {recent.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-hover">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text">{r.name}</span>
                      <span className="block text-xs text-subtle">{formatDate(r.createdAt.slice(0, 10))}</span>
                    </span>
                    {r.risk ? <Tag tone={RISK_TONE[r.risk]}>{tr(r.risk)}</Tag> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-muted">{t("noReports")}</p>
          )}
        </div>

        <div className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-orange" aria-hidden="true">
            <FileSpreadsheet size={18} />
          </span>
          <h2 className="mt-3 font-head text-base font-extrabold text-text">{t("bulkTitle")}</h2>
          <p className="mt-1 flex-1 text-[13px] text-muted">{t("bulkBody")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/checks/bulk" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white shadow-orange transition-[filter,scale] duration-150 hover:brightness-105 active:scale-[0.97]">
              <FileSpreadsheet size={14} aria-hidden="true" /> {t("bulkCta")}
            </Link>
            <span className="text-[11px] text-subtle">{t("bulkNote")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
