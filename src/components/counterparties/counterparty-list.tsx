"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, MoreVertical, Plus, Search, ShieldCheck } from "lucide-react";
import { Button, ButtonLink, Card, EmptyState, GradientText, PageHeader, Segmented, Select, Tag, buttonClass } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, istDate } from "@/lib/dates";
import { formatInrShort } from "@/lib/money";
import { RiskTag } from "./risk-tag";
import { UpiBadge } from "./upi-badge";
import type { CounterpartyRow } from "@/server/counterparties/service";

// PRD S05: find and manage every buyer, debtor and borrower. Search, filters and paging run on the server, because
// PAN and mobile can only be matched by their keyed hash. Rows are one grid: a stacked card on phones, table-like
// columns from lg up (the same elements, so nothing is rendered twice).

export interface CounterpartyPage {
  rows: CounterpartyRow[];
  total: number;
  page: number;
  size: number;
  tags: string[];
}

interface Filters {
  q: string;
  status: "active" | "archived" | "all";
  tag: string;
  page: number;
  size: number;
}

const SIZES = [10, 25, 50] as const;
/** Avatar · name · risk (and last checked) · GSTIN/PAN · mobile · limit · actions. */
const COLS = "lg:grid-cols-[2.25rem_minmax(0,1fr)_8rem_9.75rem_7.5rem_4.5rem_auto]";

