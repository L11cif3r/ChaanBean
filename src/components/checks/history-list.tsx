"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, FileSpreadsheet, Plus, Search, X } from "lucide-react";
import { Button, ButtonLink, Card, EmptyState, GradientText, PageHeader, Segmented, Select, Tag, type Tone } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { formatInrShort } from "@/lib/money";
import type { HistoryRow } from "@/server/checks/history";

// Credit Worthiness history with filters: search by company, GSTIN or report number; risk level; status; date range;
// single or bulk search; sort. All filtering is on the page, so it is instant. Rows are cards on phones and
// table-like columns from lg up.

type Risk = NonNullable<HistoryRow["riskLevel"]>;
const RISKS: Risk[] = ["high", "medium", "low", "not_enough_data"];
export const RISK_TONE: Record<Risk, Tone> = { high: "danger", medium: "warning", low: "success", not_enough_data: "neutral" };
const DAY = 86_400_000;
/** Company · risk · safe credit · status · date · open. */
const COLS = "lg:grid-cols-[minmax(0,2.4fr)_8rem_minmax(0,1.2fr)_8.5rem_7rem_4.5rem]";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function HistoryList({ rows, devSample, now }: { rows: HistoryRow[]; devSample: boolean; /** Server time, for the date filter. */ now: number }) {
  const t = useTranslations("checks.history");
  const tr = useTranslations("report.risk");
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [risks, setRisks] = useState<Risk[]>([]);
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("newest");
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const needle = norm(q);
    const since = period === "all" ? 0 : now - Number(period) * DAY;
    const out = rows.filter((r) => {
      if (needle && ![r.company.name, r.company.gstin ?? "", r.reportNo, r.company.city ?? ""].some((f) => norm(f).includes(needle))) return false;
      if (risks.length && !(r.riskLevel && risks.includes(r.riskLevel))) return false;
      if (status === "done" && !(r.status !== "in_progress" && !r.expired)) return false;
      if (status === "running" && r.status !== "in_progress") return false;
      if (status === "waiting" && !r.waitingConsent) return false;
      if (status === "partial" && r.status !== "partial") return false;
      if (status === "expired" && !r.expired) return false;
      if (since && new Date(r.createdAt).getTime() < since) return false;
      if (source === "single" && r.bulk) return false;
      if (source === "bulk" && !r.bulk) return false;
      return true;
    });
    const rank = (r: HistoryRow) => (r.riskLevel ? RISKS.indexOf(r.riskLevel) : 9);
    return out.sort((a, b) =>
      sort === "oldest" ? a.createdAt.localeCompare(b.createdAt)
        : sort === "risk" ? rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt)
          : sort === "credit" ? (b.creditHighPaise ?? -1) - (a.creditHighPaise ?? -1)
            : sort === "name" ? a.company.name.localeCompare(b.company.name)
              : b.createdAt.localeCompare(a.createdAt),
    );
  }, [rows, q, risks, status, period, source, sort, now]);

  const counts = useMemo(() => Object.fromEntries(RISKS.map((r) => [r, rows.filter((x) => x.riskLevel === r).length])) as Record<Risk, number>, [rows]);
  const filtered = q || risks.length || status !== "all" || period !== "all" || source !== "all";
  const clear = () => { setQ(""); setRisks([]); setStatus("all"); setPeriod("all"); setSource("all"); };
  const toggle = (r: Risk) => setRisks((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));

  async function sample(method: "POST" | "DELETE") {
    setBusy(true);
    const res = await api<{ created?: number; removed?: number }>("/api/v1/dev/sample-reports", { method, body: {} });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    toast(method === "POST" ? t("sampleAdded", { count: res.data.created ?? 0 }) : t("sampleRemoved", { count: res.data.removed ?? 0 }), "success");
    router.refresh();
  }

  const statusOf = (r: HistoryRow): { key: string; tone: Tone } =>
    r.expired ? { key: "expired", tone: "neutral" }
      : r.waitingConsent ? { key: "waiting", tone: "warning" }
        : r.status === "in_progress" ? { key: "running", tone: "info" }
          : r.status === "partial" ? { key: "partial", tone: "warning" }
            : { key: "done", tone: "success" };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.rich("titleRich", { accent: (c) => <GradientText>{c}</GradientText> })}
        description={t("subtitleShort")}
        actions={<ButtonLink href="/checks/new"><Plus aria-hidden="true" /> {t("newSearch")}</ButtonLink>}
      />

      {/* Risk summary doubles as the quickest filter. */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {RISKS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={risks.includes(r)}
            onClick={() => toggle(r)}
            className={cn(
              "flex flex-col items-start gap-2.5 rounded-2xl border bg-surface px-3.5 py-3 text-left shadow-sm sm:flex-row sm:items-center sm:justify-between transition-[border-color,box-shadow,translate] duration-150 hover:-translate-y-0.5",
              risks.includes(r) ? "border-primary ring-2 ring-[var(--ring)]" : "border-border hover:border-border-strong",
            )}
          >
            <span className="sr-only">{t("riskCard")}: </span>
            <Tag tone={RISK_TONE[r]}>{tr(r)}</Tag>
            <span className="font-head text-2xl font-bold leading-none tabular-nums text-text">{counts[r]}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">{t("search")}</span>
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-border bg-field pl-10 pr-3 text-sm text-text shadow-[0_1px_2px_rgb(16_24_40/0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-placeholder hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]"
              />
            </label>
            <Select id="f-sort" aria-label={t("sort")} value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-48">
              {["newest", "oldest", "risk", "credit", "name"].map((k) => <option key={k} value={k}>{t(`sortOpt.${k}`)}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
            <Segmented label={t("status")} value={status} onChange={setStatus} items={["all", "done", "running", "waiting", "partial", "expired"].map((k) => ({ key: k, label: t(`statusShort.${k}`) }))} />
            <div className="flex flex-wrap gap-2">
              <Segmented label={t("period")} value={period} onChange={setPeriod} items={["all", "7", "30", "90"].map((k) => ({ key: k, label: t(`periodShort.${k}`) }))} />
              <Segmented label={t("source")} value={source} onChange={setSource} items={["all", "single", "bulk"].map((k) => ({ key: k, label: t(`sourceShort.${k}`) }))} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-muted" aria-live="polite">{t("showing", { shown: shown.length, total: rows.length })}</p>
            {filtered ? (
              <button type="button" onClick={clear} className="inline-flex min-h-8 items-center gap-1 font-semibold text-primary-text hover:underline">
                <X size={13} aria-hidden="true" /> {t("clear")}
              </button>
            ) : null}
          </div>
        </div>

        {!shown.length ? (
          <EmptyState
            title={rows.length ? t("noneMatch") : t("none")}
            body={rows.length ? undefined : t("noneBodyShort")}
            action={rows.length ? <Button variant="secondary" onClick={clear}>{t("clear")}</Button> : <ButtonLink href="/checks/new"><Plus aria-hidden="true" /> {t("newSearch")}</ButtonLink>}
          />
        ) : (
          <>
            <div className={cn("hidden gap-x-4 border-b border-border bg-surface-muted px-4 py-2.5 text-[11px] font-medium uppercase tracking-[1px] text-subtle lg:grid sm:px-5", COLS)} aria-hidden="true">
              <span>{t("col.company")}</span>
              <span>{t("col.risk")}</span>
              <span className="text-right">{t("col.range")}</span>
              <span>{t("col.status")}</span>
              <span>{t("col.date")}</span>
              <span className="sr-only">{t("col.open")}</span>
            </div>
            <ul className="divide-y divide-border">
              {shown.map((r) => {
                const st = statusOf(r);
                const range = r.creditLowPaise !== null && r.creditHighPaise !== null ? `${formatInrShort(BigInt(r.creditLowPaise))} – ${formatInrShort(BigInt(r.creditHighPaise))}` : null;
                return (
                  <li key={r.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-hover sm:px-5 lg:gap-x-4 lg:py-3", COLS)}>
                    <div className="min-w-0">
                      <Link href={`/counterparties/${r.company.id}`} className="line-clamp-2 break-words font-semibold leading-snug text-text hover:text-primary-text">{r.company.name}</Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                        <span className="min-w-0 truncate">{[r.company.gstin, r.company.city, r.reportNo].filter(Boolean).join(" · ")}</span>
                        {r.bulk ? <span className="inline-flex items-center gap-1 rounded-md bg-primary-softer px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-text"><FileSpreadsheet size={11} aria-hidden="true" />{t("bulkTag")}</span> : null}
                      </span>
                    </div>
                    <div className="justify-self-end lg:justify-self-start">
                      {r.riskLevel ? <Tag tone={RISK_TONE[r.riskLevel]}>{tr(r.riskLevel)}</Tag> : <span className="text-muted">—</span>}
                    </div>
                    {/* Safe range, status and date: one line on phones; their own columns from lg up. */}
                    <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs lg:contents">
                      <span className="tabular-nums text-text-2 lg:text-right lg:text-sm">
                        <span className="text-muted lg:hidden">{t("col.range")}: </span>
                        {range ?? (r.riskLevel === "high" ? <span className="text-danger-fg">{t("noCredit")}</span> : <span className="text-muted">—</span>)}
                      </span>
                      <span><Tag tone={st.tone}>{t(`statusOpt.${st.key}`)}</Tag></span>
                      <span className="text-muted lg:text-sm lg:text-text-2">
                        {formatDate(r.createdAt.slice(0, 10))}
                        {r.by ? <span className="ml-1 lg:ml-0 lg:block lg:text-xs lg:text-muted"><span className="lg:hidden">· </span>{r.by}</span> : null}
                      </span>
                      <Link href={`/reports/${r.id}`} className="ml-auto inline-flex min-h-10 items-center gap-1 font-semibold text-primary-text hover:underline lg:ml-0 lg:min-h-0 lg:justify-self-end lg:text-sm">
                        {t("open")} <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {devSample ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border-strong p-4 text-sm">
          <p className="text-muted">{t("sampleNote")}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={busy} onClick={() => void sample("POST")}>{t("sampleAdd")}</Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={() => void sample("DELETE")}>{t("sampleRemove")}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
