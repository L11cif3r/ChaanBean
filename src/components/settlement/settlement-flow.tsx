"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, CheckCircle2, FileText } from "lucide-react";
import { Button, Checkbox, FormField, Input, Textarea, buttonClass } from "@/components/ui";
import { Decision, PublicCard, PublicHero, StatusNote, StepTitle, TermsList } from "@/components/agreement/agreement-flow";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { OtpInput } from "@/components/ui/otp-input";
import { ScheduleEditor } from "@/components/settlements/schedule-editor";
import { api } from "@/lib/api-client";
import { addDays, formatDate, formatDateTimeIst, istDate } from "@/lib/dates";
import { formatInr } from "@/lib/money";
import { rupees, toPaise, type ScheduleRowDraft } from "@/lib/settlement-draft";
import type { SettlementPageView } from "@/server/settlements/public";

// The debtor's E-Settlement page (PRD v3.0 8.7, FR-ES-03), phone first: who offers it, what was owed and the offer,
// the payment schedule and the default clause, the full PDF; then accept with the OTP sent to the mobile on record and
// an acknowledgement, make a counter-proposal (another amount or other dates), or reject.

const inr = (paise: number) => formatInr(BigInt(Math.round(paise)), { withPaise: true });

export function SettlementFlow({ token, initial: v }: { token: string; initial: SettlementPageView }) {
  const t = useTranslations("settlementPage");
  const ta = useTranslations("agreement");
  const router = useRouter();
  const base = `/api/v1/public/settlements/${token}`;
  const toPay = v.settlementPaise + v.interestAgreedPaise;
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [ack, setAck] = useState(false);
  const [someoneElse, setSomeoneElse] = useState(false);
  const [name, setName] = useState("");
  const [dialog, setDialog] = useState<"counter" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [counter, setCounter] = useState({
    amount: rupees(toPay),
    mode: v.mode,
    fullDate: v.mode === "full" ? v.rows[0]?.dueDate ?? addDays(istDate(new Date()), 7) : addDays(istDate(new Date()), 7),
    rows: v.rows.map((r): ScheduleRowDraft => ({ dueDate: r.dueDate, amount: rupees(r.amountPaise) })),
  });
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
      setOtp("");
    }
  }

  const hero = (
    <PublicHero
      eyebrow={t("eyebrow")}
      title={t("title", { requester: v.requester.name })}
      meta={`${v.reference} · ${ta("version", { n: v.version })} · ${t("settles", { original: v.original })}`}
      amountLabel={t("toPay")}
      amount={inr(toPay)}
      facts={[
        [t("owed", { date: formatDate(v.owedOn) }), inr(v.owedPaise)],
        [t("settlement"), inr(v.settlementPaise)],
        [t("interestAgreed"), inr(v.interestAgreedPaise)],
        [v.waivedPaise >= 0 ? t("waived") : t("extra"), inr(Math.abs(v.waivedPaise))],
      ]}
    />
  );
  const contact = (
    <p className="text-center text-xs text-muted">
      {v.requester.phone ? ta("questions", { requester: v.requester.name, phone: v.requester.phone }) : ta("questionsNoPhone", { requester: v.requester.name })} {ta("poweredBy")}
    </p>
  );
  const schedule = (
    <div className="rounded-xl border border-border p-3 text-sm">
      <p className="flex items-center gap-2 font-bold text-text">
        <CalendarClock size={15} className="text-primary-text" aria-hidden="true" />
        {v.mode === "full" ? t("oneDate") : t("instalments", { count: v.rows.length })}
      </p>
      <ol className="mt-2 divide-y divide-border">
        {v.rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2 tabular-nums">
            <span className="flex items-center gap-2 text-text-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-surface-muted text-[11px] font-bold text-muted" aria-hidden="true">{i + 1}</span>
              {formatDate(r.dueDate)}
            </span>
            <span className="font-semibold text-text">{inr(r.amountPaise)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
  const pdf = (
    <a href={`${base}/pdf`} target="_blank" rel="noopener" className={buttonClass("secondary", "md", "w-full")}>
      <FileText aria-hidden="true" /> {v.sealedAt ? t("downloadSealed") : t("viewFull")}
    </a>
  );

  if (v.status !== "sent" && v.status !== "viewed") {
    const sealed = Boolean(v.sealedAt);
    const body = sealed
      ? t("acceptedBody", { at: formatDateTimeIst(new Date(v.sealedAt!)) })
      : v.status === "counter_proposed" ? t("counterBody", { requester: v.requester.name })
        : v.status === "rejected" ? t("rejectedBody", { requester: v.requester.name })
          : v.status === "expired" ? ta("expiredBody", { requester: v.requester.name })
            : v.status === "cancelled" ? t("cancelledBody", { requester: v.requester.name })
              : t("closedBody");
    return (
      <div className="space-y-4">
        {hero}
        <StatusNote sealed={sealed}>{body}</StatusNote>
        {sealed ? <PublicCard>{schedule}{pdf}</PublicCard> : null}
        {contact}
      </div>
    );
  }

  const counterTotal = toPaise(counter.amount);
  const counterBody = () => ({
    decision: "COUNTER",
    amountPaise: counterTotal,
    mode: counter.mode,
    fullDate: counter.mode === "full" ? counter.fullDate : undefined,
    instalments: counter.mode === "instalments" ? counter.rows.map((r) => ({ dueDate: r.dueDate, amountPaise: toPaise(r.amount) })) : [],
    comment,
  });

  return (
    <div className="space-y-4">
      {hero}

      <PublicCard>
        {schedule}
        <TermsList title={ta("clausesTitle")} count={ta("clausesCount", { count: v.clauses.length })} clauses={v.clauses} extra={v.terms.trim() ? <><span className="font-semibold">{ta("additionalTerms")}</span> {v.terms}</> : null} />
        {pdf}
      </PublicCard>

      {v.testMode ? <p className="rounded-xl bg-warning-bg px-4 py-2 text-xs font-semibold text-warning-fg">{ta("testMode")}</p> : null}

      <PublicCard>
        <section aria-labelledby="otp-title" className="space-y-3">
          <StepTitle n={1} id="otp-title" done={otp.length === 6}>{ta("verify", { mobile: v.mobileMasked })}</StepTitle>
          {!otpSent ? (
            <Button className="w-full" onClick={() => void sendOtp()} loading={busy === "otp"}>{ta("sendOtp")}</Button>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-center">
                <OtpInput value={otp} onChange={setOtp} invalid={Boolean(errors.otp)} label={ta("otpLabel")} describedBy={errors.otp ? "otp-error" : undefined} />
              </div>
              {errors.otp ? <p id="otp-error" role="alert" className="text-center text-sm font-medium text-danger-fg">{errors.otp}</p> : null}
              <div className="text-center">
                <button type="button" className="min-h-10 px-2 text-sm font-semibold text-primary-text underline-offset-2 hover:underline disabled:text-muted disabled:no-underline" disabled={resendIn > 0 || busy === "otp"} onClick={() => void sendOtp()}>
                  {resendIn > 0 ? ta("resendIn", { seconds: resendIn }) : ta("resend")}
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="space-y-3 border-t border-border pt-4">
          <StepTitle n={2} done={ack}>{ta("confirmStep")}</StepTitle>
          <div className="space-y-3 rounded-xl border border-border bg-surface-muted/60 p-3">
            <Checkbox id="ack" checked={ack} onChange={(e) => setAck(e.target.checked)} label={t("ack", { amount: inr(toPay) })} />
            <Checkbox id="someone" checked={someoneElse} onChange={(e) => setSomeoneElse(e.target.checked)} label={ta("notContact", { name: v.contactName })} />
            {someoneElse ? (
              <FormField id="accept-name" label={ta("yourName")} error={errors.acceptedName}>
                <Input id="accept-name" value={name} maxLength={120} autoComplete="name" onChange={(e) => setName(e.target.value)} />
              </FormField>
            ) : null}
          </div>
        </div>

        {errors._ && !dialog ? <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{errors._}</p> : null}
        <Decision
          accept={
            <Button
              className="h-12 w-full text-[15px]"
              disabled={otp.length !== 6 || !ack || (someoneElse && name.trim().length < 2)}
              loading={busy === "decide" && !dialog}
              icon={<CheckCircle2 size={18} aria-hidden="true" />}
              onClick={() => void decide({ decision: "ACCEPT", otp, acknowledged: true, acceptedName: someoneElse ? name : undefined })}
            >
              {ta("accept")}
            </Button>
          }
          other={<Button variant="secondary" onClick={() => setDialog("counter")}>{t("counter")}</Button>}
          reject={<Button variant="secondary" className="text-danger-fg hover:text-danger-fg" onClick={() => setDialog("reject")}>{ta("reject")}</Button>}
          notice={ta("notice")}
          until={v.linkExpiresAt ? ta("linkValid", { until: formatDateTimeIst(new Date(v.linkExpiresAt)) }) : null}
        />
      </PublicCard>
      {contact}

      <Dialog
        open={dialog === "counter"}
        onClose={() => setDialog(null)}
        title={t("counterTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>{ta("close")}</Button>
            <Button loading={busy === "decide"} onClick={() => void decide(counterBody())}>{t("sendCounter")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t("counterLead", { owed: inr(v.owedPaise) })}</p>
          <FormField id="c-amount" label={t("counterAmount")} required error={errors.amountPaise}>
            <Input id="c-amount" inputMode="decimal" value={counter.amount} invalid={Boolean(errors.amountPaise)} onChange={(e) => setCounter({ ...counter, amount: e.target.value })} />
          </FormField>
          <div role="radiogroup" aria-label={t("howToPay")} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-strong p-1">
            {(["full", "instalments"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={counter.mode === m} onClick={() => setCounter({ ...counter, mode: m })}
              className={cn("min-h-10 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150", counter.mode === m ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text")}>
                {t(`mode.${m}`)}
              </button>
            ))}
          </div>
          {counter.mode === "full" ? (
            <FormField id="c-date" label={t("payBy")} required error={errors.fullDate}>
              <Input id="c-date" type="date" min={istDate(new Date())} value={counter.fullDate} invalid={Boolean(errors.fullDate)} onChange={(e) => setCounter({ ...counter, fullDate: e.target.value })} />
            </FormField>
          ) : (
            <ScheduleEditor id="c-rows" compact rows={counter.rows} onChange={(rows) => setCounter({ ...counter, rows })} totalPaise={counterTotal} errors={errors} />
          )}
          <FormField id="c-comment" label={t("counterComment")} hint={t("counterCommentHint")}>
            <Textarea id="c-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
          </FormField>
          {errors._ ? <p role="alert" className="text-sm font-semibold text-danger-fg">{errors._}</p> : null}
        </div>
      </Dialog>

      <Dialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={t("rejectTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>{ta("close")}</Button>
            <Button variant="danger" loading={busy === "decide"} onClick={() => void decide({ decision: "REJECT", comment: comment || undefined })}>{ta("reject")}</Button>
          </>
        }
      >
        <FormField id="reject-comment" label={t("rejectComment")}>
          <Textarea id="reject-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
        </FormField>
      </Dialog>
    </div>
  );
}
