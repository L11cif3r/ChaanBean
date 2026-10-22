"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, ChevronDown, Gavel, Landmark, ShieldAlert, Siren } from "lucide-react";
import { Tag, type Tone } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { formatDate, formatDateTimeIst } from "@/lib/dates";
import type { CaseMatchView, Review } from "@/server/cases/service";

// Case Check building blocks in the Credit Worthiness look: a match card with a confidence meter and the three review
// answers, and made-up example matches that work as an interactive mock view (answers change on screen only).

export const CONFIDENCE_TONE: Record<CaseMatchView["confidence"], Tone> = { high: "danger", medium: "warning", low: "neutral" };
const REVIEW_TONE: Record<Review, Tone> = { pending: "neutral", confirmed: "danger", not_this_person: "success", unsure: "warning" };
const SOURCE_ICON = { court: Gavel, fir: Siren, aml: ShieldAlert } as const;
const day = (d: string | null) => (d ? formatDate(d) : "—");

/** One possible match. `data-match` marks real matches (tests and styles); examples carry `data-example`. */
export function MatchCard({
  m, canReview, saving, onReview, example,
}: {
  m: CaseMatchView;
  canReview: boolean;
  saving?: boolean;
  onReview?: (v: Exclude<Review, "pending">) => void;
  example?: boolean;
}) {
  const t = useTranslations("cases");
  const Icon = SOURCE_ICON[m.source] ?? Landmark;
  const level = m.confidence === "high" ? 3 : m.confidence === "medium" ? 2 : 1;
  const choice = (v: Exclude<Review, "pending">) => (
    <button
      key={v}
      type="button"
      aria-pressed={m.review === v}
      disabled={saving}
      onClick={() => onReview?.(v)}
      className={cn(
        "h-9 flex-1 rounded-lg px-2.5 text-xs font-semibold transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[0.97] disabled:opacity-60",
        m.review === v
          ? v === "confirmed" ? "bg-danger text-white shadow-danger" : v === "not_this_person" ? "bg-success text-white" : "bg-warning text-white"
          : "bg-surface text-text-2 shadow-sm hover:text-text",
      )}
    >
      {t(`review.${v}`)}
    </button>
  );
  return (
    <article
      {...(example ? { "data-example": "" } : { "data-match": "" })}
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-surface p-4 shadow-sm transition-[border-color,box-shadow] duration-200",
        m.review === "confirmed" ? "border-danger/40 shadow-[0_0_0_3px_var(--danger-bg)]" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", m.confidence === "high" ? "bg-brand text-white shadow-orange" : "bg-soft text-primary-text")} aria-hidden="true">
            <Icon size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-head text-[15px] font-extrabold text-text">{m.caseNo ?? m.listName ?? t("listEntry")}</span>
            <span className="block text-xs text-subtle">{t(`source.${m.source}`)}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Tag tone={CONFIDENCE_TONE[m.confidence]}>{t(`confidence.${m.confidence}`)}</Tag>
          <span className="flex gap-0.5" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1.5 w-4 rounded-full", i <= level ? (m.confidence === "high" ? "bg-danger" : m.confidence === "medium" ? "bg-warning" : "bg-subtle") : "bg-surface-strong")} />
            ))}
          </span>
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="col-span-2">
          <dt className="sr-only">{t("col.court")}</dt>
          <dd className="font-medium text-text-2">{m.court}</dd>
        </div>
        <div>
          <dt className="text-subtle">{t("col.type")}</dt>
          <dd className="mt-0.5 font-medium text-text">
            {m.caseType}
            {m.recovery ? <Tag tone="warning" className="ml-1 align-middle">{t("recovery")}</Tag> : null}
          </dd>
        </div>
        <div>
          <dt className="text-subtle">{t("col.filed")}</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-text">{day(m.filedOn ?? m.listDate)}</dd>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-2">
          <dt className="sr-only">{t("col.status")}</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <Tag tone={m.pending ? "info" : "neutral"}>{m.status}</Tag>
            {m.nextHearing ? (
              <span className="inline-flex items-center gap-1 text-subtle">
                <CalendarClock size={13} aria-hidden="true" /> {t("nextHearing", { date: day(m.nextHearing) })}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <details className="group mt-3 text-xs">
        <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-primary-text">
          {t("moreAboutCase")} <ChevronDown size={13} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <dl className="mt-2 space-y-1.5 rounded-xl bg-surface-muted p-3">
          <div><dt className="font-semibold text-text-2">{t("parties")}</dt><dd>{m.parties.map((p) => `${p.name} (${t(`role.${p.role}`)})`).join(", ")}</dd></div>
          {m.acts.length ? <div><dt className="font-semibold text-text-2">{t("acts")}</dt><dd>{m.acts.join("; ")}</dd></div> : null}
          {m.listName ? <div><dt className="font-semibold text-text-2">{t("list")}</dt><dd>{t("listValue", { name: m.listName, date: day(m.listDate) })}</dd></div> : null}
          <div><dt className="font-semibold text-text-2">{t("matchScore")}</dt><dd>{m.score} / 100</dd></div>
        </dl>
      </details>

      <div className="mt-auto pt-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{t("col.review")}</p>
        {canReview ? (
          <div className="flex gap-1 rounded-xl bg-surface-strong p-1" role="group" aria-label={t("reviewLabel", { case: m.caseNo ?? m.court })}>
            {choice("confirmed")}
            {choice("not_this_person")}
            {choice("unsure")}
          </div>
        ) : (
          <Tag tone={REVIEW_TONE[m.review]}>{t(`review.${m.review}`)}</Tag>
        )}
        {m.reviewedBy && m.reviewedAt ? <span className="mt-1.5 block text-[11px] text-subtle">{t("reviewedBy", { name: m.reviewedBy, date: formatDateTimeIst(new Date(m.reviewedAt)) })}</span> : null}
      </div>
    </article>
  );
}

