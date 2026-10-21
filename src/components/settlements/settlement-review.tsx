"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Mail, MessageCircle, Pencil, Send, Smartphone } from "lucide-react";
import { Button, ButtonLink, Card, CardHeader, Checkbox, FormField, GradientText, PageHeader, Select, Toggle } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import type { SettlementQuote, StView } from "@/server/settlements/service";
import { BackLink } from "@/components/transactions/transaction-detail";
import { ChannelLabel, PreviewSummary, ReviewLayout, SendPanel } from "@/components/transactions/review-send";

// S17 marker 5: the same acceptance flow as S14. The exact PDF the debtor will see, the channels, how long the link
// works and what sending costs (1 E-Settlement unit, or ₹201 + GST from the wallet; a revised version is free).

type Channel = "sms" | "whatsapp" | "email";
const CHANNEL_ICON: Record<Channel, ReactNode> = { sms: <Smartphone size={15} />, whatsapp: <MessageCircle size={15} />, email: <Mail size={15} /> };
const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

export function SettlementReview({ st, quote }: { st: StView; quote: SettlementQuote }) {
  const t = useTranslations("settlements");
  const tx = useTranslations("transactions.review");
  const router = useRouter();
  const toast = useToast();
  const [channels, setChannels] = useState<Record<Channel, boolean>>({ sms: true, whatsapp: true, email: Boolean(quote.channels.email) });
  const [days, setDays] = useState(st.linkValidDays);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = (Object.keys(channels) as Channel[]).filter((c) => channels[c] && (c !== "email" || quote.channels.email));

  async function send() {
    setBusy(true);
    const res = await api(`/api/v1/settlements/${st.id}/send`, { body: { channels: chosen, linkValidDays: days, confirmed: true } });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    toast(t("review.sent"), "success");
    router.push(`/settlements/${st.id}`);
  }

  const cost = quote.free ? tx("free") : formatInr(BigInt(quote.amountPaise), { withPaise: true });
  const recipient: Record<Channel, string | null> = { sms: quote.channels.sms, whatsapp: quote.channels.whatsapp, email: quote.channels.email };
  const plan = st.mode === "full" ? `${t("modeName.full")}` : t("instalmentsN", { count: st.schedule.length });

  return (
    <ReviewLayout
      back={<BackLink href={`/settlements/${st.id}`}>{tx("back", { reference: st.reference })}</BackLink>}
      header={<PageHeader title={tx.rich("heading", { accent: (c) => <GradientText>{c}</GradientText> })} description={t("review.subtitle", { reference: st.reference, name: st.counterparty.name })} />}
      summary={
        <PreviewSummary
          eyebrow={`${st.reference} · ${t("eSettlement")}`}
          name={st.counterparty.name}
          amountLabel={t("toPayLabel")}
          amount={inr(st.money.toPayPaise)}
          facts={[
            [t("owedOn", { date: formatDate(st.owedOn) }), inr(st.owedPaise)],
            [st.waivedPaise >= 0 ? t("waived") : t("extra"), inr(Math.abs(st.waivedPaise))],
            [t("modeLabel"), plan],
          ]}
          pdfHref={`/api/v1/settlements/${st.id}/pdf`}
          pdfLabel={tx("openPdf")}
        />
      }
      panel={
        <SendPanel
          title={tx("sendTo")}
          channels={(["sms", "email", "whatsapp"] as Channel[]).map((c) => (
            <Toggle
              key={c}
              id={`ch-${c}`}
              className="w-full min-w-0"
              checked={channels[c] && Boolean(recipient[c])}
              disabled={!recipient[c]}
              onChange={(e) => setChannels((x) => ({ ...x, [c]: e.target.checked }))}
              label={<ChannelLabel icon={CHANNEL_ICON[c]} name={tx(`channel.${c}`)} to={recipient[c] ?? tx("noEmail")} />}
            />
          ))}
          noChannel={!chosen.length ? tx("chooseChannel") : null}
          linkWindow={
            <FormField id="link-days" label={tx("linkValid")} hint={tx("reminders")}>
              <Select id="link-days" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{tx("days", { count: n })}</option>)}
              </Select>
            </FormField>
          }
          confirm={<Checkbox id="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} label={t("review.confirm")} />}
          cost={tx("cost", { cost })}
          notEnough={!quote.enough ? <>{tx("notEnough")} <Link href="/account/billing" className="underline underline-offset-2">{tx("addMoney")}</Link></> : null}
          send={
            <Button className="w-full" icon={<Send aria-hidden="true" />} onClick={() => void send()} loading={busy} disabled={!confirmed || !chosen.length || !quote.enough}>
              {quote.free ? tx("sendAgain") : tx("send", { cost })}
            </Button>
          }
          edit={<ButtonLink href={`/settlements/${st.id}/edit`} variant="ghost" className="w-full"><Pencil size={15} aria-hidden="true" /> {tx("edit")}</ButtonLink>}
        />
      }
      preview={
        <Card className="overflow-hidden">
          <CardHeader title={t("review.preview")} action={<a href={`/api/v1/settlements/${st.id}/pdf`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text underline-offset-2 hover:underline">{tx("openPdf")} <ExternalLink size={13} aria-hidden="true" /></a>} />
          <iframe title={t("review.previewTitle", { reference: st.reference })} src={`/api/v1/settlements/${st.id}/pdf#view=FitH`} className="block h-[60vh] min-h-[24rem] w-full border-0 bg-surface-muted lg:h-[70vh] lg:min-h-[28rem]" />
        </Card>
      }
    />
  );
}
