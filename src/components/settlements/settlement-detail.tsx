"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, MessageSquareQuote } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, FormField, Input, Select, Tag, buttonClass, type Tone } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import type { InstalmentStatus } from "@/lib/settlements";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/transactions";
import type { StView } from "@/server/settlements/service";
import { ActivityLog, BackLink, DetailGrid, DetailHero, EvidenceCard, Fact, StatusTrack } from "@/components/transactions/transaction-detail";
import { SETTLEMENT_TONE } from "./settlement-list";

// Settlement detail ("same layout as S16", PRD v1.0 S17): hero with the status track, amounts (owed, settlement,
// interest agreed, waived, paid, left), the instalments with Due / Paid / Missed, a counter-proposal shown next to
// the current terms with Accept proposal and Revise (S17 rules), evidence, payments and the activity log.

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });
const toPaise = (rupees: string) => Math.round(Number(rupees.replace(/[,\s₹]/g, "")) * 100);
const INSTALMENT_TONE: Record<InstalmentStatus, Tone> = { due: "info", paid: "success", missed: "danger" };

export function SettlementDetail({ st, canManage, canPay, canExport }: { st: StView; canManage: boolean; canPay: boolean; canExport: boolean }) {
  const t = useTranslations("settlements");
  const tt = useTranslations("transactions");
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"payment" | "cancel" | "adopt" | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pay, setPay] = useState({ amount: st.next ? String((st.next.amountPaise - st.next.paidPaise) / 100) : "", paidOn: istDate(new Date()), mode: "upi" as PaymentMode, reference: "", notify: true });

  const running = st.status === "accepted";
  const editable = st.status === "draft" || st.status === "counter_proposed";
  const started = running || st.status === "completed" || st.status === "defaulted";

  async function act(path: string, body?: unknown, ok?: string) {
    setBusy(true);
    setErrors({});
    const res = await api(`/api/v1/settlements/${st.id}/${path}`, { body: body ?? {} });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.error.fields ?? {});
      toast(res.error.message, "danger");
      return false;
    }
    if (ok) toast(ok, "success");
    setDialog(null);
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-5">
      <BackLink href="/settlements">{t("backToList")}</BackLink>

      <DetailHero
        meta={
          <>
            {st.reference} · {t("eSettlement")} · {tt("version", { n: st.version })} ·{" "}
            {st.original ? <Link href={`/transactions/${st.original.id}`} className="font-semibold text-primary-text hover:underline">{t("settlesRef", { reference: st.original.reference })}</Link> : t("outsideBill", { bill: st.outside?.billNo ?? "" })}
          </>
        }
        title={<Link href={`/counterparties/${st.counterparty.id}`} className="hover:text-primary-text">{st.counterparty.name}</Link>}
        tag={<Tag tone={SETTLEMENT_TONE[st.status]}>{t(`status.${st.status}`)}</Tag>}
        amountLabel={started ? t("left") : t("toPayLabel")}
        amount={inr(started ? st.money.remainingPaise : st.money.toPayPaise)}
        sub={st.next ? <>{t("nextDue")}: {formatDate(st.next.dueDate)} · {inr(st.next.amountPaise - st.next.paidPaise)}</> : undefined}
        paid={st.money.paidPaise}
        total={st.money.toPayPaise}
        paidOfLabel={tt("paidOf", { paid: inr(st.money.paidPaise), total: inr(st.money.toPayPaise) })}
        track={<StatusTrack label={tt("timeline")} steps={st.timeline.map((s) => ({ key: s.step, label: t(`step.${s.step}`), at: s.at }))} />}
      />

      {st.status === "defaulted" ? (
        <p role="status" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
          {st.original ? t("defaultedNote", { reference: st.original.reference }) : t("defaultedOutside")}
        </p>
      ) : null}
      {st.status === "rejected" ? (
        <p role="status" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{t("rejectedNote")}{st.lastDecision?.comment ? ` “${st.lastDecision.comment}”` : ""}</p>
      ) : null}

      {st.proposal ? (
        <Card className="border-warning-fg/40">
          <CardHeader title={<span className="inline-flex items-center gap-2"><MessageSquareQuote size={16} className="text-warning-fg" aria-hidden="true" />{t("proposal.title", { name: st.proposal.by ?? st.counterparty.name })}</span>} />
          <CardBody className="space-y-4">
            {st.proposal.comment ? <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning-fg">“{st.proposal.comment}”</p> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Terms title={t("proposal.yours")} amount={st.settlementPaise + st.interestAgreedPaise} rows={st.schedule} />
              <Terms title={t("proposal.theirs")} amount={st.proposal.amountPaise} rows={st.proposal.rows} highlight />
            </div>
            {canManage ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setDialog("adopt")}>{t("proposal.accept")}</Button>
                <ButtonLink href={`/settlements/${st.id}/edit?proposal=${st.proposal.id}`} variant="secondary">{t("proposal.revise")}</ButtonLink>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <DetailGrid
        actions={
          <Card>
            <CardHeader title={tt("actions")} />
            <CardBody className="flex flex-col gap-2">
              {st.status === "draft" && canManage ? <ButtonLink href={`/settlements/${st.id}/review`} className="w-full">{tt("reviewSend")}</ButtonLink> : null}
              {running && canPay ? <Button className="w-full" onClick={() => setDialog("payment")}>{tt("recordPayment")}</Button> : null}
              {editable && canManage ? <ButtonLink href={`/settlements/${st.id}/edit`} variant="secondary" className="w-full">{tt("edit")}</ButtonLink> : null}
              <a href={`/api/v1/settlements/${st.id}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "md", "w-full")}>
                <FileText aria-hidden="true" /> {st.seal ? t("downloadSealed") : tt("viewPdf")}
              </a>
              {st.seal && canExport ? (
                <a href={`/api/v1/settlements/${st.id}/evidence`} className={buttonClass("secondary", "md", "w-full")}>
                  <Download aria-hidden="true" /> {tt("evidencePack")}
                </a>
              ) : null}
              {(st.seal || st.status === "sent" || st.status === "viewed") && canManage ? (
                <Button variant="ghost" className="w-full" loading={busy} onClick={() => void act("resend", undefined, tt("resent"))}>{tt("resend")}</Button>
              ) : null}
              {["draft", "sent", "viewed", "counter_proposed"].includes(st.status) && canManage ? (
                <Button variant="ghost" className="w-full text-danger-fg hover:text-danger-fg" onClick={() => setDialog("cancel")}>{tt("cancel")}</Button>
              ) : null}
            </CardBody>
          </Card>
        }
        evidence={
          <EvidenceCard
            title={tt("evidence")}
            empty={t("notSealed")}
            seal={st.seal}
            reference={st.reference}
            labels={{ sealed: tt("sealed"), acceptedBy: tt("acceptedBy"), otpRef: tt("otpRef"), ipDevice: tt("ipDevice"), verify: tt("verify") }}
          />
        }
      >
        <Card>
          <CardHeader title={tt("amounts")} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Fact label={t("owedOn", { date: formatDate(st.owedOn) })} value={inr(st.owedPaise)} />
              <Fact label={t("settlementAmount")} value={inr(st.settlementPaise)} />
              <Fact label={t("interestAgreed")} value={inr(st.interestAgreedPaise)} />
              <Fact label={st.waivedPaise >= 0 ? t("waived") : t("extra")} value={inr(Math.abs(st.waivedPaise))} />
              <Fact label={t("toPayLabel")} value={inr(st.money.toPayPaise)} strong />
              <Fact label={tt("paid")} value={inr(st.money.paidPaise)} />
              <Fact label={t("left")} value={inr(st.money.remainingPaise)} strong />
              {st.next ? <Fact label={t("nextDue")} value={`${formatDate(st.next.dueDate)} · ${inr(st.next.amountPaise - st.next.paidPaise)}`} /> : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={st.mode === "full" ? t("paymentTitle") : t("instalmentsTitle", { count: st.schedule.length })} />
          <ol className="divide-y divide-border">
            {st.schedule.map((i) => (
              <li key={i.seq} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-bold tabular-nums text-text-2" aria-hidden="true">{i.seq}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[15px] font-bold tabular-nums text-text">{inr(i.amountPaise)}</span>
                  <span className="block text-xs text-muted">
                    {t("col.payBy")} {formatDate(i.dueDate)}{i.paidPaise ? ` · ${t("col.paid")} ${inr(i.paidPaise)}` : ""}
                  </span>
                </span>
                {started ? (
                  <Tag tone={INSTALMENT_TONE[i.status]}>{t(`instalment.${i.status}`)}{i.status === "paid" && i.paidOn ? ` · ${formatDate(i.paidOn)}` : ""}</Tag>
                ) : (
                  <span className="text-xs text-muted">{t("instalment.notStarted")}</span>
                )}
              </li>
            ))}
          </ol>
          <p className="border-t border-border px-4 py-3 text-xs text-muted sm:px-5">{t("graceNote", { days: st.graceDays })}</p>
        </Card>

        {st.payments.length ? (
          <Card>
            <CardHeader title={tt("payments")} />
            <ul className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
              {st.payments.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-surface-muted p-3 text-sm">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-head text-base font-bold tabular-nums text-text">{inr(p.amountPaise)}</span>
                    <span className="text-xs font-semibold text-text-2">{tt(`mode.${p.mode}`)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDate(p.paidOn)}{p.reference ? ` · ${p.reference}` : ""}{p.by ? ` · ${p.by}` : ""}</p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <ActivityLog
          title={tt("activity")}
          events={st.events.map((e) => {
            const key = `event.${e.event.replace(/\./g, "_")}`;
            return { at: e.at, who: e.actorName ?? tt(`actor.${e.actorType}`), what: t.has(key) ? t(key) : tt.has(key) ? tt(key) : e.event };
          })}
        />
      </DetailGrid>

      <Dialog
        open={dialog === "payment"}
        onClose={() => setDialog(null)}
        title={tt("recordPayment")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>{tt("close")}</Button>
            <Button loading={busy} onClick={() => void act("payments", { amountPaise: toPaise(pay.amount || "0"), paidOn: pay.paidOn, mode: pay.mode, reference: pay.reference || undefined, notify: pay.notify }, tt("paymentSaved"))}>
              {tt("savePayment")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-semibold text-text-2">{t("leftNow", { amount: inr(st.money.remainingPaise) })}</p>
          <FormField id="pay-amount" label={tt("amount")} required error={errors.amountPaise}>
            <Input id="pay-amount" inputMode="decimal" value={pay.amount} invalid={Boolean(errors.amountPaise)} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="pay-date" label={tt("paidOn")} required error={errors.paidOn}>
              <Input id="pay-date" type="date" value={pay.paidOn} max={istDate(new Date())} invalid={Boolean(errors.paidOn)} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} />
            </FormField>
            <FormField id="pay-mode" label={tt("modeLabel")} required>
              <Select id="pay-mode" value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value as PaymentMode })}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{tt(`mode.${m}`)}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField id="pay-ref" label={tt("referenceLabel")}>
            <Input id="pay-ref" maxLength={40} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
          </FormField>
          <Checkbox id="pay-notify" checked={pay.notify} onChange={(e) => setPay({ ...pay, notify: e.target.checked })} label={t("notifyDebtor")} />
          <p className="text-xs text-muted">{t("paymentOrder")}</p>
        </div>
      </Dialog>

      <ConfirmDialog
        open={dialog === "adopt"}
        onCancel={() => setDialog(null)}
        onConfirm={() => void act(`proposals/${st.proposal?.id}/adopt`, undefined, t("proposal.adopted"))}
        title={t("proposal.acceptTitle")}
        body={t("proposal.acceptBody")}
        confirmLabel={t("proposal.accept")}
        busy={busy}
      />
      <ConfirmDialog
        open={dialog === "cancel"}
        onCancel={() => setDialog(null)}
        onConfirm={() => void act("cancel", undefined, tt("cancelled"))}
        title={t("cancelTitle")}
        body={st.timeline.find((s) => s.step === "viewed")?.at ? tt("cancelViewed") : tt("cancelBody")}
        confirmLabel={tt("cancel")}
        destructive
        busy={busy}
      />
    </div>
  );
}

function Terms({ title, amount, rows, highlight }: { title: string; amount: number; rows: { dueDate: string; amountPaise: number }[]; highlight?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-xl border p-4 text-sm", highlight ? "border-warning-fg/40 bg-warning-bg/40" : "border-border bg-surface-muted")}>
      <p className="font-bold text-text">{title}</p>
      <p className={cn("mt-1 font-head text-xl font-extrabold tabular-nums", highlight ? "text-gradient" : "text-text")}>{inr(amount)}</p>
      <ol className="mt-2 space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="flex justify-between gap-3 tabular-nums text-text-2">
            <span>{i + 1}. {formatDate(r.dueDate)}</span>
            <span>{inr(r.amountPaise)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
