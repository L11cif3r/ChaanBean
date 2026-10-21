"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Clock, Eye, Hourglass, Lock, ShieldCheck, Target, Undo2, XCircle } from "lucide-react";
import { Button, Checkbox, FormField, GradientText, Input, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/dialog";
import { OtpInput } from "@/components/ui/otp-input";
import { api } from "@/lib/api-client";
import { formatDateTimeIst } from "@/lib/dates";
import type { ConsentPageView } from "@/server/consent/service";

// S10 (PRD v2.0 Figure 7): what the buyer sees on the phone. 1 who is asking, 2 what and why, 3 mobile OTP,
// 4 GST portal access when GST turnover is asked, bureau details when CIBIL is asked, 5 consent box, 6 approve or
// decline. After a yes the same link shows the approval and lets the buyer withdraw (after an OTP).

type Errors = Record<string, string>;

export function ConsentFlow({ token, initial: v }: { token: string; initial: ConsentPageView }) {
  const t = useTranslations("consent");
  const router = useRouter();
  const base = `/api/v1/public/consent/${token}`;
  const when = (iso: string) => formatDateTimeIst(new Date(iso));

  const [verified, setVerified] = useState(v.verified);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [gstUser, setGstUser] = useState("");
  const [gstSent, setGstSent] = useState(false);
  const [gstOtp, setGstOtp] = useState("");
  const [gstOk, setGstOk] = useState(v.gstVerified);
  const [bureau, setBureau] = useState({ companyPan: "", incorporatedOn: "", personalPan: "", birthDate: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"decline" | "withdraw" | null>(null);

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

  async function verifyOtp(code: string) {
    if ((await call("verify", "/verify", { otp: code })) !== null) setVerified(true);
    else setOtp("");
  }

  async function sendGstOtp() {
    if ((await call("gst", "/gst-otp", { gstUsername: gstUser })) !== null) setGstSent(true);
  }

  async function verifyGstOtp(code: string) {
    if ((await call("gstVerify", "/gst-verify", { gstOtp: code })) !== null) setGstOk(true);
    else setGstOtp("");
  }

  async function approve() {
    const body = {
      decision: "APPROVE",
      agree: true,
      ...(v.needs.companyBureau ? { companyPan: bureau.companyPan, incorporatedOn: bureau.incorporatedOn || undefined } : {}),
      ...(v.needs.personalBureau ? { personalPan: bureau.personalPan, birthDate: bureau.birthDate || undefined } : {}),
    };
    if ((await call("approve", "/decision", body)) !== null) router.refresh();
  }

  async function finish(kind: "decline" | "withdraw") {
    const done = await call(kind, kind === "decline" ? "/decision" : "/withdraw", kind === "decline" ? { decision: "DECLINE" } : undefined);
    setConfirm(null);
    if (done !== null) router.refresh();
  }

  const g = (chunks: React.ReactNode) => <GradientText>{chunks}</GradientText>;
  const initials = v.requester.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

  // 1 Who is asking: the requester's initials, the question in one line, and whose data it is.
  const header = (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
      <span className="pointer-events-none absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.22),transparent_65%)] blur-2xl" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand font-head text-[15px] font-extrabold text-white shadow-orange" aria-hidden="true">
          {initials}
        </span>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-subtle">
          <ShieldCheck size={13} className="text-primary-text" aria-hidden="true" />
          {t("eyebrow")}
        </p>
      </div>
      <h1 className="mt-3 font-head text-[1.4rem] font-extrabold leading-tight tracking-tight text-text [text-wrap:balance] sm:text-2xl">
        {v.subjectKind === "person" ? t.rich("titlePerson", { requester: v.requester.name, g }) : t.rich("title", { requester: v.requester.name, g })}
      </h1>
      <div className="mt-3">
        <Tag tone="info">{v.subjectKind === "person" ? t("forPerson", { name: v.subjectName ?? "", business: v.buyerName }) : t("forBusiness", { name: v.buyerName })}</Tag>
      </div>
    </section>
  );

  const contact = (
    <p className="px-1 text-center text-xs leading-relaxed text-muted">
      {v.requester.contactPhone
        ? t("questions", { requester: v.requester.name, phone: v.requester.contactPhone })
        : t("questionsNoPhone", { requester: v.requester.name })}{" "}
      {t("poweredBy")}{" "}
      <Link href="/legal/privacy" className="underline underline-offset-2">{t("privacy")}</Link>
    </p>
  );

  const generalError = errors._ ? <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{errors._}</p> : null;

  const testBanner = v.testMode ? <p className="rounded-xl bg-warning-bg px-4 py-2 text-xs font-semibold text-warning-fg">{t("testMode")}</p> : null;

  // ---------------------------------------------------------------- closed states

  if (v.status !== "pending" && v.status !== "approved") {
    const body =
      v.status === "declined" ? t("declinedBody", { requester: v.requester.name, at: when(v.declinedAt!) })
      : v.status === "withdrawn" ? t("withdrawnBody", { requester: v.requester.name, at: when(v.withdrawnAt!) })
      : t("expiredBody", { requester: v.requester.name });
    const Icon = v.status === "declined" ? XCircle : v.status === "withdrawn" ? Undo2 : Hourglass;
    return (
      <div className="space-y-4">
        {header}
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm" role="status">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-strong text-muted" aria-hidden="true">
            <Icon size={18} />
          </span>
          <p className="pt-0.5 text-sm font-semibold text-text-2">{body}</p>
        </div>
        {contact}
      </div>
    );
  }

  const otpStep = (purposeKey: "verifyTitle" | "verifyWithdraw", n?: number) => (
    <Step id="otp-title" n={n} done={verified} title={t(purposeKey, { mobile: v.mobileMasked })}>
      {verified ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-success-fg"><CheckCircle2 size={16} aria-hidden="true" /> {t("verified")}</p>
      ) : !otpSent ? (
        <Button className="w-full sm:w-auto" onClick={() => void sendOtp()} loading={busy === "otp"}>{t("sendOtp")}</Button>
      ) : (
        <div className="space-y-2.5">
          <BigOtp>
            <OtpInput value={otp} onChange={setOtp} onComplete={(c) => void verifyOtp(c)} disabled={busy === "verify"} invalid={Boolean(errors.otp)} label={t("otpLabel")} describedBy={errors.otp ? "otp-error" : undefined} />
          </BigOtp>
          {errors.otp ? <p id="otp-error" role="alert" className="text-sm font-medium text-danger-fg">{errors.otp}</p> : null}
          <button type="button" className="min-h-10 text-sm font-semibold text-primary-text underline-offset-2 hover:underline disabled:text-muted disabled:no-underline" disabled={resendIn > 0 || busy === "otp"} onClick={() => void sendOtp()}>
            {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
          </button>
        </div>
      )}
    </Step>
  );

  // ---------------------------------------------------------------- already approved: show it, allow withdrawal

  if (v.status === "approved") {
    return (
      <div className="space-y-4">
        {header}
        <p className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success-bg p-4 text-sm font-semibold text-success-fg" role="status">
          <ShieldCheck size={20} className="mt-px shrink-0" aria-hidden="true" />
          {t("approvedBody", { at: when(v.approvedAt!), requester: v.requester.name, until: when(v.visibleUntil!) })}
        </p>
        <WhatAndWhy v={v} />
        {testBanner}
        {otpStep("verifyWithdraw")}
        {generalError}
        <div className="space-y-2">
          <Button variant="secondary" className="w-full border-danger-fg/40 text-danger-fg" disabled={!verified} onClick={() => setConfirm("withdraw")}>
            {t("withdraw")}
          </Button>
          <p className="px-1 text-xs text-muted">{t("withdrawNote")}</p>
        </div>
        {contact}
        <ConfirmDialog
          open={confirm === "withdraw"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void finish("withdraw")}
          title={t("withdrawTitle")}
          body={t("withdrawConfirm", { requester: v.requester.name })}
          confirmLabel={t("withdraw")}
          destructive
          busy={busy === "withdraw"}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------- pending: the full flow

  const bureauReady =
    (!v.needs.companyBureau || (bureau.companyPan.trim().length === 10 && bureau.incorporatedOn)) &&
    (!v.needs.personalBureau || (bureau.personalPan.trim().length === 10 && bureau.birthDate));
  const canApprove = verified && (!v.needs.gst || gstOk) && Boolean(bureauReady) && agree;
  const field = (key: keyof typeof bureau) => ({
    value: bureau[key],
    invalid: Boolean(errors[key]),
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBureau((b) => ({ ...b, [key]: key.endsWith("Pan") ? e.target.value.toUpperCase() : e.target.value })),
  });

  return (
    <div className="space-y-4">
      {header}
      <WhatAndWhy v={v} />
      {testBanner}
      {otpStep("verifyTitle", 1)}

      {v.needs.gst ? (
        <Step id="gst-title" n={2} done={gstOk} title={t("gstTitle")}>
          {gstOk ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-success-fg"><CheckCircle2 size={16} aria-hidden="true" /> {t("gstDone")}</p>
          ) : (
            <div className="space-y-3">
              <ol className="space-y-1.5 text-[13px] text-text-2">
                {(["gstStep1", "gstStep2", "gstStep3"] as const).map((k, i) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-surface-strong text-[11px] font-bold text-muted" aria-hidden="true">{i + 1}</span>
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ol>
              <FormField id="gst-username" label={t("gstUsername")} error={errors.gstUsername}>
                <Input id="gst-username" value={gstUser} autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={!verified || gstSent} invalid={Boolean(errors.gstUsername)} onChange={(e) => setGstUser(e.target.value)} />
              </FormField>
              {!gstSent ? (
                <Button variant="secondary" className="w-full sm:w-auto" disabled={!verified || !gstUser.trim()} loading={busy === "gst"} onClick={() => void sendGstOtp()}>{t("gstSend")}</Button>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[13px] text-muted">{t("gstOtpHint")}</p>
                  <BigOtp>
                    <OtpInput value={gstOtp} onChange={setGstOtp} onComplete={(c) => void verifyGstOtp(c)} disabled={busy === "gstVerify"} invalid={Boolean(errors.gstOtp)} label={t("gstOtpLabel")} describedBy={errors.gstOtp ? "gst-otp-error" : undefined} />
                  </BigOtp>
                  {errors.gstOtp ? <p id="gst-otp-error" role="alert" className="text-sm font-medium text-danger-fg">{errors.gstOtp}</p> : null}
                  <button type="button" className="min-h-10 text-sm font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => { setGstSent(false); setGstOtp(""); }}>
                    {t("gstChange")}
                  </button>
                </div>
              )}
              {!verified ? <p className="flex items-center gap-1.5 text-xs text-muted"><Lock size={12} aria-hidden="true" />{t("verifyFirst")}</p> : null}
            </div>
          )}
        </Step>
      ) : null}

      {v.needs.companyBureau || v.needs.personalBureau ? (
        <Step id="bureau-title" n={v.needs.gst ? 3 : 2} done={Boolean(bureauReady) && verified} title={t("bureauTitle")}>
          <div className="space-y-3">
            <p className="text-[13px] text-muted">{t("bureauLead")}</p>
            {v.needs.companyBureau ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="company-pan" label={t("companyPan")} hint={v.panHint.company ? t("panHint", { pan: v.panHint.company }) : undefined} error={errors.companyPan}>
                  <Input id="company-pan" maxLength={10} autoCapitalize="characters" spellCheck={false} disabled={!verified} className="font-mono uppercase tracking-wider" {...field("companyPan")} />
                </FormField>
                <FormField id="incorporated-on" label={t("incorporatedOn")} error={errors.incorporatedOn}>
                  <Input id="incorporated-on" type="date" disabled={!verified} {...field("incorporatedOn")} />
                </FormField>
              </div>
            ) : null}
            {v.needs.personalBureau ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="personal-pan" label={v.subjectKind === "person" ? t("yourPan") : t("personalPan")} hint={v.panHint.personal ? t("panHint", { pan: v.panHint.personal }) : t("personalPanHint")} error={errors.personalPan}>
                  <Input id="personal-pan" maxLength={10} autoCapitalize="characters" spellCheck={false} disabled={!verified} className="font-mono uppercase tracking-wider" {...field("personalPan")} />
                </FormField>
                <FormField id="birth-date" label={v.subjectKind === "person" ? t("yourBirthDate") : t("birthDate")} error={errors.birthDate}>
                  <Input id="birth-date" type="date" disabled={!verified} {...field("birthDate")} />
                </FormField>
              </div>
            ) : null}
            {!verified ? <p className="flex items-center gap-1.5 text-xs text-muted"><Lock size={12} aria-hidden="true" />{t("verifyFirst")}</p> : null}
          </div>
        </Step>
      ) : null}

      <div className={cn("rounded-2xl border bg-surface p-4 shadow-sm transition-colors", agree ? "border-primary-line bg-primary-softer" : "border-border")}>
        <Checkbox id="agree" checked={agree} disabled={!verified} onChange={(e) => setAgree(e.target.checked)} label={t("agree", { requester: v.requester.name })} />
        {errors.agree ? <p role="alert" className="mt-1 text-sm font-medium text-danger-fg">{errors.agree}</p> : null}
      </div>

      {generalError}

      {/* The final action stays in reach on phones: a bar pinned to the bottom of the screen while scrolling. */}
      <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-[var(--nav-bg)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-1">
          <Button variant="secondary" className="border-danger-fg/40 text-danger-fg sm:order-2 sm:w-full" onClick={() => setConfirm("decline")}>{t("decline")}</Button>
          <Button className="w-full sm:order-1" disabled={!canApprove} loading={busy === "approve"} onClick={() => void approve()} icon={<ShieldCheck />}>{t("approve")}</Button>
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><Clock size={12} aria-hidden="true" />{t("linkValid", { until: when(v.expiresAt) })}</p>
      {contact}
      <ConfirmDialog
        open={confirm === "decline"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void finish("decline")}
        title={t("declineTitle")}
        body={t("declineConfirm", { requester: v.requester.name })}
        confirmLabel={t("decline")}
        destructive
        busy={busy === "decline"}
      />
    </div>
  );
}

/** One numbered step card. The number turns into a tick when the step is done. */
function Step({ id, n, done, title, children }: { id: string; n?: number; done: boolean; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("space-y-3 rounded-2xl border bg-surface p-4 shadow-sm", done ? "border-success/25" : "border-border")}>
      <h2 id={id} className="flex items-start gap-2.5 font-head text-[15px] font-bold leading-snug text-text">
        {n !== undefined || done ? (
          <span
            className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold", done ? "bg-success-bg text-success-fg" : "bg-brand text-white")}
            aria-hidden="true"
          >
            {done ? <Check size={13} strokeWidth={3} /> : n}
          </span>
        ) : null}
        <span className="pt-px">{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** Larger OTP boxes that share the row evenly, so six fit a 360 px phone. */
function BigOtp({ children }: { children: React.ReactNode }) {
  return <div className="[&_input]:h-14 [&_input]:min-w-0 [&_input]:max-w-14 [&_input]:flex-1 [&_input]:text-xl">{children}</div>;
}

/** S10 marker 2: purpose, the data in plain words, how long the requester sees it, how to withdraw (FR-CON-02). */
function WhatAndWhy({ v }: { v: ConsentPageView }) {
  const t = useTranslations("consent");
  const row = "flex items-start gap-3 px-4 py-3";
  const icon = "flex size-8 shrink-0 items-center justify-center rounded-lg bg-soft text-primary-text";
  return (
    <section aria-labelledby="what-title" className="overflow-hidden rounded-2xl border border-border bg-surface text-sm shadow-sm">
      <h2 id="what-title" className="sr-only">{t("whatTitle")}</h2>
      <div className={cn(row, "border-b border-border")}>
        <span className={icon} aria-hidden="true"><Eye size={15} /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[1px] text-subtle">{t("theyWillSee")}</p>
          <ul className="mt-1.5 space-y-1">
            {v.scope.map((s) => (
              <li key={s} className="flex items-start gap-2 font-semibold text-text">
                <Check size={15} className="mt-0.5 shrink-0 text-success-fg" aria-hidden="true" />
                <span>{t(`scope.${s}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid sm:grid-cols-2">
        <div className={cn(row, "border-b border-border sm:border-r")}>
          <span className={icon} aria-hidden="true"><Target size={15} /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[1px] text-subtle">{t("purpose")}</p>
            <p className="mt-0.5 text-text-2">{t(`purposes.${v.purpose}`)}</p>
          </div>
        </div>
        <div className={cn(row, "border-b border-border")}>
          <span className={icon} aria-hidden="true"><Clock size={15} /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[1px] text-subtle">{t("keptFor")}</p>
            <p className="mt-0.5 text-text-2">{t("keptForValue")}</p>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-2 bg-surface-muted px-4 py-2.5 text-xs text-muted">
        <Undo2 size={13} className="shrink-0" aria-hidden="true" />
        {t("withdrawHow")}
      </p>
    </section>
  );
}
