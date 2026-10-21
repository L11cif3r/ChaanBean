"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownUp, ArrowLeft, Building2, Check, Download, Info, Landmark, Search } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Checkbox, GradientText, PageHeader, Segmented, Select, Skeleton, Tag, type Tone } from "@/components/ui";
import { CancelWindow } from "@/components/ui/cancel-window";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { CONSENT_CHANNELS, CONSENT_PURPOSES, type ConsentChannel, type ConsentPurpose } from "@/lib/consent";
import { formatDate } from "@/lib/dates";
import { formatInr, formatInrShort } from "@/lib/money";
import type { ScreenResult } from "@/lib/screen";
import type { BulkQuote, BulkView as View, BulkRowView } from "@/server/bulk/service";
import type { CompanyHit } from "@/server/companies/search";
import { newIdempotencyKey } from "./choose-checks";

// PRD v4.0 sections 6 to 8 on one page, following the search's status: confirm the matches (free), run the quick
// screen (one cost popup and one cancel window), then filter the results, deep-check the ticked companies and export.

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });
const RESULT_TONE: Record<ScreenResult, Tone> = { looks_good: "success", check_further: "warning", avoid: "danger", not_enough_data: "neutral" };
type DeepCheck = { code: string; name: string; pricePaise: number; consent: boolean; group: "cw" | "cc" };

export function BulkView({ id, checks }: { id: string; checks: DeepCheck[] }) {
  const t = useTranslations("checks.multi");
  const toast = useToast();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api<View>(`/api/v1/bulk/${id}`).then((res) => {
    if (res.ok) setView(res.data);
    else setError(res.error.message);
  }), [id]);

  useEffect(() => { void load(); }, [load]);
  // While checks run, the page fills in by itself.
  useEffect(() => {
    if (view?.status !== "screening" && view?.status !== "deep_running") return;
    const timer = setTimeout(() => void load(), 2500);
    return () => clearTimeout(timer);
  }, [view, load]);

  if (error) return <Card><CardBody><p role="alert" className="text-danger-fg">{error}</p></CardBody></Card>;
  if (!view) return <div className="space-y-4"><Skeleton className="h-24 w-full rounded-3xl" /><Skeleton className="h-72 w-full rounded-3xl" /></div>;

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <Link href="/checks/bulk" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"><ArrowLeft size={14} aria-hidden="true" /> {t("back")}</Link>
      <PageHeader
        title={t.rich("titleRich", { accent: (c) => <GradientText>{c}</GradientText> })}
        description={t("resultsSubtitle", { name: view.fileName ?? t("typedName", { count: view.rows.length }), at: formatDate(view.createdAt.slice(0, 10)), count: view.rows.length })}
      />
      <Steps status={view.status} />
      {view.sample ? <p className="rounded-xl bg-warning-bg px-4 py-2.5 text-[13px] font-semibold text-warning-fg">{t("sampleBanner")}</p> : null}
      {view.status === "ready" ? <MatchReview view={view} onChange={setView} /> : null}
      {view.status === "confirmed" ? <ScreenStep view={view} onDone={() => void load()} toast={toast} /> : null}
      {view.status === "screening" ? <Progress view={view} /> : null}
      {view.status === "screened" || view.status === "deep_running" || view.status === "done" ? <Results view={view} checks={checks} onReload={() => void load()} /> : null}
    </div>
  );
}

