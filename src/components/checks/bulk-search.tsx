"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Download, FileSpreadsheet, Keyboard, Plus, Trash2, Upload } from "lucide-react";
import { Button, Card, CardBody, CardHeader, GradientText, PageHeader, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";

// PRD v4.0 section 6: start a multiple search by typing up to 10 companies (name, GSTIN or CIN, optional city) or by
// uploading the template (up to 50 rows, 2 MB). Matching is free; nothing is charged until a cost popup later.

const TEMPLATE_URL = "/api/v1/bulk/template";
/** A filled example (real GST and MCA companies, made-up contacts) showing every kind of row result. */
const EXAMPLE_URL = "/samples/chaanbean-multiple-search-example.xlsx";
type Row = { companyName: string; id: string; city: string };
type Previous = { id: string; source: string; fileName: string | null; status: string; rows: number; createdAt: string; looksGood: number; screened: number };

const blank = (): Row => ({ companyName: "", id: "", city: "" });

/** One box for name, GSTIN or CIN: the server tells them apart, as in the single search. */
function toPayload(r: Row) {
  const v = r.id.trim().toUpperCase().replace(/\s/g, "");
  const gstin = /^[0-9]{2}[A-Z0-9]{13}$/.test(v) ? v : "";
  const cin = !gstin && v ? v : "";
  return { companyName: r.companyName.trim(), gstin, cin, city: r.city.trim() };
}

export function BulkSearch({ maxTyped, maxRows, previous }: { maxTyped: number; maxRows: number; previous: Previous[] }) {
  const t = useTranslations("checks.multi");
  const router = useRouter();
  const [mode, setMode] = useState<"typed" | "file">("typed");
  const [rows, setRows] = useState<Row[]>([blank(), blank(), blank()]);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filled = rows.filter((r) => r.companyName.trim() || r.id.trim());
  const set = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  async function submit() {
    setError(null);
    setBusy(true);
    const res = mode === "typed"
      ? await api<{ id: string }>("/api/v1/bulk", { body: { rows: filled.map(toPayload) } })
      : await (async () => {
          if (!file) return null;
          const form = new FormData();
          form.append("file", file);
          return api<{ id: string }>("/api/v1/bulk", { form });
        })();
    setBusy(false);
    if (!res) return;
    if (!res.ok) return setError(res.error.fields?.file ?? res.error.fields?.rows ?? res.error.message);
    router.push(`/checks/bulk/${res.data.id}`);
  }

  const modes = [
    { key: "typed" as const, icon: Keyboard, title: t("typeTab"), body: t("typeCardBody", { max: maxTyped }) },
    { key: "file" as const, icon: FileSpreadsheet, title: t("fileTab"), body: t("fileCardBody", { max: maxRows }) },
  ];

  return (
    <div className="space-y-5 pb-28 sm:pb-0">
      <PageHeader title={t.rich("titleRich", { accent: (c) => <GradientText>{c}</GradientText> })} description={t("subtitleShort")} />

      {/* Where this page sits in the flow: step 1 of 4. */}
      <ol aria-label={t("stepsTitle")} className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm sm:gap-3 sm:p-2.5">
        {(["s1", "s2", "s3", "s4"] as const).map((s, i) => (
          <li key={s} aria-current={i === 0 ? "step" : undefined} title={t(`steps.${s}`)} className={cn("flex min-w-0 items-center gap-2 sm:gap-3", i < 3 && "flex-1")}>
            <span className={cn("flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 sm:px-2.5", i === 0 && "bg-primary-softer")}>
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", i === 0 ? "bg-brand text-white shadow-orange" : "bg-surface-strong text-muted")}>{i + 1}</span>
              <span className={cn("min-w-0", i !== 0 && "sr-only md:not-sr-only")}><span className={cn("block truncate text-xs font-semibold sm:text-[13px]", i === 0 ? "text-text" : "text-muted")}>{t(`stepsShort.${s}`)}</span></span>
            </span>
            {i < 3 ? <span className="h-px min-w-3 flex-1 rounded-full bg-border" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div role="radiogroup" aria-label={t("how")} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {modes.map(({ key, icon: Icon, title, body }) => {
              const on = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { setMode(key); setError(null); }}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition-[border-color,background-color,box-shadow,translate] duration-150 hover:-translate-y-0.5",
                    on ? "border-primary bg-primary-softer ring-2 ring-[var(--ring)]" : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", on ? "bg-brand text-white shadow-orange" : "bg-soft text-primary-text")} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-text">{title}</span>
                    <span className="mt-0.5 block text-xs text-muted">{body}</span>
                  </span>
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", on ? "border-primary bg-primary text-white" : "border-border-strong")} aria-hidden="true">
                    {on ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {mode === "typed" ? (
            <Card>
              <CardHeader title={t("typeTitle", { max: maxTyped })} action={<span className="text-xs tabular-nums text-subtle">{rows.length}/{maxTyped}</span>} />
              <CardBody className="@container space-y-2.5">
                <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_2.75rem] gap-2 text-[11px] font-medium uppercase tracking-[1px] text-subtle @xl:grid">
                  <span>{t("colName")}</span><span>{t("colId")}</span><span>{t("colCity")}</span><span />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-muted/50 p-2 @xl:grid-cols-[1.4fr_1fr_0.8fr_2.75rem] @xl:border-0 @xl:bg-transparent @xl:p-0">
                    <input aria-label={t("colNameN", { n: i + 1 })} value={r.companyName} onChange={(e) => set(i, "companyName", e.target.value)} placeholder={t("namePlaceholder")}
                      className={cn(FIELD, "col-span-2 text-sm @xl:col-span-1")} />
                    <input aria-label={t("colIdN", { n: i + 1 })} value={r.id} onChange={(e) => set(i, "id", e.target.value.toUpperCase())} placeholder={t("idPlaceholder")}
                      className={cn(FIELD, "font-mono text-xs")} />
                    <div className="flex min-w-0 gap-2">
                      <input aria-label={t("colCityN", { n: i + 1 })} value={r.city} onChange={(e) => set(i, "city", e.target.value)} placeholder={t("colCity")}
                        className={cn(FIELD, "flex-1 text-sm")} />
                      <button type="button" aria-label={t("removeRow", { n: i + 1 })} disabled={rows.length === 1}
                        onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-subtle hover:bg-surface-strong hover:text-danger-fg disabled:opacity-40 @xl:hidden">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <button type="button" aria-label={t("removeRow", { n: i + 1 })} disabled={rows.length === 1}
                      onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                      className="hidden size-11 items-center justify-center rounded-xl text-subtle hover:bg-surface-strong hover:text-danger-fg disabled:opacity-40 @xl:inline-flex">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button variant="secondary" size="sm" disabled={rows.length >= maxTyped} onClick={() => setRows((rs) => [...rs, blank()])}>
                    <Plus size={14} aria-hidden="true" /> {t("addRow")}
                  </Button>
                  <p className="text-xs text-muted">{t("typeHelpShort")}</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title={t("fileTitle", { max: maxRows })} />
              <CardBody className="space-y-3">
                <label
                  htmlFor="bulk-file"
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files?.[0] ?? null); }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors",
                    drag ? "border-primary bg-primary-softer" : file ? "border-primary-line bg-primary-softer" : "border-border-strong bg-surface-muted hover:border-primary",
                  )}
                >
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-orange" aria-hidden="true">
                    {file ? <FileSpreadsheet size={22} /> : <Upload size={22} />}
                  </span>
                  <span className="max-w-full break-words font-bold text-text">{file ? file.name : t("drop")}</span>
                  <span className="text-xs text-muted">{file ? t("replace") : t("formats", { max: maxRows })}</span>
                  <input id="bulk-file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                </label>
                <div className="flex flex-wrap gap-x-4">
                  <a href={TEMPLATE_URL} download className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary-text hover:underline"><Download size={14} aria-hidden="true" /> {t("template")}</a>
                  <a href={EXAMPLE_URL} download className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary-text hover:underline"><FileSpreadsheet size={14} aria-hidden="true" /> {t("example")}</a>
                </div>
                <details className="text-xs text-muted">
                  <summary className="cursor-pointer font-semibold text-text-2 hover:text-text">{t("columnsSummary")}</summary>
                  <p className="mt-1">{t("columns")}</p>
                </details>
              </CardBody>
            </Card>
          )}
          {error ? <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{error}</p> : null}

          {/* Phones: the next step stays at the bottom of the screen. */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-[var(--nav-bg)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur sm:static sm:flex-wrap sm:justify-start sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <Button loading={busy} disabled={mode === "typed" ? !filled.length : !file} onClick={() => void submit()} className="order-2 sm:order-1">
              {t("matchBtn", { count: mode === "typed" ? filled.length : 0, file: mode })}
            </Button>
            <span className="order-1 text-xs font-semibold text-muted sm:order-2">{t("freeNoteShort")}</span>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          {previous.length ? (
            <Card>
              <CardHeader title={t("previous")} />
              <ul className="divide-y divide-border text-sm">
                {previous.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link href={`/checks/bulk/${p.id}`} className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-hover sm:px-5">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-text">{p.fileName ?? t("typedName", { count: p.rows })}</span>
                        <span className="block text-xs text-muted">{formatDate(p.createdAt.slice(0, 10))} · {t("rowsN", { count: p.rows })}{p.screened ? ` · ${t("looksGoodN", { count: p.looksGood })}` : ""}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Tag tone={p.status === "done" || p.status === "screened" ? "success" : "info"}>{t(`status.${p.status}`)}</Tag>
                        <ChevronRight size={14} className="text-subtle" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="relative isolate overflow-hidden p-4">
              <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
              <p className="font-head text-sm font-bold text-text">{t("stepsTitle")}</p>
              <ol className="mt-3 space-y-2.5 text-[13px]">
                {(["s1", "s2", "s3", "s4"] as const).map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-primary-text shadow-sm">{i + 1}</span>
                    <span className="text-text-2">{t(`steps.${s}`)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

const FIELD = "h-11 min-w-0 rounded-xl border border-border bg-field px-3 text-text outline-none transition-[border-color,box-shadow] placeholder:text-placeholder hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]";
