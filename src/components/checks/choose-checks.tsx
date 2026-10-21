"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Check, ChevronDown, Crown, Factory, Globe, History, IdCard, Info, Landmark, Minus, Play, ReceiptText, ShieldCheck, Ship, SlidersHorizontal, Sparkles, Star, TrendingUp, Users, Zap, type LucideIcon } from "lucide-react";
import { CancelWindow } from "@/components/ui/cancel-window";
import { MobileCostBar } from "@/components/ui/mobile-cost-bar";
import { CompanySearch, type CompanyOption } from "./company-search";
import { CwStart, type RecentReport } from "./cw-start";
import { Button, Card, CardBody, CardHeader, Carousel, Checkbox, FormField, GradientText, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import type { CwCode } from "@/lib/checks";
import { CONSENT_CHANNELS, CONSENT_PURPOSES, type ConsentChannel, type ConsentPurpose } from "@/lib/consent";
import type { CatalogueEntry, Quote, SubjectQuote } from "@/server/checks/service";

// PRD v3.0 section 6.5 (Figures 11 and 5): choose checks, see the cost as you tick, then run all together or one by
// one. v4 section 8: no confirm popup; "Run search" starts a short countdown bar in the cost panel with Cancel, and
// nothing is taken until it ends. Consent and wallet notes show in the panel when they apply. GST turnover defaults to the last 4 years and CIBIL to the company (6.2);
// personal CIBIL asks for the person's details, and their OTP goes to their own mobile.

type Period = "4y" | "cy";
type CibilSubject = "company" | "personal" | "both";

interface Catalogue {
  /** Contact is null for a company picked from MCA records until the user adds one (v4). */
  counterparty: { id: string; name: string; type: string; contactName: string | null; mobileMasked: string | null };
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

export function ChooseChecks({ buyers: saved, initialBuyer, recent = [] }: { buyers: CompanyOption[]; initialBuyer: string | null; recent?: RecentReport[] }) {
  const t = useTranslations("checks");
  // A company just added from search shows straight away, before the refreshed buyer list arrives.
  const [added, setAdded] = useState<CompanyOption | null>(null);
  const buyers = added && !saved.some((b) => b.id === added.id) ? [added, ...saved] : saved;
  const choose = (id: string | null, option?: CompanyOption) => { if (option) setAdded(option); setBuyer(id); };
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
  const [pending, setPending] = useState<{ id: string; seconds: number; quote: Quote } | null>(null);
  const [mode, setMode] = useState<"together" | "manual">("together");
  // The server's quote, kept with the choices it was made for: any change to the choices makes it stale.
  const [quoted, setQuoted] = useState<{ key: string; quote: Quote; runKey: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [purpose, setPurpose] = useState<ConsentPurpose>("supply_on_credit");
  const [channels, setChannels] = useState<Record<ConsentChannel, boolean>>({ sms: true, whatsapp: true, email: false });
  const reviewRef = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState(false);

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
      const c = res.data.counterparty;
      setPerson({ sameAsContact: Boolean(c.mobileMasked), name: c.contactName ?? "", pan: "", birthDate: "", mobile: "" });
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

  // The cost box (marker 6) is worked out here as the user ticks; "Run search" asks the server for the exact figures.
  const cost = useMemo(() => {
    let price = 0;
    let gst = 0;
    const lines = selected.map((code) => {
      const c = byCode.get(code)!;
      price += c.pricePaise ?? 0;
      gst += c.gstPaise ?? 0;
      return { code, name: c.name, label: inr(c.pricePaise ?? 0) };
    });
    return { lines, price, gst, total: price + gst, consent: selected.filter((c) => byCode.get(c)?.consent).length };
  }, [selected, byCode]);

  const personBody = () =>
    needsPerson
      ? { sameAsContact: person.sameAsContact, name: person.name, pan: person.pan, birthDate: person.birthDate, mobile: person.sameAsContact ? undefined : person.mobile }
      : undefined;
  const choiceKey = JSON.stringify([buyer, selected, mode, needsPerson ? person : null]);
  const quote = quoted?.key === choiceKey ? quoted.quote : null;
  const asking = Boolean(quote?.consent?.subjects.some((s) => !s.reuse));
  const blocked = (q: Quote) =>
    (!q.enough && mode === "together") ||
    Boolean(q.consent?.subjects.some((s) => s.limitReached)) ||
    Boolean(q.consent?.subjects.some((s) => !s.reuse) && !CONSENT_CHANNELS.some((c) => channels[c]));

  /**
   * v4 section 8: one button. It gets the exact price from the server and starts at once, with the cancel bar below;
   * only when the buyer or a person must say yes, or the wallet is short, does it stop to show that first, in the page.
   */
  async function runSearch() {
    if (!buyer || !selected.length || busy) return;
    if (quote) return void run(quote, quoted!.runKey);
    setBusy(true);
    setPersonErrors({});
    const res = await api<Quote>("/api/v1/checks/quote", { body: { counterpartyId: buyer, items: selected, person: personBody() } });
    if (!res.ok) {
      setBusy(false);
      if (res.error.fields) setPersonErrors(res.error.fields);
      return toast(res.error.message, "danger");
    }
    const q = res.data;
    const fresh = { key: choiceKey, quote: q, runKey: newIdempotencyKey() };
    setQuoted(fresh);
    setChannels((c) => ({ ...c, email: c.email && Boolean(q.consent?.emailMasked) }));
    const needsLook = q.consent?.subjects.some((s) => !s.reuse || s.limitReached || s.declinedAt) || (!q.enough && mode === "together");
    if (needsLook) {
      setBusy(false);
      requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
      return;
    }
    await run(q, fresh.runKey);
  }

  async function run(q: Quote, runKey: string) {
    if (!buyer || blocked(q)) return;
    setBusy(true);
    const consent = q.consent?.subjects.some((s) => !s.reuse) ? { purpose, channels: CONSENT_CHANNELS.filter((c) => channels[c]) } : undefined;
    const res = await api<{ id: string; cancelWindowSeconds: number }>("/api/v1/checks/requests", {
      body: { quoteId: q.quoteId, counterpartyId: buyer, items: selected, mode, consent, person: personBody() },
      idempotencyKey: runKey,
    });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    setPending({ id: res.data.id, seconds: res.data.cancelWindowSeconds, quote: q });
  }

  async function cancelPending() {
    if (!pending) return;
    const res = await api(`/api/v1/checks/requests/${pending.id}/cancel`, { body: {} });
    if (!res.ok) return toast(res.error.message, "danger");
    toast(t("cancelledNothing"), "success");
    setPending(null);
    setQuoted(null);
  }

  function startedPending() {
    if (!pending) return;
    const q = pending.quote;
    toast(q.sample ? t("sampleStarted") : mode === "manual" ? t("startedManual") : t("held", { amount: inr(q.walletPaise) }), "success");
    router.push(`/reports/${pending.id}`);
  }

  // Before a company is chosen: the start page with the search and the example report (no catalogue to show yet).
  if (!buyer) return <CwStart companies={buyers} recent={recent} onPick={choose} />;

  const turnoverCy = byCode.get("CW_GST_TURNOVER_CY");
  const turnover4y = byCode.get("CW_GST_TURNOVER_4Y");
  const cibilCo = byCode.get("CW_CIBIL_COMPANY");
  const cibilPe = byCode.get("CW_CIBIL_PERSONAL");
  const turnoverDisabled = turnover4y?.disabled && turnoverCy?.disabled ? turnover4y.disabled : null;
  const cibilDisabled = cibilPe?.disabled && cibilCo?.disabled ? cibilPe.disabled : null;
  const ready = catalogue?.counterparty.id === buyer;
  const runLabel = asking ? t("askAndRun") : selected.length ? t("runSearchAmount", { amount: inr(cost.total) }) : t("runSearch");
  const companyOk = !cibilCo?.disabled;
  const recentHit = catalogue?.checks.find((c) => c.recent)?.recent ?? null;

  /** What a package ticks for this company: its checks that can run here, turnover for 4 years, CIBIL of the company. */
  const packageCodes = (k: PackageKey): CwCode[] => {
    const codes: CwCode[] = [];
    for (const item of PACKAGES[k]) {
      if (item === "turnover") {
        if (!turnover4y?.disabled && turnover4y) codes.push("CW_GST_TURNOVER_4Y");
        else if (!turnoverCy?.disabled && turnoverCy) codes.push("CW_GST_TURNOVER_CY");
      } else if (item === "cibil") {
        if (cibilCo && !cibilCo.disabled) codes.push("CW_CIBIL_COMPANY");
        else if (cibilPe && !cibilPe.disabled) codes.push("CW_CIBIL_PERSONAL");
      } else if (byCode.get(item) && !byCode.get(item)!.disabled) codes.push(item);
    }
    return codes;
  };
  const priceOf = (codes: CwCode[]) => codes.reduce((sum, c) => sum + (byCode.get(c)?.pricePaise ?? 0) + (byCode.get(c)?.gstPaise ?? 0), 0);
  const same = (x: CwCode[], y: CwCode[]) => x.length === y.length && [...x].sort().join() === [...y].sort().join();
  const activePackage = (Object.keys(PACKAGES) as PackageKey[]).find((k) => same(packageCodes(k), selected)) ?? null;

  function applyPackage(k: PackageKey) {
    const codes = packageCodes(k);
    setPicked(Object.fromEntries(codes.filter((c) => !c.startsWith("CW_GST_TURNOVER") && !c.startsWith("CW_CIBIL")).map((c) => [c, true])));
    setTurnoverOn(codes.some((c) => c.startsWith("CW_GST_TURNOVER")));
    setPeriod(codes.includes("CW_GST_TURNOVER_CY") ? "cy" : "4y");
    setCibilOn(codes.some((c) => c.startsWith("CW_CIBIL")));
    setCibilSubject(companyOk ? "company" : "personal");
  }

  /** One check as a one-tap chip: icon, name and price; off and greyed when it cannot run for this company. */
  const chip = (key: string, label: string, price: number | null, on: boolean, off: string | null, toggle: (v: boolean) => void, consent?: boolean) => {
    const Icon = CHIP_ICON[key] ?? Sparkles;
    return (
      <button
        key={key}
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-label={label}
        disabled={Boolean(off) || Boolean(pending)}
        title={off ? t(`disabled.${off}`) : t(`desc.${key === "turnover" ? "turnover" : key === "cibil" ? "cibil" : key}`)}
        onClick={() => toggle(!on)}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow,scale] duration-150 active:scale-[0.98]",
          off ? "cursor-not-allowed border-dashed border-border bg-surface-muted opacity-60" : on ? "border-primary/60 bg-primary-softer shadow-[0_0_0_3px_var(--primary-soft)]" : "border-border bg-surface hover:border-border-strong",
        )}
      >
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors", on ? "bg-brand text-white" : "bg-surface-strong text-muted")} aria-hidden="true">
          {on ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-text">{label}</span>
          <span className="block truncate text-[11.5px] text-subtle">
            {off ? t(`disabledShort.${off}`) : consent ? t("pkg.otp") : t("publicRecord")}
          </span>
        </span>
        <span className={cn("shrink-0 text-[13px] font-bold tabular-nums", on ? "text-primary-text" : "text-text-2")}>{price === null ? "—" : inrShort(price)}</span>
      </button>
    );
  };
  const plain = (code: CwCode) => {
    const c = byCode.get(code);
    if (!c) return null;
    return chip(code, c.name, c.pricePaise, Boolean(picked[code]), c.disabled ?? null, (v) => setPicked((p) => ({ ...p, [code]: v })));
  };

  return (
    <div className="space-y-5 pb-28 lg:pb-0">
      <PageHeader
        title={<>{t("titleLead")} <GradientText>{t("titleAccent")}</GradientText></>}
        description={t("subtitleShort")}
      />

      <Card>
        <CardBody className="space-y-2.5">
          <label htmlFor="buyer" className="sr-only">{t("search.label")}</label>
          <CompanySearch companies={buyers} value={buyer} onChange={pending ? () => undefined : choose} />
          {catalogue?.counterparty.id === buyer && !catalogue.counterparty.mobileMasked ? (
            <p className="flex items-start gap-2 rounded-xl bg-info-bg px-3 py-2 text-xs text-info-fg">
              <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
              <span>{t.rich("needsContactShort", { link: (c) => <Link href={`/counterparties/${buyer}`} className="font-semibold underline">{c}</Link> })}</span>
            </p>
          ) : null}
          {recentHit ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              <History size={14} aria-hidden="true" />
              {t("recentShort", { date: formatDate(istDate(new Date(recentHit.at))) })}
              <Link href={`/reports/${recentHit.requestId}`} className="font-semibold text-primary-text hover:underline">{t("openResult")}</Link>
            </p>
          ) : null}
        </CardBody>
      </Card>

      {buyer && !ready ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]" aria-hidden="true">
          <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-52" /><Skeleton className="h-52" /><Skeleton className="h-52" /></div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {buyer && ready ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <fieldset disabled={Boolean(pending)} className="min-w-0 space-y-4">
            <legend className="sr-only">{t("pkg.title")}</legend>
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-head text-lg font-bold text-text">{t("pkg.title")}</h2>
              <button type="button" onClick={() => setCustom((v) => !v)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-text hover:underline" aria-expanded={custom}>
                <SlidersHorizontal size={14} aria-hidden="true" /> {custom ? t("pkg.hideCustom") : t("pkg.customise")}
              </button>
            </div>
            <Carousel label={t("pkg.title")} slide="basis-[82%] sm:basis-[calc((100%-1.5rem)/3)]" controls="dots">
              {(Object.keys(PACKAGES) as PackageKey[]).map((k) => {
                const codes = packageCodes(k);
                const on = activePackage === k;
                const missing = PACKAGES[k].length - codes.length;
                const needsYes = codes.some((c) => byCode.get(c)?.consent);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => applyPackage(k)}
                    className={cn(
                      "relative flex h-full w-full flex-col rounded-2xl border p-4 text-left transition-[border-color,box-shadow,translate,background-color] duration-200 hover:-translate-y-0.5",
                      on ? "border-transparent bg-surface shadow-[0_0_0_2px_var(--primary),0_14px_32px_-14px_rgb(252_106_16/0.55)]" : "border-border bg-surface shadow-sm hover:border-primary-line hover:shadow-md",
                    )}
                  >
                    {k === "standard" ? <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white shadow-orange">{t("pkg.popular")}</span> : null}
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("flex size-9 items-center justify-center rounded-xl", on ? "bg-brand text-white" : "bg-soft text-primary-text")} aria-hidden="true">
                        {k === "quick" ? <Zap size={17} /> : k === "standard" ? <ShieldCheck size={17} /> : <Crown size={17} />}
                      </span>
                      <span className={cn("flex size-5 items-center justify-center rounded-full border-2", on ? "border-primary bg-primary text-white" : "border-border-strong")} aria-hidden="true">
                        {on ? <Check size={12} strokeWidth={3.5} /> : null}
                      </span>
                    </span>
                    <span className="mt-3 font-head text-base font-extrabold text-text">{t(`pkg.${k}.name`)}</span>
                    <span className="mt-0.5 text-[12.5px] leading-snug text-muted">{t(`pkg.${k}.line`)}</span>
                    <span className="mt-3 flex flex-wrap gap-1">
                      {codes.map((c) => (
                        <span key={c} className="rounded-md bg-surface-strong px-1.5 py-0.5 text-[10.5px] font-semibold text-text-2">{shortName(t, c)}</span>
                      ))}
                    </span>
                    <span className="mt-auto flex items-end justify-between gap-2 pt-4">
                      <span className="font-head text-2xl font-extrabold tracking-tight text-gradient">{inrShort(priceOf(codes))}</span>
                      <span className="text-right text-[11px] leading-tight text-subtle">
                        {t("pkg.count", { count: codes.length })}
                        {needsYes ? <span className="block font-semibold text-info-fg">{t("pkg.otp")}</span> : null}
                        {missing > 0 ? <span className="block">{t("pkg.missing", { count: missing })}</span> : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </Carousel>

            {custom || !activePackage ? (
              <Card className="animate-[cb-fade-up_0.25s_ease-out_both]">
                <CardHeader title={t("pkg.customTitle")} action={<span className="text-xs text-subtle">{t("pkg.tapToToggle")}</span>} />
                <CardBody className="space-y-5">
                  {CHIP_GROUPS.map((g) => (
                    <div key={g.key} className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{t(g.key)}</p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {g.items.map((item) =>
                          item === "turnover" ? (
                            chip("turnover", t("turnoverTitle"), (period === "cy" ? turnoverCy : turnover4y)?.pricePaise ?? null, turnoverOn, turnoverDisabled ?? null, setTurnoverOn, true)
                          ) : item === "cibil" ? (
                            chip("cibil", t("cibilTitle"), cibilPe?.pricePaise ?? null, cibilOn, cibilDisabled ?? null, setCibilOn, true)
                          ) : (
                            plain(item)
                          ),
                        )}
                      </div>
                      {g.items.includes("turnover") && turnoverOn ? (
                        <RadioPills
                          name="turnover"
                          label={t("turnoverPeriod")}
                          value={period}
                          onChange={setPeriod}
                          items={(["4y", "cy"] as const).filter((v) => !(v === "cy" ? turnoverCy : turnover4y)?.disabled).map((v) => ({ key: v, label: v === "cy" ? t("turnoverCy") : t("turnover4y") }))}
                        />
                      ) : null}
                      {g.items.includes("cibil") && cibilOn ? (
                        <div className="space-y-3">
                          <RadioPills
                            name="cibil"
                            label={t("cibilWhose")}
                            value={cibilSubject}
                            onChange={setCibilSubject}
                            items={(["company", "personal", "both"] as const)
                              .filter((v) => !((v !== "personal" && cibilCo?.disabled) || (v !== "company" && cibilPe?.disabled)))
                              .map((v) => ({ key: v, label: v === "company" ? t("cibilCompany") : v === "personal" ? t("cibilPersonal") : t("cibilBoth") }))}
                          />
                          {cibilSubject !== "company" ? <PersonForm person={person} onChange={setPerson} errors={personErrors} contact={catalogue.counterparty} /> : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </CardBody>
              </Card>
            ) : null}
            {!custom && activePackage && needsPerson ? <PersonForm person={person} onChange={setPerson} errors={personErrors} contact={catalogue.counterparty} /> : null}
          </fieldset>

          <aside className="space-y-3 lg:sticky lg:top-[5rem] lg:self-start">
            <Card className="overflow-hidden">
              <div className="bg-soft px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{t("total")}</p>
                <p className="mt-1 font-head text-[2rem] font-extrabold leading-none tracking-tight text-gradient">{inr(cost.total)}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {selected.length ? t("totalLine", { count: selected.length, gst: inr(cost.gst) }) : t("costEmpty")}
                </p>
              </div>
              <CardBody className="space-y-3 text-sm">
                {cost.lines.length ? (
                  <details className="group text-xs">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-text-2">
                      {t("seeBreakup")} <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {cost.lines.map((l) => (
                        <li key={l.code} className="flex justify-between gap-3">
                          <span className="text-muted">{l.name}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-text">{l.label}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                <fieldset disabled={Boolean(pending)}>
                  <legend className="sr-only">{t("howRun")}</legend>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-strong p-1 text-xs">
                    {(["together", "manual"] as const).map((m) => (
                      <label
                        key={m}
                        className={cn(
                          "relative flex h-8 cursor-pointer items-center justify-center rounded-lg px-2 text-center font-semibold transition-[background-color,color,box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                          mode === m ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
                        )}
                      >
                        <input type="radio" name="mode" className="absolute inset-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0" checked={mode === m} onChange={() => setMode(m)} />
                        {m === "together" ? t("runTogetherShort") : t("runManualShort")}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div ref={reviewRef} className="space-y-3 scroll-mt-24">
                  {quote && !pending ? <CostSummary quote={quote} later={mode === "manual"} /> : null}
                  {quote?.consent && !pending ? (
                    <ConsentBlock
                      consent={quote.consent}
                      buyerName={catalogue.counterparty.name}
                      purpose={purpose}
                      onPurpose={setPurpose}
                      channels={channels}
                      onChannels={setChannels}
                      names={new Map(quote.lines.map((l) => [l.code, l.name]))}
                    />
                  ) : null}
                  {quote?.sample && !pending ? <p className="rounded-xl bg-warning-bg px-3 py-2 text-xs font-semibold text-warning-fg">{t("sampleNote")}</p> : null}
                  {quote && !quote.enough && mode === "together" && !pending ? (
                    <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-xs font-semibold text-danger-fg">
                      {t("shortfall", { amount: inr(quote.walletPaise - quote.walletBeforePaise) })}{" "}
                      <Link href="/account/billing?topup=1" className="underline underline-offset-2">{t("addMoney")}</Link>
                    </p>
                  ) : null}
                </div>

                {pending ? (
                  <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[var(--nav-bg)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                    <CancelWindow inline seconds={pending.seconds} onCancel={cancelPending} onDone={startedPending} />
                  </div>
                ) : (
                  <>
                    <Button className="h-12 w-full text-[15px]" disabled={!selected.length || (quote ? blocked(quote) : false)} loading={busy} onClick={() => void runSearch()}>
                      <Play aria-hidden="true" /> {runLabel}
                    </Button>
                    <p className="text-center text-[11.5px] text-subtle">{t("runHintShort")}</p>
                  </>
                )}
              </CardBody>
            </Card>
            <ReportMap selected={selected} />
          </aside>
          {!pending ? (
            <MobileCostBar
              total={inr(cost.total)}
              count={selected.length}
              label={asking ? t("askAndRunShort") : t("runSearch")}
              disabled={!selected.length || (quote ? blocked(quote) : false)}
              loading={busy}
              onClick={() => void runSearch()}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** A small choice (period, whose CIBIL) as pill-shaped radio buttons: keyboard and screen-reader friendly. */
function RadioPills<K extends string>({ name, label, value, onChange, items }: { name: string; label: string; value: K; onChange: (k: K) => void; items: { key: K; label: string }[] }) {
  return (
    <fieldset className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-surface-strong p-1">
      <legend className="sr-only">{label}</legend>
      {items.map((it) => (
        <label
          key={it.key}
          className={cn(
            "relative inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-semibold transition-[background-color,color,box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            value === it.key ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
          )}
        >
          <input type="radio" name={name} className="absolute inset-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0" checked={value === it.key} onChange={() => onChange(it.key)} />
          {it.label}
        </label>
      ))}
    </fieldset>
  );
}

type PackageKey = "quick" | "standard" | "complete";
type PackageItem = CwCode | "turnover" | "cibil";
/** One-tap packages: Quick is public records only; Standard adds turnover (buyer's OTP), MSME and PAN; Complete adds CIBIL, rating and trade. */
const PACKAGES: Record<PackageKey, PackageItem[]> = {
  quick: ["CW_GST_SEARCH", "CW_COMPANY", "CW_DIRECTORS"],
  standard: ["CW_GST_SEARCH", "CW_COMPANY", "CW_DIRECTORS", "turnover", "CW_MSME", "CW_PAN"],
  complete: ["CW_GST_SEARCH", "CW_COMPANY", "CW_DIRECTORS", "turnover", "CW_MSME", "CW_PAN", "cibil", "CW_CREDIT_RATING", "CW_IEC_PROFILE", "CW_IEC_TURNOVER"],
};
const CHIP_GROUPS: { key: string; items: PackageItem[] }[] = [
  { key: "groupGst", items: ["CW_GST_SEARCH", "turnover"] },
  { key: "groupCompany", items: ["CW_COMPANY", "CW_DIRECTORS", "CW_CREDIT_RATING"] },
  { key: "groupCibil", items: ["cibil"] },
  { key: "groupIdentity", items: ["CW_MSME", "CW_PAN", "CW_IEC_PROFILE", "CW_IEC_TURNOVER"] },
];
const CHIP_ICON: Record<string, LucideIcon> = {
  CW_GST_SEARCH: ReceiptText, turnover: TrendingUp, cibil: Landmark, CW_MSME: Factory, CW_PAN: IdCard,
  CW_IEC_PROFILE: Ship, CW_IEC_TURNOVER: Globe, CW_COMPANY: Building2, CW_DIRECTORS: Users, CW_CREDIT_RATING: Star,
};
const inrShort = (paise: number) => formatInr(BigInt(Math.round(paise)));
/** Short chip label for a check inside a package card. */
const shortName = (t: ReturnType<typeof useTranslations>, code: CwCode) => t(`short.${code}`);

const MAP: { key: string; codes: CwCode[] }[] = [
  { key: "sectionGst", codes: ["CW_GST_SEARCH"] },
  { key: "sectionTurnover", codes: ["CW_GST_TURNOVER_4Y", "CW_GST_TURNOVER_CY"] },
  { key: "sectionCibil", codes: ["CW_CIBIL_COMPANY", "CW_CIBIL_PERSONAL"] },
  { key: "sectionIdentity", codes: ["CW_MSME", "CW_PAN", "CW_IEC_PROFILE", "CW_IEC_TURNOVER"] },
  { key: "sectionCompany", codes: ["CW_COMPANY", "CW_DIRECTORS"] },
  { key: "sectionRating", codes: ["CW_CREDIT_RATING"] },
];

/** Which report sections the ticked checks fill, so the user knows what they will get. */
function ReportMap({ selected }: { selected: CwCode[] }) {
  const t = useTranslations("checks");
  const tr = useTranslations("report");
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-[1px] text-subtle">{t("reportWillHave")}</p>
      <ul className="mt-3 space-y-1.5 text-xs">
        <li className="flex items-center gap-2 text-text"><Check size={13} className="text-success-fg" aria-hidden="true" />{t("mapRisk")}</li>
        {MAP.map((m) => {
          const on = m.codes.some((c) => selected.includes(c));
          return (
            <li key={m.key} className={cn("flex items-center gap-2", on ? "text-text" : "text-subtle")}>
              {on ? <Check size={13} className="text-success-fg" aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
              {tr(m.key)}
              {on ? null : <span className="sr-only">{t("mapNotTicked")}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Figure 5 rows, shared by the cost panel and the one-by-one run on the report. */
export function CostSummary({ quote, later }: { quote: Quote; later?: boolean }) {
  const t = useTranslations("checks");
  return (
    <dl className="divide-y divide-border rounded-lg border border-border text-xs">
      {quote.lines.map((l) => (
        <div key={l.code} className="flex justify-between gap-3 px-3 py-2">
          <dt className="text-text-2">{l.name}</dt>
          <dd className="text-right tabular-nums">{inr(l.pricePaise)} <span className="text-subtle">+ {inr(l.gstPaise)} GST</span></dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 px-3 py-2">
        <dt className="font-medium text-text">{later ? t("deductAsYouRun") : t("deductNow")}</dt>
        <dd className="text-right font-semibold tabular-nums">{inr(quote.walletPaise)}</dd>
      </div>
      <div className="flex justify-between gap-3 px-3 py-2">
        <dt className="text-muted">{t("walletNow")}</dt>
        <dd className="tabular-nums">{inr(quote.walletBeforePaise)}</dd>
      </div>
      <div className="flex justify-between gap-3 px-3 py-2">
        <dt className="text-muted">{t("walletAfter")}</dt>
        <dd className={cn("font-semibold tabular-nums", quote.walletAfterPaise < 0 && "text-danger-fg")}>{inr(quote.walletAfterPaise)}</dd>
      </div>
    </dl>
  );
}

/** v3 6.5 marker 3: personal CIBIL opens a small form for the person. */
function PersonForm({
  person, onChange, errors, contact,
}: { person: Person; onChange: (p: Person) => void; errors: Record<string, string>; contact: Catalogue["counterparty"] }) {
  const t = useTranslations("checks.person");
  const set = (patch: Partial<Person>) => onChange({ ...person, ...patch });
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-3.5">
      <p className="text-sm font-medium text-text">{t("title")}</p>
      {contact.mobileMasked ? (
        <Checkbox
          id="person-same"
          checked={person.sameAsContact}
          onChange={(e) => set({ sameAsContact: e.target.checked, name: e.target.checked ? contact.contactName ?? "" : "" })}
          label={t("sameAsContact", { name: contact.contactName ?? "", mobile: contact.mobileMasked })}
        />
      ) : null}
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
    <div className="animate-[cb-fade-up_0.25s_ease-out_both] space-y-3 rounded-lg border border-primary-line bg-primary-softer p-3.5 text-xs">
      <p className="text-sm font-medium text-text">{t("title")}</p>
      {consent.subjects.map((s) => (
        <SubjectLine key={s.kind} s={s} items={s.scope.map((c) => names.get(c) ?? c)} />
      ))}
      {asking.length ? (
        <>
          <fieldset>
            <legend className="mb-1.5 font-medium text-text-2">{t("channels")}</legend>
            <div className="flex flex-col gap-1.5">
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
            <p className="font-medium text-text-2">{t("preview")}</p>
            <p className="mt-1 rounded-md bg-surface px-2.5 py-2 text-text-2 shadow-control">{t("previewText", { buyer: buyerName })}</p>
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
        <p className="rounded-md bg-success-bg px-2.5 py-2 font-medium text-success-fg">
          {t("reuse", { name: s.name, date: day(s.reuse.approvedAt), items: items.join(", ") })}
        </p>
      ) : (
        <p className="text-muted">{t("lead", { count: items.length, items: items.join(", "), name: s.name, mobile: s.mobileMasked })}</p>
      )}
      {s.limitReached ? (
        <p role="alert" className="rounded-md bg-danger-bg px-2.5 py-2 font-medium text-danger-fg">
          {t("limit", { name: s.name, date: s.nextAllowedAt ? day(s.nextAllowedAt) : "" })}
        </p>
      ) : null}
      {s.declinedAt ? (
        <p role="status" className="rounded-md bg-warning-bg px-2.5 py-2 font-medium text-warning-fg">
          {t("declinedRecently", { name: s.name, date: day(s.declinedAt) })}
        </p>
      ) : null}
    </div>
  );
}
