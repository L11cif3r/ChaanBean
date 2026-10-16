"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Card, CardBody, CardHeader, FormField, Input, Tag, Toggle } from "@/components/ui";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { topupSplit, TOPUP_MAX_PAISE, TOPUP_MIN_PAISE } from "@/lib/billing";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";

// PRD S19: current plan and auto-renew, wallet with top-up and low-balance alert, usage per item, ledger with a CSV
// statement, and GST invoices.

export interface BillingData {
  plan: { name: string; status: "active" | "grace" | "expired" | "cancelled"; startsAt: string; endsAt: string; autoRenew: boolean; seats: number } | null;
  unitsLeft: number;
  walletPaise: number;
  alertPaise: number | null;
  lowBalance: boolean;
  usage: { code: string; name: string; included: number; used: number; remaining: number; pricePaise: number }[];
  ledger: LedgerEntry[];
  invoices: { id: string; number: string; issuedAt: string; description: string; totalPaise: number }[];
}

interface LedgerEntry {
  id: string;
  at: string;
  type: "hold" | "commit" | "reverse" | "topup" | "adjust";
  source: "plan" | "wallet";
  itemName: string | null;
  units: number;
  amountPaise: number;
  balanceAfterPaise: number | null;
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
    if (e.type === "topup") return t("entryTopup");
    return t("entryAdjust");
  };

  const ledgerColumns: Column<LedgerEntry>[] = [
    { key: "at", header: t("colDate"), label: t("colDate"), render: (e) => <span className="whitespace-nowrap text-muted">{formatDateTimeIst(new Date(e.at))}</span>, hideOnMobile: true },
    {
      key: "entry", header: t("colEntry"), label: t("colEntry"),
      render: (e) => (
        <div>
          <p className="font-medium text-text">{entryLabel(e)}</p>
          <p className="text-xs text-muted">
            {e.source === "plan" ? t("planUnit") : null}
            <span className="sm:hidden">{e.source === "plan" ? " · " : ""}{formatDateTimeIst(new Date(e.at))}</span>
          </p>
        </div>
      ),
    },
    { key: "debit", header: t("colDebit"), label: t("colDebit"), align: "right", render: (e) => (e.amountPaise < 0 ? <span className="tabular-nums">{inr(-e.amountPaise)}</span> : e.units < 0 ? <span className="text-muted">−{-e.units}</span> : null) },
    { key: "credit", header: t("colCredit"), label: t("colCredit"), align: "right", render: (e) => (e.amountPaise > 0 ? <span className="tabular-nums text-success-fg">{inr(e.amountPaise)}</span> : e.units > 0 ? <span className="text-muted">+{e.units}</span> : null) },
    { key: "balance", header: t("colBalance"), label: t("colBalance"), align: "right", hideOnMobile: true, render: (e) => (e.balanceAfterPaise === null ? null : <span className="tabular-nums">{inr(e.balanceAfterPaise)}</span>) },
  ];

  const usageColumns: Column<BillingData["usage"][number]>[] = [
    { key: "item", header: t("colItem"), label: t("colItem"), render: (u) => <span className="font-medium text-text">{u.name}</span>, sortValue: (u) => u.name },
    { key: "included", header: t("colIncluded"), label: t("colIncluded"), align: "right", render: (u) => <span className="tabular-nums">{u.included || "—"}</span>, sortValue: (u) => u.included, hideOnMobile: true },
    { key: "used", header: t("colUsed"), label: t("colUsed"), align: "right", render: (u) => <span className="tabular-nums">{u.included ? u.used : "—"}</span>, sortValue: (u) => u.used, hideOnMobile: true },
    { key: "remaining", header: t("colRemaining"), label: t("colRemaining"), align: "right", render: (u) => <span className="font-bold tabular-nums">{u.included ? u.remaining : "—"}</span>, sortValue: (u) => u.remaining },
    { key: "price", header: t("colPrice"), label: t("colPrice"), align: "right", render: (u) => <span className="whitespace-nowrap tabular-nums text-muted">{t("priceGst", { price: inr(u.pricePaise) })}</span>, sortValue: (u) => u.pricePaise },
  ];

  const invoiceColumns: Column<BillingData["invoices"][number]>[] = [
    { key: "number", header: t("colNumber"), label: t("colNumber"), render: (i) => <span className="font-mono text-xs font-bold text-text">{i.number}</span> },
    { key: "date", header: t("colDate"), label: t("colDate"), render: (i) => <span className="text-muted">{day(i.issuedAt)}</span>, hideOnMobile: true },
    { key: "description", header: t("colDescription"), label: t("colDescription"), render: (i) => i.description, hideOnMobile: true },
    { key: "amount", header: t("colAmount"), label: t("colAmount"), align: "right", render: (i) => <span className="tabular-nums">{inr(i.totalPaise)}</span> },
    {
      key: "view", header: "", label: t("view"), align: "right",
      render: (i) => (
        <a href={`/api/v1/billing/invoices/${i.id}`} target="_blank" rel="noopener" className="text-sm font-bold text-primary-text hover:underline">
          {t("view")}
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("currentPlan")}
            action={data.plan ? <Tag tone={data.plan.status === "active" ? "success" : "warning"}>{data.plan.status === "active" ? t("statusActive") : t("statusGrace")}</Tag> : null}
          />
          <CardBody className="space-y-4">
            {data.plan ? (
              <>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight text-text">{data.plan.name}</p>
                  <p className="text-sm text-muted">{t("period", { start: day(data.plan.startsAt), end: day(data.plan.endsAt) })}</p>
                  <p className="mt-1 text-sm text-text-2">
                    {t("unitsLeft", { count: data.unitsLeft })} · {t("users", { count: data.plan.seats })}
                  </p>
                </div>
                <Toggle id="auto-renew" label={t("autoRenew")} checked={autoRenew} onChange={(e) => void saveAutoRenew(e.target.checked)} />
                <ButtonLink href="/account/plan/change" variant="secondary" size="sm">
                  {t("changePlan")}
                </ButtonLink>
              </>
            ) : (
              <>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight text-text">{t("payPerUse")}</p>
                  <p className="text-sm text-muted">{t("payPerUseBody")}</p>
                </div>
                <ButtonLink href="/account/plan/change" size="sm">
                  {t("choosePlan")}
                </ButtonLink>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("wallet")} action={<Button size="sm" onClick={() => setTopupOpen(true)}>{t("addMoney")}</Button>} />
          <CardBody className="space-y-4">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-subtle">{t("balance")}</p>
              <p className="text-3xl font-black tabular-nums tracking-tight text-text">{inr(data.walletPaise)}</p>
              {data.lowBalance ? (
                <p role="status" className="mt-1 text-sm font-semibold text-warning-fg">
                  {t("lowBalance")}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">{t("walletNote")}</p>
              )}
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveAlert();
              }}
            >
              <FormField id="alert-amount" label={t("alert")} hint={t("alertHint")} error={alertError ?? undefined}>
                <Input
                  id="alert-amount"
                  inputMode="numeric"
                  value={alert}
                  onChange={(e) => {
                    setAlert(e.target.value.replace(/\D/g, ""));
                    setAlertError(null);
                  }}
                  invalid={!!alertError}
                />
              </FormField>
              <Button type="submit" variant="secondary" size="sm" loading={savingAlert} disabled={savingAlert}>
                {t("save")}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("usageTitle")} />
        <DataTable columns={usageColumns} rows={data.usage} rowKey={(u) => u.code} initialPageSize={25} />
      </Card>

      <Card>
        <CardHeader title={t("ledgerTitle")} />
        <CardBody className="border-b border-border">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void loadLedger();
            }}
          >
            <FormField id="ledger-from" label={t("from")}>
              <Input id="ledger-from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            </FormField>
            <FormField id="ledger-to" label={t("to")}>
              <Input id="ledger-to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            </FormField>
            <Button type="submit" variant="secondary">
              {t("show")}
            </Button>
            <a href={csvHref} className="inline-flex h-11 items-center text-sm font-bold text-primary-text hover:underline" download>
              {t("downloadCsv")}
            </a>
          </form>
        </CardBody>
        <DataTable columns={ledgerColumns} rows={entries} rowKey={(e) => e.id} empty={t("noLedger")} initialPageSize={10} />
      </Card>

      <Card>
        <CardHeader title={t("invoicesTitle")} />
        <DataTable columns={invoiceColumns} rows={data.invoices} rowKey={(i) => i.id} empty={t("noInvoices")} />
      </Card>

      <TopupDialog open={topupOpen} onClose={() => setTopupOpen(false)} />
    </div>
  );
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
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, "").slice(0, 7));
              setError(null);
            }}
            invalid={!!error}
            autoFocus
          />
        </FormField>
        {split ? <p className="text-xs text-muted">{t("topupGst", { gst: formatInr(split.gst, { withPaise: true }), taxable: formatInr(split.taxable, { withPaise: true }) })}</p> : null}
      </form>
    </Dialog>
  );
}
