"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Gavel, Loader2, MapPin, RotateCw, ShieldAlert, ShieldCheck, Siren } from "lucide-react";
import { ButtonLink, Card, CardBody, CardHeader, StatCard, Tag, type Tone } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { MockReveal } from "@/components/checks/report-preview";
import { api } from "@/lib/api-client";
import { formatDateTimeIst } from "@/lib/dates";
import { GST_STATES } from "@/server/providers/identity/states";
import type { CaseCheckView, Review } from "@/server/cases/service";
import { EXAMPLE_MATCHES, InteractiveMatches, MatchCard } from "./case-ui";

// S12 results (PRD v3.0 Figure 17) in the Credit Worthiness report layout: a hero with progress, the counters
// (marker 3), each search's state, and the ranked matches as cards with the review answers (marker 5). Only "This is
// them" counts in the credit report's risk level. When a search has nothing to show, an interactive example shows what
// a match looks like. Polls while a search runs.

const ICON = { CC_COURT: Gavel, CC_FIR: Siren, CC_AML: ShieldAlert } as const;
const STATE_TONE: Record<string, Tone> = { success: "success", no_data: "neutral", running: "info", queued: "info", ready: "info", not_available: "warning", too_many: "warning", not_covered: "warning", cancelled: "neutral" };