const base = { recovery: false, listName: null, listDate: null, details: {}, reviewedBy: null, reviewedAt: null };

/** Made-up matches for the example result and the mock views. */
export const EXAMPLE_MATCHES: CaseMatchView[] = [
  {
    ...base, id: "ex-1", source: "court", caseNo: "CC 1234/2025", court: "Metropolitan Magistrate Court, Bengaluru", caseType: "Cheque bounce (NI Act s.138)",
    filedOn: "2025-03-11", status: "Pending", pending: true, nextHearing: "2026-11-18",
    parties: [{ role: "complainant", name: "Sample Steels LLP" }, { role: "accused", name: "Example Traders Pvt Ltd" }],
    acts: ["Negotiable Instruments Act, 1881 s.138"], recovery: true, score: 92, confidence: "high", review: "pending",
  },
  {
    ...base, id: "ex-2", source: "court", caseNo: "OS 567/2022", court: "City Civil Court, Bengaluru", caseType: "Money recovery suit",
    filedOn: "2022-08-02", status: "Disposed", pending: false, nextHearing: null,
    parties: [{ role: "petitioner", name: "Demo Finance Ltd" }, { role: "respondent", name: "Example Traders" }],
    acts: ["Code of Civil Procedure, Order 37"], recovery: true, score: 71, confidence: "medium", review: "pending",
  },
  {
    ...base, id: "ex-3", source: "fir", caseNo: "FIR 0213/2024", court: "Peenya Police Station, Bengaluru", caseType: "Cheating (BNS 318)",
    filedOn: "2024-01-19", status: "Under investigation", pending: true, nextHearing: null,
    parties: [{ role: "accused", name: "Example Trading Co" }], acts: ["Bharatiya Nyaya Sanhita s.318"], score: 48, confidence: "low", review: "pending",
  },
  {
    ...base, id: "ex-4", source: "aml", caseNo: null, court: "UN Security Council consolidated list", caseType: "Sanctions list entry",
    filedOn: null, status: "Listed", pending: true, nextHearing: null, listName: "UNSC consolidated list", listDate: "2026-09-30",
    parties: [{ role: "listed", name: "Example Traders" }], acts: [], score: 35, confidence: "low", review: "pending",
  },
];

/** Example matches whose review answers work on screen only: the interactive mock view. */
export function InteractiveMatches({ matches = EXAMPLE_MATCHES, className }: { matches?: CaseMatchView[]; className?: string }) {
  const [answers, setAnswers] = useState<Record<string, Review>>({});
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {matches.map((m) => (
        <MatchCard key={m.id} example m={{ ...m, review: answers[m.id] ?? m.review }} canReview onReview={(v) => setAnswers((a) => ({ ...a, [m.id]: v }))} />
      ))}
    </div>
  );
}
