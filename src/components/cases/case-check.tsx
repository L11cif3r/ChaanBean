"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Gavel, ShieldAlert, Siren } from "lucide-react";
import { CompanySearch, type CompanyOption } from "@/components/checks/company-search";
import { Button, Card, CardBody, CardHeader, FormField, GradientText, Input, PageHeader, Select, Skeleton, Textarea } from "@/components/ui";
import { CaseStart } from "./case-start";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { CancelWindow } from "@/components/ui/cancel-window";
import { MobileCostBar } from "@/components/ui/mobile-cost-bar";
import { CostSummary, newIdempotencyKey } from "@/components/checks/choose-checks";
import { api } from "@/lib/api-client";
import { CC_CODES, FIR_STATES, firCovered, type CcCode } from "@/lib/cases";
import { formatInr } from "@/lib/money";
import { GST_STATES } from "@/server/providers/identity/states";
import type { CatalogueEntry, Quote } from "@/server/checks/service";

// S12 (PRD v3.0 section 7, Figure 17): pick the checks, check the search details, see the cost, then search. Before a
// company is chosen the page shows how it works and an example result; "Run search" starts a cancel bar in the cost
// panel (no confirm popup, v4 section 8).
// Nothing is ticked at first except the user's own last choice (FR-CC-01). The FIR card is off for states the
// provider does not cover (FR-CC-07).

interface Defaults {
  name: string;
  state: string;
  district: string;
  address: string;
  panOnFile: string | null;
  mobileOnFile: string | null;
  individual: boolean;
}

interface Catalogue {
  counterparty: { id: string; name: string };
  checks: CatalogueEntry[];
  defaults: Defaults;
}

interface Form {
  name: string;
  state: string;
  district: string;
  address: string;
  relativeName: string;
  pan: string;
  mobile: string;
  birthDate: string;
}

const PREF_KEY = "cb_case_checks";
const STATES = Object.entries(GST_STATES).filter(([code]) => !["28", "97", "99"].includes(code)).sort((a, b) => a[1].localeCompare(b[1]));
const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

function savedChoice(): CcCode[] {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((c): c is CcCode => (CC_CODES as readonly string[]).includes(c)) : [];
  } catch {
    return [];
  }
}

