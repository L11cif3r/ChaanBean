"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, FormField, Input, Tag, Textarea } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { HEADLINE_ITEMS, type PlanCode } from "@/lib/billing";
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
  const [details, setDetails] = useState<PickerPlan | null>(null);
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

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">{t("subtitle", { months })}</p>

      {current ? (
        <p role="status" className="rounded-[14px] bg-info-bg px-4 py-3 text-sm font-semibold text-info-fg">
          {t("current", { plan: current.name, date: formatDate(istDate(new Date(current.endsAt))) })} {t("currentNote")}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div role="radiogroup" aria-label={t("title")} className="grid gap-4 sm:grid-cols-2">
            {plans.map((p) => {
              const active = selected === p.code;
              const headline = HEADLINE_ITEMS.map((code) => p.items.find((i) => i.code === code)).filter((i) => i !== undefined);
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
                    "relative flex flex-col rounded-3xl border bg-surface p-5 text-left shadow-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary",
                    active && !current ? "border-primary ring-1 ring-primary" : "border-border",
                    current ? "opacity-80" : "cursor-pointer hover:border-primary",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="whitespace-nowrap text-lg font-extrabold tracking-tight text-text">{p.name}</h2>
                    {p.recommended ? <Tag tone="info">{t("recommended")}</Tag> : null}
                  </div>
                  <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-text">{inr(p.pricePaise)}</p>
                  <p className="text-xs text-muted">{t("perPeriod", { months: p.periodMonths })}</p>
                  <p className="mt-1 text-xs font-semibold text-text-2">{t("users", { count: p.seats })}</p>
                  <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                    {headline.map((i) => (
                      <li key={i.code} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-primary-text" aria-hidden="true" />
                        <span>
                          <span className="font-bold tabular-nums">{i.quantity}</span> {i.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetails(p);
                    }}
                    className="mt-4 self-start text-sm font-bold text-primary-text underline-offset-2 hover:underline"
                  >
                    {t("seeAll")}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardBody className="space-y-2">
                <h2 className="text-base font-bold text-text">{t("payPerUse")}</h2>
                <p className="text-sm text-muted">{t("payPerUseBody")}</p>
                <Button variant="secondary" size="sm" onClick={() => router.push("/account/billing?topup=1")}>
                  {t("payPerUseCta")}
                </Button>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="space-y-2">
                <h2 className="text-base font-bold text-text">{t("customTitle")}</h2>
                <p className="text-sm text-muted">{t("customBody")}</p>
                <Button variant="secondary" size="sm" onClick={() => setCustomOpen(true)}>
                  {t("customCta")}
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>

        {!current ? (
          <Card className="h-fit xl:sticky xl:top-24">
            <CardHeader title={t("summaryTitle")} />
            <CardBody className="space-y-4">
              {plan ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t("planLine", { plan: plan.name, months: plan.periodMonths })}</dt>
                    <dd className="tabular-nums">{inr(plan.pricePaise, true)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">{t("gst")}</dt>
                    <dd className="tabular-nums">{inr(plan.gstPaise, true)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-border pt-2 text-base font-extrabold">
                    <dt>{t("total")}</dt>
                    <dd className="tabular-nums">{inr(plan.totalPaise, true)}</dd>
                  </div>
                </dl>
              ) : null}
              <div className="rounded-2xl bg-surface-muted px-3 py-2 text-xs">
                <p className="font-bold text-text-2">{t("billingGstin")}</p>
                <p className="font-mono text-text">{billingGstin ?? t("noGstin")}</p>
                <p className="text-muted">{t("gstinNote")}</p>
              </div>
              {error ? (
                <p role="alert" className="text-sm font-semibold text-danger-fg">
                  {error}
                </p>
              ) : null}
              <Button className="w-full" onClick={() => void pay()} loading={busy} disabled={busy || !plan}>
                {plan ? t("pay", { amount: inr(plan.totalPaise, true) }) : t("selectPlan")}
              </Button>
              <p className="text-center text-xs text-muted">{t("secure")}</p>
              {decideLaterHref ? (
                <ButtonLink href={decideLaterHref} variant="ghost" size="sm" className="w-full">
                  {t("decideLater")}
                </ButtonLink>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>

      <Dialog open={details !== null} onClose={() => setDetails(null)} title={details ? t("allItemsTitle", { plan: details.name }) : ""}>
        {details ? (
          <div className="space-y-3">
            <ul className="divide-y divide-border">
              {details.items.map((i) => (
                <li key={i.code} className="flex items-center justify-between gap-3 py-2">
                  <span>{i.name}</span>
                  <span className="font-bold tabular-nums">{t("unitsIncluded", { count: i.quantity })}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 py-2">
                <span>{t("users", { count: details.seats })}</span>
              </li>
            </ul>
            <p className="text-xs text-muted">{t("payPerUseNote")}</p>
          </div>
        ) : null}
      </Dialog>

      <CustomPlanDialog open={customOpen} onClose={() => setCustomOpen(false)} />
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
