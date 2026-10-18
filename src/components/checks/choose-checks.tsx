"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, EmptyState, FormField, Input, PageHeader, Select, Skeleton, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import type { CwCode } from "@/lib/checks";
import { CONSENT_CHANNELS, CONSENT_PURPOSES, type ConsentChannel, type ConsentPurpose } from "@/lib/consent";
import type { CatalogueEntry, Quote, SubjectQuote } from "@/server/checks/service";

// PRD v3.0 section 6.5 (Figures 11 and 5): choose checks, see the cost as you tick, confirm what will be deducted,
// then run all together or one by one. GST turnover defaults to the last 4 years and CIBIL to the company (6.2);
// personal CIBIL asks for the person's details, and their OTP goes to their own mobile.

type Period = "4y" | "cy";
type CibilSubject = "company" | "personal" | "both";

interface Catalogue {
  counterparty: { id: string; name: string; type: string; contactName: string; mobileMasked: string };
  checks: CatalogueEntry[];
}

interface Person {
  sameAsContact: boolean;
  name: string;
  pan: string;
  birthDate: string;
  mobile: string;
}

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });
export const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`.replace(".", "");

export function ChooseChecks({ buyers, initialBuyer }: { buyers: { id: string; name: string }[]; initialBuyer: string | null }) {
  const t = useTranslations("checks");
  const router = useRouter();
  const toast = useToast();
  const [buyer, setBuyer] = useState<string | null>(initialBuyer);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [turnoverOn, setTurnoverOn] = useState(false);
  const [period, setPeriod] = useState<Period>("4y");
  const [cibilOn, setCibilOn] = useState(false);
  const [cibilSubject, setCibilSubject] = useState<CibilSubject>("company");
  const [person, setPerson] = useState<Person>({ sameAsContact: true, name: "", pan: "", birthDate: "", mobile: "" });
  const [personErrors, setPersonErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [mode, setMode] = useState<"together" | "manual">("together");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [purpose, setPurpose] = useState<ConsentPurpose>("supply_on_credit");
  const [channels, setChannels] = useState<Record<ConsentChannel, boolean>>({ sms: true, whatsapp: true, email: false });
  const [runKey, setRunKey] = useState("");

  useEffect(() => {
    if (!buyer) return;
    let live = true;
    void api<Catalogue>(`/api/v1/checks/catalogue?counterparty=${buyer}`).then((res) => {
      if (!live) return;
      if (!res.ok) return toast(res.error.message, "danger");
      setCatalogue(res.data);
      // Pre-tick the public checks that can run, as in Figure 11.
      setPicked(Object.fromEntries(res.data.checks.filter((c) => ["CW_GST_SEARCH", "CW_COMPANY", "CW_DIRECTORS"].includes(c.code) && !c.disabled).map((c) => [c.code, true])));
      setTurnoverOn(false);
      setPeriod("4y");
      setCibilOn(false);
      const companyOk = !res.data.checks.find((c) => c.code === "CW_CIBIL_COMPANY")?.disabled;
      setCibilSubject(companyOk ? "company" : "personal");
      setPerson({ sameAsContact: true, name: res.data.counterparty.contactName, pan: "", birthDate: "", mobile: "" });
    });
    return () => {
      live = false;
    };
  }, [buyer, toast]);

  const byCode = useMemo(() => new Map((catalogue?.checks ?? []).map((c) => [c.code, c])), [catalogue]);
  const selected: CwCode[] = useMemo(() => {
    const codes = Object.entries(picked).filter(([, v]) => v).map(([k]) => k as CwCode);
    if (turnoverOn) codes.push(period === "cy" ? "CW_GST_TURNOVER_CY" : "CW_GST_TURNOVER_4Y");
    if (cibilOn && cibilSubject !== "personal") codes.push("CW_CIBIL_COMPANY");
    if (cibilOn && cibilSubject !== "company") codes.push("CW_CIBIL_PERSONAL");
    return codes.filter((c) => byCode.get(c) && !byCode.get(c)!.disabled);
  }, [picked, turnoverOn, period, cibilOn, cibilSubject, byCode]);
  const needsPerson = selected.includes("CW_CIBIL_PERSONAL");

  // The cost box (marker 6) is worked out here as the user ticks; the popup asks the server for the exact figures.
  const cost = useMemo(() => {
    let units = 0;
    let money = 0;
    const lines = selected.map((code) => {
      const c = byCode.get(code)!;
      const plan = c.planLeft !== null && c.planLeft > 0;
      if (plan) units += 1;
      else money += (c.pricePaise ?? 0) + (c.gstPaise ?? 0);
      return { code, name: c.name, label: plan ? t("oneUnit") : inr((c.pricePaise ?? 0) + (c.gstPaise ?? 0)) };
    });
    return { lines, units, money, consent: selected.filter((c) => byCode.get(c)?.consent).length };
  }, [selected, byCode, t]);

  const personBody = () =>
    needsPerson
      ? { sameAsContact: person.sameAsContact, name: person.name, pan: person.pan, birthDate: person.birthDate, mobile: person.sameAsContact ? undefined : person.mobile }
      : undefined;

  async function openConfirm() {
    if (!buyer || !selected.length) return;
    setBusy(true);
    setPersonErrors({});
    const res = await api<Quote>("/api/v1/checks/quote", { body: { counterpartyId: buyer, items: selected, person: personBody() } });
    setBusy(false);
    if (!res.ok) {
      if (res.error.fields) setPersonErrors(res.error.fields);
      return toast(res.error.message, "danger");
    }
    setQuote(res.data);
    setChannels((c) => ({ ...c, email: c.email && Boolean(res.data.consent?.emailMasked) }));
    setRunKey(newIdempotencyKey());
    setConfirm(true);
  }

  async function run() {
    if (!buyer || !quote) return;
    setBusy(true);
    const askSomeone = quote.consent?.subjects.some((s) => !s.reuse);
    const consent = askSomeone ? { purpose, channels: CONSENT_CHANNELS.filter((c) => channels[c]) } : undefined;
    const res = await api<{ id: string }>("/api/v1/checks/requests", {
      body: { quoteId: quote.quoteId, counterpartyId: buyer, items: selected, mode, consent, person: personBody() },
      idempotencyKey: runKey,
    });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    setConfirm(false);
    router.push(`/reports/${res.data.id}`);
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

  const card = (code: CwCode) => {
    const c = byCode.get(code);
    if (!c) return null;
    const on = Boolean(picked[code]);
    return (
      <label
        key={code}
        className={cn(
          "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all",
          c.disabled ? "cursor-not-allowed border-border bg-surface-muted opacity-70" : on ? "border-primary bg-primary-softer shadow-sm" : "border-border bg-surface hover:border-border-strong",
        )}
      >
        <input
          type="checkbox"
          className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--primary)]"
          checked={on}
          disabled={Boolean(c.disabled)}
          onChange={(e) => setPicked((p) => ({ ...p, [code]: e.target.checked }))}
          aria-describedby={`${code}-desc`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-text">{c.name}</span>
            <Tag tone="neutral">{t("publicRecord")}</Tag>
          </span>
          <span id={`${code}-desc`} className="mt-1 block text-sm text-muted">
            {t(`desc.${code}`)}
          </span>
          <PriceLine entry={c} />
          {c.recent ? <RecentLine recent={c.recent} /> : null}
          {c.disabled ? <span className="mt-1 block text-xs font-semibold text-warning-fg">{t(`disabled.${c.disabled}`)}</span> : null}
        </span>
      </label>
    );
  };

  const turnoverCy = byCode.get("CW_GST_TURNOVER_CY");
  const turnover4y = byCode.get("CW_GST_TURNOVER_4Y");
  const cibilCo = byCode.get("CW_CIBIL_COMPANY");
  const cibilPe = byCode.get("CW_CIBIL_PERSONAL");
  const turnoverDisabled = turnover4y?.disabled && turnoverCy?.disabled ? turnover4y.disabled : null;
  const cibilDisabled = cibilPe?.disabled && cibilCo?.disabled ? cibilPe.disabled : null;
  const periodEntry = period === "cy" ? turnoverCy : turnover4y;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card>
        <CardBody>
          <FormField id="buyer" label={t("buyer")} hint={t("chooseBuyerHint")}>
            <Select id="buyer" value={buyer ?? ""} onChange={(e) => setBuyer(e.target.value || null)} className="sm:max-w-md">
              <option value="">{t("selectBuyer")}</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
        </CardBody>
      </Card>

      {buyer && catalogue?.counterparty.id !== buyer ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-hidden="true">
          <div className="space-y-5">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-36 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-56 w-full rounded-3xl" />
        </div>
      ) : null}

      {buyer && catalogue?.counterparty.id === buyer ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            <Card>
              <CardHeader title={t("groupGst")} />
              <CardBody className="grid gap-3 md:grid-cols-2">
                {card("CW_GST_SEARCH")}
                <ConsentCard id="turnover" title={t("turnoverTitle")} desc={t("desc.turnover")} on={turnoverOn} onToggle={setTurnoverOn} disabled={turnoverDisabled}>
                  <fieldset className="mt-3 space-y-2 text-sm" disabled={!turnoverOn}>
                    <legend className="sr-only">{t("turnoverPeriod")}</legend>
                    {(["4y", "cy"] as const).map((v) => {
                      const entry = v === "cy" ? turnoverCy : turnover4y;
                      const off = Boolean(entry?.disabled);
                      return (
                        <label key={v} className={cn("flex items-center gap-2", (off || !turnoverOn) && "text-muted")}>
                          <input type="radio" name="turnover" className="accent-[var(--primary)]" checked={period === v} disabled={off} onChange={() => setPeriod(v)} />
                          {v === "cy" ? t("turnoverCy") : t("turnover4y")}
                          {entry ? <span className="text-xs text-muted">· {entry.pricePaise ? inr(entry.pricePaise) : t("priceNotSet")}</span> : null}
                        </label>
                      );
                    })}
                  </fieldset>
                  {periodEntry && turnoverOn ? <PriceLine entry={periodEntry} /> : null}
                </ConsentCard>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("groupCibil")} />
              <CardBody>
                <ConsentCard id="cibil" title={t("cibilTitle")} desc={t("desc.cibil")} on={cibilOn} onToggle={setCibilOn} disabled={cibilDisabled}>
                  <fieldset className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" disabled={!cibilOn}>
                    <legend className="sr-only">{t("cibilWhose")}</legend>
                    {(["company", "personal", "both"] as const).map((v) => {
                      const off = (v !== "personal" && Boolean(cibilCo?.disabled)) || (v !== "company" && Boolean(cibilPe?.disabled));
                      return (
                        <label key={v} className={cn("flex items-center gap-2", (off || !cibilOn) && "text-muted")}>
                          <input type="radio" name="cibil" className="accent-[var(--primary)]" checked={cibilSubject === v} disabled={off} onChange={() => setCibilSubject(v)} />
                          {v === "company" ? t("cibilCompany") : v === "personal" ? t("cibilPersonal") : t("cibilBoth")}
                        </label>
                      );
                    })}
                  </fieldset>
                  {cibilPe ? <span className="mt-2 block text-xs text-muted">{t("perReport", { price: inr(cibilPe.pricePaise ?? 0) })}</span> : null}
                  {cibilOn && cibilSubject !== "company" ? (
                    <PersonForm person={person} onChange={setPerson} errors={personErrors} contact={catalogue.counterparty} />
                  ) : null}
                </ConsentCard>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("groupIdentity")} />
              <CardBody className="grid gap-3 md:grid-cols-2">
                {(["CW_MSME", "CW_PAN", "CW_IEC_PROFILE", "CW_IEC_TURNOVER"] as const).map((c) => card(c))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("groupCompany")} />
              <CardBody className="grid gap-3 md:grid-cols-3">
                {(["CW_COMPANY", "CW_DIRECTORS", "CW_CREDIT_RATING"] as const).map((c) => card(c))}
              </CardBody>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardHeader title={t("costTitle")} />
              <CardBody className="space-y-3 text-sm">
                {cost.lines.length ? (
                  <ul className="space-y-1.5">
                    {cost.lines.map((l) => (
                      <li key={l.code} className="flex justify-between gap-3">
                        <span className="text-text-2">{l.name}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{l.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">{t("costEmpty")}</p>
                )}
                <dl className="space-y-1 border-t border-border pt-3">
                  <div className="flex justify-between"><dt className="text-muted">{t("fromPlan")}</dt><dd className="font-bold tabular-nums">{t("units", { count: cost.units })}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t("fromWallet")}</dt><dd className="font-bold tabular-nums">{inr(cost.money)}</dd></div>
                </dl>
                {cost.consent ? <p className="text-xs text-muted">{t("consentNote", { count: cost.consent })}</p> : null}
                <Button className="w-full" disabled={!selected.length} loading={busy && !confirm} onClick={() => void openConfirm()}>
                  {t("continue")}
                </Button>
              </CardBody>
            </Card>
          </aside>
        </div>
      ) : null}

      {confirm && quote ? (
        <Dialog
          open
          onClose={() => setConfirm(false)}
          title={t("confirmTitle")}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => void run()}
                loading={busy}
                disabled={
                  (!quote.enough && mode === "together") ||
                  Boolean(quote.consent?.subjects.some((s) => s.limitReached)) ||
                  Boolean(quote.consent?.subjects.some((s) => !s.reuse) && !CONSENT_CHANNELS.some((c) => channels[c]))
                }
              >
                {t("run")}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-muted">{t("confirmSubtitle")}</p>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-bold text-text-2">{t("howRun")}</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="mode" className="accent-[var(--primary)]" checked={mode === "together"} onChange={() => setMode("together")} />
                {t("runTogether")}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="mode" className="accent-[var(--primary)]" checked={mode === "manual"} onChange={() => setMode("manual")} />
                {t("runManual")}
              </label>
            </fieldset>
            <CostSummary quote={quote} later={mode === "manual"} />
            {quote.consent ? (
              <ConsentBlock
                consent={quote.consent}
                buyerName={catalogue?.counterparty.name ?? ""}
                purpose={purpose}
                onPurpose={setPurpose}
                channels={channels}
                onChannels={setChannels}
                names={new Map(quote.lines.map((l) => [l.code, l.name]))}
              />
            ) : null}
            {!quote.enough ? (
              <p role="alert" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
                {t("notEnough")}{" "}
                <Link href="/account/billing" className="underline underline-offset-2">
                  {t("addMoney")}
                </Link>
              </p>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

/** Figure 5 rows, shared by this popup and the one-by-one popup on the report. */
export function CostSummary({ quote, later }: { quote: Quote; later?: boolean }) {
  const t = useTranslations("checks");
  return (
    <dl className="divide-y divide-border rounded-2xl border border-border">
      <div className="flex justify-between gap-3 px-4 py-2.5">
        <dt className="text-muted">{later ? t("deductAsYouRun") : t("deductNow")}</dt>
        <dd className="text-right font-bold tabular-nums">{t("deductSummary", { units: t("units", { count: quote.planUnits }), money: inr(quote.walletPaise) })}</dd>
      </div>
      <div className="flex justify-between gap-3 px-4 py-2.5">
        <dt className="text-muted">{t("planLeftAfter")}</dt>
        <dd className="font-bold tabular-nums">{quote.planUnitsLeftAfter}</dd>
      </div>
      <div className="flex justify-between gap-3 px-4 py-2.5">
        <dt className="text-muted">{t("walletAfter")}</dt>
        <dd className={cn("font-bold tabular-nums", quote.walletAfterPaise < 0 && "text-danger-fg")}>{inr(quote.walletAfterPaise)}</dd>
      </div>
    </dl>
  );
}

/** A check card that needs a yes: an include box, then its options. */
function ConsentCard({
  id, title, desc, on, onToggle, disabled, children,
}: { id: string; title: string; desc: string; on: boolean; onToggle: (v: boolean) => void; disabled: string | null; children: React.ReactNode }) {
  const t = useTranslations("checks");
  return (
    <div className={cn("rounded-2xl border p-4", disabled ? "border-border bg-surface-muted opacity-70" : on ? "border-primary bg-primary-softer shadow-sm" : "border-border bg-surface")}>
      <div className="flex gap-3">
        <input
          id={`${id}-on`}
          type="checkbox"
          className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--primary)]"
          checked={on}
          disabled={Boolean(disabled)}
          onChange={(e) => onToggle(e.target.checked)}
          aria-describedby={`${id}-desc`}
        />
        <div className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`${id}-on`} className="cursor-pointer font-bold text-text">{title}</label>
            <Tag tone="info">{t("buyerConsent")}</Tag>
          </span>
          <span id={`${id}-desc`} className="mt-1 block text-sm text-muted">{desc}</span>
          {children}
          {disabled ? <span className="mt-2 block text-xs font-semibold text-warning-fg">{t(`disabled.${disabled}`)}</span> : null}
        </div>
      </div>
    </div>
  );
}

/** v3 6.5 marker 3: personal CIBIL opens a small form for the person. */
function PersonForm({
  person, onChange, errors, contact,
}: { person: Person; onChange: (p: Person) => void; errors: Record<string, string>; contact: Catalogue["counterparty"] }) {
  const t = useTranslations("checks.person");
  const set = (patch: Partial<Person>) => onChange({ ...person, ...patch });
  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-bold text-text">{t("title")}</p>
      <Checkbox
        id="person-same"
        checked={person.sameAsContact}
        onChange={(e) => set({ sameAsContact: e.target.checked, name: e.target.checked ? contact.contactName : "" })}
        label={t("sameAsContact", { name: contact.contactName, mobile: contact.mobileMasked })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="person-name" label={t("name")} error={errors["person.name"]}>
          <Input id="person-name" value={person.name} maxLength={120} invalid={Boolean(errors["person.name"])} onChange={(e) => set({ name: e.target.value })} />
        </FormField>
        {!person.sameAsContact ? (
          <FormField id="person-mobile" label={t("mobile")} hint={t("mobileHint")} error={errors["person.mobile"]}>
            <Input id="person-mobile" type="tel" inputMode="numeric" maxLength={10} value={person.mobile} invalid={Boolean(errors["person.mobile"])} onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, "") })} />
          </FormField>
        ) : null}
        <FormField id="person-pan" label={t("pan")} hint={t("panHint")} error={errors["person.pan"]}>
          <Input id="person-pan" value={person.pan} maxLength={10} className="font-mono uppercase" invalid={Boolean(errors["person.pan"])} onChange={(e) => set({ pan: e.target.value.toUpperCase() })} />
        </FormField>
        <FormField id="person-birth" label={t("birthDate")} error={errors["person.birthDate"]}>
          <Input id="person-birth" type="date" value={person.birthDate} invalid={Boolean(errors["person.birthDate"])} onChange={(e) => set({ birthDate: e.target.value })} />
        </FormField>
      </div>
      {errors.person ? <p role="alert" className="text-sm font-medium text-danger-fg">{errors.person}</p> : null}
    </div>
  );
}

/** S09 markers 2 to 6, folded into the confirm popup: who is asked, how, why, and the exact message. */
function ConsentBlock({
  consent, buyerName, purpose, onPurpose, channels, onChannels, names,
}: {
  consent: NonNullable<Quote["consent"]>;
  buyerName: string;
  purpose: ConsentPurpose;
  onPurpose: (p: ConsentPurpose) => void;
  channels: Record<ConsentChannel, boolean>;
  onChannels: (c: Record<ConsentChannel, boolean>) => void;
  names: Map<string, string>;
}) {
  const t = useTranslations("checks.consent");
  const asking = consent.subjects.filter((s) => !s.reuse);
  const buyerAsked = asking.find((s) => s.kind === "buyer");
  const recipient: Record<ConsentChannel, string | null> = {
    sms: asking[0]?.mobileMasked ?? null,
    whatsapp: buyerAsked ? consent.whatsappMasked : (asking[0]?.mobileMasked ?? null),
    email: buyerAsked ? consent.emailMasked : null,
  };
  const none = asking.length > 0 && !CONSENT_CHANNELS.some((c) => channels[c]);
  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <p className="font-bold text-text">{t("title")}</p>
      {consent.subjects.map((s) => (
        <SubjectLine key={s.kind} s={s} items={s.scope.map((c) => names.get(c) ?? c)} />
      ))}
      {asking.length ? (
        <>
          <fieldset>
            <legend className="mb-1 text-sm font-bold text-text-2">{t("channels")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {CONSENT_CHANNELS.map((c) => (
                <label key={c} className={cn("flex items-center gap-2", !recipient[c] && "text-muted")}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--primary)]"
                    checked={channels[c] && Boolean(recipient[c])}
                    disabled={!recipient[c]}
                    onChange={(e) => onChannels({ ...channels, [c]: e.target.checked })}
                  />
                  {t(`channel.${c}`)} <span className="text-xs text-muted">{recipient[c] ?? t("noEmail")}</span>
                </label>
              ))}
            </div>
            {asking.length > 1 ? <p className="mt-1 text-xs text-muted">{t("personChannels")}</p> : null}
            {none ? <p className="mt-1 text-xs font-semibold text-danger-fg">{t("chooseChannel")}</p> : null}
          </fieldset>
          <FormField id="consent-purpose" label={t("purpose")} hint={t("purposeHint")}>
            <Select id="consent-purpose" value={purpose} onChange={(e) => onPurpose(e.target.value as ConsentPurpose)}>
              {CONSENT_PURPOSES.map((p) => (
                <option key={p} value={p}>{t(`purposes.${p}`)}</option>
              ))}
            </Select>
          </FormField>
          <div>
            <p className="text-sm font-bold text-text-2">{t("preview")}</p>
            <p className="mt-1 rounded-xl bg-surface-muted px-3 py-2 text-xs text-text-2">{t("previewText", { buyer: buyerName })}</p>
          </div>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted">
            <li>{t("next1")}</li>
            <li>{t("next2")}</li>
            <li>{t("next3")}</li>
          </ol>
        </>
      ) : null}
    </div>
  );
}

function SubjectLine({ s, items }: { s: SubjectQuote; items: string[] }) {
  const t = useTranslations("checks.consent");
  const day = (iso: string) => formatDate(istDate(new Date(iso)));
  return (
    <div className="space-y-2">
      {s.reuse ? (
        <p className="rounded-[14px] bg-success-bg px-4 py-3 text-sm font-semibold text-success-fg">
          {t("reuse", { name: s.name, date: day(s.reuse.approvedAt), items: items.join(", ") })}
        </p>
      ) : (
        <p className="text-sm text-muted">{t("lead", { count: items.length, items: items.join(", "), name: s.name, mobile: s.mobileMasked })}</p>
      )}
      {s.limitReached ? (
        <p role="alert" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
          {t("limit", { name: s.name, date: s.nextAllowedAt ? day(s.nextAllowedAt) : "" })}
        </p>
      ) : null}
      {s.declinedAt ? (
        <p role="status" className="rounded-[14px] bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-fg">
          {t("declinedRecently", { name: s.name, date: day(s.declinedAt) })}
        </p>
      ) : null}
    </div>
  );
}

function PriceLine({ entry }: { entry: CatalogueEntry }) {
  const t = useTranslations("checks");
  if (entry.pricePaise === null) return <span className="mt-2 block text-xs text-muted">{t("priceNotSet")}</span>;
  const price = inr(entry.pricePaise);
  return (
    <span className="mt-2 block text-xs text-muted">
      {entry.planLeft !== null && entry.planLeft > 0 ? `${t("priceOrUnit", { price })} · ${t("unitsLeft", { count: entry.planLeft })}` : `${price} · ${t("fromWallet")}`}
    </span>
  );
}

function RecentLine({ recent }: { recent: { requestId: string; at: string } }) {
  const t = useTranslations("checks");
  return (
    <span className="mt-1 block text-xs font-semibold text-success-fg">
      {t("recent", { date: formatDate(istDate(new Date(recent.at))) })}{" "}
      <Link href={`/reports/${recent.requestId}`} className="underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
        {t("openResult")}
      </Link>{" "}
      <span className="font-normal text-muted">{t("rerunCharged")}</span>
    </span>
  );
}
