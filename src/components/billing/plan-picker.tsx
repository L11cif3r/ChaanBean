"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Info, Lock, MessageSquareText, Sparkles, Wallet } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Carousel, FormField, Input, Textarea } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import type { PlanCode } from "@/lib/billing";
import { formatDate, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { normaliseMobile } from "@/lib/validators";

// PRD S03: Plan A, Plan B (recommended), pay per use, custom plan, order summary with GST, and Pay.

export interface PickerPlan {
  code: PlanCode;
  name: string;
  recommended: boolean;
  pricePaise: number;
  gstPaise: number;
  totalPaise: number;
  periodMonths: number;
  seats: number;
  items: { code: string; name: string; quantity: number }[];
}

const inr = (paise: number, withPaise = false) => formatInr(BigInt(paise), { withPaise });

export function PlanPicker({
  plans,
  billingGstin,
  returnTo,
  current,
  decideLaterHref,
}: {
  plans: PickerPlan[];
  billingGstin: string | null;
  returnTo: "signup" | "change";
  current: { name: string; endsAt: string } | null;
  decideLaterHref?: string;
}) {
  const t = useTranslations("billing.choose");
  const toast = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<PlanCode | null>(plans.find((p) => p.recommended)?.code ?? plans[0]?.code ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const plan = plans.find((p) => p.code === selected) ?? null;

  async function pay() {
    if (!plan) return setError(t("selectPlan"));
    setError(null);
    setBusy(true);
    const res = await api<{ orderId: string; checkoutUrl: string }>("/api/v1/billing/checkout", { body: { purpose: "plan", plan: plan.code, returnTo } });
    if (!res.ok) {
      setBusy(false);
      return toast(res.error.message, "danger");
    }
    window.location.assign(res.data.checkoutUrl);
  }

  const months = plans[0]?.periodMonths ?? 12;
  const payLabel = plan ? t("pay", { amount: inr(plan.totalPaise, true) }) : t("selectPlan");

  return (
    <div className={cn("space-y-5", !current && "pb-20 sm:pb-0")}>
      <p className="text-sm text-muted">{t("subtitle", { months })}</p>

      {current ? (
        <p role="status" className="flex items-start gap-2.5 rounded-xl bg-info-bg px-3.5 py-3 text-[13px] font-semibold leading-snug text-info-fg">
          <Info size={16} className="mt-px shrink-0" aria-hidden="true" />
          <span>
            {t("current", { plan: current.name, date: formatDate(istDate(new Date(current.endsAt))) })} {t("currentNote")}
          </span>
        </p>
      ) : null}

      <div className={cn("grid gap-5", !current && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="min-w-0 space-y-5">
          <div role="radiogroup" aria-label={t("title")}>
            <Carousel label={t("title")} slide="basis-[86%] sm:basis-[calc(50%-8px)]" gap="gap-4" controls="dots">
              {plans.map((p) => {
                const active = selected === p.code;
                return (
                  <div
                    key={p.code}
                    role="radio"
                    aria-checked={active}
                    tabIndex={current ? -1 : 0}
                    aria-disabled={current ? true : undefined}
                    onClick={() => !current && setSelected(p.code)}
                    onKeyDown={(e) => {
                      if (!current && (e.key === " " || e.key === "Enter")) {
                        e.preventDefault();
                        setSelected(p.code);
                      }
                    }}
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface p-5 text-left shadow-sm outline-none transition-[border-color,box-shadow,translate] duration-200 focus-visible:ring-2 focus-visible:ring-primary",
                      active && !current ? "border-primary shadow-[0_0_0_3px_var(--primary-soft)]" : "border-border",
                      current ? "opacity-80" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
                    )}
                  >
                    {p.recommended ? (
                      <>
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-soft" aria-hidden="true" />
                        <span className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-xl bg-brand px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.6px] text-white shadow-orange">
                          <Sparkles size={12} aria-hidden="true" />
                          {t("recommended")}
                        </span>
                      </>
                    ) : null}
                    <div className="relative flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          active && !current ? "border-primary bg-primary text-white" : "border-border-strong bg-surface",
                        )}
                        aria-hidden="true"
                      >
                        {active && !current ? <Check size={12} strokeWidth={3.5} /> : null}
                      </span>
                      <h2 className="whitespace-nowrap font-head text-lg font-extrabold tracking-tight text-text">{p.name}</h2>
                      {active && !current ? <span className="sr-only">{t("selected")}</span> : null}
                    </div>
                    <p className="relative mt-4 font-head text-[2.1rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                      <span className="text-gradient">{inr(p.pricePaise)}</span>
                    </p>
                    <p className="relative mt-1.5 text-xs text-muted">{t("perPeriod", { months: p.periodMonths })}</p>
                    {/* v4 3.1: no units. The whole payment goes into the wallet; the plan adds users (and plan prices once set). */}
                    <ul className="relative mt-4 flex-1 space-y-2 border-t border-border pt-4 text-[13px] text-text-2">
                      {[t("benefitWallet", { amount: inr(p.totalPaise) }), t("benefitUsers", { count: p.seats }), t("benefitPrices")].map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-success-bg text-success-fg" aria-hidden="true">
                            <Check size={11} strokeWidth={3} />
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </Carousel>
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase leading-none tracking-[1.2px] text-subtle">{t("orAlso")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <OptionTile icon={<Wallet size={17} />} title={t("payPerUse")} body={t("payPerUseBody")}>
                <Button variant="secondary" size="sm" onClick={() => router.push("/account/billing?topup=1")}>
                  {t("payPerUseCta")}
                </Button>
              </OptionTile>
              <OptionTile icon={<MessageSquareText size={17} />} title={t("customTitle")} body={t("customBody")}>
                <Button variant="secondary" size="sm" onClick={() => setCustomOpen(true)}>
                  {t("customCta")}
                </Button>
              </OptionTile>
            </div>
          </div>
        </div>

        {!current ? (
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader title={t("summaryTitle")} />
            <CardBody className="space-y-4">
              {plan ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t("planLine", { plan: plan.name, months: plan.periodMonths })}</dt>
                    <dd className="tabular-nums text-text">{inr(plan.pricePaise, true)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t("gst")}</dt>
                    <dd className="tabular-nums text-text">{inr(plan.gstPaise, true)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
                    <dt className="font-bold text-text">{t("total")}</dt>
                    <dd className="font-head text-lg font-extrabold tabular-nums text-text">{inr(plan.totalPaise, true)}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="rounded-xl bg-surface-muted px-3 py-2.5 text-xs">
                <p className="font-semibold text-text-2">{t("billingGstin")}</p>
                <p className="mt-0.5 font-mono text-text">{billingGstin ?? t("noGstin")}</p>
                <p className="mt-0.5 text-subtle">{t("gstinNote")}</p>
              </div>
              {error ? (
                <p role="alert" className="text-sm font-semibold text-danger-fg">
                  {error}
                </p>
              ) : null}
              <Button className="hidden w-full sm:inline-flex" onClick={() => void pay()} loading={busy} disabled={busy || !plan}>
                {payLabel}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-subtle">
                <Lock size={12} aria-hidden="true" />
                {t("secure")}
              </p>
              {decideLaterHref ? (
                <ButtonLink href={decideLaterHref} variant="ghost" size="sm" className="w-full">
                  {t("decideLater")}
                </ButtonLink>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>

      {/* Phones: the total and Pay stay in reach at the bottom of the screen (the card's button shows from 640 px). */}
      {!current ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[var(--nav-bg)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_-16px_rgba(16,24,40,0.3)] backdrop-blur sm:hidden">
          <div className="flex items-center gap-3">
            {plan ? (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-subtle">{t("totalWithGst")}</p>
                <p className="font-head text-lg font-extrabold tabular-nums text-gradient">{inr(plan.totalPaise, true)}</p>
              </div>
            ) : null}
            <Button className="flex-1" onClick={() => void pay()} loading={busy} disabled={busy || !plan}>
              {payLabel}
            </Button>
          </div>
        </div>
      ) : null}

      <CustomPlanDialog open={customOpen} onClose={() => setCustomOpen(false)} />
    </div>
  );
}

/** Pay per use and custom plan: a small icon tile, a title, one line and an action. */
function OptionTile({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft text-primary-text" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div>
          <h2 className="font-head text-[15px] font-bold text-text">{title}</h2>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{body}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function CustomPlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("billing.choose");
  const tc = useTranslations("team");
  const toast = useToast();
  const [form, setForm] = useState({ name: "", mobile: "", expected: "", message: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function send() {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = tc("errName");
    if (!normaliseMobile(form.mobile)) errs.mobile = tc("errMobile");
    setFields(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await api("/api/v1/billing/custom-plan", {
      body: {
        name: form.name.trim(),
        mobile: form.mobile,
        expectedChecks: form.expected.trim() ? Number(form.expected) : null,
        message: form.message.trim() || null,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setFields(res.error.fields ?? {});
      if (!res.error.fields) toast(res.error.message, "danger");
      return;
    }
    toast(t("customSent"), "success");
    setForm({ name: "", mobile: "", expected: "", message: "" });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("customTitle")}
      footer={
        <Button onClick={() => void send()} loading={busy} disabled={busy}>
          {t("customSend")}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-muted">{t("customBody")}</p>
        <FormField id="custom-name" label={t("customName")} error={fields.name} required>
          <Input id="custom-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!fields.name} autoComplete="name" />
        </FormField>
        <FormField id="custom-mobile" label={t("customMobile")} error={fields.mobile} required>
          <Input id="custom-mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} invalid={!!fields.mobile} inputMode="tel" autoComplete="tel-national" />
        </FormField>
        <FormField id="custom-expected" label={t("customExpected")} error={fields.expectedChecks}>
          <Input id="custom-expected" value={form.expected} onChange={(e) => setForm({ ...form, expected: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
        </FormField>
        <FormField id="custom-message" label={t("customMessage")} error={fields.message}>
          <Textarea id="custom-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} maxLength={1000} />
        </FormField>
      </div>
    </Dialog>
  );
}
