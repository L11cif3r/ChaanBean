"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, BellRing, CalendarClock, Download, FileText, Plus, Receipt, Tags, Wallet } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, FormField, Input, ProgressBar, SectionLabel, Tag, Toggle } from "@/components/ui";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { topupSplit, TOPUP_MAX_PAISE, TOPUP_MIN_PAISE } from "@/lib/billing";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";

// PRD S19: current plan and auto-renew, wallet with top-up and low-balance alert, usage per item, ledger with a CSV
// statement, and GST invoices. Design v2: a wallet hero with the balance in the brand gradient, a plan card with a thin
// period bar, and compact tables that drop to two columns on phones.

export interface BillingData {
  plan: {
    name: string;
    status: "active" | "grace" | "expired" | "cancelled";
    startsAt: string;
    endsAt: string;
    autoRenew: boolean;
    seats: number;
    /** Display only: days in the plan period and days gone so far. */
    daysTotal: number;
    daysUsed: number;
  } | null;
  walletPaise: number;
  alertPaise: number | null;
  lowBalance: boolean;
  /** v4: one rupee price per item (the plan's price while a plan is active). */
  prices: { code: string; name: string; pricePaise: number; gstPaise: number; listPricePaise: number; planPrice: boolean }[];
  ledger: LedgerEntry[];
  invoices: { id: string; number: string; issuedAt: string; description: string; totalPaise: number }[];
}

interface LedgerEntry {
  id: string;
  at: string;
  type: "hold" | "commit" | "reverse" | "topup" | "adjust";
  source: "plan" | "wallet";
  itemName: string | null;
  amountPaise: number;
  balanceAfterPaise: number | null;
  note?: string | null;
}

const inr = (paise: number, withPaise = true) => formatInr(BigInt(paise), { withPaise });
const day = (iso: string) => formatDate(istDate(new Date(iso)));

