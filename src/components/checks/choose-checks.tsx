"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Card, CardBody, CardHeader, EmptyState, FormField, PageHeader, Select, Skeleton, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import type { CwCode } from "@/lib/checks";
import { CONSENT_CHANNELS, CONSENT_PURPOSES, type ConsentChannel, type ConsentPurpose } from "@/lib/consent";
import type { CatalogueEntry, Quote } from "@/server/checks/service";

// PRD v2.0 section 4.1 (Figures 4 and 5): choose checks, see the cost as you tick, confirm what will be deducted, then
// run all together or one by one.

type Turnover = "none" | "cy" | "4y";
type Cibil = "none" | "company" | "personal" | "both";

interface Catalogue {
  counterparty: { id: string; name: string; type: string };
  checks: CatalogueEntry[];
}

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

export function ChooseChecks({ buyers, initialBuyer }: { buyers: { id: string; name: string }[]; initialBuyer: string | null }) {
  const t = useTranslations("checks");
  const router = useRouter();
  const toast = useToast();
  const [buyer, setBuyer] = useState<string | null>(initialBuyer);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [turnover, setTurnover] = useState<Turnover>("none");
  const [cibil, setCibil] = useState<Cibil>("none");
  const [confirm, setConfirm] = useState(false);
  const [mode, setMode] = useState<"together" | "manual">("together");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [purpose, setPurpose] = useState<ConsentPurpose>("supply_on_credit");
  const [channels, setChannels] = useState<Record<ConsentChannel, boolean>>({ sms: true, whatsapp: true, email: false });

  useEffect(() => {
    if (!buyer) return;
    let live = true;
    void api<Catalogue>(`/api/v1/checks/catalogue?counterparty=${buyer}`).then((res) => {
      if (!live) return;
      if (!res.ok) return toast(res.error.message, "danger");
      setCatalogue(res.data);
      // Pre-tick the public checks that can run, as in Figure 4.
      setPicked(Object.fromEntries(res.data.checks.filter((c) => !c.consent && !c.disabled && c.code !== "CW_CREDIT_RATING").map((c) => [c.code, true])));
      setTurnover("none");
      setCibil("none");
    });
    return () => {
      live = false;
    };
  }, [buyer, toast]);

  const byCode = useMemo(() => new Map((catalogue?.checks ?? []).map((c) => [c.code, c])), [catalogue]);
  const selected: CwCode[] = useMemo(() => {
    const codes = Object.entries(picked).filter(([, v]) => v).map(([k]) => k as CwCode);
    if (turnover === "cy") codes.push("CW_GST_TURNOVER_CY");
    if (turnover === "4y") codes.push("CW_GST_TURNOVER");
    if (cibil === "company" || cibil === "both") codes.push("CW_CIBIL_COMPANY");
    if (cibil === "personal" || cibil === "both") codes.push("CW_CIBIL_PERSONAL");
    return codes.filter((c) => byCode.get(c) && !byCode.get(c)!.disabled);
  }, [picked, turnover, cibil, byCode]);

  // The cost box (marker 5) is worked out here as the user ticks; the popup asks the server for the exact figures.
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

  async function openConfirm() {
    if (!buyer || !selected.length) return;
    setBusy(true);
    const res = await api<Quote>("/api/v1/checks/quote", { body: { counterpartyId: buyer, items: selected } });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    setQuote(res.data);
    setChannels((c) => ({ ...c, email: c.email && Boolean(res.data.consent?.emailMasked) }));
    setConfirm(true);
  }

  async function run() {
    if (!buyer) return;
    setBusy(true);
    const askBuyer = quote?.consent && !quote.consent.reuse;
    const consent = askBuyer ? { purpose, channels: CONSENT_CHANNELS.filter((c) => channels[c]) } : undefined;
    const res = await api<{ id: string }>("/api/v1/checks", { body: { counterpartyId: buyer, items: selected, mode, consent } });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
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

  const card = (code: CwCode, title: string, desc: string, extra?: React.ReactNode) => {
    const c = byCode.get(code);
    if (!c) return null;
    const on = Boolean(picked[code]);
    return (
      <label
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
            <span className="font-bold text-text">{title}</span>
            <Tag tone="neutral">{t("publicRecord")}</Tag>
          </span>
          <span id={`${code}-desc`} className="mt-1 block text-sm text-muted">
            {desc}
          </span>
          <PriceLine entry={c} />
          {c.recent ? <RecentLine recent={c.recent} /> : null}
          {c.disabled ? <span className="mt-1 block text-xs font-semibold text-warning-fg">{t(`disabled.${c.disabled}`)}</span> : null}
          {extra}
        </span>
      </label>
    );
  };

  const turnoverCy = byCode.get("CW_GST_TURNOVER_CY");
  const turnover4y = byCode.get("CW_GST_TURNOVER");
  const cibilCo = byCode.get("CW_CIBIL_COMPANY");
  const cibilPe = byCode.get("CW_CIBIL_PERSONAL");
  const turnoverDisabled = turnover4y?.disabled ?? null;
  const cibilDisabled = cibilPe?.disabled ?? null;

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
                {card("CW_GST_SEARCH", byCode.get("CW_GST_SEARCH")!.name, t("desc.CW_GST_SEARCH"))}
                <fieldset className={cn("rounded-2xl border p-4", turnoverDisabled ? "border-border bg-surface-muted opacity-70" : turnover !== "none" ? "border-primary bg-primary-softer shadow-sm" : "border-border bg-surface")}>
                  <legend className="sr-only">{t("turnoverTitle")}</legend>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-text">{t("turnoverTitle")}</span>
                    <Tag tone="info">{t("buyerConsent")}</Tag>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{t("desc.turnover")}</span>
                  <div className="mt-3 space-y-2 text-sm">
                    {(["none", "cy", "4y"] as const).map((v) => {
                      const entry = v === "cy" ? turnoverCy : v === "4y" ? turnover4y : null;
                      const off = v !== "none" && (Boolean(turnoverDisabled) || Boolean(entry?.disabled));
                      return (
                        <label key={v} className={cn("flex items-center gap-2", off && "text-muted")}>
                          <input type="radio" name="turnover" className="accent-[var(--primary)]" checked={turnover === v} disabled={off} onChange={() => setTurnover(v)} />
                          {v === "none" ? t("notIncluded") : v === "cy" ? t("turnoverCy") : t("turnover4y")}
                          {entry ? <span className="text-xs text-muted">· {entry.pricePaise ? inr(entry.pricePaise) : t("priceNotSet")}</span> : null}
                        </label>
                      );
                    })}
                  </div>
                  {turnoverDisabled ? <span className="mt-2 block text-xs font-semibold text-warning-fg">{t(`disabled.${turnoverDisabled}`)}</span> : null}
                </fieldset>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("groupCibil")} />
              <CardBody>
                <fieldset className={cn("rounded-2xl border p-4", cibilDisabled ? "border-border bg-surface-muted opacity-70" : cibil !== "none" ? "border-primary bg-primary-softer shadow-sm" : "border-border bg-surface")}>
                  <legend className="sr-only">{t("cibilTitle")}</legend>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-text">{t("cibilTitle")}</span>
                    <Tag tone="info">{t("buyerConsent")}</Tag>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{t("desc.cibil")}</span>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {(["none", "company", "personal", "both"] as const).map((v) => {
                      const off = v !== "none" && (Boolean(cibilDisabled) || ((v === "company" || v === "both") && Boolean(cibilCo?.disabled)));
                      return (
                        <label key={v} className={cn("flex items-center gap-2", off && "text-muted")}>
                          <input type="radio" name="cibil" className="accent-[var(--primary)]" checked={cibil === v} disabled={off} onChange={() => setCibil(v)} />
                          {v === "none" ? t("notIncluded") : v === "company" ? t("cibilCompany") : v === "personal" ? t("cibilPersonal") : t("cibilBoth")}
                        </label>
                      );
                    })}
                  </div>
                  {cibilPe ? <span className="mt-2 block text-xs text-muted">{t("perReport", { price: inr(cibilPe.pricePaise ?? 0) })}</span> : null}
                  {cibilDisabled ? <span className="mt-2 block text-xs font-semibold text-warning-fg">{t(`disabled.${cibilDisabled}`)}</span> : null}
                </fieldset>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("groupCompany")} />
              <CardBody className="grid gap-3 md:grid-cols-3">
                {card("CW_COMPANY", byCode.get("CW_COMPANY")!.name, t("desc.CW_COMPANY"))}
                {card("CW_DIRECTOR", byCode.get("CW_DIRECTOR")!.name, t("desc.CW_DIRECTOR"))}
                {card("CW_CREDIT_RATING", byCode.get("CW_CREDIT_RATING")!.name, t("desc.CW_CREDIT_RATING"))}
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
                disabled={(!quote.enough && mode === "together") || Boolean(quote.consent && !quote.consent.reuse && (quote.consent.limitReached || !CONSENT_CHANNELS.some((c) => channels[c])))}
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
            <dl className="divide-y divide-border rounded-2xl border border-border">
              <div className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted">{mode === "together" ? t("deductNow") : t("deductAsYouRun")}</dt>
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
            {quote.consent ? (
              <ConsentBlock
                consent={quote.consent}
                buyerName={catalogue?.counterparty.name ?? ""}
                items={quote.lines.filter((l) => byCode.get(l.code)?.consent).map((l) => l.name)}
                purpose={purpose}
                onPurpose={setPurpose}
                channels={channels}
                onChannels={setChannels}
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

/** S09 markers 2 to 6, folded into the confirm popup in v2.0: who is asked, how, why, and the exact message. */
function ConsentBlock({
  consent, buyerName, items, purpose, onPurpose, channels, onChannels,
}: {
  consent: NonNullable<Quote["consent"]>;
  buyerName: string;
  items: string[];
  purpose: ConsentPurpose;
  onPurpose: (p: ConsentPurpose) => void;
  channels: Record<ConsentChannel, boolean>;
  onChannels: (c: Record<ConsentChannel, boolean>) => void;
}) {
  const t = useTranslations("checks.consent");
  if (consent.reuse) {
    return (
      <p className="rounded-[14px] bg-success-bg px-4 py-3 text-sm font-semibold text-success-fg">
        {t("reuse", { date: formatDate(istDate(new Date(consent.reuse.approvedAt))) })}
      </p>
    );
  }
  const recipient: Record<ConsentChannel, string | null> = { sms: consent.mobileMasked, whatsapp: consent.whatsappMasked, email: consent.emailMasked };
  const none = !CONSENT_CHANNELS.some((c) => channels[c]);
  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div>
        <p className="font-bold text-text">{t("title")}</p>
        <p className="text-sm text-muted">{t("lead", { count: items.length, items: items.join(", "), mobile: consent.mobileMasked })}</p>
      </div>
      {consent.limitReached ? (
        <p role="alert" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
          {t("limit", { date: consent.nextAllowedAt ? formatDate(istDate(new Date(consent.nextAllowedAt))) : "" })}
        </p>
      ) : null}
      {consent.declinedAt ? (
        <p role="status" className="rounded-[14px] bg-warning-bg px-4 py-3 text-sm font-semibold text-warning-fg">
          {t("declinedRecently", { date: formatDate(istDate(new Date(consent.declinedAt))) })}
        </p>
      ) : null}
      <fieldset>
        <legend className="mb-1 text-sm font-bold text-text-2">{t("channels")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {CONSENT_CHANNELS.map((c) => (
            <label key={c} className={cn("flex items-center gap-2", !recipient[c] && "text-muted")}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--primary)]"
                checked={channels[c]}
                disabled={!recipient[c]}
                onChange={(e) => onChannels({ ...channels, [c]: e.target.checked })}
              />
              {t(`channel.${c}`)} <span className="text-xs text-muted">{recipient[c] ?? t("noEmail")}</span>
            </label>
          ))}
        </div>
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
