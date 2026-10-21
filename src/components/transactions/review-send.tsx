"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Mail, MessageCircle, Pencil, Send, Smartphone } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, FormField, GradientText, PageHeader, Select, Toggle } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import type { SendQuote, TxView } from "@/server/transactions/service";
import { BackLink } from "./transaction-detail";

// S14 (PRD v3.0 Figure 20): the exact agreement the counterparty will see, where it goes, for how long, and what
// sending costs. Sending uses one unit on first send; resending after a change request is free.
// Phones: the key facts, then the send panel, then the full PDF. Large screens: preview left, send panel right.

type Channel = "sms" | "whatsapp" | "email";
const CHANNEL_ICON: Record<Channel, ReactNode> = { sms: <Smartphone size={15} />, whatsapp: <MessageCircle size={15} />, email: <Mail size={15} /> };
const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

export function ReviewSend({ tx, quote }: { tx: TxView; quote: SendQuote }) {
  const t = useTranslations("transactions.review");
  const tt = useTranslations("transactions");
  const router = useRouter();
  const toast = useToast();
  const [channels, setChannels] = useState<Record<Channel, boolean>>({ sms: true, whatsapp: true, email: Boolean(quote.channels.email) });
  const [days, setDays] = useState(tx.linkValidDays);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = (Object.keys(channels) as Channel[]).filter((c) => channels[c]);

  async function send() {
    setBusy(true);
    const res = await api(`/api/v1/transactions/${tx.id}/send`, { body: { channels: chosen, linkValidDays: days, confirmed: true } });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    toast(t("sent"), "success");
    router.push(`/transactions/${tx.id}`);
  }

  const cost = quote.free ? t("free") : formatInr(BigInt(quote.amountPaise), { withPaise: true });
  const recipient: Record<Channel, string | null> = { sms: quote.channels.sms, whatsapp: quote.channels.whatsapp, email: quote.channels.email };
  const balance = Math.max(0, tx.totalPaise - tx.paidNowPaise);

  return (
    <ReviewLayout
      back={<BackLink href={`/transactions/${tx.id}`}>{t("back", { reference: tx.reference })}</BackLink>}
      header={<PageHeader title={t.rich("heading", { accent: (c) => <GradientText>{c}</GradientText> })} description={t("subtitle", { reference: tx.reference, name: tx.counterparty.name })} />}
      summary={
        <PreviewSummary
          eyebrow={`${tx.reference} · ${tt(`type.${tx.type}`)}`}
          name={tx.counterparty.name}
          amountLabel={tt("balance")}
          amount={inr(balance)}
          facts={[
            [tx.type === "lender" ? tt("principal") : tt("total"), inr(tx.totalPaise)],
            [tx.type === "buyer" ? tt("goodsDueBy") : tt("dueDate"), formatDate(tx.dueDate)],
            [tt("interestShort"), tx.interestBp ? `${tx.interestBp / 100}%` : tt("noInterest")],
          ]}
          pdfHref={`/api/v1/transactions/${tx.id}/pdf`}
          pdfLabel={t("openPdf")}
        />
      }
      panel={
        <SendPanel
          title={t("sendTo")}
          channels={(["sms", "email", "whatsapp"] as Channel[]).map((c) => (
            <Toggle
              key={c}
              id={`ch-${c}`}
              className="w-full min-w-0"
              checked={channels[c] && Boolean(recipient[c])}
              disabled={!recipient[c]}
              onChange={(e) => setChannels((x) => ({ ...x, [c]: e.target.checked }))}
              label={<ChannelLabel icon={CHANNEL_ICON[c]} name={t(`channel.${c}`)} to={recipient[c] ?? t("noEmail")} />}
            />
          ))}
          noChannel={!chosen.length ? t("chooseChannel") : null}
          linkWindow={
            <FormField id="link-days" label={t("linkValid")} hint={t("reminders")}>
              <Select id="link-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{t("days", { count: n })}</option>
                ))}
              </Select>
            </FormField>
          }
          confirm={<Checkbox id="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} label={t("confirm")} />}
          cost={t("cost", { cost })}
          notEnough={!quote.enough ? <>{t("notEnough")} <Link href="/account/billing" className="underline underline-offset-2">{t("addMoney")}</Link></> : null}
          send={
            <Button className="w-full" icon={<Send aria-hidden="true" />} onClick={() => void send()} loading={busy} disabled={!confirmed || !chosen.length || !quote.enough}>
              {quote.free ? t("sendAgain") : t("send", { cost })}
            </Button>
          }
          edit={<ButtonLink href={`/transactions/${tx.id}/edit`} variant="ghost" className="w-full"><Pencil size={15} aria-hidden="true" /> {t("edit")}</ButtonLink>}
        />
      }
      preview={
        <Card className="overflow-hidden">
          <CardHeader title={t("preview")} action={<a href={`/api/v1/transactions/${tx.id}/pdf`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text underline-offset-2 hover:underline">{t("openPdf")} <ExternalLink size={13} aria-hidden="true" /></a>} />
          <iframe title={t("previewTitle", { reference: tx.reference })} src={`/api/v1/transactions/${tx.id}/pdf#view=FitH`} className="block h-[60vh] min-h-[24rem] w-full border-0 bg-surface-muted lg:h-[70vh] lg:min-h-[28rem]" />
        </Card>
      }
    />
  );
}