export function BillingManager({ data, openTopup }: { data: BillingData; openTopup: boolean }) {
  const t = useTranslations("billing.page");
  const toast = useToast();
  const router = useRouter();
  const [topupOpen, setTopupOpen] = useState(openTopup);
  const [autoRenew, setAutoRenew] = useState(data.plan?.autoRenew ?? false);
  const [alert, setAlert] = useState(data.alertPaise === null ? "" : String(data.alertPaise / 100));
  const [alertError, setAlertError] = useState<string | null>(null);
  const [savingAlert, setSavingAlert] = useState(false);
  const [entries, setEntries] = useState(data.ledger);
  const [range, setRange] = useState({ from: "", to: "" });

  async function saveAutoRenew(next: boolean) {
    setAutoRenew(next);
    const res = await api("/api/v1/billing/settings", { method: "PATCH", body: { autoRenew: next } });
    if (!res.ok) {
      setAutoRenew(!next);
      return toast(res.error.message, "danger");
    }
    toast(next ? t("autoRenewOn") : t("autoRenewOff", { date: data.plan ? day(data.plan.endsAt) : "" }), "success");
    router.refresh();
  }

  async function saveAlert() {
    const value = alert.trim() === "" ? null : Number(alert);
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 100_000)) return setAlertError(t("alertInvalid"));
    setAlertError(null);
    setSavingAlert(true);
    const res = await api("/api/v1/billing/settings", { method: "PATCH", body: { alertAmount: value } });
    setSavingAlert(false);
    if (!res.ok) return setAlertError(res.error.fields?.alertAmount ?? res.error.message);
    toast(t("saved"), "success");
    router.refresh();
  }

  async function loadLedger() {
    const q = new URLSearchParams();
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    const res = await api<{ entries: LedgerEntry[] }>(`/api/v1/billing/ledger?${q}`);
    if (!res.ok) return toast(res.error.fields?.from ?? res.error.message, "danger");
    setEntries(res.data.entries);
  }

  const csvHref = `/api/v1/billing/ledger?${new URLSearchParams({ format: "csv", ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) })}`;

  const entryLabel = (e: LedgerEntry) => {
    const item = e.itemName ?? "";
    if (e.type === "hold") return t("entryHold", { item });
    if (e.type === "commit") return t("entryCommit", { item });
    if (e.type === "reverse") return t("entryReverse", { item });
    // v4 3.1: a plan payment is credited to the wallet as a top-up; its note names the plan.
    if (e.type === "topup") return e.note ?? t("entryTopup");
    return t("entryAdjust");
  };

  const ledgerColumns: Column<LedgerEntry>[] = [
    { key: "at", header: t("colDate"), label: t("colDate"), render: (e) => <span className="whitespace-nowrap text-[13px] text-muted">{formatDateTimeIst(new Date(e.at))}</span>, hideOnMobile: true },
    {
      key: "entry", header: t("colEntry"), label: t("colEntry"),
      render: (e) => (
        <div className="flex items-center gap-3">
          <span
            className={e.amountPaise > 0 ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-bg text-success-fg" : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-strong text-muted"}
            aria-hidden="true"
          >
            {e.amountPaise > 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text">{entryLabel(e)}</p>
            <p className="text-xs text-muted md:hidden">{formatDateTimeIst(new Date(e.at))}</p>
          </div>
          {/* Phones: one signed amount instead of the Debit and Credit columns. */}
          {e.amountPaise !== 0 ? (
            <span className={e.amountPaise > 0 ? "shrink-0 font-semibold tabular-nums text-success-fg md:hidden" : "shrink-0 font-semibold tabular-nums text-text md:hidden"}>
              {e.amountPaise > 0 ? "+" : "−"}
              {inr(Math.abs(e.amountPaise))}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: "debit", header: t("colDebit"), label: t("colDebit"), align: "right", hideOnMobile: true, render: (e) => (e.amountPaise < 0 ? <span className="tabular-nums">{inr(-e.amountPaise)}</span> : null) },
    { key: "credit", header: t("colCredit"), label: t("colCredit"), align: "right", hideOnMobile: true, render: (e) => (e.amountPaise > 0 ? <span className="tabular-nums text-success-fg">{inr(e.amountPaise)}</span> : null) },
    { key: "balance", header: t("colBalance"), label: t("colBalance"), align: "right", hideOnMobile: true, render: (e) => (e.balanceAfterPaise === null ? null : <span className="tabular-nums text-muted">{inr(e.balanceAfterPaise)}</span>) },
  ];

  const priceColumns: Column<BillingData["prices"][number]>[] = [
    {
      key: "item", header: t("colItem"), label: t("colItem"), sortValue: (u) => u.name,
      render: (u) => (
        <div className="min-w-0">
          <span className="font-medium text-text">{u.name}</span>
          {u.planPrice ? <Tag tone="info" className="ml-2 align-middle">{t("planPriceTag")}</Tag> : null}
          <p className="mt-0.5 text-xs text-muted md:hidden">{t("priceGst", { price: inr(u.pricePaise) })}</p>
        </div>
      ),
    },
    {
      key: "price", header: t("colPrice"), label: t("colPrice"), align: "right", hideOnMobile: true, sortValue: (u) => u.pricePaise,
      render: (u) => (
        <span className="whitespace-nowrap tabular-nums">
          {inr(u.pricePaise)}
          {u.planPrice && u.listPricePaise !== u.pricePaise ? <span className="ml-1.5 text-xs text-muted line-through">{inr(u.listPricePaise)}</span> : null}
        </span>
      ),
    },
    { key: "gst", header: t("colGst"), label: t("colGst"), align: "right", render: (u) => <span className="tabular-nums text-muted">{inr(u.gstPaise)}</span>, sortValue: (u) => u.gstPaise, hideOnMobile: true },
    { key: "total", header: t("colTotal"), label: t("colTotal"), align: "right", render: (u) => <span className="whitespace-nowrap font-bold tabular-nums">{inr(u.pricePaise + u.gstPaise)}</span>, sortValue: (u) => u.pricePaise + u.gstPaise },
  ];

  const invoiceColumns: Column<BillingData["invoices"][number]>[] = [
    {
      key: "number", header: t("colNumber"), label: t("colNumber"),
      render: (i) => (
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-soft text-primary-text" aria-hidden="true">
            <FileText size={15} />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-text">{i.description}</p>
            <p className="text-xs text-muted">
              <span className="font-mono">{i.number}</span>
              <span className="md:hidden"> · {day(i.issuedAt)}</span>
            </p>
          </div>
        </div>
      ),
    },
    { key: "date", header: t("colDate"), label: t("colDate"), render: (i) => <span className="whitespace-nowrap text-[13px] text-muted">{day(i.issuedAt)}</span>, hideOnMobile: true },
    { key: "amount", header: t("colAmount"), label: t("colAmount"), align: "right", render: (i) => <span className="whitespace-nowrap font-semibold tabular-nums">{inr(i.totalPaise)}</span> },
    {
      key: "view", header: "", label: t("view"), align: "right",
      render: (i) => (
        <a href={`/api/v1/billing/invoices/${i.id}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center text-[13px] font-bold text-primary-text hover:underline">
          {t("view")}
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Wallet hero */}
        <section aria-labelledby="wallet-title" className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
          <span className="pointer-events-none absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.22),transparent_65%)] blur-2xl" aria-hidden="true" />
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-orange" aria-hidden="true">
                  <Wallet size={17} />
                </span>
                <h2 id="wallet-title" className="font-head text-[15px] font-bold text-text">{t("wallet")}</h2>
              </div>
              {data.lowBalance ? <Tag tone="warning">{t("lowTag")}</Tag> : null}
            </div>
            <SectionLabel className="mt-5">{t("balance")}</SectionLabel>
            <p className="text-gradient mt-2 font-head text-[2.4rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-[2.75rem]">{inr(data.walletPaise)}</p>
            {data.lowBalance ? (
              <p role="status" className="mt-2 text-sm font-semibold text-warning-fg">
                {t("lowBalance")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">{t("walletNote")}</p>
            )}
            <Button className="mt-5 w-full sm:w-auto" icon={<Plus />} onClick={() => setTopupOpen(true)}>
              {t("addMoney")}
            </Button>
          </div>
          <form
            className="border-t border-border bg-surface/70 px-4 py-3.5 backdrop-blur sm:px-5"
            onSubmit={(e) => {
              e.preventDefault();
              void saveAlert();
            }}
          >
            <div className="flex items-end gap-2">
              <FormField id="alert-amount" label={<span className="inline-flex items-center gap-1.5"><BellRing size={14} className="text-primary-text" aria-hidden="true" />{t("alert")}</span>} className="min-w-0 flex-1">
                <Input
                  id="alert-amount"
                  inputMode="numeric"
                  value={alert}
                  hint={t("alertHint")}
                  error={alertError ?? undefined}
                  onChange={(e) => {
                    setAlert(e.target.value.replace(/\D/g, ""));
                    setAlertError(null);
                  }}
                />
              </FormField>
              <Button type="submit" variant="secondary" className="h-11" loading={savingAlert} disabled={savingAlert}>
                {t("save")}
              </Button>
            </div>
            {alertError ? (
              <p id="alert-amount-error" className="mt-1.5 text-xs font-medium text-danger-fg">
                {alertError}
              </p>
            ) : null}
            <p id="alert-amount-hint" className="mt-1.5 text-xs text-muted">{t("alertHint")}</p>
          </form>
        </section>

        {/* Plan */}
        <Card className="flex flex-col">
          <CardHeader
            title={t("currentPlan")}
            action={data.plan ? <Tag tone={data.plan.status === "active" ? "success" : "warning"}>{data.plan.status === "active" ? t("statusActive") : t("statusGrace")}</Tag> : null}
          />
          <CardBody className="flex flex-1 flex-col gap-4">
            {data.plan ? (
              <>
                <div>
                  <p className="font-head text-2xl font-extrabold tracking-tight text-text">{data.plan.name}</p>
                  <p className="mt-1 text-sm text-text-2">
                    {t("planWallet")} · {t("users", { count: data.plan.seats })}
                  </p>
                </div>
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
                    <CalendarClock size={13} aria-hidden="true" />
                    {t("period", { start: day(data.plan.startsAt), end: day(data.plan.endsAt) })}
                  </p>
                  <ProgressBar label={t("daysUsed")} value={data.plan.daysUsed} max={data.plan.daysTotal} />
                </div>
                <Toggle id="auto-renew" label={t("autoRenew")} checked={autoRenew} onChange={(e) => void saveAutoRenew(e.target.checked)} />
                <div className="mt-auto">
                  <ButtonLink href="/account/plan/change" variant="secondary" size="sm">
                    {t("changePlan")}
                  </ButtonLink>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="font-head text-2xl font-extrabold tracking-tight text-text">{t("payPerUse")}</p>
                  <p className="mt-1 text-sm text-muted">{t("payPerUseBody")}</p>
                </div>
                <div className="mt-auto">
                  <ButtonLink href="/account/plan/change" size="sm">
                    {t("choosePlan")}
                  </ButtonLink>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={<TitleWithIcon icon={<Tags size={15} />}>{t("usageTitle")}</TitleWithIcon>} />
        <DataTable columns={priceColumns} rows={data.prices} rowKey={(u) => u.code} initialPageSize={25} />
      </Card>

      <Card>
        <CardHeader
          title={<TitleWithIcon icon={<Receipt size={15} />}>{t("ledgerTitle")}</TitleWithIcon>}
          action={
            <a href={csvHref} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-bold text-primary-text hover:bg-hover" download>
              <Download size={14} aria-hidden="true" />
              {t("downloadCsv")}
            </a>
          }
        />
        <form
          className="grid grid-cols-2 items-end gap-2 border-b border-border px-4 py-3 sm:flex sm:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            void loadLedger();
          }}
        >
          <FormField id="ledger-from" label={t("from")} className="sm:w-44">
            <Input id="ledger-from" type="date" className="h-10" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </FormField>
          <FormField id="ledger-to" label={t("to")} className="sm:w-44">
            <Input id="ledger-to" type="date" className="h-10" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </FormField>
          <Button type="submit" variant="secondary" className="col-span-2 h-10 sm:col-span-1">
            {t("show")}
          </Button>
        </form>
        <DataTable columns={ledgerColumns} rows={entries} rowKey={(e) => e.id} empty={<EmptyLine>{t("noLedger")}</EmptyLine>} initialPageSize={10} />
      </Card>

      <Card>
        <CardHeader title={<TitleWithIcon icon={<FileText size={15} />}>{t("invoicesTitle")}</TitleWithIcon>} />
        <DataTable columns={invoiceColumns} rows={data.invoices} rowKey={(i) => i.id} empty={<EmptyLine>{t("noInvoices")}</EmptyLine>} />
      </Card>

      <TopupDialog open={topupOpen} onClose={() => setTopupOpen(false)} />
    </div>
  );
}

function TitleWithIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-lg bg-soft text-primary-text" aria-hidden="true">
        {icon}
      </span>
      <span className="font-head">{children}</span>
    </span>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">{children}</p>;
}

function TopupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("billing.page");
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rupees = amount ? BigInt(amount) : 0n;
  const paise = rupees * 100n;
  const valid = paise >= TOPUP_MIN_PAISE && paise <= TOPUP_MAX_PAISE;
  const split = valid ? topupSplit(paise) : null;

  async function pay() {
    if (!valid) return setError(t("topupInvalid"));
    setError(null);
    setBusy(true);
    const res = await api<{ checkoutUrl: string }>("/api/v1/billing/checkout", { body: { purpose: "topup", amount: Number(rupees), returnTo: "billing" } });
    if (!res.ok) {
      setBusy(false);
      if (res.error.fields?.amount) return setError(res.error.fields.amount);
      return toast(res.error.message, "danger");
    }
    window.location.assign(res.data.checkoutUrl);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("topupTitle")}
      footer={
        <Button onClick={() => void pay()} loading={busy} disabled={busy}>
          {t("continueToPay")}
        </Button>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void pay();
        }}
      >
        <FormField id="topup-amount" label={t("topupAmount")} hint={t("topupHint")} error={error ?? undefined} required>
          <Input
            id="topup-amount"
            inputMode="numeric"
            className="h-12 text-lg font-semibold tabular-nums"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, "").slice(0, 7));
              setError(null);
            }}
            invalid={!!error}
            autoFocus
          />
        </FormField>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("quickAmounts")}>
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={amount === String(a)}
              onClick={() => {
                setAmount(String(a));
                setError(null);
              }}
              className={
                amount === String(a)
                  ? "h-9 rounded-lg border border-primary bg-primary-softer px-3 text-[13px] font-semibold text-primary-text"
                  : "h-9 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold text-text-2 hover:border-primary-line"
              }
            >
              {formatInr(BigInt(a) * 100n)}
            </button>
          ))}
        </div>
        {split ? <p className="text-xs text-muted">{t("topupGst", { gst: formatInr(split.gst, { withPaise: true }), taxable: formatInr(split.taxable, { withPaise: true }) })}</p> : null}
      </form>
    </Dialog>
  );
}

/** Shortcut chips in the top-up dialog. They only fill the amount field; the same checks apply. */
const QUICK_AMOUNTS = [2000, 5000, 10000, 25000] as const;