function Steps({ status }: { status: View["status"] }) {
  const t = useTranslations("checks.multi");
  const at = status === "ready" ? 0 : status === "confirmed" || status === "screening" ? 1 : 2;
  const keys = ["stepMatch", "stepScreen", "stepResults"] as const;
  return (
    <ol className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm sm:gap-3 sm:p-2.5">
      {keys.map((k, i) => (
        <li key={k} className={cn("flex min-w-0 items-center gap-2 sm:gap-3", i < keys.length - 1 && "flex-1")} aria-current={i === at ? "step" : undefined}>
          <span className={cn("flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 sm:px-2.5", i === at && "bg-primary-softer")}>
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                i === at ? "bg-brand text-white shadow-orange" : i < at ? "bg-success-bg text-success-fg" : "bg-surface-strong text-muted",
              )}
            >
              {i < at ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn("min-w-0", i !== at && "sr-only sm:not-sr-only")}><span className={cn("block truncate text-xs font-semibold sm:text-[13px]", i === at ? "text-text" : "text-muted")}>{t(k)}</span></span>
          </span>
          {i < keys.length - 1 ? <span className={cn("h-px min-w-3 flex-1 rounded-full", i < at ? "bg-success-fg/40" : "bg-border")} aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- 1. confirm matches (6.2)

function HitLine({ h }: { h: CompanyHit }) {
  const t = useTranslations("checks.search");
  const Icon = h.source === "gst" ? Landmark : Building2;
  return (
    <span className="flex min-w-0 items-start gap-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-text">
          {h.name}
          {h.source === "yours" ? <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary-text">{t("yourBuyers")}</span> : null}
          {h.status && h.source !== "yours" ? <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", /^active$/i.test(h.status) ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg")}>{h.status}</span> : null}
        </span>
        <span className="block text-xs text-muted">{[h.cin ?? h.gstin, h.city, h.state, h.registrationDate ? t("since", { date: formatDate(h.registrationDate) }) : null].filter(Boolean).join(" · ")}</span>
      </span>
    </span>
  );
}

function MatchReview({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const t = useTranslations("checks.multi");
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(rowId: string, change: { included?: boolean; pick?: string; gstin?: string }) {
    setBusy(rowId);
    const res = await api<View>(`/api/v1/bulk/${view.id}/rows`, { method: "PATCH", body: { changes: [{ rowId, ...change }] } });
    setBusy(null);
    if (res.ok) onChange(res.data);
    else toast(res.error.message, "danger");
  }

  async function confirm() {
    setBusy("confirm");
    const res = await api<View>(`/api/v1/bulk/${view.id}/confirm`, { body: {} });
    setBusy(null);
    if (res.ok) { onChange(res.data); toast(t("confirmed"), "success"); }
    else toast(res.error.fields?.rows ?? res.error.message, "danger");
  }

  const s = view.summary;
  return (
    <>
      <Card>
        <CardHeader title={t("matchTitle")} action={<span className="text-xs font-semibold text-muted">{t("freeNote")}</span>} />
        <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5">
          <Tag tone="success">{t("readyN", { count: s.ready })}</Tag>
          {s.needsPick ? <Tag tone="warning">{t("needsPickN", { count: s.needsPick })}</Tag> : null}
          {s.skipped ? <Tag tone="neutral">{t("skippedN", { count: s.skipped })}</Tag> : null}
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {view.rows.map((r) => {
            const usable = r.matchState === "matched_exact" || r.matchState === "picked" || r.matchState === "needs_pick";
            const typed = [r.input.companyName, r.input.gstin, r.input.cin, r.input.city].filter(Boolean).join(" · ");
            return (
              <li key={r.id} className={cn("space-y-3 px-4 py-3.5 sm:px-5", !r.included && "bg-surface-muted/60")}>
                <div className="flex flex-wrap items-start gap-3">
                  <Checkbox id={`inc-${r.id}`} checked={r.included} disabled={!usable || busy === r.id} onChange={(e) => void patch(r.id, { included: e.target.checked })}
                    label={<span className="font-semibold text-text">{t("rowN", { n: r.rowNo })}: <span className="font-normal text-text-2">{typed}</span></span>} />
                  <span className="ml-auto"><Tag tone={r.matchState === "matched_exact" || r.matchState === "picked" ? "success" : r.matchState === "needs_pick" ? "warning" : r.matchState === "invalid" ? "danger" : "neutral"}>{t(`match.${r.matchState}`)}</Tag></span>
                </div>
                {(r.matchState === "matched_exact" || (r.matchState === "picked" && r.candidates.length <= 1)) && r.picked ? <div className="pl-7"><HitLine h={r.picked} /></div> : null}
                {r.matchState === "needs_pick" || (r.matchState === "picked" && r.candidates.length > 1) ? (
                  <fieldset className="space-y-1.5 pl-7">
                    <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-subtle">{t("pickOne", { count: r.candidates.length })}</legend>
                    {r.candidates.map((h) => (
                      <label key={h.key} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5", r.picked?.key === h.key ? "border-primary bg-primary-softer" : "border-border hover:border-primary-line")}>
                        <input type="radio" name={`pick-${r.id}`} checked={r.picked?.key === h.key} disabled={busy === r.id} onChange={() => void patch(r.id, { pick: h.key })} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                        <HitLine h={h} />
                      </label>
                    ))}
                    <details className="pt-1 text-sm">
                      <summary className="cursor-pointer font-semibold text-primary-text">{t("noneOfThese")}</summary>
                      <div className="mt-2"><AddGstin busy={busy === r.id} onAdd={(gstin) => patch(r.id, { gstin })} /></div>
                    </details>
                  </fieldset>
                ) : null}
                {r.matchState === "not_found" || (r.matchState === "invalid" && r.error === "badGstin") ? (
                  <div className="space-y-2 pl-7">
                    {r.matchState === "not_found" ? <p className="text-sm text-muted">{r.error ? t(`rowError.${r.error}`) : t("notFoundHelp")}</p> : null}
                    <AddGstin busy={busy === r.id} onAdd={(gstin) => patch(r.id, { gstin })} />
                  </div>
                ) : null}
                {r.matchState === "invalid" && r.error ? <p className="pl-7 text-sm font-semibold text-danger-fg">{t(`rowError.${r.error}`)}</p> : null}
                {r.matchState === "duplicate" ? <p className="pl-7 text-sm text-muted">{t("duplicateHelp")}</p> : null}
              </li>
            );
          })}
        </ul>
      </Card>
      <StickyBar>
        <p className="text-sm text-text-2">{s.needsPick ? t("pickFirst", { count: s.needsPick }) : t("readyToScreen", { count: s.ready })}</p>
        <Button loading={busy === "confirm"} disabled={!s.ready || s.needsPick > 0} onClick={() => void confirm()}>{t("continue", { count: s.ready })}</Button>
      </StickyBar>
    </>
  );
}

/** 14.2: type the GSTIN of a row that was not found; the row is matched again by it. */
function AddGstin({ busy, onAdd }: { busy: boolean; onAdd: (gstin: string) => Promise<void> }) {
  const t = useTranslations("checks.multi");
  const [gstin, setGstin] = useState("");
  return (
    <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); if (gstin.trim()) void onAdd(gstin); }}>
      <input aria-label={t("addGstinLabel")} value={gstin} maxLength={15} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder={t("addGstinLabel")}
        className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-field px-3 font-mono text-sm outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]" />
      <Button type="submit" variant="secondary" loading={busy} disabled={gstin.trim().length !== 15}>{t("addGstinBtn")}</Button>
    </form>
  );
}

