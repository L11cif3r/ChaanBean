"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileClock, ReceiptText } from "lucide-react";
import { Button, ButtonLink, ErrorSummary, FormField, GradientText, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { SETTLEMENT_RULES, settlementClauses, waivedPaise } from "@/lib/settlements";
import { settlementBody, toPaise, type SettlementDraft } from "@/lib/settlement-draft";
import type { DebtorOption, OverdueOption } from "@/server/settlements/service";
import { BackLink } from "@/components/transactions/transaction-detail";
import { FormStepper, Section, StickyActions, SummaryCard } from "@/components/transactions/agreement-form";
import { ScheduleEditor } from "./schedule-editor";

// S17 (PRD v1.0 Wireframe S17; v3.0 8.7): 1 what is owed (an overdue agreement, or an outside debt), 2 settlement
// terms with the amount waived worked out, 3 the instalment schedule, 4 the default clause, 5 preview and send.
// One page with a step track and a live summary, like the agreement form.

const inr = (paise: number) => formatInr(BigInt(Math.round(paise || 0)), { withPaise: true });
const SOURCE_ICON = { agreement: <FileClock size={18} />, outside: <ReceiptText size={18} /> } as const;

export function SettlementForm({
  initial, overdue, debtors, jurisdiction, owedNow,
}: {
  initial: SettlementDraft;
  overdue: OverdueOption[];
  debtors: DebtorOption[];
  jurisdiction: string;
  /** When editing a settlement of an agreement: what it owes today (the agreement is no longer in `overdue`). */
  owedNow?: OverdueOption | null;
}) {
  const t = useTranslations("settlements");
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState<SettlementDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"save" | "preview" | null>(null);
  const set = (patch: Partial<SettlementDraft>) => setD((x) => ({ ...x, ...patch }));
  const editing = Boolean(d.id);

  const options = owedNow && !overdue.some((o) => o.id === owedNow.id) ? [owedNow, ...overdue] : overdue;
  const tx = d.source === "agreement" ? options.find((o) => o.id === d.transactionId) : undefined;
  const owed = d.source === "agreement" ? tx?.owedPaise ?? 0 : toPaise(d.outsideOwed);
  const settlement = toPaise(d.settlement);
  const interest = toPaise(d.interestAgreed);
  const toPay = settlement + interest;
  const waived = waivedPaise(owed, settlement, interest);
  const clauses = settlementClauses({ graceDays: d.graceDays, originalReference: tx?.reference ?? null, outsideBillNo: d.source === "outside" ? d.outsideBillNo || null : null, jurisdiction });
  const debtorId = d.source === "agreement" ? tx?.counterpartyId ?? "" : d.counterpartyId;
  const debtorName = d.source === "agreement" ? tx?.counterpartyName : debtors.find((b) => b.id === d.counterpartyId)?.name;

  async function save(then: "save" | "preview") {
    setBusy(then);
    setErrors({});
    const body = settlementBody({ ...d, counterpartyId: debtorId });
    const res = d.id
      ? await api<{ id: string }>(`/api/v1/settlements/${d.id}`, { method: "PATCH", body })
      : await api<{ id: string }>("/api/v1/settlements", { body });
    setBusy(null);
    if (!res.ok) {
      setErrors(res.error.fields ?? {});
      return toast(res.error.message, "danger");
    }
    const id = d.id ?? res.data.id;
    set({ id });
    if (then === "preview") router.push(`/settlements/${id}/review`);
    else {
      toast(t("saved"), "success");
      router.push(`/settlements/${id}`);
    }
  }

  const err = (k: string) => errors[k];
  const summary = Object.entries(errors).filter(([k]) => !k.startsWith("instalments.")).map(([field, message]) => ({ field, message }));
  const rowsSum = d.rows.reduce((s, r) => s + toPaise(r.amount), 0);
  const scheduled = d.mode === "full" ? /^\d{4}-\d{2}-\d{2}$/.test(d.fullDate) : d.rows.length > 0 && rowsSum === toPay;

  const steps = [
    { id: "st-sec-owed", label: t("stepper.owed"), done: Boolean(debtorId) && owed > 0 },
    { id: "st-sec-terms", label: t("stepper.offer"), done: settlement > 0 },
    { id: "st-sec-plan", label: t("stepper.plan"), done: toPay > 0 && scheduled },
    { id: "st-sec-rules", label: t("stepper.rules"), done: false },
  ];

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save("preview"); }} noValidate>
      <BackLink href={d.id ? `/settlements/${d.id}` : "/settlements"}>{d.id ? t("backToSettlement") : t("backToList")}</BackLink>
      <PageHeader title={t.rich(editing ? "editHeading" : "newHeading", { accent: (c) => <GradientText>{c}</GradientText> })} description={t("newSubtitle")} />
      {summary.length ? <ErrorSummary title={t("fixErrors")} errors={summary} /> : null}

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="order-2 min-w-0 space-y-5 lg:order-none">
          <Section id="st-sec-owed" n={1} title={t("owedTitle")}>
            {!editing ? (
              <div role="tablist" aria-label={t("sourceLabel")} className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {(["agreement", "outside"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={d.source === s}
                    onClick={() => set({ source: s })}
                    className={cn(
                      "flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150",
                      d.source === s ? "border-primary bg-primary-softer shadow-sm" : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", d.source === s ? "bg-brand text-white shadow-orange" : "bg-soft text-primary-text")} aria-hidden="true">{SOURCE_ICON[s]}</span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-semibold", d.source === s ? "text-primary-text" : "text-text")}>{t(`source.${s}`)}</span>
                      <span className="block text-xs text-muted">{t(`sourceHint.${s}`)}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {d.source === "agreement" ? (
              <>
                <FormField id="st-tx" label={t("agreementLabel")} required error={err("transactionId")} hint={!options.length ? t("noOverdue") : undefined}>
                  <Select id="st-tx" value={d.transactionId} disabled={editing} invalid={Boolean(err("transactionId"))} onChange={(e) => set({ transactionId: e.target.value })}>
                    <option value="">{t("selectAgreement")}</option>
                    {options.map((o) => <option key={o.id} value={o.id}>{o.reference} · {o.counterpartyName} · {inr(o.owedPaise)}</option>)}
                  </Select>
                </FormField>
                {tx ? (
                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    {[
                      [t("reference"), <Link key="r" href={`/transactions/${tx.id}`} className="font-semibold text-primary-text underline-offset-2 hover:underline">{tx.reference}</Link>],
                      [t("debtor"), tx.counterpartyName],
                      [t("balance"), inr(tx.balancePaise)],
                      [t("overdueBy"), t("days", { count: tx.daysOverdue })],
                      [t("interestAccrued"), inr(tx.interestPaise)],
                    ].map(([k, v], i) => (
                      <div key={i} className="min-w-0 rounded-xl bg-surface-muted px-3 py-2.5">
                        <dt className="text-[11px] font-medium text-muted">{k}</dt>
                        <dd className={cn("mt-0.5 break-words font-semibold tabular-nums", i === 3 ? "text-danger-fg" : "text-text")}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="st-cp" label={t("debtor")} required error={err("counterpartyId")} hint={t("debtorHint")} className="sm:col-span-2">
                  <div className="flex gap-2">
                    <Select id="st-cp" value={d.counterpartyId} disabled={editing && d.counterpartyId !== ""} invalid={Boolean(err("counterpartyId"))} onChange={(e) => set({ counterpartyId: e.target.value })}>
                      <option value="">{t("selectDebtor")}</option>
                      {debtors.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.mobileMasked}</option>)}
                    </Select>
                    <ButtonLink href="/counterparties/new" variant="secondary" className="shrink-0">{t("addDebtor")}</ButtonLink>
                  </div>
                </FormField>
                <FormField id="st-bill" label={t("billNo")} required error={err("outsideBillNo")}>
                  <Input id="st-bill" maxLength={30} value={d.outsideBillNo} invalid={Boolean(err("outsideBillNo"))} onChange={(e) => set({ outsideBillNo: e.target.value })} />
                </FormField>
                <FormField id="st-bill-date" label={t("billDate")} required error={err("outsideBillDate")}>
                  <Input id="st-bill-date" type="date" max={istDate(new Date())} value={d.outsideBillDate} invalid={Boolean(err("outsideBillDate"))} onChange={(e) => set({ outsideBillDate: e.target.value })} />
                </FormField>
                <FormField id="st-owed" label={t("amountDue")} required error={err("outsideOwedPaise")} hint={t("amountDueHint")}>
                  <Input id="st-owed" inputMode="decimal" value={d.outsideOwed} invalid={Boolean(err("outsideOwedPaise"))} onChange={(e) => set({ outsideOwed: e.target.value })} />
                </FormField>
              </div>
            )}
          </Section>

          <Section id="st-sec-terms" n={2} title={t("termsTitle")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField id="st-amount" label={t("settlementAmount")} required error={err("settlementPaise")} hint={owed ? t("owedHint", { owed: inr(owed) }) : undefined}>
                <Input id="st-amount" inputMode="decimal" value={d.settlement} invalid={Boolean(err("settlementPaise"))} onChange={(e) => set({ settlement: e.target.value })} />
              </FormField>
              <FormField id="st-interest" label={t("interestAgreed")} error={err("interestAgreedPaise")} hint={t("interestAgreedHint")}>
                <Input id="st-interest" inputMode="decimal" value={d.interestAgreed} invalid={Boolean(err("interestAgreedPaise"))} onChange={(e) => set({ interestAgreed: e.target.value })} />
              </FormField>
              <FormField id="st-waived" label={waived >= 0 ? t("waived") : t("extra")}>
                <Input id="st-waived" readOnly value={owed ? inr(Math.abs(waived)) : "—"} className="bg-surface-muted font-semibold tabular-nums" />
              </FormField>
            </div>
          </Section>

          <Section id="st-sec-plan" n={3} title={d.mode === "instalments" ? t("scheduleTitle") : t("modeLabel")}>
            <div role="radiogroup" aria-label={t("modeLabel")} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-strong p-1">
              {(["full", "instalments"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={d.mode === m} onClick={() => set({ mode: m })}
                  className={cn("min-h-10 rounded-lg px-3 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150", d.mode === m ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text")}>
                  {t(`modeName.${m}`)}
                </button>
              ))}
            </div>
            {d.mode === "full" ? (
              <FormField id="st-full-date" label={t("fullDate")} required error={err("fullDate")} className="max-w-xs">
                <Input id="st-full-date" type="date" min={istDate(new Date())} value={d.fullDate} invalid={Boolean(err("fullDate"))} onChange={(e) => set({ fullDate: e.target.value })} />
              </FormField>
            ) : (
              <ScheduleEditor id="st-rows" rows={d.rows} onChange={(rows) => set({ rows })} totalPaise={toPay} errors={errors} />
            )}
          </Section>

          <Section id="st-sec-rules" n={4} title={t("defaultTitle")}>
            <FormField id="st-grace" label={t("graceDays")} hint={t("graceHint")} className="max-w-xs">
              <Select id="st-grace" value={d.graceDays} onChange={(e) => set({ graceDays: Number(e.target.value) })}>
                {Array.from({ length: SETTLEMENT_RULES.graceDaysMax - SETTLEMENT_RULES.graceDaysMin + 1 }, (_, i) => i + SETTLEMENT_RULES.graceDaysMin).map((n) => (
                  <option key={n} value={n}>{t("days", { count: n })}</option>
                ))}
              </Select>
            </FormField>
            <details className="group rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5 text-sm">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-text-2">
                {t("clausesTitle")}
                <span className="text-xs font-medium text-muted group-open:hidden">{t("clausesCount", { count: clauses.length })}</span>
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                {clauses.map((c) => <li key={c}>{c}</li>)}
              </ol>
            </details>
            <FormField id="st-terms" label={t("yourTerms")} hint={t("yourTermsHint", { left: SETTLEMENT_RULES.maxTermsChars - d.terms.length })} error={err("terms")}>
              <Textarea id="st-terms" rows={3} maxLength={SETTLEMENT_RULES.maxTermsChars} value={d.terms} onChange={(e) => set({ terms: e.target.value })} />
            </FormField>
          </Section>
        </div>

        <div className="contents lg:sticky lg:top-20 lg:block lg:space-y-4">
          <div className="order-1 lg:order-none">
            <FormStepper label={t("stepper.label")} steps={steps} />
          </div>
          <div className="order-3 lg:order-none">
            <SummaryCard
              title={t("summary.title")}
              amountLabel={t("summary.toPay")}
              amount={inr(toPay)}
              party={debtorName}
              rows={[
                [t("summary.owed"), owed ? inr(owed) : "—"],
                [t("summary.offer"), inr(settlement)],
                [t("summary.interest"), inr(interest)],
                [waived >= 0 ? t("waived") : t("extra"), owed ? inr(Math.abs(waived)) : "—"],
                [t("summary.plan"), d.mode === "full"
                  ? (/^\d{4}-\d{2}-\d{2}$/.test(d.fullDate) ? t("summary.oneDate", { date: formatDate(d.fullDate) }) : t("modeName.full"))
                  : d.rows.length ? t("instalmentsN", { count: d.rows.length }) : "—"],
              ]}
            />
          </div>
        </div>
      </div>

      <StickyActions>
        <Button type="button" variant="secondary" loading={busy === "save"} disabled={busy !== null || !debtorId} onClick={() => void save("save")}>{t("saveDraft")}</Button>
        <Button type="submit" className="min-w-0 flex-1 sm:flex-none" loading={busy === "preview"} disabled={busy !== null || !debtorId}>{t("preview")}</Button>
      </StickyActions>
    </form>
  );
}
