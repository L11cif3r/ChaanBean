"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MoreVertical } from "lucide-react";
import { Button, ButtonLink, Card, EmptyState, PageHeader, Select, Tag } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatInr } from "@/lib/money";
import { UpiBadge } from "./upi-badge";
import type { CounterpartyRow } from "@/server/counterparties/service";

// PRD S05: find and manage every buyer, debtor and borrower. Search, filters and paging run on the server, because
// PAN and mobile can only be matched by their keyed hash.

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
    <div className="space-y-6">
      <PageHeader
        title={t("listTitle")}
        description={t("listSubtitle")}
        actions={
          <>
            {canExport && data.total > 0 ? (
              <a href={`/api/v1/counterparties/export?${query(filters)}`} className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-5 text-sm font-bold text-text-2 shadow-sm hover:border-primary hover:text-primary-text">
                {t("export")}
              </a>
            ) : null}
            {canManage ? <ButtonLink href="/counterparties/new">{t("add")}</ButtonLink> : null}
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:p-5">
          <div className="min-w-0 flex-1">
            <label htmlFor="cp-search" className="mb-1.5 block text-sm font-bold text-text-2">
              {t("searchLabel")}
            </label>
            <input
              id="cp-search"
              type="search"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder={t("searchPlaceholder")}
              aria-describedby="cp-search-hint"
              className="block h-11 w-full rounded-xl border border-border bg-surface-muted px-3.5 text-sm text-text outline-none placeholder:text-placeholder focus:border-primary"
            />
            <p id="cp-search-hint" className="mt-1 text-xs text-muted">
              {t("searchHint")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:pb-[22px]">
            <div>
              <label htmlFor="cp-status" className="sr-only">
                {t("filterStatus")}
              </label>
              <Select id="cp-status" value={filters.status} onChange={(e) => set({ status: e.target.value as Filters["status"] })} className="sm:w-36">
                <option value="active">{t("statusActive")}</option>
                <option value="archived">{t("statusArchived")}</option>
                <option value="all">{t("statusAll")}</option>
              </Select>
            </div>
            <div>
              <label htmlFor="cp-tag" className="sr-only">
                {t("filterTag")}
              </label>
              <Select id="cp-tag" value={filters.tag} onChange={(e) => set({ tag: e.target.value })} className="sm:w-40" disabled={!data.tags.length}>
                <option value="">{t("allTags")}</option>
                {data.tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </Select>
            </div>
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
            <EmptyState title={t("emptyTitle")} body={t("emptyBody")} action={canManage ? <ButtonLink href="/counterparties/new">{t("add")}</ButtonLink> : null} />
          )
        ) : (
          <>
            <div className="relative overflow-x-auto" aria-busy={loading}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-muted font-mono text-xs font-bold uppercase tracking-wider text-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">{t("colName")}</th>
                    <th scope="col" className="hidden px-4 py-2.5 md:table-cell">{t("colIdentifier")}</th>
                    <th scope="col" className="hidden px-4 py-2.5 lg:table-cell">{t("colMobile")}</th>
                    <th scope="col" className="px-4 py-2.5">{t("colRisk")}</th>
                    <th scope="col" className="hidden px-4 py-2.5 xl:table-cell">{t("colLastChecked")}</th>
                    <th scope="col" className="hidden px-4 py-2.5 text-right xl:table-cell">{t("colOpen")}</th>
                    <th scope="col" className="hidden px-4 py-2.5 text-right lg:table-cell">{t("colOutstanding")}</th>
                    <th scope="col" className="hidden px-4 py-2.5 text-right xl:table-cell">{t("colLimit")}</th>
                    <th scope="col" className="px-2 py-2.5"><span className="sr-only">{t("colActions")}</span></th>
                  </tr>
                </thead>
                <tbody className={loading ? "divide-y divide-border opacity-60" : "divide-y divide-border"}>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-primary-softer">
                      <td className="max-w-[16rem] px-4 py-3">
                        <Link href={`/counterparties/${r.id}`} className="block truncate font-bold text-text hover:text-primary-text">
                          {r.legalName}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          {t(`types.${r.type}`)}
                          {r.city ? <span>· {r.city}</span> : null}
                          {r.status === "archived" ? <Tag tone="neutral">{t("statusArchived")}</Tag> : null}
                          <span className="md:hidden">· {r.identifier}</span>
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs md:table-cell">{r.identifier}</td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="tabular-nums">{r.mobile}</span>
                        <span className="mt-1 block">
                          <UpiBadge status={r.upiStatus} compact />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Tag tone="neutral">{t("riskNotChecked")}</Tag>
                      </td>
                      <td className="hidden px-4 py-3 text-muted xl:table-cell">{t("never")}</td>
                      <td className="hidden px-4 py-3 text-right tabular-nums xl:table-cell">0</td>
                      <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{formatInr(0n)}</td>
                      <td className="hidden px-4 py-3 text-right text-muted xl:table-cell">—</td>
                      <td className="px-2 py-3 text-right">
                        <RowMenu row={r} canManage={canManage} onArchive={() => setArchiving(r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
              <span>{t("count", { count: data.total })}</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  {t("rowsPerPage")}
                  <select
                    value={filters.size}
                    onChange={(e) => set({ size: Number(e.target.value) })}
                    className="h-8 rounded-lg border border-border bg-field px-2 text-text"
                  >
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="rounded-lg border border-border bg-surface px-2.5 py-1 font-semibold hover:border-primary disabled:opacity-50" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                  {t("previous")}
                </button>
                <span className="tabular-nums">{t("pageOf", { page: data.page, pages })}</span>
                <button type="button" className="rounded-lg border border-border bg-surface px-2.5 py-1 font-semibold hover:border-primary disabled:opacity-50" disabled={data.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                  {t("next")}
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

/** S05 marker 5: View, Run checks, New transaction, Archive. */
function RowMenu({ row, canManage, onArchive }: { row: CounterpartyRow; canManage: boolean; onArchive: () => void }) {
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

  const item = "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary-softer hover:text-primary-text";
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("rowMenu", { name: row.legalName })}
        className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-text"
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-10 z-20 w-48 rounded-2xl border border-border bg-surface p-1.5 text-left shadow-lg">
          <Link role="menuitem" href={`/counterparties/${row.id}`} className={item}>
            {t("view")}
          </Link>
          {canManage && row.status === "active" ? (
            <>
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
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
