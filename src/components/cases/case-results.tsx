"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
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
      <Link href={`/counterparties/${view.counterparty.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary-text">
        <ArrowLeft size={14} aria-hidden="true" /> {t("back", { name: view.counterparty.name })}
      </Link>

      <header className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted">{t("resultsMeta", { number: view.reportNo, date: formatDateTimeIst(new Date(view.createdAt)) })}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text">{view.search.name}</h1>
            <p className="mt-1 text-sm text-muted">{[view.search.district, GST_STATES[view.search.state]].filter(Boolean).join(", ")}</p>
            {view.testData ? <Tag tone="warning" className="mt-2">{t("testData")}</Tag> : null}
          </div>
          <ButtonLink href={`/cases?counterparty=${view.counterparty.id}`} variant="secondary">{t("searchAgain")}</ButtonLink>
        </div>
        {running ? <p className="mt-3 text-sm font-semibold text-primary-text" role="status">{t("running")}</p> : null}
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("count.matches")} value={view.counts.matches} />
        <StatCard label={t("count.pending")} value={view.counts.pending} />
        <StatCard label={t("count.disposed")} value={view.counts.disposed} />
        <StatCard label={t("count.notReviewed")} value={view.counts.notReviewed} />
      </div>

      <Card>
        <CardHeader title={t("checksDone")} />
        <CardBody className="space-y-2 text-sm">
          {view.items.map((i) => (
            <p key={i.code} className={cn("flex flex-wrap justify-between gap-2", i.status === "not_available" && "font-semibold text-warning-fg")}>
              <span className="font-semibold text-text-2">{i.name}</span>
              <span>{t(`state.${stateKey(i)}`)}</span>
            </p>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("matchesTitle")} />
        <CardBody>
          {!view.matches.length ? (
            <p className="text-sm text-muted">{running ? t("searching") : t("noRecords")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("col.case")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("col.court")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("col.type")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("col.filed")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("col.status")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("col.match")}</th>
                    <th scope="col" className="py-2 font-semibold">{t("col.review")}</th>
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

function MatchRow({
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
          <button type="button" className="text-left font-semibold text-primary-text underline-offset-2 hover:underline" aria-expanded={open} onClick={onToggle}>
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
          <td colSpan={7} className="bg-surface-muted px-4 py-3 text-sm">
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <dt className="font-semibold text-text-2">{t("parties")}</dt>
              <dd>{m.parties.map((p) => `${p.name} (${t(`role.${p.role}`)})`).join(", ")}</dd>
              {m.acts.length ? (
                <>
                  <dt className="font-semibold text-text-2">{t("acts")}</dt>
                  <dd>{m.acts.join("; ")}</dd>
                </>
              ) : null}
              {m.listName ? (
                <>
                  <dt className="font-semibold text-text-2">{t("list")}</dt>
                  <dd>{t("listValue", { name: m.listName, date: day(m.listDate) })}</dd>
                </>
              ) : null}
              <dt className="font-semibold text-text-2">{t("matchScore")}</dt>
              <dd>{m.score} / 100</dd>
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}
