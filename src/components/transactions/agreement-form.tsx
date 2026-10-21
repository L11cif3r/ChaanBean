"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Banknote, Check, HandCoins, Plus, Trash2, Truck } from "lucide-react";
import { Button, ButtonLink, FormField, GradientText, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { GST_RATES_BP, TX_TYPES, fixedClauses, totals } from "@/lib/transactions";
import { GST_STATES } from "@/server/providers/identity/states";
import { emptyItem, type AgreementDraft, type BuyerOption } from "@/lib/agreement-draft";

// S13 (PRD v3.0 8.3, Figure 19): a seller-initiated, buyer-initiated or lender agreement. Labels follow the type.
// Amounts are worked out as the user types; "Preview agreement" saves the draft and opens Review and send (S14).
// Every section stays on one page (numbered 1–3, with a step track that shows what is filled in); a live summary sits
// beside the form on large screens and under it on phones, where the actions stay at the bottom of the screen.

const STATES = Object.entries(GST_STATES).filter(([c]) => !["28", "97", "99"].includes(c)).sort((a, b) => a[1].localeCompare(b[1]));
const toPaise = (rupees: string) => Math.round(Number(rupees.replace(/[,\s₹]/g, "")) * 100);
const num = (v: string) => Number(v.replace(/[,\s]/g, ""));
const inr = (paise: number) => formatInr(BigInt(Math.round(paise || 0)), { withPaise: true });
const TYPE_ICON = { seller: <Truck size={18} />, buyer: <HandCoins size={18} />, lender: <Banknote size={18} /> } as const;

export function AgreementForm({ buyers, initial, jurisdiction }: { buyers: BuyerOption[]; initial: AgreementDraft; jurisdiction: string }) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState<AgreementDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"save" | "preview" | null>(null);
  const set = (patch: Partial<AgreementDraft>) => setD((x) => ({ ...x, ...patch }));
  const setItem = (i: number, patch: Partial<AgreementDraft["items"][number]>) =>
    setD((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  const lender = d.type === "lender";
  const sums = useMemo(() => {
    const valid = d.items.filter((i) => num(i.qty) > 0 && num(i.rate) > 0);
    return totals(valid.map((i) => ({ product: i.product, qty: num(i.qty), unit: i.unit, ratePaise: toPaise(i.rate), gstBp: Number(i.gst) })));
  }, [d.items]);
  const total = lender ? toPaise(d.principal || "0") : sums.totalPaise;
  const paidNow = toPaise(d.paidNow || "0");
  const buyer = buyers.find((b) => b.id === d.counterpartyId);

  const body = () => ({
    type: d.type,
    counterpartyId: d.counterpartyId,
    invoiceNo: d.invoiceNo.trim() || undefined,
    invoiceDate: d.invoiceDate,
    placeOfSupply: lender ? undefined : d.placeOfSupply || undefined,
    items: lender ? [] : d.items.filter((i) => i.product || i.qty || i.rate).map((i) => ({
      product: i.product, hsn: i.hsn || undefined, qty: num(i.qty), unit: i.unit, ratePaise: toPaise(i.rate), gstBp: Number(i.gst),
    })),
    principalPaise: lender ? toPaise(d.principal || "0") : undefined,
    paidNowPaise: paidNow,
    dueDate: d.dueDate,
    interestBp: Math.round(Number(d.interest || "0") * 100),
    terms: d.terms,
  });

  async function save(then: "save" | "preview") {
    setBusy(then);
    setErrors({});
    const res = d.id
      ? await api<{ id: string }>(`/api/v1/transactions/${d.id}`, { method: "PATCH", body: body() })
      : await api<{ id: string; warning: string | null }>("/api/v1/transactions", { body: body() });
    setBusy(null);
    if (!res.ok) {
      setErrors(res.error.fields ?? {});
      return toast(res.error.message, "danger");
    }
    const id = d.id ?? res.data.id;
    set({ id });
    if (then === "preview") router.push(`/transactions/${id}/review`);
    else {
      toast(t("saved"), "success");
      router.push(`/transactions/${id}`);
    }
  }

  const field = (key: string) => errors[key];
  const roles = { seller: [t("roles.seller.you"), t("roles.seller.they")], buyer: [t("roles.buyer.you"), t("roles.buyer.they")], lender: [t("roles.lender.you"), t("roles.lender.they")] }[d.type];
  const validDue = /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate);
  const clauses = fixedClauses(d.type, { rateBp: Math.round(Number(d.interest || "0") * 100), dueDate: validDue ? formatDate(d.dueDate) : d.dueDate, jurisdiction });

  const steps = [
    { id: "tx-sec-party", label: t(`stepper.party.${d.type}`), done: Boolean(d.counterpartyId) },
    { id: "tx-sec-deal", label: t("stepper.deal"), done: Boolean(d.invoiceDate) && (lender ? total > 0 : Boolean(d.invoiceNo.trim() && d.placeOfSupply) && total > 0) },
    { id: "tx-sec-terms", label: t("stepper.terms"), done: validDue },
    { id: "tx-sec-review", label: t("stepper.review"), done: false },
  ];

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save("preview"); }} noValidate>
      <PageHeader
        title={t.rich(d.id ? "editHeading" : "newHeading", { accent: (c) => <GradientText>{c}</GradientText> })}
        description={t("newSubtitle")}
      />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="order-2 min-w-0 space-y-5 lg:order-none">
          <Section id="tx-sec-party" n={1} title={t("parties")}>
            <div role="tablist" aria-label={t("typeLabel")} className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
              {TX_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={d.type === type}
                  title={t(`type.${type}`)}
                  onClick={() => set({ type })}
                  className={cn(
                    "flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
                    d.type === type ? "border-primary bg-primary-softer shadow-sm" : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", d.type === type ? "bg-brand text-white shadow-orange" : "bg-soft text-primary-text")} aria-hidden="true">{TYPE_ICON[type]}</span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-semibold", d.type === type ? "text-primary-text" : "text-text")}>{t(`typeShort.${type}`)}</span>
                    <span className="block text-xs text-muted">{t(`typeHint.${type}`)}</span>
                  </span>
                </button>
              ))}
            </div>
            <FormField id="tx-cp" label={roles[1]} required error={field("counterpartyId")} hint={buyer && !buyer.bankLinked ? t("notBankLinked") : buyer ? t("mobileOnRecord", { mobile: buyer.mobileMasked }) : undefined}>
              <Select id="tx-cp" value={d.counterpartyId} invalid={Boolean(field("counterpartyId"))} onChange={(e) => set({ counterpartyId: e.target.value, placeOfSupply: buyers.find((b) => b.id === e.target.value)?.stateCode ?? d.placeOfSupply })}>
                <option value="">{t("selectCounterparty")}</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </FormField>
            {!buyers.length ? <ButtonLink href="/counterparties/new" size="sm" variant="secondary">{t("addCounterparty")}</ButtonLink> : null}
          </Section>

          <Section id="tx-sec-deal" n={2} title={lender ? t("loan") : t("dealTitle")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="tx-invoice" label={lender ? t("loanRef") : t("invoiceNo")} required={!lender} error={field("invoiceNo")}>
                <Input id="tx-invoice" value={d.invoiceNo} maxLength={30} invalid={Boolean(field("invoiceNo"))} onChange={(e) => set({ invoiceNo: e.target.value })} />
              </FormField>
              <FormField id="tx-date" label={lender ? t("disbursedOn") : t("invoiceDate")} required error={field("invoiceDate")}>
                <Input id="tx-date" type="date" value={d.invoiceDate} invalid={Boolean(field("invoiceDate"))} onChange={(e) => set({ invoiceDate: e.target.value })} />
              </FormField>
              {!lender ? (
                <FormField id="tx-pos" label={t("placeOfSupply")} required error={field("placeOfSupply")} className="sm:col-span-2">
                  <Select id="tx-pos" value={d.placeOfSupply} invalid={Boolean(field("placeOfSupply"))} onChange={(e) => set({ placeOfSupply: e.target.value })}>
                    <option value="">{t("selectState")}</option>
                    {STATES.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </Select>
                </FormField>
              ) : (
                <FormField id="tx-principal" label={t("principal")} required error={field("principalPaise")}>
                  <Input id="tx-principal" inputMode="decimal" value={d.principal} invalid={Boolean(field("principalPaise"))} onChange={(e) => set({ principal: e.target.value })} />
                </FormField>
              )}
            </div>

            {!lender ? (
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-head text-sm font-bold text-text">{t("items")}</p>
                  <span className="text-xs text-muted">{t("itemsCount", { count: d.items.length })}</span>
                </div>
                {field("items") ? <p role="alert" className="text-sm font-medium text-danger-fg">{field("items")}</p> : null}
                <div className="hidden grid-cols-[minmax(0,2fr)_5.5rem_5rem_4.5rem_6.5rem_6.5rem_2.5rem] gap-2 px-1 text-[11px] font-medium uppercase tracking-[1px] text-subtle lg:grid" aria-hidden="true">
                  <span>{t("col.product")}</span><span>{t("col.hsn")}</span><span>{t("col.qty")}</span><span>{t("col.unit")}</span><span>{t("col.rate")}</span><span>{t("col.gst")}</span><span />
                </div>
                <ol className="space-y-2">
                  {d.items.map((it, i) => {
                    const line = num(it.qty) > 0 && num(it.rate) > 0 ? totals([{ product: "", qty: num(it.qty), unit: "", ratePaise: toPaise(it.rate), gstBp: Number(it.gst) }]).totalPaise : 0;
                    const bad = (k: string) => Boolean(errors[`items.${i}.${k}`]);
                    return (
                      <li key={i} className="rounded-xl border border-border bg-surface-muted/60 p-3 lg:border-0 lg:bg-transparent lg:p-0">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_5.5rem_5rem_4.5rem_6.5rem_6.5rem_2.5rem] lg:items-center">
                          <Cell caption={t("col.product")} className="col-span-2 sm:col-span-3 lg:col-span-1">
                            <Input id={`it-${i}-p`} aria-label={t("col.productN", { n: i + 1 })} value={it.product} maxLength={120} invalid={bad("product")} onChange={(e) => setItem(i, { product: e.target.value })} />
                          </Cell>
                          <Cell caption={t("col.hsn")}>
                            <Input id={`it-${i}-h`} aria-label={t("col.hsnN", { n: i + 1 })} value={it.hsn} maxLength={8} inputMode="numeric" invalid={bad("hsn")} onChange={(e) => setItem(i, { hsn: e.target.value.replace(/\D/g, "") })} />
                          </Cell>
                          <Cell caption={t("col.qty")}>
                            <Input id={`it-${i}-q`} aria-label={t("col.qtyN", { n: i + 1 })} value={it.qty} inputMode="decimal" invalid={bad("qty")} onChange={(e) => setItem(i, { qty: e.target.value })} />
                          </Cell>
                          <Cell caption={t("col.unit")}>
                            <Input id={`it-${i}-u`} aria-label={t("col.unitN", { n: i + 1 })} value={it.unit} maxLength={12} invalid={bad("unit")} onChange={(e) => setItem(i, { unit: e.target.value })} />
                          </Cell>
                          <Cell caption={t("col.rate")}>
                            <Input id={`it-${i}-r`} aria-label={t("col.rateN", { n: i + 1 })} value={it.rate} inputMode="decimal" invalid={bad("ratePaise")} onChange={(e) => setItem(i, { rate: e.target.value })} />
                          </Cell>
                          <Cell caption={t("col.gst")}>
                            <Select id={`it-${i}-g`} aria-label={t("col.gstN", { n: i + 1 })} value={it.gst} onChange={(e) => setItem(i, { gst: e.target.value })}>
                              {GST_RATES_BP.map((bp) => (
                                <option key={bp} value={bp}>{bp / 100}%</option>
                              ))}
                            </Select>
                          </Cell>
                          <div className="flex items-end justify-between gap-2 self-end lg:items-center lg:justify-center">
                            <span className="text-sm font-semibold tabular-nums text-text lg:hidden">{inr(line)}</span>
                            <button type="button" className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-danger-fg disabled:opacity-40" aria-label={t("removeN", { n: i + 1 })} disabled={d.items.length === 1} onClick={() => set({ items: d.items.filter((_, j) => j !== i) })}>
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        {line ? <p className="mt-1 hidden text-right text-xs tabular-nums text-muted lg:block">{t("col.amount")}: {inr(line)}</p> : null}
                      </li>
                    );
                  })}
                </ol>
                <Button type="button" size="sm" variant="secondary" icon={<Plus size={14} aria-hidden="true" />} disabled={d.items.length >= 100} onClick={() => set({ items: [...d.items, emptyItem()] })}>
                  {t("addItem")}
                </Button>
              </div>
            ) : null}
          </Section>

          <Section id="tx-sec-terms" n={3} title={t("paymentTerms")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!lender ? (
                <FormField id="tx-total" label={t("total")}>
                  <Input id="tx-total" value={inr(total)} readOnly className="bg-surface-muted font-semibold tabular-nums" />
                </FormField>
              ) : null}
              <FormField id="tx-paid" label={d.type === "buyer" ? t("advancePaid") : lender ? t("repaidAtSigning") : t("paidNow")} error={field("paidNowPaise")}>
                <Input id="tx-paid" inputMode="decimal" value={d.paidNow} invalid={Boolean(field("paidNowPaise"))} onChange={(e) => set({ paidNow: e.target.value })} />
              </FormField>
              <FormField id="tx-due" label={d.type === "buyer" ? t("goodsDueBy") : lender ? t("repayableBy") : t("dueDate")} required error={field("dueDate")}>
                <Input id="tx-due" type="date" value={d.dueDate} invalid={Boolean(field("dueDate"))} onChange={(e) => set({ dueDate: e.target.value })} />
              </FormField>
              <FormField id="tx-interest" label={t("interest")} hint={t("interestHint")} error={field("interestBp")}>
                <Input id="tx-interest" inputMode="decimal" value={d.interest} invalid={Boolean(field("interestBp"))} onChange={(e) => set({ interest: e.target.value })} />
              </FormField>
            </div>
            <div className="space-y-3 border-t border-border pt-4 text-sm">
              <details className="group rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5">
                <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-semibold text-text-2">
                  {t("fixedClauses")}
                  <span className="text-xs font-medium text-muted group-open:hidden">{t("clausesCount", { count: clauses.length })}</span>
                </summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                  {clauses.map((c) => <li key={c}>{c}</li>)}
                </ol>
              </details>
              <FormField id="tx-terms" label={t("yourTerms")} hint={t("yourTermsHint", { left: 5000 - d.terms.length })} error={field("terms")}>
                <Textarea id="tx-terms" rows={3} maxLength={5000} value={d.terms} onChange={(e) => set({ terms: e.target.value })} />
              </FormField>
              <p className="text-xs text-muted">{t("attachLater")}</p>
            </div>
          </Section>
        </div>

        <div className="contents lg:sticky lg:top-20 lg:block lg:space-y-4">
          <div className="order-1 lg:order-none">
            <FormStepper label={t("stepper.label")} steps={steps} />
          </div>
          <div id="tx-sec-review" className="order-3 scroll-mt-24 lg:order-none">
            <SummaryCard
              title={t("summary.title")}
              amountLabel={t("balance")}
              amount={inr(Math.max(0, total - paidNow))}
              rows={[
                ...(!lender ? [[t("summary.taxable"), inr(sums.taxablePaise)], [t("summary.gst"), inr(sums.gstPaise)]] as [string, string][] : []),
                [lender ? t("summary.principal") : t("summary.total"), inr(total)],
                [d.type === "buyer" ? t("summary.advance") : t("summary.paid"), inr(paidNow)],
                [t("summary.due"), validDue ? formatDate(d.dueDate) : t("summary.notSet")],
                [t("summary.interest"), Number(d.interest) > 0 ? t("summary.interestValue", { rate: Number(d.interest) }) : t("noInterest")],
              ]}
              party={buyer?.name}
            />
          </div>
        </div>
      </div>

      <StickyActions>
        <Button type="button" variant="secondary" loading={busy === "save"} disabled={busy !== null || !d.counterpartyId} onClick={() => void save("save")}>{t("saveDraft")}</Button>
        <Button type="submit" className="min-w-0 flex-1 sm:flex-none" loading={busy === "preview"} disabled={busy !== null || !d.counterpartyId}>{t("preview")}</Button>
      </StickyActions>
    </form>
  );
}