export function CaseResults({ initial, canReview }: { initial: CaseCheckView; canReview: boolean }) {
  const t = useTranslations("cases");
  const toast = useToast();
  const [view, setView] = useState(initial);
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

  const finished = view.items.filter((i) => i.status !== "queued" && i.status !== "running").length;
  const total = Math.max(1, view.items.length);
  const missing = view.items.filter((i) => ["not_available", "cancelled"].includes(i.status));
  const where = [view.search.district, GST_STATES[view.search.state]].filter(Boolean).join(", ");

  return (
    <div className="space-y-5">
      <Link href={`/counterparties/${view.counterparty.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text">
        <ArrowLeft size={13} aria-hidden="true" /> {t("back", { name: view.counterparty.name })}
      </Link>

      <header className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <span className="pointer-events-none absolute inset-0 -z-10 bg-soft opacity-80" aria-hidden="true" />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{t("title")}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text sm:text-[1.9rem]">{view.search.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {where ? <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" /> {where}</span> : null}
              <span>{t("resultsMeta", { number: view.reportNo, date: formatDateTimeIst(new Date(view.createdAt)) })}</span>
            </p>
            {view.testData ? (
              <p className="mt-2 inline-flex rounded-md border border-dashed border-warning/40 bg-warning-bg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.5px] text-warning-fg">{t("testData")}</p>
            ) : null}
          </div>
          <ButtonLink href={`/cases?counterparty=${view.counterparty.id}`} variant="secondary">
            <RotateCw aria-hidden="true" /> {t("searchAgain")}
          </ButtonLink>
        </div>
        <div className="border-t border-border px-4 py-3 sm:px-5" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className={cn("font-medium", running ? "text-text" : "text-muted")}>{running ? t("running") : t("finished")}</span>
            <span className="tabular-nums text-subtle">{t("progressCount", { done: finished, total: view.items.length })}</span>
          </div>
          <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${(finished / total) * 100}%` }} />
            {running ? <div className="absolute inset-y-0 left-0 w-1/3 animate-[cb-indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent" /> : null}
          </div>
        </div>
      </header>

      <div className="snap-carousel -mx-4 gap-3 px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 [&>*]:w-[46%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
        <StatCard label={t("count.matches")} value={view.counts.matches} icon={<Gavel />} />
        <StatCard label={t("count.pending")} value={view.counts.pending} icon={<Clock />} />
        <StatCard label={t("count.disposed")} value={view.counts.disposed} icon={<CheckCircle2 />} />
        <StatCard label={t("count.notReviewed")} value={view.counts.notReviewed} icon={<AlertTriangle />} />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {view.items.map((i) => {
          const Icon = ICON[i.code as keyof typeof ICON] ?? Gavel;
          const key = stateKey(i);
          const busy = i.status === "queued" || i.status === "running";
          return (
            <div key={i.code} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text" aria-hidden="true">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-sm font-bold text-text">
                    {i.name}
                    {i.status === "success" && i.provider?.startsWith("mock") ? <span className="ml-1 text-primary" title={t("sampleStar")} aria-label={t("sampleStar")}>★</span> : null}
                  </span>
                  <Tag tone={STATE_TONE[key] ?? "neutral"}>{t(`stateShort.${key}`)}</Tag>
                </span>
                {key !== "success" ? (
                  <span className={cn("mt-1 block text-xs leading-snug", STATE_TONE[key] === "warning" ? "font-medium text-warning-fg" : "text-muted")}>{t(`state.${key}`)}</span>
                ) : (
                  <span className="mt-1 block text-xs text-subtle">{t("foundCount", { count: view.matches.filter((m) => m.source === (i.code === "CC_FIR" ? "fir" : i.code === "CC_AML" ? "aml" : "court")).length })}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {view.testData ? <p className="text-xs text-text-2"><span className="font-semibold text-primary">★</span> {t("sampleStarNote")}</p> : null}

      <Card>
        <CardHeader
          title={<>{t("matchesTitle")}{view.testData ? <span className="ml-1 text-primary" title={t("sampleStar")} aria-label={t("sampleStar")}>★</span> : null}</>}
          action={view.matches.length ? <span className="text-xs text-subtle">{t("rankedNote")}</span> : null}
        />
        <CardBody className="space-y-4">
          {view.matches.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {view.matches.map((m) => (
                <MatchCard key={m.id} m={m} canReview={canReview} saving={saving === m.id} onReview={(v) => void review(m.id, v)} />
              ))}
            </div>
          ) : running ? (
            <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
              {[0, 1].map((k) => (
                <div key={k} className="h-48 animate-[cb-shimmer_1.6s_linear_infinite] rounded-2xl bg-[linear-gradient(90deg,var(--surface-strong),var(--surface-muted),var(--surface-strong))] bg-[length:200%_100%]" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center px-4 py-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-success-bg text-success-fg" aria-hidden="true"><ShieldCheck size={22} /></span>
                <p className="mt-3 font-head text-base font-bold text-text">{t("noRecordsTitle")}</p>
                <p className="mt-1 max-w-md text-xs text-muted">{t("noRecordsShort")}</p>
              </div>
              <MockReveal title={t("mock.title")} note={t("mock.note")} minHeight="min-h-72">
                <InteractiveMatches matches={EXAMPLE_MATCHES.slice(0, 2)} />
              </MockReveal>
            </div>
          )}
          <p className="text-xs text-muted">{t("onlyConfirmed")}</p>
        </CardBody>
      </Card>

      {missing.length ? (
        <section aria-labelledby="case-missing" className="space-y-3">
          <h2 id="case-missing" className="font-head text-[15px] font-bold text-text">{t("mock.missingTitle")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {missing.map((i) => {
              const source = i.code === "CC_FIR" ? "fir" : i.code === "CC_AML" ? "aml" : "court";
              const example = EXAMPLE_MATCHES.filter((m) => m.source === source).slice(0, 1);
              return (
                <Card key={i.code}>
                  <CardHeader title={i.name} />
                  <CardBody>
                    <MockReveal title={t(`stateShort.${stateKey(i)}`)} note={t("mock.missingNote")} tone="warning">
                      <InteractiveMatches matches={example} className="sm:grid-cols-1" />
                    </MockReveal>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function stateKey(i: CaseCheckView["items"][number]) {
  if (i.status === "not_available" && i.errorCode === "TOO_MANY_MATCHES") return "too_many";
  if (i.status === "not_available" && i.errorCode === "STATE_NOT_COVERED") return "not_covered";
  return i.status;
}
