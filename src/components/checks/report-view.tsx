"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, XCircle } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Tag, type Tone } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { CostSummary, newIdempotencyKey } from "@/components/checks/choose-checks";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInr, formatInrShort } from "@/lib/money";
import type {
  CibilData, CompanyData, CreditRatingData, CwCode, DirectorData, GstSearchData, IecProfileData, IecTurnoverData, MsmeData, PanData, TurnoverData,
} from "@/lib/checks";
import type { RiskLevel, Signal } from "@/lib/report-rules";
import type { Quote, ReportView as Report } from "@/server/checks/service";

// PRD v3.0 section 6.7 (Figure 15): one report with the risk level, the safe credit range, why, and a
// section per check. Sections fill in as checks finish; the page polls while anything is still running.

const RISK_TONE: Record<RiskLevel, string> = {
  high: "border-danger-fg/30 bg-danger-bg text-danger-fg",
  medium: "border-warning-fg/30 bg-warning-bg text-warning-fg",
  low: "border-success-fg/30 bg-success-bg text-success-fg",
  not_enough_data: "border-border bg-neutral-bg text-neutral-fg",
};

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)));
const short = (paise: number) => formatInrShort(BigInt(Math.round(paise)));
const day = (iso: string) => formatDate(iso.length > 10 ? istDate(new Date(iso)) : iso);

