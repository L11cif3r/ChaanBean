"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Info, Play, Plus, RotateCw, XCircle } from "lucide-react";
import { Button, ButtonLink, buttonClass, Card, CardBody, CardHeader, Tag, type Tone } from "@/components/ui";
import { CancelWindow } from "@/components/ui/cancel-window";
import { CostSummary, newIdempotencyKey } from "@/components/checks/choose-checks";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInrShort } from "@/lib/money";
import type { ExampleReport } from "@/lib/example-report";
import type {
  CibilData, CompanyData, CreditRatingData, CwCode, DirectorData, GstSearchData, IecProfileData, IecTurnoverData, MsmeData, PanData, TurnoverData,
} from "@/lib/checks";
import { sourceLine } from "@/lib/checks";
import { CompanyVisual, DirectorsChart, RangeBar } from "./report-charts";
import { CibilBody, CompanyBody, DirectorBody, GstBody, IdentityBody, RatingBody, TurnoverBody } from "./report-sections";
import { ExampleBadge, GhostSection, useExample, type PreviewKey } from "./report-preview";
import type { RiskLevel, Signal } from "@/lib/report-rules";
import type { Quote, ReportView as Report } from "@/server/checks/service";

// PRD v3.0 section 6.7 (Figure 15): one report with the risk level, the safe credit range, why, and a
// section per check. Sections fill in as checks finish; the page polls while anything is still running, with a
// progress bar. A chosen section without data shows a faded example under a note on what happened; checks that were
// not chosen are offered at the foot, each with a faded example (v4 redesign).

const RISK_TONE: Record<RiskLevel, string> = {
  high: "border-danger/25 bg-danger-bg text-danger-fg",
  medium: "border-warning/25 bg-warning-bg text-warning-fg",
  low: "border-success/25 bg-success-bg text-success-fg",
  not_enough_data: "border-border bg-surface text-text",
};

const short = (paise: number) => formatInrShort(BigInt(Math.round(paise)));
const day = (iso: string) => formatDate(iso.length > 10 ? istDate(new Date(iso)) : iso);

/** Report sections in page order, with the checks that fill them and the example used when they have no data. */
const SECTIONS: { key: string; preview: PreviewKey; codes: CwCode[] }[] = [
  { key: "sectionGst", preview: "gst", codes: ["CW_GST_SEARCH"] },
  { key: "sectionCibil", preview: "cibil", codes: ["CW_CIBIL_COMPANY", "CW_CIBIL_PERSONAL"] },
  { key: "sectionTurnover", preview: "turnover", codes: ["CW_GST_TURNOVER_4Y", "CW_GST_TURNOVER_CY"] },
  { key: "sectionIdentity", preview: "identity", codes: ["CW_MSME", "CW_PAN", "CW_IEC_PROFILE", "CW_IEC_TURNOVER"] },
  { key: "sectionCompany", preview: "company", codes: ["CW_COMPANY", "CW_DIRECTORS"] },
  { key: "sectionRating", preview: "rating", codes: ["CW_CREDIT_RATING"] },
];