function Cell({ caption, className, children }: { caption: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="mb-1 block text-[11px] font-medium text-muted lg:hidden" aria-hidden="true">{caption}</span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- shared with the settlement form

/** A numbered form section. */
export function Section({ id, n, title, children, aside }: { id: string; n: number; title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 id={`${id}-title`} className="flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-text">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white" aria-hidden="true">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

/** Step track for a one-page form: each step links to its section and turns green when filled in. */
export function FormStepper({ label, steps }: { label: string; steps: { id: string; label: string; done: boolean }[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <nav aria-label={label} className="rounded-2xl border border-border bg-surface p-2 shadow-sm">
      <ol className="flex">
        {steps.map((s, i) => (
          <li key={s.id} className="relative flex min-w-0 flex-1">
            {i > 0 ? <span className={cn("absolute right-1/2 top-[17px] h-0.5 w-full", steps[i - 1].done ? "bg-brand" : "bg-surface-strong")} aria-hidden="true" /> : null}
            <a href={`#${s.id}`} aria-current={i === current ? "step" : undefined} className="relative flex w-full min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-center hover:bg-hover">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                  s.done ? "bg-brand text-white shadow-orange" : i === current ? "border-2 border-primary bg-surface text-primary-text" : "border border-border-strong bg-surface text-subtle",
                )}
                aria-hidden="true"
              >
                {s.done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("block w-full truncate text-[11px] font-semibold sm:text-xs", s.done || i === current ? "text-text" : "text-muted")}>{s.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Live summary: the key amount in the brand gradient and the figures that make it up. */
export function SummaryCard({ title, amountLabel, amount, rows, party, footer }: { title: string; amountLabel: string; amount: string; rows: [string, ReactNode][]; party?: string; footer?: ReactNode }) {
  return (
    <section aria-label={title} className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <span className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-soft" aria-hidden="true" />
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{title}</p>
        {party ? <p className="mt-1.5 truncate text-sm font-semibold text-text">{party}</p> : null}
        <p className="mt-3 text-xs text-muted">{amountLabel}</p>
        <p className="text-gradient font-head text-[1.85rem] font-extrabold leading-tight tracking-tight tabular-nums" aria-live="polite">{amount}</p>
      </div>
      <dl className="divide-y divide-border px-4 pb-2 text-sm sm:px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold tabular-nums text-text">{v}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="border-t border-border px-4 py-3 text-xs sm:px-5">{footer}</div> : null}
    </section>
  );
}

/** The form's actions; on phones and tablets they stay at the bottom of the screen. */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 flex items-center gap-2 border-t border-border bg-[var(--nav-bg)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur sm:-mx-6 sm:justify-between sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
      {children}
    </div>
  );
}
