"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "./cn";
import { EmptyState } from "./display";

// Lists sort, filter and paginate (PRD 7 common rules; S05: 10, 25 or 50 rows per page). Sorting here is for small,
// already-loaded lists; long lists sort and page on the server and pass `rows` for the current page only.

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Plain-text column name for the screen-reader sort label. */
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  /** Hide on phones to keep the table readable at 360 px. */
  hideOnMobile?: boolean;
}

const PAGE_SIZES = [10, 25, 50] as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  initialPageSize = 10,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  initialPageSize?: (typeof PAGE_SIZES)[number];
}) {
  const t = useTranslations("ui");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en-IN");
      return sort.dir === "asc" ? r : -r;
    });
  }, [rows, columns, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  if (!rows.length) return <>{empty ?? <EmptyState title={t("noResults")} />}</>;

  return (
    <div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-[11px] font-medium uppercase tracking-[1px] text-subtle">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("px-4 py-2.5", c.align === "right" && "text-right", c.hideOnMobile && "hidden md:table-cell")}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-text"
                        aria-label={t("sortBy", { column: c.label })}
                        onClick={() => setSort(active && sort!.dir === "asc" ? { key: c.key, dir: "desc" } : { key: c.key, dir: "asc" })}
                      >
                        {c.header}
                        <span aria-hidden="true">{active ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-hover">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3", c.align === "right" && "text-right tabular-nums", c.hideOnMobile && "hidden md:table-cell")}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
        <label className="inline-flex items-center gap-2">
          {t("rowsPerPage")}
          <select
            className="h-8 rounded-md bg-field px-2 text-text shadow-control"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg border border-border bg-surface px-2.5 py-1 font-semibold hover:border-primary hover:text-primary-text disabled:opacity-50" disabled={current <= 1} onClick={() => setPage(current - 1)}>
            {t("previous")}
          </button>
          <span className="tabular-nums">{t("pageOf", { page: current, pages })}</span>
          <button type="button" className="rounded-lg border border-border bg-surface px-2.5 py-1 font-semibold hover:border-primary hover:text-primary-text disabled:opacity-50" disabled={current >= pages} onClick={() => setPage(current + 1)}>
            {t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}
