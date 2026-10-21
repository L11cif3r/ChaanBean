"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileText, Lock, Paperclip, ShieldCheck } from "lucide-react";
import { Button, Checkbox, FormField, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { OtpInput } from "@/components/ui/otp-input";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTimeIst } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { REJECT_REASONS } from "@/lib/transactions";
import type { AgreementPageView } from "@/server/transactions/public";

// S15 (PRD v3.0 Figure 21), phone first: 1 who shared it, 2 summary with the balance up front, 3 terms and the full
// agreement, 4 OTP to the mobile on record, 5 I Accept (after the OTP and the box) / Request changes (comment
// required) / Reject (reason optional), 6 notice that time, device and OTP reference are recorded and both parties
// get a copy. The hero, step and decision pieces are shared with the debtor's settlement page.

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

export function AgreementFlow({ token, initial: v }: { token: string; initial: AgreementPageView }) {
  const t = useTranslations("agreement");
  const router = useRouter();
  const base = `/api/v1/public/agreements/${token}`;
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [ack, setAck] = useState(false);
  const [someoneElse, setSomeoneElse] = useState(false);
  const [name, setName] = useState("");
  const [dialog, setDialog] = useState<"changes" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function call<T>(key: string, path: string, body?: unknown) {
    setBusy(key);
    setErrors({});
    const res = await api<T>(`${base}${path}`, { body: body ?? {} });
    setBusy(null);
    if (!res.ok) {
      setErrors(res.error.fields && Object.keys(res.error.fields).length ? res.error.fields : { _: res.error.message });
      return null;
    }
    return res.data;
  }

  async function sendOtp() {
    const res = await call<{ resendAfterSeconds: number }>("otp", "/otp");
    if (!res) return;
    setOtpSent(true);
    setOtp("");
    setResendIn(res.resendAfterSeconds);
  }

  async function decide(body: Record<string, unknown>) {
    const done = await call("decide", "/decision", body);
    if (done !== null) {
      setDialog(null);
      router.refresh();
    } else if (body.decision === "ACCEPT") {
      setOtp(""); // a wrong or expired code: type it again
    }
  }

  const s = v.summary;
  const hero = (
    <PublicHero
      eyebrow={t("eyebrow")}
      title={t(`title.${v.type}`, { requester: v.requester.name })}
      meta={`${v.reference} · ${t("version", { n: v.version })}`}
      amountLabel={t("balance")}
      amount={inr(s.balancePaise)}
      facts={[
        [v.type === "lender" ? t("loanRef") : t("invoice"), s.invoiceNo ?? "—"],
        [v.type === "lender" ? t("principal") : t("total"), inr(s.totalPaise)],
        [v.type === "buyer" ? t("advance") : t("paid"), inr(s.paidPaise)],
        [v.type === "buyer" ? t("goodsDueBy") : t("dueDate"), formatDate(s.dueDate)],
        [t("interest"), s.interestBp ? t("interestValue", { rate: s.interestBp / 100 }) : t("noInterest")],
      ]}
    />
  );
  const contact = (
    <p className="text-center text-xs text-muted">
      {v.requester.phone ? t("questions", { requester: v.requester.name, phone: v.requester.phone }) : t("questionsNoPhone", { requester: v.requester.name })} {t("poweredBy")}
    </p>
  );
  const documents = (
    <div className="space-y-2">
      <a href={`${base}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "md", "w-full")}>
        <FileText aria-hidden="true" /> {v.sealedAt ? t("downloadSealed") : t("viewFull")}
      </a>
      {v.attachments.map((a) => (
        <a key={a.id} href={`${base}/attachments/${a.id}`} target="_blank" rel="noopener" className="flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-primary-text underline-offset-2 hover:underline">
          <Paperclip size={14} className="shrink-0" aria-hidden="true" /> <span className="min-w-0 truncate">{t("attachment", { name: a.name })}</span>
        </a>
      ))}
    </div>
  );

  if (v.status !== "sent" && v.status !== "viewed") {
    const sealed = Boolean(v.sealedAt);
    const body = sealed
      ? t("acceptedBody", { at: formatDateTimeIst(new Date(v.sealedAt!)) })
      : v.status === "changes_requested" ? t("changesBody", { requester: v.requester.name })
        : v.status === "rejected" ? t("rejectedBody", { requester: v.requester.name })
          : v.status === "expired" ? t("expiredBody", { requester: v.requester.name })
            : v.status === "cancelled" ? t("cancelledBody", { requester: v.requester.name })
              : t("closedBody");
    return (
      <div className="space-y-4">
        {hero}
        <StatusNote sealed={sealed}>{body}</StatusNote>
        {sealed ? documents : null}
        {contact}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hero}

      <PublicCard>
        <TermsList title={t("clausesTitle")} count={t("clausesCount", { count: v.clauses.length })} clauses={v.clauses} extra={v.terms.trim() ? <><span className="font-semibold">{t("additionalTerms")}</span> {v.terms}</> : null} />
        {documents}
      </PublicCard>

      {v.testMode ? <p className="rounded-xl bg-warning-bg px-4 py-2 text-xs font-semibold text-warning-fg">{t("testMode")}</p> : null}

      <PublicCard>
        <section aria-labelledby="otp-title" className="space-y-3">
          <StepTitle n={1} id="otp-title" done={otp.length === 6}>{t("verify", { mobile: v.mobileMasked })}</StepTitle>
          {!otpSent ? (
            <Button className="w-full" onClick={() => void sendOtp()} loading={busy === "otp"}>{t("sendOtp")}</Button>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-center">
                <OtpInput value={otp} onChange={setOtp} invalid={Boolean(errors.otp)} label={t("otpLabel")} describedBy={errors.otp ? "otp-error" : undefined} />
              </div>
              {errors.otp ? <p id="otp-error" role="alert" className="text-center text-sm font-medium text-danger-fg">{errors.otp}</p> : null}
              <div className="text-center">
                <button type="button" className="min-h-10 px-2 text-sm font-semibold text-primary-text underline-offset-2 hover:underline disabled:text-muted disabled:no-underline" disabled={resendIn > 0 || busy === "otp"} onClick={() => void sendOtp()}>
                  {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="space-y-3 border-t border-border pt-4">
          <StepTitle n={2} done={ack}>{t("confirmStep")}</StepTitle>
          <div className="space-y-3 rounded-xl border border-border bg-surface-muted/60 p-3">
            <Checkbox id="ack" checked={ack} onChange={(e) => setAck(e.target.checked)} label={t(`ack.${v.type}`)} />
            <Checkbox id="someone" checked={someoneElse} onChange={(e) => setSomeoneElse(e.target.checked)} label={t("notContact", { name: v.contactName })} />
            {someoneElse ? (
              <FormField id="accept-name" label={t("yourName")} error={errors.acceptedName}>
                <Input id="accept-name" value={name} maxLength={120} autoComplete="name" onChange={(e) => setName(e.target.value)} />
              </FormField>
            ) : null}
          </div>
        </div>

        {errors._ ? <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{errors._}</p> : null}
        <Decision
          accept={
            <Button
              className="h-12 w-full text-[15px]"
              disabled={otp.length !== 6 || !ack || (someoneElse && name.trim().length < 2)}
              loading={busy === "decide" && !dialog}
              icon={<CheckCircle2 size={18} aria-hidden="true" />}
              onClick={() => void decide({ decision: "ACCEPT", otp, acknowledged: true, acceptedName: someoneElse ? name : undefined })}
            >
              {t("accept")}
            </Button>
          }
          other={<Button variant="secondary" onClick={() => setDialog("changes")}>{t("requestChanges")}</Button>}
          reject={<Button variant="secondary" className="text-danger-fg hover:text-danger-fg" onClick={() => setDialog("reject")}>{t("reject")}</Button>}
          notice={t("notice")}
          until={v.linkExpiresAt ? t("linkValid", { until: formatDateTimeIst(new Date(v.linkExpiresAt)) }) : null}
        />
      </PublicCard>
      {contact}

      <Dialog
        open={dialog === "changes"}
        onClose={() => setDialog(null)}
        title={t("changesTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>{t("close")}</Button>
            <Button loading={busy === "decide"} disabled={comment.trim().length < 10} onClick={() => void decide({ decision: "CHANGES", comment })}>{t("sendChanges")}</Button>
          </>
        }
      >
        <FormField id="changes" label={t("changesLabel")} hint={t("changesHint")} error={errors.comment}>
          <Textarea id="changes" rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
        </FormField>
      </Dialog>

      <Dialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={t("rejectTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>{t("close")}</Button>
            <Button variant="danger" loading={busy === "decide"} onClick={() => void decide({ decision: "REJECT", reason: reason || undefined })}>{t("reject")}</Button>
          </>
        }
      >
        <FormField id="reason" label={t("reasonLabel")}>
          <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">{t("noReasonGiven")}</option>
            {REJECT_REASONS.map((r) => <option key={r} value={r}>{t(`reason.${r}`)}</option>)}
          </Select>
        </FormField>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- shared with the settlement page (/s)

export function PublicCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5", className)}>{children}</section>;
}

/** Who sent it, the headline amount in the brand gradient, and the key facts in a two-column grid. */
export function PublicHero({ eyebrow, title, meta, amountLabel, amount, facts, children }: {
  eyebrow: string; title: string; meta: string; amountLabel: string; amount: string; facts: [string, ReactNode][]; children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <span className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <span className="absolute inset-0 bg-soft" />
        <span className="absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.2),transparent_65%)] blur-2xl" />
      </span>
      <div className="p-4 sm:p-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-text-2 shadow-sm">
          <ShieldCheck size={13} className="text-primary-text" aria-hidden="true" /> {eyebrow}
        </span>
        <h1 className="mt-3 text-[1.35rem] font-extrabold leading-tight tracking-tight text-text [text-wrap:balance]">{title}</h1>
        <p className="mt-1 text-xs text-muted">{meta}</p>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">{amountLabel}</p>
        <p className="text-gradient animate-rise mt-1 font-head text-[2.25rem] font-extrabold leading-none tracking-tight tabular-nums">{amount}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {facts.map(([k, val]) => (
            <div key={k} className="min-w-0 rounded-xl bg-surface/80 px-3 py-2">
              <dt className="truncate text-[11px] font-medium text-muted">{k}</dt>
              <dd className="mt-0.5 break-words font-semibold tabular-nums text-text">{val}</dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </section>
  );
}

export function TermsList({ title, count, clauses, extra }: { title: string; count: string; clauses: string[]; extra: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5 text-sm">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 font-bold text-text">
        {title}
        <span className="text-xs font-medium text-muted">{count}</span>
      </summary>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-text-2">
        {clauses.map((c) => <li key={c}>{c}</li>)}
      </ol>
      {extra ? <p className="mt-2 whitespace-pre-wrap text-text-2">{extra}</p> : null}
    </details>
  );
}

export function StepTitle({ n, id, done, children }: { n: number; id?: string; done?: boolean; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-[15px] font-bold text-text">
      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", done ? "bg-success-bg text-success-fg" : "bg-brand text-white")} aria-hidden="true">
        {done ? <CheckCircle2 size={14} /> : n}
      </span>
      {children}
    </h2>
  );
}

/** The big accept button, then the two other answers side by side, then the small print. */
export function Decision({ accept, other, reject, notice, until }: { accept: ReactNode; other: ReactNode; reject: ReactNode; notice: string; until: string | null }) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      {accept}
      <div className="grid grid-cols-2 gap-2">
        {other}
        {reject}
      </div>
      <p className="flex items-start gap-2 text-xs text-muted">
        <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{notice}{until ? ` ${until}` : ""}</span>
      </p>
    </div>
  );
}

export function StatusNote({ sealed, children }: { sealed: boolean; children: ReactNode }) {
  return (
    <p role="status" className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-semibold", sealed ? "bg-success-bg text-success-fg" : "border border-border bg-surface text-text-2")}>
      {sealed ? <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : null}
      {children}
    </p>
  );
}
