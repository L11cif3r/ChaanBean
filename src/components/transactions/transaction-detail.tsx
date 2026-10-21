"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Download, FileText, Paperclip, Plus, ShieldCheck } from "lucide-react";
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, FormField, Input, SectionLabel, Select, Tag, buttonClass, type Tone } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { OPEN_STATUSES, PAYMENT_MODES, type PaymentMode, type TxStatus } from "@/lib/transactions";
import type { TxView } from "@/server/transactions/service";

// S16 (PRD v3.0 Figure 23): one agreement from draft to paid. Hero with the status and the amount that matters now,
// a horizontal status track (marker 2), amounts with interest to today (3), actions (4), evidence (5) and the activity
// log, which cannot be edited (6). The hero, track and log pieces are shared with the settlement detail page.

export const STATUS_TONE: Record<TxStatus, Tone> = {
  draft: "neutral", sent: "info", viewed: "info", changes_requested: "warning", accepted: "success", active: "success",
  partially_paid: "info", overdue: "danger", paid: "success", settled: "success", rejected: "danger", expired: "neutral", cancelled: "neutral",
};

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });
const toPaise = (rupees: string) => Math.round(Number(rupees.replace(/[,\s₹]/g, "")) * 100);

export function TransactionDetail({ tx, canManage, canPay, canExport }: { tx: TxView; canManage: boolean; canPay: boolean; canExport: boolean }) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"payment" | "paid" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pay, setPay] = useState({ amount: "", paidOn: istDate(new Date()), mode: "upi" as PaymentMode, reference: "", notify: true });
  const fileRef = useRef<HTMLInputElement>(null);

  const open = OPEN_STATUSES.includes(tx.status);
  const editable = tx.status === "draft" || tx.status === "changes_requested";

  async function act(path: string, body?: unknown, ok?: string) {
    setBusy(true);
    setErrors({});
    const res = await api(`/api/v1/transactions/${tx.id}/${path}`, { body: body ?? {} });
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

  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    const res = await api(`/api/v1/transactions/${tx.id}/attachments`, { form });
    setBusy(false);
    if (!res.ok) return toast(res.error.fields?.file ?? res.error.message, "danger");
    router.refresh();
  }

  const due = tx.money.duePaise;
  const dueWhen = `${formatDate(tx.dueDate)}${tx.money.daysOverdue ? ` · ${t("daysOverdue", { count: tx.money.daysOverdue })}` : open ? ` · ${t("daysLeft", { count: tx.money.daysLeft })}` : ""}`;
  const totalLabel = tx.type === "lender" ? t("principal") : t("total");

  return (
    <div className="space-y-5">
      <BackLink href="/transactions">{t("backToList")}</BackLink>

      <DetailHero
        meta={<>{tx.reference} · {t(`type.${tx.type}`)} · {t("version", { n: tx.version })}</>}
        title={<Link href={`/counterparties/${tx.counterparty.id}`} className="hover:text-primary-text">{tx.counterparty.name}</Link>}
        tag={<Tag tone={STATUS_TONE[tx.status]}>{t(`status.${tx.status}`)}</Tag>}
        amountLabel={open ? t("dueToday") : totalLabel.replace(/\s*\(₹\)$/, "")}
        amount={inr(open ? due : tx.totalPaise)}
        sub={<>{tx.type === "buyer" ? t("goodsDueBy") : t("dueDate")}: {dueWhen}</>}
        paid={tx.money.paidPaise}
        total={tx.totalPaise}
        paidOfLabel={t("paidOf", { paid: inr(tx.money.paidPaise), total: inr(tx.totalPaise) })}
        track={<StatusTrack label={t("timeline")} steps={tx.timeline.map((s) => ({ key: s.step, label: t(`step.${s.step}`), at: s.at }))} />}
      />

      {tx.status === "changes_requested" && tx.lastDecision?.comment ? (
        <p role="status" className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning-fg">
          <span className="font-bold">{t("changesAsked")}</span> “{tx.lastDecision.comment}”
        </p>
      ) : null}
      {tx.status === "settled" && tx.settlement ? (
        <p role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success-fg">
          {t("settledNote")} <Link href={`/settlements/${tx.settlement.id}`} className="underline underline-offset-2">{tx.settlement.reference}</Link>
        </p>
      ) : null}
      {tx.status === "rejected" ? (
        <p role="status" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">
          {t("rejectedNote", { reason: tx.lastDecision?.reason ? t(`reason.${tx.lastDecision.reason}`) : t("noReason") })}
        </p>
      ) : null}

      <DetailGrid
        actions={
          <Card>
            <CardHeader title={t("actions")} />
            <CardBody className="flex flex-col gap-2">
              {tx.status === "draft" && canManage ? <ButtonLink href={`/transactions/${tx.id}/review`} className="w-full">{t("reviewSend")}</ButtonLink> : null}
              {open && canPay ? <Button className="w-full" onClick={() => setDialog("payment")}>{t("recordPayment")}</Button> : null}
              {open && canPay ? <Button variant="secondary" className="w-full" onClick={() => setDialog("paid")}>{t("markPaid")}</Button> : null}
              {editable && canManage ? <ButtonLink href={`/transactions/${tx.id}/edit`} variant="secondary" className="w-full">{t("edit")}</ButtonLink> : null}
              {tx.status === "overdue" && canManage && (!tx.settlement || ["rejected", "expired", "cancelled", "defaulted"].includes(tx.settlement.status)) ? (
                <ButtonLink href={`/settlements/new?transaction=${tx.id}`} variant="secondary" className="w-full">{t("startSettlement")}</ButtonLink>
              ) : null}
              {tx.settlement ? <ButtonLink href={`/settlements/${tx.settlement.id}`} variant="secondary" className="w-full">{t("openSettlement", { reference: tx.settlement.reference })}</ButtonLink> : null}
              <a href={`/api/v1/transactions/${tx.id}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "md", "w-full")}>
                <FileText aria-hidden="true" /> {tx.seal ? t("downloadSealed") : t("viewPdf")}
              </a>
              {tx.seal && canExport ? (
                <a href={`/api/v1/transactions/${tx.id}/evidence`} className={buttonClass("secondary", "md", "w-full")}>
                  <Download aria-hidden="true" /> {t("evidencePack")}
                </a>
              ) : null}
              {(tx.seal || tx.status === "sent" || tx.status === "viewed") && canManage ? (
                <Button variant="ghost" className="w-full" loading={busy} onClick={() => void act("resend", undefined, t("resent"))}>{t("resend")}</Button>
              ) : null}
              {["draft", "sent", "viewed", "changes_requested"].includes(tx.status) && canManage ? (
                <Button variant="ghost" className="w-full text-danger-fg hover:text-danger-fg" onClick={() => setDialog("cancel")}>{t("cancel")}</Button>
              ) : null}
            </CardBody>
          </Card>
        }
        evidence={
          <EvidenceCard
            title={t("evidence")}
            empty={t("notSealed")}
            seal={tx.seal}
            reference={tx.reference}
            labels={{ sealed: t("sealed"), acceptedBy: t("acceptedBy"), otpRef: t("otpRef"), ipDevice: t("ipDevice"), verify: t("verify") }}
          />
        }
      >
        <Card>
          <CardHeader title={t("amounts")} />
          <CardBody>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Fact label={totalLabel} value={inr(tx.totalPaise)} />
              <Fact label={t("paid")} value={inr(tx.money.paidPaise)} />
              <Fact label={t("balance")} value={inr(tx.money.principalPaise)} strong />
              <Fact label={tx.type === "buyer" ? t("goodsDueBy") : t("dueDate")} value={dueWhen} tone={tx.money.daysOverdue ? "danger" : undefined} />
              <Fact label={t("interestAccrued")} value={tx.interestBp ? `${inr(tx.money.interestPaise)} · ${tx.interestBp / 100}%` : t("noInterest")} />
              {open ? <Fact label={t("dueToday")} value={inr(due)} strong /> : null}
            </dl>
          </CardBody>
        </Card>

        {tx.payments.length ? (
          <Card>
            <CardHeader title={t("payments")} />
            <ul className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
              {tx.payments.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-surface-muted p-3 text-sm">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-head text-base font-bold tabular-nums text-text">{inr(p.amountPaise)}</span>
                    <span className="text-xs font-semibold text-text-2">{t(`mode.${p.mode}`)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDate(p.paidOn)}{p.reference ? ` · ${p.reference}` : ""}</p>
                  <p className="mt-0.5 text-xs text-muted">{p.interestPaise ? t("split", { interest: inr(p.interestPaise), principal: inr(p.principalPaise) }) : t("allPrincipal")}</p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title={t("attachments")}
            action={editable && canManage ? (
              <>
                <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" aria-label={t("addFile")} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
                <Button size="sm" variant="secondary" icon={<Plus aria-hidden="true" />} loading={busy} disabled={tx.attachments.length >= 5} onClick={() => fileRef.current?.click()}>{t("addFile")}</Button>
              </>
            ) : null}
          />
          <CardBody>
            {tx.attachments.length ? (
              <ul className="space-y-2 text-sm">
                {tx.attachments.map((a) => (
                  <li key={a.id} className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-soft text-primary-text" aria-hidden="true"><Paperclip size={14} /></span>
                    <a href={`/api/v1/transactions/${tx.id}/attachments/${a.id}`} target="_blank" rel="noopener" className="min-w-0 truncate font-semibold text-primary-text underline-offset-2 hover:underline">{a.name}</a>
                    <span className="shrink-0 text-xs text-muted">{Math.ceil(a.size / 1024)} KB</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("noFiles")}</p>
            )}
          </CardBody>
        </Card>

        <ActivityLog
          title={t("activity")}
          events={tx.events.map((e) => ({
            at: e.at,
            who: e.actorName ?? t(`actor.${e.actorType}`),
            what: t.has(`event.${e.event.replace(/\./g, "_")}`) ? t(`event.${e.event.replace(/\./g, "_")}`) : e.event,
          }))}
        />
      </DetailGrid>

      <Dialog
        open={dialog === "payment"}
        onClose={() => setDialog(null)}
        title={t("recordPayment")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>{t("close")}</Button>
            <Button loading={busy} onClick={() => void act("payments", { amountPaise: toPaise(pay.amount || "0"), paidOn: pay.paidOn, mode: pay.mode, reference: pay.reference || undefined, notify: pay.notify }, t("paymentSaved"))}>
              {t("savePayment")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-semibold text-text-2">{t("dueNow", { amount: inr(due) })}</p>
          <FormField id="pay-amount" label={t("amount")} required error={errors.amountPaise}>
            <Input id="pay-amount" inputMode="decimal" value={pay.amount} invalid={Boolean(errors.amountPaise)} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="pay-date" label={t("paidOn")} required error={errors.paidOn}>
              <Input id="pay-date" type="date" value={pay.paidOn} max={istDate(new Date())} invalid={Boolean(errors.paidOn)} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} />
            </FormField>
            <FormField id="pay-mode" label={t("modeLabel")} required>
              <Select id="pay-mode" value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value as PaymentMode })}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{t(`mode.${m}`)}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField id="pay-ref" label={t("referenceLabel")}>
            <Input id="pay-ref" maxLength={40} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
          </FormField>
          <Checkbox id="pay-notify" checked={pay.notify} onChange={(e) => setPay({ ...pay, notify: e.target.checked })} label={t("notifyCounterparty")} />
          <p className="text-xs text-muted">{t("interestFirst")}</p>
        </div>
      </Dialog>

      <Dialog
        open={dialog === "paid"}
        onClose={() => setDialog(null)}
        title={t("markPaid")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>{t("close")}</Button>
            <Button loading={busy} onClick={() => void act("mark-paid", { paidOn: pay.paidOn, mode: pay.mode, reference: pay.reference || undefined }, t("markedPaid"))}>{t("markPaid")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm font-semibold text-text-2">{t("markPaidLead", { amount: inr(due) })}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="paid-date" label={t("paidOn")} required error={errors.paidOn}>
              <Input id="paid-date" type="date" value={pay.paidOn} max={istDate(new Date())} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} />
            </FormField>
            <FormField id="paid-mode" label={t("modeLabel")} required>
              <Select id="paid-mode" value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value as PaymentMode })}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{t(`mode.${m}`)}</option>)}
              </Select>
            </FormField>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={dialog === "cancel"}
        onCancel={() => setDialog(null)}
        onConfirm={() => void act("cancel", undefined, t("cancelled"))}
        title={t("cancelTitle")}
        body={tx.timeline.find((s) => s.step === "viewed")?.at ? t("cancelViewed") : t("cancelBody")}
        confirmLabel={t("cancel")}
        destructive
        busy={busy}
      />
    </div>
  );
}

// ---------------------------------------------------------------- shared with the settlement detail page

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary-text">
      <ArrowLeft size={14} aria-hidden="true" /> {children}
    </Link>
  );
}

/** Hero card: reference line, the counterparty as the heading, the status tag, the amount that matters now in the
 * brand gradient, how much is paid, and the status track. */
export function DetailHero({ meta, title, tag, amountLabel, amount, sub, paid, total, paidOfLabel, track }: {
  meta: ReactNode; title: ReactNode; tag: ReactNode; amountLabel: ReactNode; amount: ReactNode; sub?: ReactNode;
  paid: number; total: number; paidOfLabel: string; track: ReactNode;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <header className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <span className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <span className="absolute inset-0 bg-soft" />
        <span className="absolute -right-16 -top-20 size-64 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.18),transparent_65%)] blur-2xl" />
      </span>
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted sm:text-sm">{meta}</p>
            <h1 className="mt-1 break-words text-xl font-extrabold tracking-tight text-text sm:text-2xl">{title}</h1>
          </div>
          <div className="shrink-0 pt-0.5">{tag}</div>
        </div>
        <div className="animate-rise mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <SectionLabel>{amountLabel}</SectionLabel>
            <p className="text-gradient mt-2 font-head text-[2rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-[2.5rem]">{amount}</p>
            {sub ? <p className="mt-2 text-xs text-muted">{sub}</p> : null}
          </div>
          {total > 0 ? (
            <div className="w-full sm:w-56">
              <p className="text-xs font-medium text-text-2">{paidOfLabel}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-strong" role="progressbar" aria-label={paidOfLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <div className="h-full origin-left animate-[cb-grow-x_0.8s_cubic-bezier(0.2,0.7,0.2,1)_both] rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-5 border-t border-border pt-4">{track}</div>
      </div>
    </header>
  );
}

/** Horizontal status track: done steps filled, the next one ringed. Dates show under the steps from tablet width. */
export function StatusTrack({ label, steps }: { label: string; steps: { key: string; label: string; at: string | null }[] }) {
  const last = steps.reduce((acc, s, i) => (s.at ? i : acc), -1);
  return (
    <ol aria-label={label} className="flex w-full">
      {steps.map((s, i) => {
        const when = s.at ? formatDateTimeIst(new Date(s.at)) : undefined;
        return (
          <li key={s.key} className="relative flex min-w-0 flex-1 flex-col items-center px-0.5 text-center" title={when} aria-current={i === last + 1 ? "step" : undefined}>
            {i > 0 ? <span className={cn("absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2", i <= last ? "bg-brand" : "bg-surface-strong")} aria-hidden="true" /> : null}
            <span
              className={cn(
                "relative flex size-6 items-center justify-center rounded-full",
                s.at ? "bg-brand text-white shadow-orange" : i === last + 1 ? "border-2 border-primary bg-surface text-primary-text" : "border border-border-strong bg-surface text-subtle",
              )}
              aria-hidden="true"
            >
              {s.at ? <Check size={13} strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <span className={cn("mt-1.5 block w-full break-words text-[11px] font-semibold leading-tight sm:text-xs", s.at ? "text-text" : "text-muted")}>{s.label}</span>
            {when ? <span className="mt-0.5 hidden text-[10.5px] leading-tight text-muted sm:block">{when}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Two columns on large screens (content, then a sticky side column); on phones the actions come first and the
 * evidence last. */
export function DetailGrid({ actions, evidence, children }: { actions: ReactNode; evidence: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="order-2 min-w-0 space-y-5 lg:order-none">{children}</div>
      <div className="contents lg:sticky lg:top-20 lg:block lg:space-y-5">
        <div className="order-1 lg:order-none">{actions}</div>
        <div className="order-3 lg:order-none">{evidence}</div>
      </div>
    </div>
  );
}

export function EvidenceCard({ title, empty, seal, reference, labels }: {
  title: string; empty: string; reference: string;
  seal: { sha256: string; sealedAt: string; acceptedName: string; mobileMasked: string; otpRef: string; ip: string | null; device: string | null; verifyUrl: string } | null;
  labels: { sealed: string; acceptedBy: string; otpRef: string; ipDevice: string; verify: string };
}) {
  return (
    <Card>
      <CardHeader title={<span className="inline-flex items-center gap-2"><ShieldCheck size={16} className={seal ? "text-success-fg" : "text-subtle"} aria-hidden="true" />{title}</span>} />
      <CardBody>
        {seal ? (
          <dl className="space-y-2.5 text-sm">
            <Line label={labels.sealed} value={formatDateTimeIst(new Date(seal.sealedAt))} />
            <Line label="SHA-256" value={<span className="block break-all font-mono text-[11px] leading-snug text-text-2">{seal.sha256}</span>} />
            <Line label={labels.acceptedBy} value={`${seal.acceptedName}, ${seal.mobileMasked}`} />
            <Line label={labels.otpRef} value={seal.otpRef} />
            <Line label={labels.ipDevice} value={`${seal.ip ?? "—"} · ${seal.device ?? "—"}`} />
            <Line label={labels.verify} value={<a href={seal.verifyUrl} className="font-semibold text-primary-text underline underline-offset-2">{reference}</a>} />
          </dl>
        ) : (
          <p className="text-sm text-muted">{empty}</p>
        )}
      </CardBody>
    </Card>
  );
}

/** The activity log as a vertical timeline (reads well on phones; no table to scroll). */
export function ActivityLog({ title, events }: { title: string; events: { at: string; who: string; what: string }[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <ol className="px-4 py-4 sm:px-5">
        {events.map((e, i) => (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < events.length - 1 ? <span className="absolute left-[4.5px] top-3 h-full w-px bg-border" aria-hidden="true" /> : null}
            <span className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", i === 0 ? "bg-brand" : "border border-border-strong bg-surface")} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{e.what}</p>
              <p className="text-xs text-muted">{e.who} · <span className="tabular-nums">{formatDateTimeIst(new Date(e.at), true)}</span></p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** One figure in the amounts card: a small label over the value, in a soft tile. */
export function Fact({ label, value, strong, tone }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: "danger" }) {
  return (
    <div className={cn("min-w-0 rounded-xl px-3 py-2.5", strong ? "bg-primary-softer" : "bg-surface-muted")}>
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className={cn("mt-0.5 break-words tabular-nums", strong ? "font-bold text-text" : "font-semibold text-text-2", tone === "danger" && "text-danger-fg")}>{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.8px] text-subtle">{label}</dt>
      <dd className="mt-0.5 min-w-0 break-words font-medium text-text">{value}</dd>
    </div>
  );
}
