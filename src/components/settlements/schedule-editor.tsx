"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button, FormField, Input, Select } from "@/components/ui";
import { addDays, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { SETTLEMENT_RULES, splitEqually } from "@/lib/settlements";
import { rupees, toPaise, type ScheduleRowDraft } from "@/lib/settlement-draft";

// S17 marker 3: the instalment schedule. "Split equally" fills the rows from a count, a first date and a frequency;
// rows can then be changed, added or removed. The total must match what is to be paid. Also used by the debtor for a
// counter-proposal (FR-ES-03).

const inr = (paise: number) => formatInr(BigInt(Math.round(paise || 0)), { withPaise: true });

export function ScheduleEditor({
  id, rows, onChange, totalPaise, errors, compact,
}: {
  id: string;
  rows: ScheduleRowDraft[];
  onChange: (rows: ScheduleRowDraft[]) => void;
  /** What the rows must add up to. */
  totalPaise: number;
  errors: Record<string, string>;
  /** Phone layout for the debtor's page. */
  compact?: boolean;
}) {
  const t = useTranslations("settlements.schedule");
  const today = istDate(new Date());
  const [count, setCount] = useState(rows.length >= 2 ? rows.length : 3);
  const [first, setFirst] = useState(rows[0]?.dueDate ?? addDays(today, 7));
  const [every, setEvery] = useState("month");
  const sum = rows.reduce((s, r) => s + toPaise(r.amount), 0);
  const matches = rows.length > 0 && sum === totalPaise;
  const setRow = (i: number, patch: Partial<ScheduleRowDraft>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function split() {
    if (totalPaise <= 0) return;
    const step = every === "month" ? undefined : Number(every);
    onChange(splitEqually(totalPaise, count, first, step).map((r) => ({ dueDate: r.dueDate, amount: rupees(r.amountPaise) })));
  }

  return (
    <div className="space-y-4">
      <div className={compact ? "grid grid-cols-1 gap-3 rounded-xl bg-surface-muted p-3" : "grid grid-cols-1 gap-3 rounded-xl bg-surface-muted p-3 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"}>
        <FormField id={`${id}-count`} label={t("count")}>
          <Select id={`${id}-count`} value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {Array.from({ length: SETTLEMENT_RULES.maxInstalments - 1 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </FormField>
        <FormField id={`${id}-first`} label={t("firstDate")}>
          <Input id={`${id}-first`} type="date" min={today} value={first} onChange={(e) => setFirst(e.target.value)} />
        </FormField>
        <FormField id={`${id}-every`} label={t("every")}>
          <Select id={`${id}-every`} value={every} onChange={(e) => setEvery(e.target.value)}>
            <option value="month">{t("monthly")}</option>
            <option value="15">{t("days", { count: 15 })}</option>
            <option value="7">{t("days", { count: 7 })}</option>
          </Select>
        </FormField>
        <Button type="button" variant="secondary" disabled={totalPaise <= 0} onClick={split}>{t("split")}</Button>
      </div>

      {rows.length ? (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-start gap-2">
              <span className="mt-2 flex size-7 items-center justify-center rounded-lg bg-surface-muted text-xs font-bold tabular-nums text-text-2" aria-hidden="true">{i + 1}</span>
              <div>
                <Input id={`${id}-${i}-date`} type="date" aria-label={t("dateN", { n: i + 1 })} min={today} value={r.dueDate} invalid={Boolean(errors[`instalments.${i}.dueDate`])} onChange={(e) => setRow(i, { dueDate: e.target.value })} />
                {errors[`instalments.${i}.dueDate`] ? <p className="mt-1 text-xs font-medium text-danger-fg">{errors[`instalments.${i}.dueDate`]}</p> : null}
              </div>
              <Input id={`${id}-${i}-amount`} inputMode="decimal" aria-label={t("amountN", { n: i + 1 })} value={r.amount} invalid={Boolean(errors[`instalments.${i}.amountPaise`])} onChange={(e) => setRow(i, { amount: e.target.value })} />
              <button type="button" className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-danger-fg" aria-label={t("removeN", { n: i + 1 })} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" size="sm" variant="secondary" icon={<Plus size={14} aria-hidden="true" />} disabled={rows.length >= SETTLEMENT_RULES.maxInstalments}
          onClick={() => onChange([...rows, { dueDate: rows.length ? addDays(rows[rows.length - 1].dueDate, 30) : first, amount: "" }])}>
          {t("addRow")}
        </Button>
        <p className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold tabular-nums ${matches ? "bg-success-bg text-success-fg" : "bg-warning-bg text-warning-fg"}`} aria-live="polite">
          {matches ? <CheckCircle2 size={16} aria-hidden="true" /> : null}
          {matches ? t("matches", { total: inr(sum) }) : t("mismatch", { sum: inr(sum), total: inr(totalPaise) })}
        </p>
      </div>
      {errors.instalments ? <p role="alert" className="text-sm font-medium text-danger-fg">{errors.instalments}</p> : null}
    </div>
  );
}