export function ReportView({ initial, canRun }: { initial: Report; canRun: boolean }) {
  const t = useTranslations("report");
  const tg = useTranslations("report.preview.ghost");
  const toast = useToast();
  const ex = useExample();
  const [report, setReport] = useState(initial);
  const [running, setRunning] = useState<string | null>(null);
  const [runQuote, setRunQuote] = useState<{ code: string; name: string; quote: Quote; key: string } | null>(null);
  // v4 section 8: a short countdown with Cancel before a one-by-one check is started (nothing is taken before).
  const [counting, setCounting] = useState(false);
  const tc = useTranslations("checks");

  const reload = useCallback(async () => {
    const res = await api<Report>(`/api/v1/reports/${report.id}`);
    if (res.ok) setReport(res.data);
  }, [report.id]);

  const pending = report.status === "pending_start" || report.items.some((i) => i.status === "queued" || i.status === "running");
  const waiting = report.items.some((i) => i.status === "waiting_consent");
  useEffect(() => {
    if (!pending && !waiting) return;
    // Quick while checks run; slower while only the buyer's answer is awaited.
    const timer = setInterval(() => void reload(), pending ? 2500 : 10_000);
    return () => clearInterval(timer);
  }, [pending, waiting, reload]);

  // v3 FR-CW-05: each one-by-one run shows its cost in the section first, then a short cancel bar.
  async function askToRun(code: string) {
    setRunning(code);
    const res = await api<Quote>(`/api/v1/checks/requests/${report.id}/items/${code}/quote`, { body: {} });
    setRunning(null);
    if (!res.ok) return toast(res.error.message, "danger");
    setRunQuote({ code, name: report.items.find((i) => i.code === code)?.name ?? code, quote: res.data, key: newIdempotencyKey() });
  }

  async function runOne() {
    if (!runQuote) return;
    setRunning(runQuote.code);
    const res = await api(`/api/v1/checks/requests/${report.id}/items/${runQuote.code}/run`, { body: { quoteId: runQuote.quote.quoteId }, idempotencyKey: runQuote.key });
    setRunning(null);
    setRunQuote(null);
    if (!res.ok) return toast(res.error.message, "danger");
    await reload();
  }

  async function resend(consentId: string) {
    const res = await api(`/api/v1/checks/requests/${report.id}/consents/${consentId}/resend`, { body: {} });
    if (!res.ok) return toast(res.error.message, "danger");
    toast(t("consent.resent"), "success");
    await reload();
  }

  const item = (code: CwCode) => report.items.find((i) => i.code === code);
  const data = <T,>(code: CwCode) => (item(code)?.status === "success" && item(code)!.data ? (item(code)!.data as T) : null);
  const { outcome } = report;
  const finished = report.items.filter((i) => !["queued", "running", "ready", "waiting_consent"].includes(i.status)).length;
  const total = report.items.length;
  const chosen = SECTIONS.filter((s) => s.codes.some((c) => item(c)));
  const notChosen = SECTIONS.filter((s) => !s.codes.some((c) => item(c)));
  const addHref = `/checks/new?counterparty=${report.counterparty.id}`;

  const body = (key: string) => {
    switch (key) {
      case "sectionGst":
        return data<GstSearchData>("CW_GST_SEARCH") ? <GstBody d={data<GstSearchData>("CW_GST_SEARCH")!} /> : null;
      case "sectionCibil":
        return (
          <>
            {data<CibilData>("CW_CIBIL_COMPANY") ? <CibilBody d={data<CibilData>("CW_CIBIL_COMPANY")!} title={item("CW_CIBIL_PERSONAL") ? t("cibilCompanyTitle") : null} /> : null}
            {data<CibilData>("CW_CIBIL_PERSONAL") ? <CibilBody d={data<CibilData>("CW_CIBIL_PERSONAL")!} title={t("cibilPersonalTitle", { name: item("CW_CIBIL_PERSONAL")?.subjectName ?? "" })} /> : null}
          </>
        );
      case "sectionTurnover": {
        const d = data<TurnoverData>("CW_GST_TURNOVER_4Y") ?? data<TurnoverData>("CW_GST_TURNOVER_CY");
        return d ? <TurnoverBody d={d} /> : null;
      }
      case "sectionIdentity":
        return <IdentityBody msme={data<MsmeData>("CW_MSME")} pan={data<PanData>("CW_PAN")} iec={data<IecProfileData>("CW_IEC_PROFILE")} trade={data<IecTurnoverData>("CW_IEC_TURNOVER")} />;
      case "sectionCompany":
        return (
          <>
            {data<CompanyData>("CW_COMPANY") ? <CompanyBody d={data<CompanyData>("CW_COMPANY")!} /> : null}
            {data<CompanyData>("CW_COMPANY") ? <CompanyVisual d={data<CompanyData>("CW_COMPANY")!} /> : null}
            {data<DirectorData>("CW_DIRECTORS") ? <DirectorsChart d={data<DirectorData>("CW_DIRECTORS")!} /> : null}
            {data<DirectorData>("CW_DIRECTORS") ? <DirectorBody d={data<DirectorData>("CW_DIRECTORS")!} /> : null}
          </>
        );
      case "sectionRating":
        return data<CreditRatingData>("CW_CREDIT_RATING") ? <RatingBody d={data<CreditRatingData>("CW_CREDIT_RATING")!} /> : null;
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <Link href={`/counterparties/${report.counterparty.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text">
        <ArrowLeft size={13} aria-hidden="true" /> {t("back", { name: report.counterparty.name })}
      </Link>

      {report.status === "pending_start" ? (
        <p role="status" className="rounded-lg bg-info-bg px-3.5 py-2.5 text-sm text-info-fg">{t("startingNow")}</p>
      ) : null}
      {report.status === "cancelled" ? (
        <p role="status" className="rounded-lg bg-surface-strong px-3.5 py-2.5 text-sm text-text-2">{report.startError ?? t("cancelledReport")}</p>
      ) : null}
      {report.expired ? (
        <p role="status" className="rounded-lg bg-warning-bg px-3.5 py-2.5 text-sm text-warning-fg">{t("expired")}</p>
      ) : null}

      <header className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("title")}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text sm:text-[1.9rem]">{report.counterparty.name}</h1>
            <p className="mt-1 text-xs text-muted">{t("meta", { number: report.reportNo, date: formatDateTimeIst(new Date(report.createdAt)), valid: day(report.validUntil) })}</p>
            {report.testData ? (
              <p className="mt-2 inline-flex rounded-md border border-dashed border-warning/40 bg-warning-bg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.5px] text-warning-fg">
                {report.items.some((i) => i.status === "success" && !i.hidden && !isSampleItem(i.provider)) ? t("testDataMixed") : t("testData")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/v1/reports/${report.id}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "md")}>
              <Download aria-hidden="true" /> {t("download")}
            </a>
            {canRun ? <ButtonLink href={addHref}><RotateCw aria-hidden="true" /> {t("runAgain")}</ButtonLink> : null}
          </div>
        </div>
        {total ? (
          <div className="border-t border-border px-4 py-3 sm:px-5" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className={cn("font-medium", pending ? "text-text" : "text-muted")}>{pending ? t("inProgress") : t("progressDone")}</span>
              <span className="tabular-nums text-subtle">{t("progressCount", { done: finished, total })}</span>
            </div>
            <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
              <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${(finished / total) * 100}%` }} />
              {pending ? <div className="absolute inset-y-0 left-0 w-1/3 animate-[cb-indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent" /> : null}
            </div>
          </div>
        ) : null}
      </header>

      {report.consents.map((c) => <ConsentCard key={c.id} consent={c} canResend={canRun} onResend={() => void resend(c.id)} />)}

      <div className="snap-carousel -mx-4 gap-3 px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&>section]:w-[84%] [&>section]:shrink-0 [&>section]:snap-start md:[&>section]:w-auto">
        <section aria-labelledby="risk-title" className={cn("rounded-2xl border p-4 shadow-sm", RISK_TONE[outcome.level])}>
          <h2 id="risk-title" className="text-[11px] font-medium uppercase tracking-[1px] opacity-80">{t("riskTitle")}</h2>
          <p className="mt-2 font-head text-2xl font-extrabold tracking-tight">{t(`risk.${outcome.level}`)}</p>
          <p className="mt-1 text-xs">{t("riskCounts", { good: outcome.counts.positive, warn: outcome.counts.caution + outcome.counts.red })}</p>
          {outcome.level !== "not_enough_data" ? <RiskMeter level={outcome.level} /> : null}
        </section>

        <section aria-labelledby="range-title" className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <h2 id="range-title" className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">
            {t("rangeTitle")} <span className="normal-case tracking-normal">({t("rangeGuide")})</span>
          </h2>
          {outcome.range ? (
            <>
              <p className="mt-2 font-head text-xl font-extrabold tracking-tight text-gradient">{t("rangeValue", { low: short(outcome.range.lowPaise), high: short(outcome.range.highPaise) })}</p>
              <p className="mt-1 text-xs text-muted">
                {outcome.range.baseType === "annualised_cy"
                  ? t("rangeBasisCy", { base: short(outcome.range.basePaise), year: outcome.range.baseYear, months: outcome.range.monthsFiled ?? 0 })
                  : t("rangeBasis", {
                      low: outcome.range.reduced ? 0.5 : 1,
                      high: outcome.range.reduced ? 1 : 2,
                      base: short(outcome.range.basePaise),
                      year: outcome.range.baseYear,
                    })}
              </p>
              {outcome.range.reduced ? <p className="mt-1 text-xs font-medium text-warning-fg">{t("rangeReduced")}</p> : null}
              <RangeBar lowPaise={outcome.range.lowPaise} highPaise={outcome.range.highPaise} basePaise={outcome.range.basePaise} />
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-medium text-text-2">{outcome.rangeNote ? t(`rangeNote.${outcome.rangeNote}`) : "—"}</p>
              {outcome.rangeNote === "no_turnover" ? (
                <div className="mt-2 opacity-60" aria-hidden="true">
                  <div className="flex items-center justify-between text-[11px] text-subtle">
                    <ExampleBadge />
                    <span className="tabular-nums">{t("rangeValue", { low: short(ex.range.lowPaise), high: short(ex.range.highPaise) })}</span>
                  </div>
                  <RangeBar lowPaise={ex.range.lowPaise} highPaise={ex.range.highPaise} basePaise={ex.range.basePaise} />
                </div>
              ) : null}
            </>
          )}
        </section>

        <section aria-labelledby="why-title" className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <h2 id="why-title" className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("whyTitle")}</h2>
          {outcome.signals.length ? (
            <ul className="mt-2 space-y-1.5 text-xs">
              {outcome.signals.map((s) => <SignalRow key={s.key} signal={s} />)}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">{pending ? t("signalsComing") : t("noSignals")}</p>
          )}
        </section>
      </div>

      {report.items.some((i) => i.status === "success" && !i.hidden && isSampleItem(i.provider)) ? (
        <p className="text-xs text-text-2"><span className="font-semibold text-primary">★</span> {t("sampleStarNote")}</p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {chosen.map((sec) => (
          <Section
            key={sec.key}
            title={t(sec.key)}
            codes={sec.codes}
            preview={sec.preview}
            ex={ex}
            report={report}
            canRun={canRun}
            running={running}
            onRun={(code) => void askToRun(code)}
            runQuote={runQuote && sec.codes.includes(runQuote.code as CwCode) ? runQuote : null}
            counting={counting}
            onConfirmRun={() => setCounting(true)}
            onCancelQuote={() => setRunQuote(null)}
            onCancelCount={() => { setCounting(false); setRunQuote(null); toast(tc("cancelledNothing"), "success"); }}
            onCountDone={() => { setCounting(false); void runOne(); }}
          >
            {body(sec.key)}
          </Section>
        ))}
        <Card>
          <CardHeader title={t("sectionCases")} />
          <CardBody className="space-y-3 text-sm">
            <p className="text-xs text-muted">{t("casesNote")}</p>
            {canRun ? <ButtonLink href={`/cases?counterparty=${report.counterparty.id}`} variant="secondary" size="sm">{t("caseCheck")}</ButtonLink> : null}
          </CardBody>
        </Card>
      </div>

      {notChosen.length ? (
        <section aria-labelledby="more-title" className="space-y-3 pt-2">
          <div>
            <h2 id="more-title" className="text-sm font-semibold text-text">{tg("moreTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted">{tg("moreLead")}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {notChosen.map((sec) => (
              <Card key={sec.key}>
                <CardHeader title={t(sec.key)} action={<ExampleBadge />} />
                <CardBody className="text-sm">
                  <GhostSection
                    k={sec.preview}
                    ex={ex}
                    title={tg("notSelectedTitle")}
                    note={tg("notSelectedNote")}
                    action={canRun ? <ButtonLink href={addHref} size="sm" variant="secondary"><Plus aria-hidden="true" /> {tg("addCheck")}</ButtonLink> : null}
                  />
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Low, medium or high on a three-step bar under the risk level. */
function RiskMeter({ level }: { level: RiskLevel }) {
  const at = level === "low" ? 0 : level === "medium" ? 1 : 2;
  return (
    <div className="mt-3 grid grid-cols-3 gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("h-1.5 rounded-full", i <= at ? "bg-current" : "bg-current opacity-20")} />
      ))}
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const t = useTranslations("report");
  const Icon = signal.tone === "positive" ? CheckCircle2 : signal.tone === "red" ? XCircle : signal.tone === "info" ? Info : AlertTriangle;
  const color = signal.tone === "positive" ? "text-success-fg" : signal.tone === "red" ? "text-danger-fg" : signal.tone === "info" ? "text-info-fg" : "text-warning-fg";
  return (
    <li className="flex items-start gap-2">
      <Icon size={14} className={cn("mt-px shrink-0", color)} aria-hidden="true" />
      <span className="text-text-2">{t(`signal.${signal.key}`, signal.values ?? {})}</span>
    </li>
  );
}

function Section({
  title, codes, preview, ex, report, canRun, running, onRun, runQuote, counting, onConfirmRun, onCancelQuote, onCancelCount, onCountDone, children,
}: {
  title: string;
  codes: CwCode[];
  preview: PreviewKey;
  ex: ExampleReport;
  report: Report;
  canRun: boolean;
  running: string | null;
  onRun: (code: string) => void;
  runQuote: { code: string; name: string; quote: Quote } | null;
  counting: boolean;
  onConfirmRun: () => void;
  onCancelQuote: () => void;
  onCancelCount: () => void;
  onCountDone: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("report");
  const tg = useTranslations("report.preview.ghost");
  const items = codes.map((c) => report.items.find((i) => i.code === c)).filter((i) => i !== undefined);
  const done = items.filter((i) => i.status === "success" && !i.hidden);
  // A section shown with sample (made-up) data is marked with a star, explained once above the sections.
  const sample = done.some((i) => isSampleItem(i.provider));
  // Every distinct source, so a section that mixes live and sample data says both.
  const withSource = done.filter((i) => i.fetchedAt).map((i) => ({ name: i.name, text: sourceText(t, i.provider, i.fetchedAt!, i.data) }));
  const mixed = new Set(withSource.map((x) => x.text)).size > 1;
  const sources = mixed ? withSource.map((x) => `${x.name}: ${x.text}`) : withSource.slice(0, 1).map((x) => x.text);
  const rest = items.filter((i) => i.status !== "success" || i.hidden);
  const runButton = (i: (typeof items)[number]) =>
    i.status === "ready" && canRun && !runQuote ? (
      <Button size="sm" variant="secondary" loading={running === i.code} onClick={() => onRun(i.code)}>
        <Play aria-hidden="true" /> {items.length > 1 ? t("runNamed", { name: i.name }) : t("runThis")}
      </Button>
    ) : null;

  // Nothing to show yet: a skeleton while it runs, otherwise a faded example under a note on what happened.
  const empty = !done.length;
  const busy = items.some((i) => i.status === "queued" || i.status === "running");
  const kind = busy ? "running"
    : items.some((i) => i.status === "waiting_consent") ? "waiting"
    : items.some((i) => i.status === "ready") ? "ready"
    : items.some((i) => i.hidden) ? "blocked"
    : items.every((i) => i.status === "not_available" || i.status === "no_data") ? "notAvailable"
    : "failed";

  return (
    <Card>
      <CardHeader
        title={<>{title}{sample ? <span className="ml-1 text-primary" title={t("sampleStarTitle")} aria-label={t("sampleStarTitle")}>★</span> : null}</>}
        action={sources.length ? <span className="text-right text-[11px] text-subtle">{sources.join(" · ")}</span> : busy ? <Tag tone="info">{t("state.running")}</Tag> : null}
      />
      <CardBody className="space-y-4 text-sm">
        {runQuote ? (
          <div className="space-y-3 rounded-lg border border-primary-line bg-primary-softer p-3">
            <p className="text-sm font-medium text-text">{t("runTitle", { name: runQuote.name })}</p>
            {counting ? (
              <CancelWindow inline seconds={3} onCancel={onCancelCount} onDone={onCountDone} />
            ) : (
              <>
                <CostSummary quote={runQuote.quote} />
                {!runQuote.quote.enough ? (
                  <p role="alert" className="rounded-md bg-danger-bg px-2.5 py-2 text-xs font-medium text-danger-fg">
                    {t("notEnough")}{" "}
                    <Link href="/account/billing" className="underline underline-offset-2">{t("addMoney")}</Link>
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={onCancelQuote}>{t("cancel")}</Button>
                  <Button size="sm" onClick={onConfirmRun} loading={running === runQuote.code} disabled={!runQuote.quote.enough}>{t("runConfirm")}</Button>
                </div>
              </>
            )}
          </div>
        ) : null}
        {empty && busy ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-3 w-2/3 animate-[cb-shimmer_1.6s_linear_infinite] rounded bg-[linear-gradient(90deg,var(--surface-strong),var(--surface-muted),var(--surface-strong))] bg-[length:200%_100%]" />
            <div className="h-24 animate-[cb-shimmer_1.6s_linear_infinite] rounded-lg bg-[linear-gradient(90deg,var(--surface-strong),var(--surface-muted),var(--surface-strong))] bg-[length:200%_100%]" />
            <div className="h-3 w-1/2 animate-[cb-shimmer_1.6s_linear_infinite] rounded bg-[linear-gradient(90deg,var(--surface-strong),var(--surface-muted),var(--surface-strong))] bg-[length:200%_100%]" />
          </div>
        ) : null}
        {(!empty || busy) && rest.length ? (
          <ul className="space-y-1.5">
            {rest.map((i) => (
              <li key={i.code} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className={cn("text-muted", (i.status === "not_available" || i.hidden || i.errorCode?.startsWith("CONSENT_")) && "font-medium text-warning-fg")}>
                  {items.length > 1 ? <span className="font-medium text-text-2">{i.name}: </span> : null}
                  {t(`state.${stateKey(i)}`)}
                </p>
                {runButton(i)}
              </li>
            ))}
          </ul>
        ) : null}
        {empty && !busy ? (
          <GhostSection
            k={preview}
            ex={ex}
            tone={kind === "notAvailable" || kind === "failed" || kind === "blocked" ? "warning" : "neutral"}
            title={tg(`${kind}Title`)}
            note={
              <>
                {rest.map((i) => (
                  <span key={i.code} className="block">
                    {items.length > 1 ? <span className="font-medium text-text-2">{i.name}: </span> : null}
                    {t(`state.${stateKey(i)}`)}
                  </span>
                ))}
                <span className="mt-1 block text-subtle">{tg(`${kind}Note`)}</span>
              </>
            }
            action={rest.some((i) => i.status === "ready") && canRun && !runQuote ? <div className="flex flex-wrap justify-center gap-2">{rest.map(runButton)}</div> : null}
          />
        ) : null}
        {children}
      </CardBody>
    </Card>
  );
}

/** Message key for a check that has no result to show. */
function stateKey(i: Report["items"][number]) {
  if (i.hidden) return i.hidden === "withdrawn" ? "hidden_withdrawn" : "hidden_lapsed";
  if (i.status === "cancelled" && i.errorCode === "CONSENT_DECLINED") return "consent_declined";
  if (i.status === "cancelled" && i.errorCode === "CONSENT_EXPIRED") return "consent_expired";
  if (i.status === "cancelled" && i.errorCode === "CONSENT_WITHDRAWN") return "consent_withdrawn";
  return i.status === "success" ? "not_selected" : i.status;
}

const CONSENT_TONE: Record<Report["consents"][number]["status"], Tone> = {
  pending: "info", approved: "success", declined: "danger", expired: "warning", withdrawn: "warning",
};

/** S11 "Waiting for consent since …": where the buyer's yes stands, by which channels, and until when. */
function ConsentCard({ consent: c, canResend, onResend }: { consent: Report["consents"][number]; canResend: boolean; onResend: () => void }) {
  const t = useTranslations("report.consent");
  const when = (iso: string) => formatDateTimeIst(new Date(iso));
  const line =
    c.status === "pending" ? t("pendingLine", { since: when(c.sentAt), until: when(c.expiresAt) })
    : c.status === "approved" ? t("approvedLine", { at: when(c.approvedAt!), until: when(c.visibleUntil!) })
    : c.status === "declined" ? t("declinedLine", { at: when(c.declinedAt!) })
    : c.status === "expired" ? t("expiredLine", { at: when(c.expiresAt) })
    : t("withdrawnLine", { at: when(c.withdrawnAt!) });
  return (
    <section aria-labelledby={`consent-${c.id}`} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`consent-${c.id}`} className="text-sm font-semibold text-text">
          {c.subjectKind === "person" ? t("titlePerson", { name: c.subjectName ?? "" }) : t("title")}
        </h2>
        <span className="flex items-center gap-2">
          {c.status === "pending" && canResend && !c.reused ? (
            <Button size="sm" variant="secondary" onClick={onResend}>{t("resend")}</Button>
          ) : null}
          <Tag tone={CONSENT_TONE[c.status]}>{t(`status.${c.status}`)}</Tag>
        </span>
      </div>
      <p className="mt-2 text-sm text-text-2">{line}</p>
      <p className="mt-1 text-xs text-muted">
        {c.reused
          ? t("reused")
          : t("sentBy", { channels: c.channels.map((ch) => t(`channel.${ch}`)).join(", "), mobile: c.mobileMasked })}
        {c.remindedAt ? ` ${t("reminded", { at: when(c.remindedAt) })}` : ""}
      </p>
    </section>
  );
}

/** A section's data came from a sample (dummy) provider rather than a live source. */
const isSampleItem = (provider: string | null | undefined) => !provider || provider.startsWith("mock");

/** v4 FR-RP-04: "API Setu, 20 Oct 2026, 13:51 IST" or "MCA open data as of 13 Oct 2026" or "Sample data, …". */
function sourceText(t: ReturnType<typeof useTranslations>, provider: string | null, fetchedAt: string, data: unknown) {
  const line = sourceLine(provider, formatDateTimeIst(new Date(fetchedAt)), data);
  return t(`src.${line.key}`, line.key === "mca" ? { date: formatDate(line.values.date) } : line.values);
}