export function CaseCheck({ buyers: saved, initialBuyer }: { buyers: CompanyOption[]; initialBuyer: string | null }) {
  const t = useTranslations("cases");
  const router = useRouter();
  const toast = useToast();
  const [buyer, setBuyer] = useState<string | null>(initialBuyer);
  // v4: the same company search as Credit Worthiness; a company just added shows before the list refreshes.
  const [added, setAdded] = useState<CompanyOption | null>(null);
  const buyers = added && !saved.some((b) => b.id === added.id) ? [added, ...saved] : saved;
  const choose = (id: string | null, option?: CompanyOption) => { if (option) setAdded(option); setBuyer(id); };
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The server's quote, kept with the choices it was made for: any change makes it stale.
  const [quoted, setQuoted] = useState<{ key: string; quote: Quote; runKey: string } | null>(null);
  const [pending, setPending] = useState<{ id: string; seconds: number; quote: Quote } | null>(null);
  const tc = useTranslations("checks");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!buyer) return;
    let live = true;
    void api<Catalogue>(`/api/v1/checks/catalogue?counterparty=${buyer}&tab=CASE_CHECK`).then((res) => {
      if (!live) return;
      if (!res.ok) return toast(res.error.message, "danger");
      const d = res.data.defaults;
      setCatalogue(res.data);
      setForm({ name: d.name, state: d.state, district: d.district, address: d.address, relativeName: "", pan: "", mobile: "", birthDate: "" });
      setPicked(Object.fromEntries(savedChoice().map((c) => [c, true])));
      setErrors({});
    });
    return () => {
      live = false;
    };
  }, [buyer, toast]);

  const firOff = Boolean(form && !firCovered(form.state));
  const selected = useMemo(
    () => (catalogue?.checks ?? []).filter((c) => picked[c.code] && !c.disabled && !(c.code === "CC_FIR" && firOff)).map((c) => c.code as CcCode),
    [catalogue, picked, firOff],
  );
  const available = (catalogue?.checks ?? []).filter((c) => !c.disabled && !(c.code === "CC_FIR" && firOff));
  const cost = useMemo(() => {
    let price = 0;
    let gst = 0;
    for (const code of selected) {
      const c = catalogue!.checks.find((x) => x.code === code)!;
      price += c.pricePaise ?? 0;
      gst += c.gstPaise ?? 0;
    }
    return { price, gst, total: price + gst };
  }, [selected, catalogue]);

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const caseInput = () =>
    form && {
      name: form.name, state: form.state, district: form.district, address: form.address,
      relativeName: form.relativeName || undefined, pan: form.pan || undefined, mobile: form.mobile || undefined, birthDate: form.birthDate || undefined,
    };

  function localErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form) return e;
    if (form.name.trim().length < 2) e.name = t("errors.name");
    if (!form.state) e.state = t("errors.state");
    if (form.district.trim().length < 2) e.district = t("errors.district");
    if (form.address.trim().length < 3) e.address = t("errors.address");
    return e;
  }

  const choiceKey = JSON.stringify([buyer, selected, form]);
  const quote = quoted?.key === choiceKey ? quoted.quote : null;

  /** v4 section 8: one button. Gets the exact price and starts at once with a cancel bar; stops only if the wallet is short. */
  async function runSearch() {
    if (!buyer || !selected.length || busy) return;
    const e = localErrors();
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(selected));
    } catch {
      // the saved choice is a convenience only
    }
    let q = quote;
    let runKey = quoted?.runKey ?? "";
    if (!q) {
      setBusy(true);
      const res = await api<Quote>("/api/v1/checks/quote", { body: { counterpartyId: buyer, tab: "case_check", items: selected } });
      if (!res.ok) {
        setBusy(false);
        return toast(res.error.message, "danger");
      }
      q = res.data;
      runKey = newIdempotencyKey();
      setQuoted({ key: choiceKey, quote: q, runKey });
    }
    if (!q.enough) return setBusy(false);
    await run(q, runKey);
  }

  async function run(q: Quote, runKey: string) {
    if (!buyer) return;
    setBusy(true);
    const res = await api<{ id: string; cancelWindowSeconds: number }>("/api/v1/checks/requests", {
      body: { tab: "case_check", quoteId: q.quoteId, counterpartyId: buyer, items: selected, mode: "together", caseInput: caseInput() },
      idempotencyKey: runKey,
    });
    setBusy(false);
    if (!res.ok) {
      if (res.error.fields) setErrors(Object.fromEntries(Object.entries(res.error.fields).map(([k, v]) => [k.replace(/^caseInput\./, ""), v])));
      return toast(res.error.message, "danger");
    }
    setPending({ id: res.data.id, seconds: res.data.cancelWindowSeconds, quote: q });
  }

  async function cancelPending() {
    if (!pending) return;
    const res = await api(`/api/v1/checks/requests/${pending.id}/cancel`, { body: {} });
    if (!res.ok) return toast(res.error.message, "danger");
    toast(tc("cancelledNothing"), "success");
    setPending(null);
    setQuoted(null);
  }

  function startedPending() {
    if (!pending) return;
    toast(pending.quote.sample ? tc("sampleStarted") : tc("held", { amount: inr(pending.quote.walletPaise) }), "success");
    router.push(`/cases/${pending.id}`);
  }

  const ready = buyer && catalogue?.counterparty.id === buyer && form;

  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      <PageHeader title={<>{t("titleLead")} <GradientText>{t("titleAccent")}</GradientText></>} description={t("subtitleShort")} />

      <Card>
        <CardBody>
          <FormField id="buyer" label={t("buyer")} hint={t("buyerHint")}>
            <CompanySearch companies={buyers} value={buyer} onChange={pending ? () => undefined : choose} />
          </FormField>
        </CardBody>
      </Card>

      {!buyer ? <CaseStart /> : null}
      {buyer && !ready ? <Skeleton className="h-96 w-full" /> : null}

      {ready ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <fieldset disabled={Boolean(pending)} className="@container/checks min-w-0 space-y-4">
            <Card>
              <CardHeader title={t("searchTitle")} />
              <CardBody className="space-y-4">
                <p className="text-xs text-muted">{t("searchLeadShort")}</p>
                <div className="grid gap-4 @lg/checks:grid-cols-2">
                  <FormField id="cc-name" label={t("name")} required error={errors.name}>
                    <Input id="cc-name" value={form.name} maxLength={120} invalid={Boolean(errors.name)} onChange={(e) => set({ name: e.target.value })} />
                  </FormField>
                  <FormField id="cc-relative" label={`${t("relativeName")} (${t("optional")})`} hint={t("relativeHint")} error={errors.relativeName}>
                    <Input id="cc-relative" value={form.relativeName} maxLength={80} invalid={Boolean(errors.relativeName)} onChange={(e) => set({ relativeName: e.target.value })} />
                  </FormField>
                  <FormField id="cc-state" label={t("stateLabel")} required error={errors.state}>
                    <Select id="cc-state" value={form.state} invalid={Boolean(errors.state)} onChange={(e) => set({ state: e.target.value })}>
                      <option value="">{t("selectState")}</option>
                      {STATES.map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField id="cc-district" label={t("district")} required error={errors.district}>
                    <Input id="cc-district" value={form.district} maxLength={60} invalid={Boolean(errors.district)} onChange={(e) => set({ district: e.target.value })} />
                  </FormField>
                </div>
                <FormField id="cc-address" label={t("address")} required error={errors.address}>
                  <Textarea id="cc-address" rows={2} value={form.address} maxLength={300} invalid={Boolean(errors.address)} onChange={(e) => set({ address: e.target.value })} />
                </FormField>
                <details className="group rounded-xl border border-border bg-surface-muted px-3.5 py-2.5" open={Boolean(errors.pan || errors.mobile || errors.birthDate)}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-text-2">
                    {t("moreDetails")} <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                <div className="mt-3 grid gap-4 @2xl/checks:grid-cols-3">
                  <FormField id="cc-pan" label={`${t("pan")} (${t("optional")})`} hint={catalogue.defaults.panOnFile ? t("onFile", { value: catalogue.defaults.panOnFile }) : undefined} error={errors.pan}>
                    <Input id="cc-pan" value={form.pan} maxLength={10} className="font-mono uppercase" invalid={Boolean(errors.pan)} onChange={(e) => set({ pan: e.target.value.toUpperCase() })} />
                  </FormField>
                  <FormField id="cc-mobile" label={`${t("mobile")} (${t("optional")})`} hint={catalogue.defaults.mobileOnFile ? t("onFile", { value: catalogue.defaults.mobileOnFile }) : undefined} error={errors.mobile}>
                    <Input id="cc-mobile" type="tel" inputMode="numeric" maxLength={10} value={form.mobile} invalid={Boolean(errors.mobile)} onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, "") })} />
                  </FormField>
                  <FormField id="cc-birth" label={`${catalogue.defaults.individual ? t("birthDate") : t("incorporatedOn")} (${t("optional")})`} hint={t("birthHint")} error={errors.birthDate}>
                    <Input id="cc-birth" type="date" value={form.birthDate} invalid={Boolean(errors.birthDate)} onChange={(e) => set({ birthDate: e.target.value })} />
                  </FormField>
                </div>
                </details>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title={t("checksTitle")}
                action={
                  <button type="button" onClick={() => setPicked(Object.fromEntries(available.map((c) => [c.code, true])))} className="text-[13px] font-semibold text-primary-text hover:underline">
                    {t("pickAll")}
                  </button>
                }
              />
              <CardBody className="grid gap-2.5 @xl/checks:grid-cols-3">
                {catalogue.checks.map((c) => {
                  const off = Boolean(c.disabled) || (c.code === "CC_FIR" && firOff);
                  const on = Boolean(picked[c.code]) && !off;
                  const Icon = c.code === "CC_FIR" ? Siren : c.code === "CC_AML" ? ShieldAlert : Gavel;
                  return (
                    <label
                      key={c.code}
                      title={c.code === "CC_FIR" ? (firOff ? t("firNotCovered") : t("firCovered", { states: FIR_STATES.map((st) => GST_STATES[st]).join(", ") })) : t(`desc.${c.code}`)}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow,scale] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring active:scale-[0.98]",
                        off ? "cursor-not-allowed border-dashed border-border bg-surface-muted opacity-60" : on ? "border-primary/60 bg-primary-softer shadow-[0_0_0_3px_var(--primary-soft)]" : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0 z-10"
                        checked={on}
                        disabled={off}
                        onChange={(e) => setPicked((p) => ({ ...p, [c.code]: e.target.checked }))}
                        aria-label={c.name}
                        aria-describedby={`${c.code}-desc`}
                      />
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("flex size-9 items-center justify-center rounded-xl transition-colors", on ? "bg-brand text-white" : "bg-soft text-primary-text")} aria-hidden="true">
                          {on ? <Check size={17} strokeWidth={3} /> : <Icon size={17} />}
                        </span>
                        <span className={cn("text-[13px] font-bold tabular-nums", on ? "text-primary-text" : "text-text-2")}>{c.pricePaise === null ? t("priceNotSet") : inr(c.pricePaise)}</span>
                      </span>
                      <span className="text-sm font-bold text-text">{c.name}</span>
                      <span id={`${c.code}-desc`} className="text-xs leading-snug text-muted">{t(`descShort.${c.code}`)}</span>
                      {c.code === "CC_FIR" ? (
                        <span className={cn("text-[11.5px]", firOff ? "font-semibold text-warning-fg" : "text-subtle")}>
                          {firOff ? t("firNotCoveredShort") : t("firCovered", { states: FIR_STATES.map((st) => GST_STATES[st]).join(", ") })}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </CardBody>
            </Card>
          </fieldset>

          <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
            <Card>
              <CardHeader title={t("costTitle")} />
              <CardBody className="space-y-3 text-sm">
                {selected.length ? (
                  <ul className="space-y-1.5 text-xs">
                    {selected.map((code) => {
                      const c = catalogue.checks.find((x) => x.code === code)!;
                      return (
                        <li key={code} className="flex justify-between gap-3">
                          <span className="text-text-2">{c.name}</span>
                          <span className="shrink-0 font-medium tabular-nums text-text">{inr(c.pricePaise ?? 0)}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">{t("costEmpty")}</p>
                )}
                <dl className="space-y-1 border-t border-border pt-3 text-xs">
                  <div className="flex justify-between"><dt className="text-muted">{t("beforeGst")}</dt><dd className="tabular-nums">{inr(cost.price)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t("gst")}</dt><dd className="tabular-nums">{inr(cost.gst)}</dd></div>
                  <div className="flex items-baseline justify-between pt-1"><dt className="text-sm font-medium text-text">{t("total")}</dt><dd className="text-lg font-semibold tabular-nums text-text">{inr(cost.total)}</dd></div>
                </dl>
                <p className="text-xs text-muted">{t("chargeNote")}</p>
                {quote && !pending ? <CostSummary quote={quote} /> : null}
                {quote?.sample && !pending ? <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs font-medium text-warning-fg">{tc("sampleNote")}</p> : null}
                {quote && !quote.enough && !pending ? (
                  <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger-fg">
                    {tc("shortfall", { amount: inr(quote.walletPaise - quote.walletBeforePaise) })}{" "}
                    <Link href="/account/billing?topup=1" className="underline underline-offset-2">{t("addMoney")}</Link>
                  </p>
                ) : null}
                {pending ? (
                  <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[var(--nav-bg)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                    <CancelWindow inline seconds={pending.seconds} onCancel={cancelPending} onDone={startedPending} />
                  </div>
                ) : (
                  <>
                    <Button className="w-full" disabled={!selected.length || Boolean(quote && !quote.enough)} loading={busy} onClick={() => void runSearch()}>
                      {selected.length ? tc("runSearchAmount", { amount: inr(cost.total) }) : tc("runSearch")}
                    </Button>
                    <p className="text-center text-[11px] leading-snug text-subtle">{t("timeNote")}</p>
                  </>
                )}
              </CardBody>
            </Card>
          </aside>
          {!pending ? (
            <MobileCostBar total={inr(cost.total)} count={selected.length} label={tc("runSearch")} disabled={!selected.length || Boolean(quote && !quote.enough)} loading={busy} onClick={() => void runSearch()} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