/** Two letters for the avatar tile: the first letters of the first two words. */
export function initials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function CounterpartyList({ initial, canManage, canExport }: { initial: CounterpartyPage; canManage: boolean; canExport: boolean }) {
  const t = useTranslations("counterparties");
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [filters, setFilters] = useState<Filters>({ q: "", status: "active", tag: "", page: 1, size: 10 });
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState<CounterpartyRow | null>(null);
  const first = useRef(true);

  const query = useCallback((f: Filters) => {
    const p = new URLSearchParams();
    if (f.q.trim().length >= 2) p.set("q", f.q.trim());
    p.set("status", f.status);
    if (f.tag) p.set("tag", f.tag);
    p.set("page", String(f.page));
    p.set("size", String(f.size));
    return p.toString();
  }, []);

  const load = useCallback(
    async (f: Filters) => {
      setLoading(true);
      const res = await api<CounterpartyPage>(`/api/v1/counterparties?${query(f)}`);
      setLoading(false);
      if (res.ok) setData(res.data);
      else toast(res.error.message, "danger");
    },
    [query, toast],
  );

  // Search waits 300 ms after the last key (S05 marker 2); filters and paging load at once.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => void load(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, load]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const filtered = filters.q.trim().length >= 2 || filters.status !== "active" || filters.tag !== "";
  const pages = Math.max(1, Math.ceil(data.total / data.size));

  async function archive() {
    if (!archiving) return;
    const res = await api(`/api/v1/counterparties/${archiving.id}/archive`, { body: {} });
    setArchiving(null);
    if (!res.ok) return toast(res.error.message, "danger");
    toast(t("archived"), "success");
    await load(filters);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.rich("listTitleRich", { accent: (c) => <GradientText>{c}</GradientText> })}
        description={t("listSubtitleShort")}
        actions={
          <>
            {canExport && data.total > 0 ? (
              <a href={`/api/v1/counterparties/export?${query(filters)}`} className={buttonClass("secondary", "md")}>
                <Download aria-hidden="true" /> {t("export")}
              </a>
            ) : null}
            {canManage ? (
              <ButtonLink href="/counterparties/new">
                <Plus aria-hidden="true" /> {t("add")}
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden">
        {/* One toolbar: search, status and tag. */}
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="cp-search" className="sr-only">
              {t("searchLabel")}
            </label>
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <input
              id="cp-search"
              type="search"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder={t("searchPlaceholder")}
              aria-describedby="cp-search-hint"
              title={t("searchHint")}
              className="block h-11 w-full rounded-xl border border-border bg-field pl-10 pr-3.5 text-sm text-text shadow-[0_1px_2px_rgb(16_24_40/0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-placeholder hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]"
            />
            <p id="cp-search-hint" className="sr-only">
              {t("searchHint")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label={t("filterStatus")}
              value={filters.status}
              onChange={(status) => set({ status })}
              items={[
                { key: "active", label: t("statusActive") },
                { key: "archived", label: t("statusArchived") },
                { key: "all", label: t("statusAll") },
              ]}
            />
            {data.tags.length ? (
              <div>
                <label htmlFor="cp-tag" className="sr-only">
                  {t("filterTag")}
                </label>
                <Select id="cp-tag" value={filters.tag} onChange={(e) => set({ tag: e.target.value })} className="w-40">
                  <option value="">{t("allTags")}</option>
                  {data.tags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
        </div>

        {data.rows.length === 0 ? (
          filtered ? (
            <EmptyState
              title={t("noResultsTitle")}
              action={
                <Button variant="secondary" size="sm" onClick={() => set({ q: "", status: "active", tag: "" })}>
                  {t("clearFilters")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t("emptyTitle")}
              body={t("emptyBodyShort")}
              action={
                canManage ? (
                  <ButtonLink href="/counterparties/new">
                    <Plus aria-hidden="true" /> {t("add")}
                  </ButtonLink>
                ) : null
              }
            />
          )
        ) : (
          <>
            <div
              className={cn("hidden gap-x-4 border-b border-border bg-surface-muted px-4 py-2.5 text-[11px] font-medium uppercase tracking-[1px] text-subtle lg:grid", COLS)}
              aria-hidden="true"
            >
              <span />
              <span>{t("colName")}</span>
              <span>{t("colRisk")}</span>
              <span>{t("colIdentifier")}</span>
              <span>{t("colMobile")}</span>
              <span className="whitespace-nowrap text-right" title={t("colLimit")}>{t("colLimitShort")}</span>
              <span className="sr-only">{t("colActions")}</span>
            </div>
            <ul className={cn("divide-y divide-border transition-opacity", loading && "opacity-60")} aria-busy={loading}>
              {data.rows.map((r) => (
                <Row key={r.id} row={r} canManage={canManage} onArchive={() => setArchiving(r)} />
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
              <span className="font-medium">{t("count", { count: data.total })}</span>
              <div className="flex items-center gap-2">
                <label className="hidden items-center gap-2 sm:inline-flex">
                  {t("rowsPerPage")}
                  <select value={filters.size} onChange={(e) => set({ size: Number(e.target.value) })} className="h-8 rounded-lg border border-border bg-field px-2 text-text">
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={t("previous")}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-text-2 hover:border-border-strong disabled:opacity-50 sm:size-8"
                  disabled={data.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <span className="tabular-nums">{t("pageOf", { page: data.page, pages })}</span>
                <button
                  type="button"
                  aria-label={t("next")}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-text-2 hover:border-border-strong disabled:opacity-50 sm:size-8"
                  disabled={data.page >= pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={archiving !== null}
        onCancel={() => setArchiving(null)}
        onConfirm={() => void archive()}
        title={t("archiveTitle", { name: archiving?.legalName ?? "" })}
        body={t("archiveBody")}
        confirmLabel={t("archive")}
      />
    </div>
  );
}

/** One counterparty: a card on phones (name and risk, then facts, then actions), a table row from lg up. */
function Row({ row: r, canManage, onArchive }: { row: CounterpartyRow; canManage: boolean; onArchive: () => void }) {
  const t = useTranslations("counterparties");
  const nameId = `cp-${r.id}-name`;
  const active = r.status === "active";
  return (
    <li className={cn("grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-hover lg:gap-x-4 lg:py-3", COLS)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-soft text-xs font-bold text-primary-text" aria-hidden="true">
        {initials(r.legalName)}
      </span>
      <div className="min-w-0">
        <Link id={nameId} href={`/counterparties/${r.id}`} className="line-clamp-2 break-words font-semibold leading-snug text-text hover:text-primary-text">
          {r.legalName}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
          {t(`types.${r.type}`)}
          {r.city ? <span>· {r.city}</span> : null}
          {r.status === "archived" ? <Tag tone="neutral">{t("statusArchived")}</Tag> : null}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 justify-self-end lg:items-start lg:justify-self-start">
        <RiskTag risk={r.risk} />
        {r.lastCheckedAt ? <span className="text-[11px] text-subtle">{t("checkedOn", { date: formatDate(istDate(new Date(r.lastCheckedAt))) })}</span> : null}
      </div>

      {/* Facts: one wrapped line on phones; their own columns from lg up. */}
      <div className="col-span-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted lg:contents">
        <span className="min-w-0 truncate font-mono text-text-2 lg:text-xs" title={r.identifier}>{r.identifier}</span>
        <span className="inline-flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-start lg:gap-1">
          <span className="tabular-nums text-text-2 lg:text-sm">{r.mobile ?? "—"}</span>
          <UpiBadge status={r.upiStatus} compact />
        </span>
        <span className={cn("tabular-nums lg:text-right lg:text-sm lg:text-text-2", !r.creditHighPaise && "hidden lg:inline")}>
          <span className="lg:hidden">{t("colLimit")}: </span>
          {r.creditHighPaise ? formatInrShort(BigInt(r.creditHighPaise)) : "—"}
        </span>
      </div>

      <div className="col-span-3 flex items-center gap-2 lg:col-span-1 lg:justify-end">
        {canManage && active ? (
          <Link
            href={`/checks/new?counterparty=${r.id}`}
            aria-describedby={nameId}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-soft px-3 text-[13px] font-semibold text-primary-text transition-[background-color,scale] duration-150 hover:bg-primary-softer active:scale-[0.97] lg:h-8 lg:flex-none"
          >
            <ShieldCheck size={14} aria-hidden="true" /> {t("quickCheck")}
          </Link>
        ) : null}
        <Link href={`/counterparties/${r.id}`} aria-describedby={nameId} className={buttonClass("secondary", "sm", "h-10 flex-1 lg:h-8 lg:flex-none")}>
          {t("view")}
        </Link>
        {canManage && active ? <RowMenu row={r} onArchive={onArchive} /> : null}
      </div>
    </li>
  );
}

/** S05 marker 5: the rest of the row actions (View and Run checks are buttons on the row). */
function RowMenu({ row, onArchive }: { row: CounterpartyRow; onArchive: () => void }) {
  const t = useTranslations("counterparties");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-hover hover:text-primary-text";
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("rowMenu", { name: row.legalName })}
        className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-strong hover:text-text lg:size-8"
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-11 z-20 w-48 rounded-2xl border border-border bg-surface p-1.5 text-left shadow-lg lg:top-9">
          <Link role="menuitem" href={`/checks/new?counterparty=${row.id}`} className={item}>
            {t("runChecks")}
          </Link>
          <Link role="menuitem" href={`/transactions/new?counterparty=${row.id}`} className={item}>
            {t("newTransaction")}
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger-fg hover:bg-danger-bg hover:text-danger-fg`}
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
          >
            {t("archive")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
