"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Card, CardBody, CardHeader, EmptyState, FormField, Input, PageHeader, Select, Skeleton, Tag, Textarea } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { CostSummary, newIdempotencyKey } from "@/components/checks/choose-checks";
import { api } from "@/lib/api-client";
import { CC_CODES, FIR_STATES, firCovered, type CcCode } from "@/lib/cases";
import { formatInr } from "@/lib/money";
import { GST_STATES } from "@/server/providers/identity/states";
import type { CatalogueEntry, Quote } from "@/server/checks/service";

// S12 (PRD v3.0 section 7, Figure 17): pick the checks, check the search details, see the cost, then search.
// Nothing is ticked at first except the user's own last choice (FR-CC-01). The FIR card is off for states the
// provider does not cover (FR-CC-07).

interface Defaults {
  name: string;
  state: string;
  district: string;
  address: string;
  panOnFile: string | null;
  mobileOnFile: string;
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

export function CaseCheck({ buyers, initialBuyer }: { buyers: { id: string; name: string }[]; initialBuyer: string | null }) {
  const t = useTranslations("cases");
  const router = useRouter();
  const toast = useToast();
  const [buyer, setBuyer] = useState<string | null>(initialBuyer);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [runKey, setRunKey] = useState("");
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
  const cost = useMemo(() => {
    let units = 0;
    let money = 0;
    for (const code of selected) {
      const c = catalogue!.checks.find((x) => x.code === code)!;
      if (c.planLeft !== null && c.planLeft > 0) units += 1;
      else money += (c.pricePaise ?? 0) + (c.gstPaise ?? 0);
    }
    return { units, money };
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

  async function openConfirm() {
    if (!buyer || !selected.length) return;
    const e = localErrors();
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(selected));
    } catch {
      // the saved choice is a convenience only
    }
    setBusy(true);
    const res = await api<Quote>("/api/v1/checks/quote", { body: { counterpartyId: buyer, tab: "case_check", items: selected } });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    setQuote(res.data);
    setRunKey(newIdempotencyKey());
  }

  async function run() {
    if (!buyer || !quote) return;
    setBusy(true);
    const res = await api<{ id: string }>("/api/v1/checks/requests", {
      body: { tab: "case_check", quoteId: quote.quoteId, counterpartyId: buyer, items: selected, mode: "together", caseInput: caseInput() },
      idempotencyKey: runKey,
    });
    setBusy(false);
    if (!res.ok) {
      if (res.error.fields) setErrors(Object.fromEntries(Object.entries(res.error.fields).map(([k, v]) => [k.replace(/^caseInput\./, ""), v])));
      return toast(res.error.message, "danger");
    }
    setQuote(null);
    router.push(`/cases/${res.data.id}`);
  }

  if (!buyers.length) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <Card>
          <EmptyState title={t("noBuyers")} action={<ButtonLink href="/counterparties/new">{t("addBuyer")}</ButtonLink>} />
        </Card>
      </div>
    );
  }

  const ready = buyer && catalogue?.counterparty.id === buyer && form;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card>
        <CardBody>
          <FormField id="buyer" label={t("buyer")} hint={t("buyerHint")}>
            <Select id="buyer" value={buyer ?? ""} onChange={(e) => setBuyer(e.target.value || null)} className="sm:max-w-md">
              <option value="">{t("selectBuyer")}</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </FormField>
        </CardBody>
      </Card>

      {buyer && !ready ? <Skeleton className="h-96 w-full rounded-3xl" /> : null}

      {ready ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            <Card>
              <CardHeader title={t("searchTitle")} />
              <CardBody className="space-y-4">
                <p className="text-sm text-muted">{t("searchLead")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="cc-name" label={t("name")} required error={errors.name}>
                    <Input id="cc-name" value={form.name} maxLength={120} invalid={Boolean(errors.name)} onChange={(e) => set({ name: e.target.value })} />
                  </FormField>
                  <FormField id="cc-relative" label={`${t("relativeName")} (${t("optional")})`} hint={t("relativeHint")} error={errors.relativeName}>
                    <Input id="cc-relative" value={form.relativeName} maxLength={80} invalid={Boolean(errors.relativeName)} onChange={(e) => set({ relativeName: e.target.value })} />
                  </FormField>
                  <FormField id="cc-state" label={t("state")} required error={errors.state}>
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
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField id="cc-pan" label={`${t("pan")} (${t("optional")})`} hint={catalogue.defaults.panOnFile ? t("onFile", { value: catalogue.defaults.panOnFile }) : undefined} error={errors.pan}>
                    <Input id="cc-pan" value={form.pan} maxLength={10} className="font-mono uppercase" invalid={Boolean(errors.pan)} onChange={(e) => set({ pan: e.target.value.toUpperCase() })} />
                  </FormField>
                  <FormField id="cc-mobile" label={`${t("mobile")} (${t("optional")})`} hint={t("onFile", { value: catalogue.defaults.mobileOnFile })} error={errors.mobile}>
                    <Input id="cc-mobile" type="tel" inputMode="numeric" maxLength={10} value={form.mobile} invalid={Boolean(errors.mobile)} onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, "") })} />
                  </FormField>
                  <FormField id="cc-birth" label={`${catalogue.defaults.individual ? t("birthDate") : t("incorporatedOn")} (${t("optional")})`} hint={t("birthHint")} error={errors.birthDate}>
                    <Input id="cc-birth" type="date" value={form.birthDate} invalid={Boolean(errors.birthDate)} onChange={(e) => set({ birthDate: e.target.value })} />
                  </FormField>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("checksTitle")} />
              <CardBody className="grid gap-3 md:grid-cols-3">
                {catalogue.checks.map((c) => {
                  const off = Boolean(c.disabled) || (c.code === "CC_FIR" && firOff);
                  const on = Boolean(picked[c.code]) && !off;
                  return (
                    <label
                      key={c.code}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all",
                        off ? "cursor-not-allowed border-border bg-surface-muted opacity-70" : on ? "border-primary bg-primary-softer shadow-sm" : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--primary)]"
                        checked={on}
                        disabled={off}
                        onChange={(e) => setPicked((p) => ({ ...p, [c.code]: e.target.checked }))}
                        aria-describedby={`${c.code}-desc`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-text">{c.name}</span>
                        <span id={`${c.code}-desc`} className="mt-1 block text-sm text-muted">{t(`desc.${c.code}`)}</span>
                        <span className="mt-2 block text-xs text-muted">
                          {c.pricePaise === null ? t("priceNotSet") : c.planLeft !== null && c.planLeft > 0 ? t("priceOrUnit", { price: inr(c.pricePaise), count: c.planLeft }) : t("priceWallet", { price: inr(c.pricePaise) })}
                        </span>
                        {c.code === "CC_FIR" ? (
                          <span className={cn("mt-1 block text-xs", firOff ? "font-semibold text-warning-fg" : "text-muted")}>
                            {firOff ? t("firNotCovered") : t("firCovered", { states: FIR_STATES.map((s) => GST_STATES[s]).join(", ") })}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </CardBody>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardHeader title={t("costTitle")} />
              <CardBody className="space-y-3 text-sm">
                {selected.length ? (
                  <ul className="space-y-1.5">
                    {selected.map((code) => {
                      const c = catalogue.checks.find((x) => x.code === code)!;
                      const plan = c.planLeft !== null && c.planLeft > 0;
                      return (
                        <li key={code} className="flex justify-between gap-3">
                          <span className="text-text-2">{c.name}</span>
                          <span className="shrink-0 font-semibold tabular-nums">{plan ? t("oneUnit") : inr((c.pricePaise ?? 0) + (c.gstPaise ?? 0))}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted">{t("costEmpty")}</p>
                )}
                <dl className="space-y-1 border-t border-border pt-3">
                  <div className="flex justify-between"><dt className="text-muted">{t("fromPlan")}</dt><dd className="font-bold tabular-nums">{t("units", { count: cost.units })}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t("fromWallet")}</dt><dd className="font-bold tabular-nums">{inr(cost.money)}</dd></div>
                </dl>
                <p className="text-xs text-muted">{t("chargeNote")}</p>
                <Button className="w-full" disabled={!selected.length} loading={busy && !quote} onClick={() => void openConfirm()}>
                  {t("continue")}
                </Button>
              </CardBody>
            </Card>
          </aside>
        </div>
      ) : null}

      {quote ? (
        <Dialog
          open
          onClose={() => setQuote(null)}
          title={t("confirmTitle")}
          footer={
            <>
              <Button variant="secondary" onClick={() => setQuote(null)}>{t("cancel")}</Button>
              <Button onClick={() => void run()} loading={busy} disabled={!quote.enough}>{t("run")}</Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-muted">{t("confirmSubtitle", { name: form?.name ?? "" })}</p>
            <CostSummary quote={quote} />
            <p className="text-xs text-muted">{t("timeNote")}</p>
            {!quote.enough ? (
              <p role="alert" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
                {t("notEnough")}{" "}
                <Link href="/account/billing" className="underline underline-offset-2">{t("addMoney")}</Link>
              </p>
            ) : null}
            <Tag tone="neutral">{t("optionalTab")}</Tag>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