// ---------------------------------------------------------------- shared with the settlement review page

/** Phones: summary, send panel, PDF. Large screens: summary and PDF on the left, the send panel sticky on the right. */
export function ReviewLayout({ back, header, summary, panel, preview }: { back: ReactNode; header: ReactNode; summary: ReactNode; panel: ReactNode; preview: ReactNode }) {
  return (
    <div className="space-y-5">
      {back}
      {header}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">{summary}</div>
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-20">{panel}</div>
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">{preview}</div>
      </div>
    </div>
  );
}

/** A clean preview card: who it goes to and the amount that matters, with the key facts and a link to the PDF. */
export function PreviewSummary({ eyebrow, name, amountLabel, amount, facts, pdfHref, pdfLabel, children }: {
  eyebrow: string; name: string; amountLabel: string; amount: string; facts: [string, ReactNode][]; pdfHref: string; pdfLabel: string; children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{eyebrow}</p>
          <p className="mt-1 break-words font-head text-lg font-bold text-text">{name}</p>
        </div>
        <a href={pdfHref} target="_blank" rel="noopener" className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-text-2 shadow-sm hover:border-primary-line hover:text-primary-text lg:hidden">
          {pdfLabel} <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{amountLabel}</p>
      <p className="text-gradient mt-1 font-head text-[2rem] font-extrabold leading-none tracking-tight tabular-nums">{amount}</p>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm min-[400px]:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-xl bg-surface/80 px-3 py-2">
            <dt className="text-[11px] font-medium text-muted">{k}</dt>
            <dd className="mt-0.5 break-words font-semibold tabular-nums text-text">{v}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

export function ChannelLabel({ icon, name, to }: { icon: ReactNode; name: string; to: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="text-muted" aria-hidden="true">{icon}</span>
      <span className="font-semibold">{name}</span>
      <span className="min-w-0 truncate text-xs text-muted">{to}</span>
    </span>
  );
}

/** One card with everything needed to send, ending in the single send action. */
export function SendPanel({ title, channels, noChannel, linkWindow, confirm, cost, notEnough, send, edit }: {
  title: string; channels: ReactNode; noChannel: ReactNode; linkWindow: ReactNode; confirm: ReactNode; cost: string; notEnough: ReactNode; send: ReactNode; edit: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="space-y-4">
        <div className="space-y-3">
          {channels}
          {noChannel ? <p className="text-xs font-semibold text-danger-fg">{noChannel}</p> : null}
        </div>
        <div className="border-t border-border pt-4">{linkWindow}</div>
        <div className={cn("space-y-3 rounded-xl border p-3", "border-primary-line bg-primary-softer")}>
          {confirm}
        </div>
        <p className="text-xs text-muted">{cost}</p>
        {notEnough ? <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{notEnough}</p> : null}
        <div className="space-y-1.5">
          {send}
          {edit}
        </div>
      </CardBody>
    </Card>
  );
}
