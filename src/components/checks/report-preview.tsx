"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Carousel } from "@/components/ui/carousel";
import { formatInrShort } from "@/lib/money";
import { exampleReport, type ExampleReport } from "@/lib/example-report";
import { CompanyVisual, DirectorsChart, RangeBar } from "./report-charts";
import { CibilBody, CompanyBody, DirectorBody, GstBody, IdentityBody, RatingBody, TurnoverBody } from "./report-sections";

// What a Credit Worthiness report looks like, filled with a made-up company (src/lib/example-report.ts). Shown before a
// company is chosen, and faded behind a note in place of a report section that has no data. Always labelled "Example".

export type PreviewKey = "gst" | "turnover" | "cibil" | "identity" | "company" | "rating";

const short = (paise: number) => formatInrShort(BigInt(Math.round(paise)));

export function useExample() {
  return useMemo(() => exampleReport(), []);
}

/** The body of one report section, filled with the example company. */
export function ExampleBody({ k, ex }: { k: PreviewKey; ex: ExampleReport }) {
  switch (k) {
    case "gst":
      return <GstBody d={ex.gst} />;
    case "turnover":
      return <TurnoverBody d={ex.turnover} />;
    case "cibil":
      return <CibilBody d={ex.cibil} title={null} />;
    case "identity":
      return <IdentityBody msme={ex.msme} pan={ex.pan} iec={null} trade={ex.trade} />;
    case "company":
      return (
        <div className="space-y-4">
          <CompanyBody d={ex.company} />
          <CompanyVisual d={ex.company} />
          <DirectorsChart d={ex.directors} />
          <DirectorBody d={ex.directors} />
        </div>
      );
    case "rating":
      return <RatingBody d={ex.rating} />;
  }
}

export function ExampleBadge({ className }: { className?: string }) {
  const t = useTranslations("report.preview");
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border border-dashed border-border-strong bg-surface px-1.5 py-[3px] text-[11px] font-medium leading-none text-muted", className)}>
      <Eye size={11} aria-hidden="true" />
      {t("example")}
    </span>
  );
}

/**
 * A faded, non-interactive example under a note: used for a section the user did not get data for. The example is
 * hidden from screen readers; the note says what happened and what the user can do.
 */
export function GhostSection({ k, ex, title, note, action, tone = "neutral" }: { k: PreviewKey; ex: ExampleReport; title: ReactNode; note: ReactNode; action?: ReactNode; tone?: "neutral" | "warning" }) {
  return (
    <MockReveal title={title} note={note} action={action} tone={tone}>
      <ExampleBody k={k} ex={ex} />
    </MockReveal>
  );
}

/**
 * Interactive mock view for data that is not there: a faded example under a note, with "See example" to open it.
 * Opened, the example is fully usable (chart views, expanders, buttons) inside a dashed "Example" frame, and nothing
 * it does is saved. Closed, it is inert and hidden from screen readers.
 */