export function ReportView({ initial, canRun }: { initial: Report; canRun: boolean }) {
  const t = useTranslations("report");
  const toast = useToast();
  const [report, setReport] = useState(initial);
  const [running, setRunning] = useState<string | null>(null);
  const [runQuote, setRunQuote] = useState<{ code: string; name: string; quote: Quote; key: string } | null>(null);

  const reload = useCallback(async () => {
    const res = await api<Report>(`/api/v1/reports/${report.id}`);
    if (res.ok) setReport(res.data);
  }, [report.id]);

  const pending = report.items.some((i) => i.status === "queued" || i.status === "running");
  const waiting = report.items.some((i) => i.status === "waiting_consent");
  useEffect(() => {
    if (!pending && !waiting) return;
    // Quick while checks run; slower while only the buyer's answer is awaited.
    const timer = setInterval(() => void reload(), pending ? 2500 : 10_000);
    return () => clearInterval(timer);
  }, [pending, waiting, reload]);

  // v3 FR-CW-05: each one-by-one run has its own cost popup.
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

  return (
    <div className="space-y-5">
      <Link href={`/counterparties/${report.counterparty.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary-text">
        <ArrowLeft size={14} aria-hidden="true" /> {t("back", { name: report.counterparty.name })}
      </Link>

      {report.expired ? (
        <p role="status" className="rounded-[14px] bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-fg">{t("expired")}</p>
      ) : null}

      <header className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted">
              {t("title")} · {t("meta", { number: report.reportNo, date: formatDateTimeIst(new Date(report.createdAt)), valid: day(report.validUntil) })}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text sm:text-[1.75rem]">{report.counterparty.name}</h1>
            {report.testData ? <Tag tone="warning" className="mt-2">{t("testData")}</Tag> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/v1/reports/${report.id}/pdf`} target="_blank" rel="noopener" className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-5 text-sm font-bold text-text-2 shadow-sm hover:border-primary hover:text-primary-text">
              {t("download")}
            </a>
            {canRun ? <ButtonLink href={`/checks/new?counterparty=${report.counterparty.id}`}>{t("runAgain")}</ButtonLink> : null}
          </div>
        </div>
        {pending ? <p className="mt-3 text-sm font-semibold text-primary-text" role="status">{t("inProgress")}</p> : null}
      </header>

      {report.consents.map((c) => <ConsentCard key={c.id} consent={c} canResend={canRun} onResend={() => void resend(c.id)} />)}

      <div className="grid gap-4 md:grid-cols-3">
        <section aria-labelledby="risk-title" className={cn("rounded-3xl border p-5", RISK_TONE[outcome.level])}>
          <h2 id="risk-title" className="font-mono text-xs font-bold uppercase tracking-wider opacity-80">{t("riskTitle")}</h2>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{t(`risk.${outcome.level}`)}</p>
          <p className="mt-1 text-sm font-semibold">{t("riskCounts", { good: outcome.counts.positive, warn: outcome.counts.caution + outcome.counts.red })}</p>
        </section>

        <section aria-labelledby="range-title" className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h2 id="range-title" className="font-mono text-xs font-bold uppercase tracking-wider text-subtle">
            {t("rangeTitle")} <span className="normal-case">({t("rangeGuide")})</span>
          </h2>
          {outcome.range ? (
            <>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-text">{t("rangeValue", { low: short(outcome.range.lowPaise), high: short(outcome.range.highPaise) })}</p>
              <p className="mt-1 text-sm text-muted">
                {outcome.range.baseType === "annualised_cy"
                  ? t("rangeBasisCy", { base: short(outcome.range.basePaise), year: outcome.range.baseYear, months: outcome.range.monthsFiled ?? 0 })
                  : t("rangeBasis", {
                      low: outcome.range.reduced ? 0.5 : 1,
                      high: outcome.range.reduced ? 1 : 2,
                      base: short(outcome.range.basePaise),
                      year: outcome.range.baseYear,
                    })}
              </p>
              {outcome.range.reduced ? <p className="mt-1 text-sm font-semibold text-warning-fg">{t("rangeReduced")}</p> : null}
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-text-2">{outcome.rangeNote ? t(`rangeNote.${outcome.rangeNote}`) : "—"}</p>
          )}
        </section>

        <section aria-labelledby="why-title" className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h2 id="why-title" className="font-mono text-xs font-bold uppercase tracking-wider text-subtle">{t("whyTitle")}</h2>
          {outcome.signals.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {outcome.signals.map((s) => <SignalRow key={s.key} signal={s} />)}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">{t("noSignals")}</p>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t("sectionGst")} codes={["CW_GST_SEARCH"]} report={report} canRun={canRun} running={running} onRun={(code) => void askToRun(code)}>
          {data<GstSearchData>("CW_GST_SEARCH") ? <GstBody d={data<GstSearchData>("CW_GST_SEARCH")!} /> : null}
        </Section>
        <Section title={t("sectionCibil")} codes={["CW_CIBIL_COMPANY", "CW_CIBIL_PERSONAL"]} report={report} canRun={canRun} running={running} onRun={(code) => void askToRun(code)}>
          {data<CibilData>("CW_CIBIL_COMPANY") ? <CibilBody d={data<CibilData>("CW_CIBIL_COMPANY")!} title={item("CW_CIBIL_PERSONAL") ? t("cibilCompanyTitle") : null} /> : null}
          {data<CibilData>("CW_CIBIL_PERSONAL") ? <CibilBody d={data<CibilData>("CW_CIBIL_PERSONAL")!} title={t("cibilPersonalTitle", { name: item("CW_CIBIL_PERSONAL")?.subjectName ?? "" })} /> : null}
        </Section>
        <Section title={t("sectionTurnover")} codes={["CW_GST_TURNOVER_4Y", "CW_GST_TURNOVER_CY"]} report={report} canRun={canRun} running={running} onRun={(code) => void askToRun(code)}>
          {data<TurnoverData>("CW_GST_TURNOVER_4Y") ?? data<TurnoverData>("CW_GST_TURNOVER_CY") ? (
            <TurnoverBody d={(data<TurnoverData>("CW_GST_TURNOVER_4Y") ?? data<TurnoverData>("CW_GST_TURNOVER_CY"))!} />
          ) : null}
        </Section>
        <Section title={t("sectionIdentity")} codes={["CW_MSME", "CW_PAN", "CW_IEC_PROFILE", "CW_IEC_TURNOVER"]} report={report} canRun={canRun} running={running} onRun={(code) => void askToRun(code)}>
          <IdentityBody msme={data<MsmeData>("CW_MSME")} pan={data<PanData>("CW_PAN")} iec={data<IecProfileData>("CW_IEC_PROFILE")} trade={data<IecTurnoverData>("CW_IEC_TURNOVER")} />
        </Section>
        <Section title={t("sectionCompany")} codes={["CW_COMPANY", "CW_DIRECTORS"]} report={report} canRun={canRun} running={running} onRun={(code) => void askToRun(code)}>
          {data<CompanyData>("CW_COMPANY") ? <CompanyBody d={data<CompanyData>("CW_COMPANY")!} /> : null}
          {data<DirectorData>("CW_DIRECTORS") ? <DirectorBody d={data<DirectorData>("CW_DIRECTORS")!} /> : null}
        </Section>
        <Section title={t("sectionRating")} codes={["CW_CREDIT_RATING"]} report={report} canRun={canRun} running={running} onRun={(code) => void askToRun(code)}>
          {data<CreditRatingData>("CW_CREDIT_RATING") ? <RatingBody d={data<CreditRatingData>("CW_CREDIT_RATING")!} /> : null}
        </Section>
        <Card>
          <CardHeader title={t("sectionCases")} />
          <CardBody className="space-y-3 text-sm">
            <p className="text-muted">{t("casesNote")}</p>
            {canRun ? <ButtonLink href={`/cases?counterparty=${report.counterparty.id}`} variant="secondary" size="sm">{t("caseCheck")}</ButtonLink> : null}
          </CardBody>
        </Card>
      </div>

      {runQuote ? (
        <Dialog
          open
          onClose={() => setRunQuote(null)}
          title={t("runTitle", { name: runQuote.name })}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRunQuote(null)}>{t("cancel")}</Button>
              <Button onClick={() => void runOne()} loading={running === runQuote.code} disabled={!runQuote.quote.enough}>{t("runConfirm")}</Button>
            </>
          }
        >
          <div className="space-y-4">
            <CostSummary quote={runQuote.quote} />
            {!runQuote.quote.enough ? (
              <p role="alert" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
                {t("notEnough")}{" "}
                <Link href="/account/billing" className="underline underline-offset-2">{t("addMoney")}</Link>
              </p>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const t = useTranslations("report");
  const Icon = signal.tone === "positive" ? CheckCircle2 : signal.tone === "red" ? XCircle : signal.tone === "info" ? Info : AlertTriangle;
  const color = signal.tone === "positive" ? "text-success-fg" : signal.tone === "red" ? "text-danger-fg" : signal.tone === "info" ? "text-info-fg" : "text-warning-fg";
  return (
    <li className="flex items-start gap-2">
      <Icon size={16} className={cn("mt-0.5 shrink-0", color)} aria-hidden="true" />
      <span className="text-text-2">{t(`signal.${signal.key}`, signal.values ?? {})}</span>
    </li>
  );
}

function Section({
  title, codes, report, canRun, running, onRun, children,
}: {
  title: string;
  codes: CwCode[];
  report: Report;
  canRun: boolean;
  running: string | null;
  onRun: (code: string) => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("report");
  const items = codes.map((c) => report.items.find((i) => i.code === c)).filter((i) => i !== undefined);
  const done = items.filter((i) => i.status === "success" && !i.hidden);
  const source = done[0];
  return (
    <Card>
      <CardHeader
        title={title}
        action={source?.fetchedAt ? <span className="text-xs text-muted">{t("source", { provider: source.provider?.startsWith("mock") ? t("testData") : source.provider ?? "", time: formatDateTimeIst(new Date(source.fetchedAt)) })}</span> : null}
      />
      <CardBody className="space-y-4 text-sm">
        {!items.length ? <p className="text-muted">{t("state.not_selected")}</p> : null}
        {items
          .filter((i) => i.status !== "success" || i.hidden)
          .map((i) => (
            <div key={i.code} className="flex flex-wrap items-center justify-between gap-2">
              <p className={cn("text-muted", (i.status === "not_available" || i.hidden || i.errorCode?.startsWith("CONSENT_")) && "font-semibold text-warning-fg")}>
                {items.length > 1 ? <span className="font-semibold text-text-2">{i.name}: </span> : null}
                {t(`state.${stateKey(i)}`)}
              </p>
              {i.status === "ready" && canRun ? (
                <Button size="sm" variant="secondary" loading={running === i.code} onClick={() => onRun(i.code)}>
                  {t("runThis")}
                </Button>
              ) : null}
            </div>
          ))}
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
    <section aria-labelledby={`consent-${c.id}`} className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`consent-${c.id}`} className="font-bold text-text">
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

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-medium text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function statusTone(s: string): Tone {
  return s === "Active" ? "success" : "danger";
}

function GstBody({ d }: { d: GstSearchData }) {
  const t = useTranslations("report");
  const onTime = d.filings.filter((f) => f.filed && f.onTime).length;
  return (
    <Rows
      rows={[
        [t("status"), <Tag key="s" tone={statusTone(d.status)}>{d.status}</Tag>],
        [t("registered"), day(d.registrationDate)],
        [t("type"), d.constitution],
        [t("gstinsOnPan"), String(d.gstinsOnPan.length)],
        [t("lastReturn"), d.lastReturnPeriod ?? "—"],
        [t("onTime"), t("onTimeValue", { ok: onTime, total: d.filings.length })],
      ]}
    />
  );
}

function CompanyBody({ d }: { d: CompanyData }) {
  const t = useTranslations("report");
  const open = d.charges.filter((c) => c.status === "Open");
  return (
    <Rows
      rows={[
        [t("status"), <Tag key="s" tone={statusTone(d.status)}>{d.status}</Tag>],
        [t("cin"), <span key="c" className="font-mono text-xs">{d.cin}</span>],
        [t("incorporated"), day(d.incorporationDate)],
        [t("capital"), short(d.paidUpCapitalPaise)],
        [t("charges"), t("openCharges", { count: open.length, amount: short(open.reduce((s, c) => s + c.amountPaise, 0)) })],
        [t("lastBalanceSheet"), d.lastBalanceSheetDate ? day(d.lastBalanceSheetDate) : "—"],
      ]}
    />
  );
}

function DirectorBody({ d }: { d: DirectorData }) {
  const t = useTranslations("report");
  return (
    <div>
      <p className="mb-2 font-bold text-text">{t("directors")}</p>
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {d.directors.map((x) => (
          <li key={x.din} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>
              <span className="font-semibold text-text">{x.name}</span> <span className="text-xs text-muted">· {x.designation} · DIN {x.din}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted">
              {t("otherCompanies", { count: x.otherCompanies })}
              {x.disqualified ? <Tag tone="danger">{t("disqualified")}</Tag> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RatingBody({ d }: { d: CreditRatingData }) {
  const t = useTranslations("report");
  if (!d.ratings.length) return <p className="text-muted">{t("notRated")}</p>;
  return (
    <ul className="space-y-1.5">
      {d.ratings.map((r) => (
        <li key={r.agency + r.instrument} className="flex flex-wrap justify-between gap-2">
          <span className="text-text-2">{r.agency} · {r.instrument}</span>
          <span className="font-bold text-text">{r.rating} <span className="font-normal text-muted">({r.outlook}, {day(r.date)})</span></span>
        </li>
      ))}
    </ul>
  );
}

function TurnoverBody({ d }: { d: TurnoverData }) {
  const t = useTranslations("report");
  const max = Math.max(1, ...d.years.map((y) => y.turnoverPaise));
  return (
    <div className="flex h-44 items-end gap-3" role="img" aria-label={d.years.map((y) => `${y.fy}: ${short(y.turnoverPaise)}`).join(", ")}>
      {d.years.map((y) => (
        <div key={y.fy} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-xs font-bold tabular-nums text-text">{short(y.turnoverPaise)}</span>
          <div className={cn("w-full rounded-t-lg", y.partial ? "bg-primary/40" : "bg-primary")} style={{ height: `${Math.max(6, (y.turnoverPaise / max) * 120)}px` }} />
          <span className="text-[11px] text-muted">{y.partial ? t("partialYear", { fy: y.fy }) : t("turnoverYear", { fy: y.fy })}</span>
        </div>
      ))}
    </div>
  );
}

function CibilBody({ d, title }: { d: CibilData; title: string | null }) {
  const t = useTranslations("report");
  const worst = Math.max(0, ...d.overdue.map((o) => o.daysPastDue));
  return (
    <div className="space-y-2">
    {title ? <p className="font-bold text-text">{title}</p> : null}
    <Rows
      rows={[
        [t("cibilRank"), `${d.bureau} ${d.scoreOrRank}`],
        [t("activeLoans"), `${d.activeLoans}, ${inr(d.sanctionedPaise)}`],
        [t("outstanding"), inr(d.outstandingPaise)],
        [t("overdueLoans"), d.overdue.length ? <Tag key="o" tone={worst >= 90 ? "danger" : "warning"}>{t("overdueValue", { count: d.overdue.length, days: worst })}</Tag> : t("noneOverdue")],
        [t("enquiries"), String(d.enquiries6m)],
      ]}
    />
    </div>
  );
}

/** v3 FR-CW-10: MSME, PAN check and Import export in one "Business identity" section. */
function IdentityBody({ msme, pan, iec, trade }: { msme: MsmeData | null; pan: PanData | null; iec: IecProfileData | null; trade: IecTurnoverData | null }) {
  const t = useTranslations("report");
  const rows: [string, React.ReactNode][] = [];
  if (msme) rows.push([t("msme"), `${msme.udyamNumber} · ${t(`msmeCategory.${msme.category}`)} · ${msme.majorActivity}`]);
  if (pan) rows.push([t("panCheck"), <Tag key="p" tone={pan.status === "Valid" ? "success" : "danger"}>{t("panStatus", { status: pan.status, name: pan.name })}</Tag>]);
  if (pan && pan.aadhaarLinked !== null) rows.push([t("aadhaarLinked"), pan.aadhaarLinked ? t("yes") : t("no")]);
  if (iec) rows.push([t("iecProfile"), `${iec.iec} · ${iec.status} · ${t("since", { date: day(iec.issuedOn) })}`]);
  if (trade?.years.length) {
    const last = trade.years[trade.years.length - 1];
    rows.push([t("iecTurnover", { fy: last.fy }), t("iecValue", { exports: short(last.exportPaise), imports: short(last.importPaise) })]);
  }
  if (!rows.length) return null;
  return <Rows rows={rows} />;
}