/** Desktop: a card row. Phone: fixed to the bottom of the screen, so the next step is always in reach (v4 C16). */
function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[var(--nav-bg)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl lg:static lg:rounded-2xl lg:border lg:bg-surface lg:px-4 lg:shadow-sm lg:backdrop-blur-none">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- cost popup with the cancel window (section 8)

function QuoteLines({ quote }: { quote: BulkQuote }) {
  const t = useTranslations("checks.multi");
  const tc = useTranslations("checks");
  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-1.5">
        {quote.lines.map((l) => (
          <li key={l.code} className="flex justify-between gap-3">
            <span className="text-text-2">{l.name} <span className="text-muted">× {l.count}</span></span>
            <span className="tabular-nums">{inr(l.pricePaise)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1 border-t border-border pt-2">
        <div className="flex justify-between"><dt className="text-muted">{tc("beforeGst")}</dt><dd className="tabular-nums">{inr(quote.pricePaise)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{tc("gst")}</dt><dd className="tabular-nums">{inr(quote.gstPaise)}</dd></div>
        <div className="flex justify-between text-base font-semibold"><dt>{tc("total")}</dt><dd className="tabular-nums">{inr(quote.pricePaise + quote.gstPaise)}</dd></div>
        <div className="flex justify-between pt-1"><dt className="text-muted">{tc("walletNow")}</dt><dd className="tabular-nums">{inr(quote.walletBeforePaise)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{t("walletAfter")}</dt><dd className="tabular-nums">{inr(quote.walletAfterPaise)}</dd></div>
      </dl>
      {quote.skipped ? <p className="text-xs text-muted">{t("skippedNote", { count: quote.skipped })}</p> : null}
      {quote.sample ? <p className="rounded-xl bg-warning-bg px-3 py-2 text-xs font-semibold text-warning-fg">{tc("sampleNote")}</p> : null}
      {!quote.enough ? <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-xs font-semibold text-danger-fg">{t("notEnough")} <Link href="/account/billing" className="underline">{t("addMoney")}</Link></p> : null}
      <p className="text-xs text-muted">{t("chargeNote")}</p>
    </div>
  );
}

/** "Run" button that turns into the countdown bar with Cancel in place (v4 section 8); there is no confirm popup. */
function RunButton({ label, disabled, onRun, onCancelRun, onDone }: {
  label: React.ReactNode; disabled?: boolean;
  onRun: () => Promise<{ cancelWindowSeconds: number } | null>; onCancelRun: () => Promise<void>; onDone: () => void;
}) {
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  if (pending) {
    return (
      <div className="w-full">
        <CancelWindow inline seconds={pending} onCancel={async () => { await onCancelRun(); setPending(null); }} onDone={() => { setPending(null); onDone(); }} />
      </div>
    );
  }
  return (
    <Button loading={busy} disabled={disabled} onClick={async () => { setBusy(true); const r = await onRun(); setBusy(false); if (r) setPending(r.cancelWindowSeconds); }}>
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------- 2. quick screen (7.1 step 1)

function ScreenStep({ view, onDone, toast }: { view: View; onDone: () => void; toast: ReturnType<typeof useToast> }) {
  const t = useTranslations("checks.multi");
  const [quote, setQuote] = useState<BulkQuote | null>(null);
  const [key] = useState(newIdempotencyKey);

  useEffect(() => {
    void api<BulkQuote>(`/api/v1/bulk/${view.id}/screen`).then((res) => { if (res.ok) setQuote(res.data); else toast(res.error.message, "danger"); });
  }, [view.id, toast]);

  const companies = view.rows.filter((r) => r.counterpartyId && r.included);
  return (
    <>
      <Card>
        <CardHeader title={t("screenTitle")} />
        <CardBody className="space-y-4">
          <p className="text-[13px] text-muted">{t("screenBodyShort")}</p>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {companies.map((r) => (
              <li key={r.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface-muted/50 px-3 py-2"><Building2 size={14} className="shrink-0 text-primary-text" aria-hidden="true" /><span className="truncate">{r.companyName}</span></li>
            ))}
          </ul>
          {quote ? <QuoteLines quote={quote} /> : <Skeleton className="h-32 w-full rounded-2xl" />}
        </CardBody>
      </Card>
      <StickyBar>
        <p className="text-sm font-medium text-text">{quote ? t("screenCost", { amount: inr(quote.walletPaise), count: quote.companies }) : "…"}</p>
        <RunButton
          label={<><Search aria-hidden="true" /> {t("runScreen")}</>}
          disabled={!quote || !quote.enough || !quote.companies}
          onRun={async () => {
            const res = await api<{ cancelWindowSeconds: number }>(`/api/v1/bulk/${view.id}/screen`, { body: {}, idempotencyKey: key });
            if (!res.ok) { toast(res.error.message, "danger"); return null; }
            return res.data;
          }}
          onCancelRun={async () => {
            const res = await api(`/api/v1/bulk/${view.id}/cancel`, { body: {} });
            toast(res.ok ? t("cancelledNothing") : res.error.message, res.ok ? "success" : "danger");
            onDone();
          }}
          onDone={() => { toast(quote?.sample ? t("sampleStarted") : t("held", { amount: inr(quote?.walletPaise ?? 0) }), "success"); onDone(); }}
        />
      </StickyBar>
    </>
  );
}

function Progress({ view }: { view: View }) {
  const t = useTranslations("checks.multi");
  const rows = view.rows.filter((r) => r.screen);
  const done = rows.filter((r) => r.screen?.result).length;
  return (
    <Card>
      <CardBody className="space-y-3">
        <p className="font-bold text-text">{t("screening", { done, total: rows.length })}</p>
        <div className="h-2 overflow-hidden rounded-full bg-surface-strong"><div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} /></div>
        <p className="text-sm text-muted">{t("screeningNote")}</p>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------- 3. results, filters, deep check, export (7.2)

type SortKey = "company" | "filed" | "years" | "capital" | "result";
const RESULT_ORDER: Record<ScreenResult, number> = { looks_good: 0, check_further: 1, avoid: 2, not_enough_data: 3 };

function Results({ view, checks, onReload }: { view: View; checks: DeepCheck[]; onReload: () => void }) {
  const t = useTranslations("checks.multi");
  const tc = useTranslations("checks.consent");
  const toast = useToast();
  const rows = useMemo(() => view.rows.filter((r) => r.screen), [view.rows]);
  const [result, setResult] = useState<ScreenResult | "all">(() => (rows.some((r) => r.screen?.result === "looks_good") ? "looks_good" : "all"));
  const [state, setState] = useState("");
  const [minYears, setMinYears] = useState(0);
  const [filing, setFiling] = useState<"" | "regular" | "irregular">("");
  const [mca, setMca] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "result", dir: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deepOpen, setDeepOpen] = useState(false);

  const stateOf = (r: BulkRowView) => r.screen?.facts.state ?? r.picked?.state ?? null;
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) if (r.screen?.result) c[r.screen.result] = (c[r.screen.result] ?? 0) + 1;
    return c;
  }, [rows]);
  const states = [...new Set(rows.map(stateOf).filter((s): s is string => Boolean(s)))].sort();
  const mcaStatuses = [...new Set(rows.map((r) => r.screen?.facts.mcaStatus).filter((s): s is string => Boolean(s)))].sort();

  const shown = rows
    .filter((r) => result === "all" || r.screen?.result === result)
    .filter((r) => !state || stateOf(r) === state)
    .filter((r) => !minYears || (r.screen?.facts.yearsInBusiness ?? -1) >= minYears)
    .filter((r) => {
      const late = r.screen?.facts.lateOrMissing12;
      if (!filing) return true;
      if (late == null) return false;
      return filing === "regular" ? late <= 1 : late > 1;
    })
    .filter((r) => !mca || r.screen?.facts.mcaStatus === mca)
    .sort((a, b) => {
      const fa = a.screen?.facts ?? {};
      const fb = b.screen?.facts ?? {};
      const v = (r: BulkRowView, f: typeof fa): number | string =>
        sort.key === "company" ? (r.companyName ?? "") : sort.key === "filed" ? (f.filed12 ?? -1) : sort.key === "years" ? (f.yearsInBusiness ?? -1)
          : sort.key === "capital" ? (f.paidUpCapitalPaise ?? -1) : RESULT_ORDER[r.screen?.result ?? "not_enough_data"];
      const x = v(a, fa);
      const y = v(b, fb);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });

  const allShown = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const toggle = (rowId: string, on: boolean) => setSelected((s) => { const n = new Set(s); if (on) n.add(rowId); else n.delete(rowId); return n; });
  const head = (key: SortKey, label: string) => (
    <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))} className="inline-flex items-center gap-1 font-semibold uppercase hover:text-text" aria-label={t("sortBy", { label })}>
      {label} <ArrowDownUp size={11} className={cn(sort.key === key ? "text-primary" : "text-subtle")} aria-hidden="true" />
    </button>
  );

  return (
    <>
      <p className="flex items-start gap-2 rounded-xl bg-info-bg px-4 py-2.5 text-[13px] font-semibold text-info-fg"><Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{t("publicOnly")}</p>
      {view.status === "deep_running" ? <p className="text-sm font-semibold text-primary-text">{t("deepRunning")}</p> : null}
      <Card>
        <div className="space-y-3 p-3 sm:p-4">
          <Segmented
            label={t("filterResult")}
            value={result}
            onChange={setResult}
            items={(["all", "looks_good", "check_further", "avoid", "not_enough_data"] as const).map((k) => ({
              key: k,
              label: <>{k === "all" ? t("all") : t(`result.${k}`)} <span className="ml-1 tabular-nums text-subtle">{counts[k] ?? 0}</span></>,
            }))}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select id="f-state" aria-label={t("filterState")} value={state} onChange={(e) => setState(e.target.value)} className="h-10 text-sm">
              <option value="">{t("allStates")}</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select id="f-years" aria-label={t("filterYears")} value={String(minYears)} onChange={(e) => setMinYears(Number(e.target.value))} className="h-10 text-sm">
              <option value="0">{t("anyYears")}</option>
              {[2, 5, 10].map((y) => <option key={y} value={y}>{t("yearsPlus", { years: y })}</option>)}
            </Select>
            <Select id="f-filing" aria-label={t("filterFiling")} value={filing} onChange={(e) => setFiling(e.target.value as typeof filing)} className="h-10 text-sm">
              <option value="">{t("anyFiling")}</option>
              <option value="regular">{t("filingRegular")}</option>
              <option value="irregular">{t("filingIrregular")}</option>
            </Select>
            <Select id="f-mca" aria-label={t("filterMca")} value={mca} onChange={(e) => setMca(e.target.value)} className="h-10 text-sm">
              <option value="">{t("anyMca")}</option>
              {mcaStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-surface-muted text-[11px] uppercase tracking-[1px] text-subtle">
              <tr>
                <th scope="col" className="w-10 px-4 py-2.5"><input type="checkbox" aria-label={t("selectAll")} checked={allShown} onChange={(e) => setSelected(e.target.checked ? new Set([...selected, ...shown.map((r) => r.id)]) : new Set())} className="h-4 w-4 accent-[var(--primary)]" /></th>
                <th scope="col" className="px-2 py-2.5">{head("company", t("col.company"))}</th>
                <th scope="col" className="px-2 py-2.5">{t("col.gst")}</th>
                <th scope="col" className="px-2 py-2.5">{head("filed", t("col.filed"))}</th>
                <th scope="col" className="px-2 py-2.5">{t("col.mca")}</th>
                <th scope="col" className="px-2 py-2.5">{head("years", t("col.years"))}</th>
                <th scope="col" className="px-2 py-2.5">{head("capital", t("col.capital"))}</th>
                <th scope="col" className="px-4 py-2.5">{head("result", t("col.result"))}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => {
                const f = r.screen?.facts ?? {};
                const res = r.screen?.result;
                return (
                  <tr key={r.id} className={cn("transition-colors hover:bg-hover", selected.has(r.id) && "bg-primary-softer")}>
                    <td className="px-4 py-3 align-top"><input type="checkbox" aria-label={t("selectRow", { name: r.companyName ?? "" })} checked={selected.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" /></td>
                    <td className="px-2 py-3 align-top">
                      {r.counterpartyId ? <Link href={`/counterparties/${r.counterpartyId}`} className="font-semibold text-text hover:underline">{r.companyName}</Link> : <span className="font-semibold">{r.companyName}</span>}
                      <span className="block font-mono text-[11px] text-muted">{r.picked?.gstin ?? r.picked?.cin}</span>
                      {r.deep ? <Link href={`/reports/${r.deep.requestId}`} className="mr-3 mt-1 inline-block text-xs font-bold text-primary-text underline">{t("openReport", { no: r.deep.reportNo })}</Link> : null}
                      {r.case ? <Link href={`/cases/${r.case.requestId}`} className="mt-1 inline-block text-xs font-bold text-primary-text underline">{t("openCase", { no: r.case.reportNo })}</Link> : null}
                    </td>
                    <td className="px-2 py-3 align-top">{f.gstStatus ?? <span className="text-muted">—</span>}</td>
                    <td className="px-2 py-3 align-top tabular-nums">{f.months12 ? `${f.filed12}/${f.months12}` : <span className="text-muted">—</span>}</td>
                    <td className="px-2 py-3 align-top">{f.mcaStatus ?? <span className="text-muted">—</span>}</td>
                    <td className="px-2 py-3 align-top tabular-nums">{f.yearsInBusiness ?? <span className="text-muted">—</span>}</td>
                    <td className="px-2 py-3 align-top tabular-nums">{f.paidUpCapitalPaise != null ? formatInrShort(BigInt(f.paidUpCapitalPaise)) : <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3 align-top">
                      {res ? <Tag tone={RESULT_TONE[res]}>{t(`result.${res}`)}</Tag> : <span className="text-xs text-muted">{t("pending")}</span>}
                      {r.screen?.reasons.length ? (
                        <ul className="mt-1.5 space-y-0.5 text-xs text-text-2">
                          {r.screen.reasons.map((x, i) => <li key={i}>{t(`reason.${x.key}`, x.values ?? {})}</li>)}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!shown.length ? <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-muted">{t("noneMatch")}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>

      {deepOpen ? <DeepPanel bulkId={view.id} rowIds={[...selected]} checks={checks} tc={tc} onClose={() => setDeepOpen(false)} onStarted={() => { setDeepOpen(false); setSelected(new Set()); onReload(); }} toast={toast} /> : null}

      <StickyBar>
        <a href={`/api/v1/bulk/${view.id}/export`} download className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-text hover:underline"><Download size={15} aria-hidden="true" /> {t("export")}</a>
        {!deepOpen ? <Button disabled={!selected.size || view.status === "deep_running"} onClick={() => setDeepOpen(true)}>{t("deepN", { count: selected.size })}</Button> : null}
      </StickyBar>
    </>
  );
}

function DeepPanel({ bulkId, rowIds: picked, checks, onClose, onStarted, toast, tc }: {
  bulkId: string; rowIds: string[]; checks: DeepCheck[]; onClose: () => void; onStarted: () => void; toast: ReturnType<typeof useToast>; tc: ReturnType<typeof useTranslations>;
}) {
  const t = useTranslations("checks.multi");
  // Fixed while the panel is open, so the quote is not asked again on every render.
  const [rowIds] = useState(picked);
  const [codes, setCodes] = useState<string[]>(() => checks.filter((c) => ["CW_DIRECTORS", "CW_CREDIT_RATING"].includes(c.code)).map((c) => c.code));
  const [quote, setQuote] = useState<BulkQuote | null>(null);
  const [purpose, setPurpose] = useState<ConsentPurpose>("supply_on_credit");
  const [channels, setChannels] = useState<Record<ConsentChannel, boolean>>({ sms: true, whatsapp: true, email: false });
  const [key] = useState(newIdempotencyKey);

  useEffect(() => {
    if (!codes.length) return;
    let live = true;
    void api<BulkQuote>(`/api/v1/bulk/${bulkId}/deep`, { body: { action: "quote", rowIds, codes } }).then((res) => {
      if (!live) return;
      if (res.ok) setQuote(res.data);
      else toast(res.error.message, "danger");
    });
    return () => { live = false; };
  }, [bulkId, rowIds, codes, toast]);

  const consent = { purpose, channels: CONSENT_CHANNELS.filter((c) => channels[c]) };
  const extra = (
    <div className="space-y-4">
      {(["cw", "cc"] as const).map((g) => (
      <fieldset key={g} className="space-y-2">
        <legend className="mb-1 text-sm font-bold text-text">{t(g === "cw" ? "deepPick" : "deepPickCase")}</legend>
        {g === "cc" ? <p className="text-xs text-muted">{t("caseNote")}</p> : null}
        {checks.filter((c) => c.group === g).map((c) => (
          <Checkbox key={c.code} id={`deep-${c.code}`} checked={codes.includes(c.code)}
            onChange={(e) => { setQuote(null); setCodes((cs) => (e.target.checked ? [...cs, c.code] : cs.filter((x) => x !== c.code))); }}
            label={<span className="flex w-full flex-wrap justify-between gap-x-3"><span className="font-semibold">{c.name}{c.consent ? <span className="ml-1.5 text-xs font-normal text-muted">{t("needsOtp")}</span> : null}</span><span className="tabular-nums text-muted">{t("each", { amount: inr(c.pricePaise) })}</span></span>} />
        ))}
      </fieldset>
      ))}
      {quote?.needsConsent ? (
        <div className="space-y-3 rounded-lg border border-primary-line bg-primary-softer p-3">
          <p className="text-sm text-text-2">{t("consentNote", { count: quote.needsConsent })}</p>
          <fieldset>
            <legend className="mb-1 text-sm font-bold text-text-2">{tc("channels")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {CONSENT_CHANNELS.map((c) => (
                <label key={c} className="inline-flex min-h-9 items-center gap-2"><input type="checkbox" checked={channels[c]} onChange={(e) => setChannels({ ...channels, [c]: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />{tc(`channel.${c}`)}</label>
              ))}
            </div>
          </fieldset>
          <Select id="deep-purpose" aria-label={tc("purpose")} value={purpose} onChange={(e) => setPurpose(e.target.value as ConsentPurpose)}>
            {CONSENT_PURPOSES.map((p) => <option key={p} value={p}>{tc(`purposes.${p}`)}</option>)}
          </Select>
        </div>
      ) : null}
    </div>
  );

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const canRun = Boolean(codes.length && quote && quote.enough && quote.companies) && (!quote?.needsConsent || consent.channels.length > 0);
  return (
    <div ref={ref} className="scroll-mt-20 animate-[cb-fade-up_0.25s_ease-out_both]">
      <Card>
        <CardHeader title={t("deepTitle", { count: rowIds.length })} action={<Button size="sm" variant="ghost" onClick={onClose}>{t("notNow")}</Button>} />
        <CardBody className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {extra}
          <div className="min-w-0 space-y-3 rounded-xl bg-surface-muted/60 p-3.5">
            {codes.length && quote ? (
              <>
                <p className="text-sm font-medium text-text">{t("forCompanies", { count: quote.companies })}</p>
                <QuoteLines quote={quote} />
              </>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
            <RunButton
              label={t("yesRun", { count: quote?.companies ?? 0 })}
              disabled={!canRun}
              onRun={async () => {
                const res = await api<{ cancelWindowSeconds: number }>(`/api/v1/bulk/${bulkId}/deep`, {
                  body: { action: "start", rowIds, codes, consent: quote?.needsConsent ? consent : undefined }, idempotencyKey: key,
                });
                if (!res.ok) { toast(res.error.fields?.channels ?? res.error.message, "danger"); return null; }
                return res.data;
              }}
              onCancelRun={async () => {
                const res = await api(`/api/v1/bulk/${bulkId}/cancel`, { body: {} });
                toast(res.ok ? t("cancelledNothing") : res.error.message, res.ok ? "success" : "danger");
                onClose();
              }}
              onDone={() => { toast(quote?.sample ? t("sampleStarted") : t("held", { amount: inr(quote?.walletPaise ?? 0) }), "success"); onStarted(); }}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
