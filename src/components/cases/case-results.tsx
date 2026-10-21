"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, StatCard, Tag, type Tone } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst } from "@/lib/dates";
import { GST_STATES } from "@/server/providers/identity/states";
import type { CaseCheckView, CaseMatchView, Review } from "@/server/cases/service";

// S12 results (PRD v3.0 Figure 17): counters (marker 3), the ranked matches with confidence (marker 4) and the review
// buttons (marker 5). Only "This is them" counts in the credit report's risk level. Polls while a search runs.

const CONFIDENCE_TONE: Record<CaseMatchView["confidence"], Tone> = { high: "danger", medium: "warning", low: "neutral" };
const REVIEW_TONE: Record<Review, Tone> = { pending: "neutral", confirmed: "danger", not_this_person: "success", unsure: "warning" };

export function CaseResults({ initial, canReview }: { initial: CaseCheckView; canReview: boolean }) {
  const t = useTranslations("cases");
  const toast = useToast();
  const [view, setView] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await api<CaseCheckView>(`/api/v1/cases/${view.id}`);
    if (res.ok) setView(res.data);
  }, [view.id]);

  const running = view.items.some((i) => i.status === "queued" || i.status === "running");
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void reload(), 3000);
    return () => clearInterval(timer);
  }, [running, reload]);

  async function review(id: string, value: Exclude<Review, "pending">) {
    setSaving(id);
    const res = await api(`/api/v1/case-matches/${id}`, { method: "PATCH", body: { review: value } });
    setSaving(null);
    if (!res.ok) return toast(res.error.message, "danger");
    await reload();
  }

  const day = (d: string | null) => (d ? formatDate(d) : "—");

  return (
    <div className="space-y-5">
      <Link href={`/counterparties/${view.counterparty.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text">
        <ArrowLeft size={13} aria-hidden="true" /> {t("back", { name: view.counterparty.name })}
      </Link>

      <header className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("title")}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text sm:text-[1.9rem]">{view.search.name}</h1>
            <p className="mt-1 text-xs text-muted">{t("resultsMeta", { number: view.reportNo, date: formatDateTimeIst(new Date(view.createdAt)) })} · {[view.search.district, GST_STATES[view.search.state]].filter(Boolean).join(", ")}</p>
            {view.testData ? <Tag tone="warning" className="mt-2">{t("testData")}</Tag> : null}
          </div>
          <ButtonLink href={`/cases?counterparty=${view.counterparty.id}`} variant="secondary">{t("searchAgain")}</ButtonLink>
        </div>
        <div className="border-t border-border px-4 py-3 sm:px-5" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className={cn("font-medium", running ? "text-text" : "text-muted")}>{running ? t("running") : t("finished")}</span>
            <span className="tabular-nums text-subtle">{t("progressCount", { done: view.items.filter((i) => i.status !== "queued" && i.status !== "running").length, total: view.items.length })}</span>
          </div>
          <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${(view.items.filter((i) => i.status !== "queued" && i.status !== "running").length / Math.max(1, view.items.length)) * 100}%` }} />
            {running ? <div className="absolute inset-y-0 left-0 w-1/3 animate-[cb-indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent" /> : null}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("count.matches")} value={view.counts.matches} />
        <StatCard label={t("count.pending")} value={view.counts.pending} />
        <StatCard label={t("count.disposed")} value={view.counts.disposed} />
        <StatCard label={t("count.notReviewed")} value={view.counts.notReviewed} />
      </div>

      {view.testData ? <p className="text-xs text-text-2"><span className="font-semibold text-primary">★</span> {t("sampleStarNote")}</p> : null}
      <Card>
        <CardHeader title={t("checksDone")} />
        <CardBody className="space-y-2 text-xs">
          {view.items.map((i) => (
            <p key={i.code} className={cn("flex flex-wrap justify-between gap-2", i.status === "not_available" && "font-medium text-warning-fg")}>
              <span className="font-medium text-text-2">{i.name}{i.status === "success" && i.provider?.startsWith("mock") ? <span className="ml-1 text-primary" title={t("sampleStar")} aria-label={t("sampleStar")}>★</span> : null}</span>
              <span>{t(`state.${stateKey(i)}`)}</span>
            </p>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<>{t("matchesTitle")}{view.testData ? <span className="ml-1 text-primary" title={t("sampleStar")} aria-label={t("sampleStar")}>★</span> : null}</>} />
        <CardBody>
          {!view.matches.length ? (
            running ? (
              <p className="text-sm text-muted">{t("searching")}</p>
            ) : (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-success-bg text-success-fg" aria-hidden="true"><ShieldCheck size={18} /></span>
                <p className="mt-3 text-sm font-medium text-text">{t("noRecordsTitle")}</p>
                <p className="mt-1 max-w-md text-xs text-muted">{t("noRecords")}</p>
              </div>
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="border-b border-border text-[11px] uppercase tracking-[1px] text-subtle">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("col.case")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("col.court")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("col.type")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("col.filed")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("col.status")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("col.match")}</th>
                    <th scope="col" className="py-2 font-medium">{t("col.review")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {view.matches.map((m) => (
                    <MatchRow
                      key={m.id}
                      m={m}
                      day={day}
                      open={open === m.id}
                      onToggle={() => setOpen(open === m.id ? null : m.id)}
                      canReview={canReview}
                      saving={saving === m.id}
                      onReview={(v) => void review(m.id, v)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted">{t("onlyConfirmed")}</p>
        </CardBody>
      </Card>
    </div>
  );
}

function stateKey(i: CaseCheckView["items"][number]) {
  if (i.status === "not_available" && i.errorCode === "TOO_MANY_MATCHES") return "too_many";
  if (i.status === "not_available" && i.errorCode === "STATE_NOT_COVERED") return "not_covered";
  return i.status;
}

export function MatchRow({
  m, day, open, onToggle, canReview, saving, onReview,
}: {
  m: CaseMatchView;
  day: (d: string | null) => string;
  open: boolean;
  onToggle: () => void;
  canReview: boolean;
  saving: boolean;
  onReview: (v: Exclude<Review, "pending">) => void;
}) {
  const t = useTranslations("cases");
  const choice = (v: Exclude<Review, "pending">) => (
    <Button
      size="sm"
      variant={m.review === v ? "primary" : "secondary"}
      disabled={saving}
      aria-pressed={m.review === v}
      onClick={() => onReview(v)}
    >
      {t(`review.${v}`)}
    </Button>
  );
  return (
    <>
      <tr className="align-top">
        <td className="py-3 pr-3">
          <button type="button" className="text-left font-medium text-text underline-offset-2 hover:underline" aria-expanded={open} onClick={onToggle}>
            {m.caseNo ?? m.listName ?? t("listEntry")}
          </button>
          <span className="block text-xs text-muted">{t(`source.${m.source}`)}</span>
        </td>
        <td className="py-3 pr-3 text-text-2">{m.court}</td>
        <td className="py-3 pr-3 text-text-2">
          {m.caseType}
          {m.recovery ? <Tag tone="warning" className="ml-1">{t("recovery")}</Tag> : null}
        </td>
        <td className="py-3 pr-3 tabular-nums text-text-2">{day(m.filedOn ?? m.listDate)}</td>
        <td className="py-3 pr-3 text-text-2">
          {m.status}
          {m.nextHearing ? <span className="block text-xs text-muted">{t("nextHearing", { date: day(m.nextHearing) })}</span> : null}
        </td>
        <td className="py-3 pr-3">
          <Tag tone={CONFIDENCE_TONE[m.confidence]}>{t(`confidence.${m.confidence}`)}</Tag>
        </td>
        <td className="py-3">
          {canReview ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("reviewLabel", { case: m.caseNo ?? m.court })}>
              {choice("confirmed")}
              {choice("not_this_person")}
              {choice("unsure")}
            </div>
          ) : (
            <Tag tone={REVIEW_TONE[m.review]}>{t(`review.${m.review}`)}</Tag>
          )}
          {m.reviewedBy && m.reviewedAt ? <span className="mt-1 block text-xs text-muted">{t("reviewedBy", { name: m.reviewedBy, date: formatDateTimeIst(new Date(m.reviewedAt)) })}</span> : null}
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={7} className="bg-surface-muted px-4 py-3 text-xs">
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <dt className="font-medium text-text-2">{t("parties")}</dt>
              <dd>{m.parties.map((p) => `${p.name} (${t(`role.${p.role}`)})`).join(", ")}</dd>
              {m.acts.length ? (
                <>
                  <dt className="font-medium text-text-2">{t("acts")}</dt>
                  <dd>{m.acts.join("; ")}</dd>
                </>
              ) : null}
              {m.listName ? (
                <>
                  <dt className="font-medium text-text-2">{t("list")}</dt>
                  <dd>{t("listValue", { name: m.listName, date: day(m.listDate) })}</dd>
                </>
              ) : null}
              <dt className="font-medium text-text-2">{t("matchScore")}</dt>
              <dd>{m.score} / 100</dd>
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}