export function MockReveal({ children, title, note, action, tone = "neutral", minHeight = "min-h-56" }: {
  children: ReactNode; title: ReactNode; note: ReactNode; action?: ReactNode; tone?: "neutral" | "warning"; minHeight?: string;
}) {
  const tp = useTranslations("report.preview");
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="animate-[cb-fade-up_0.25s_ease-out_both] overflow-hidden rounded-2xl border border-dashed border-primary-line bg-primary-softer/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-primary-line bg-surface/70 px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-muted">
            <ExampleBadge />
            {tp("tryIt")}
          </span>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-text-2 hover:bg-hover">
            <EyeOff size={14} aria-hidden="true" /> {tp("hide")}
          </button>
        </div>
        <div className="space-y-4 p-3 text-sm">{children}</div>
        {action ? <div className="flex justify-center border-t border-dashed border-primary-line bg-surface/70 px-3 py-2.5">{action}</div> : null}
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", minHeight)}>
      <div aria-hidden="true" inert className="pointer-events-none max-h-72 select-none overflow-hidden opacity-45 blur-[1.5px] saturate-[0.4] [mask-image:linear-gradient(180deg,#000_45%,transparent)]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cn("w-full max-w-sm rounded-2xl bg-surface/95 p-4 text-center shadow-md backdrop-blur", tone === "warning" && "ring-1 ring-warning/30")}>
          <ExampleBadge />
          <p className="mt-2 font-head text-sm font-bold text-text">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{note}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white shadow-orange transition-[filter,scale] duration-150 hover:brightness-105 active:scale-[0.97]"
            >
              <Eye size={15} aria-hidden="true" /> {tp("see")}
            </button>
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The full example report, as the start page shows it before a company is chosen. */
export function ReportPreview() {
  const t = useTranslations("report");
  const tp = useTranslations("report.preview");
  const ex = useExample();
  const signals: { tone: "positive" | "caution"; text: string }[] = [
    { tone: "positive", text: t("signal.long_standing", { years: 14 }) },
    { tone: "positive", text: t("signal.growing_turnover", { years: 3 }) },
    { tone: "caution", text: t("signal.irregular_filing", { count: 3 }) },
    { tone: "caution", text: t("signal.moderate_overdue", { days: 34 }) },
  ];
  const sections: { k: PreviewKey; title: string; what: string }[] = [
    { k: "gst", title: t("sectionGst"), what: tp("what.gst") },
    { k: "turnover", title: t("sectionTurnover"), what: tp("what.turnover") },
    { k: "cibil", title: t("sectionCibil"), what: tp("what.cibil") },
    { k: "company", title: t("sectionCompany"), what: tp("what.company") },
    { k: "identity", title: t("sectionIdentity"), what: tp("what.identity") },
    { k: "rating", title: t("sectionRating"), what: tp("what.rating") },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
            {ex.name} <ExampleBadge />
          </p>
          <p className="mt-0.5 text-xs text-muted">{tp("headerNote")}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-warning/25 bg-warning-bg p-4 text-warning-fg">
          <p className="text-[11px] font-medium uppercase tracking-[1px] opacity-80">{t("riskTitle")}</p>
          <p className="mt-2 font-head text-2xl font-extrabold tracking-tight">{t("risk.medium")}</p>
          <p className="mt-1 text-xs">{t("riskCounts", { good: 2, warn: 2 })}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("rangeTitle")}</p>
          <p className="mt-2 font-head text-xl font-extrabold tracking-tight text-gradient">{t("rangeValue", { low: short(ex.range.lowPaise), high: short(ex.range.highPaise) })}</p>
          <p className="mt-1 text-xs text-muted">{tp("rangeNote")}</p>
          <RangeBar lowPaise={ex.range.lowPaise} highPaise={ex.range.highPaise} basePaise={ex.range.basePaise} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("whyTitle")}</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {signals.map((s) => (
              <li key={s.text} className="flex items-start gap-2">
                {s.tone === "positive" ? <CheckCircle2 size={14} className="mt-px shrink-0 text-success-fg" aria-hidden="true" /> : <AlertTriangle size={14} className="mt-px shrink-0 text-warning-fg" aria-hidden="true" />}
                <span className="text-text-2">{s.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Carousel label={tp("carousel")} slide="basis-[88%] sm:basis-[calc((100%-0.75rem)/2)] xl:basis-[calc((100%-1.5rem)/3)]">
        {sections.map((s) => (
          <section key={s.k} className="flex h-full flex-col rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <h3 className="font-head text-sm font-bold text-text">{s.title}</h3>
              <ExampleBadge />
            </div>
            <div className="max-h-[26rem] flex-1 space-y-4 overflow-hidden px-4 py-4 text-sm [mask-image:linear-gradient(180deg,#000_85%,transparent)]">
              <p className="text-xs text-muted">{s.what}</p>
              <ExampleBody k={s.k} ex={ex} />
            </div>
          </section>
        ))}
      </Carousel>
    </div>
  );
}
