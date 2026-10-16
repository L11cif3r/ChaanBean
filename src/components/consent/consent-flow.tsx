"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Button, Card, CardBody, Checkbox, FormField, Input, Tag } from "@/components/ui";
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

  const header = (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("eyebrow")}</p>
      <h1 className="text-xl font-extrabold leading-tight text-text">
        {v.subjectKind === "person" ? t("titlePerson", { requester: v.requester.name }) : t("title", { requester: v.requester.name })}
      </h1>
    </div>
  );

  const contact = (
    <p className="text-xs text-muted">
      {v.requester.contactPhone
        ? t("questions", { requester: v.requester.name, phone: v.requester.contactPhone })
        : t("questionsNoPhone", { requester: v.requester.name })}{" "}
      {t("poweredBy")}{" "}
      <Link href="/legal/privacy" className="underline underline-offset-2">{t("privacy")}</Link>
    </p>
  );

  const generalError = errors._ ? <p role="alert" className="rounded-[14px] bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-fg">{errors._}</p> : null;

  const testBanner = v.testMode ? <p className="rounded-[14px] bg-warning-bg px-4 py-2 text-xs font-semibold text-warning-fg">{t("testMode")}</p> : null;

  // ---------------------------------------------------------------- closed states

  if (v.status !== "pending" && v.status !== "approved") {
    const body =
      v.status === "declined" ? t("declinedBody", { requester: v.requester.name, at: when(v.declinedAt!) })
      : v.status === "withdrawn" ? t("withdrawnBody", { requester: v.requester.name, at: when(v.withdrawnAt!) })
      : t("expiredBody", { requester: v.requester.name });
    return (
      <Card>
        <CardBody className="space-y-4">
          {header}
          <p className="rounded-[14px] bg-surface-muted px-4 py-3 text-sm font-semibold text-text-2" role="status">{body}</p>
          {contact}
        </CardBody>
      </Card>
    );
  }

  const otpStep = (purposeKey: "verifyTitle" | "verifyWithdraw") => (
    <section aria-labelledby="otp-title" className="space-y-3">
      <h2 id="otp-title" className="font-bold text-text">
        <StepNo n={1} /> {t(purposeKey, { mobile: v.mobileMasked })}
      </h2>
      {verified ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-success-fg"><CheckCircle2 size={16} aria-hidden="true" /> {t("verified")}</p>
      ) : !otpSent ? (
        <Button variant="secondary" onClick={() => void sendOtp()} loading={busy === "otp"}>{t("sendOtp")}</Button>
      ) : (
        <div className="space-y-2">
          <OtpInput value={otp} onChange={setOtp} onComplete={(c) => void verifyOtp(c)} disabled={busy === "verify"} invalid={Boolean(errors.otp)} label={t("otpLabel")} describedBy={errors.otp ? "otp-error" : undefined} />
          {errors.otp ? <p id="otp-error" role="alert" className="text-sm font-medium text-danger-fg">{errors.otp}</p> : null}
          <button type="button" className="text-sm font-semibold text-primary-text underline-offset-2 hover:underline disabled:text-muted disabled:no-underline" disabled={resendIn > 0 || busy === "otp"} onClick={() => void sendOtp()}>
            {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
          </button>
        </div>
      )}
    </section>
  );

  // ---------------------------------------------------------------- already approved: show it, allow withdrawal

  if (v.status === "approved") {
    return (
      <Card>
        <CardBody className="space-y-5">
          {header}
          <p className="flex items-start gap-2 rounded-[14px] bg-success-bg px-4 py-3 text-sm font-semibold text-success-fg" role="status">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t("approvedBody", { at: when(v.approvedAt!), requester: v.requester.name, until: when(v.visibleUntil!) })}
          </p>
          <WhatAndWhy v={v} />
          {testBanner}
          {otpStep("verifyWithdraw")}
          {generalError}
          <Button variant="secondary" className="w-full border-danger-fg/40 text-danger-fg" disabled={!verified} onClick={() => setConfirm("withdraw")}>
            {t("withdraw")}
          </Button>
          <p className="text-xs text-muted">{t("withdrawNote")}</p>
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
        </CardBody>
      </Card>
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
    <Card>
      <CardBody className="space-y-5">
        {header}
        <WhatAndWhy v={v} />
        {testBanner}
        {otpStep("verifyTitle")}

        {v.needs.gst ? (
          <section aria-labelledby="gst-title" className="space-y-3 rounded-2xl border border-border p-4">
            <h2 id="gst-title" className="font-bold text-text"><StepNo n={2} /> {t("gstTitle")}</h2>
            <ol className="list-decimal space-y-0.5 pl-5 text-sm text-muted">
              <li>{t("gstStep1")}</li>
              <li>{t("gstStep2")}</li>
              <li>{t("gstStep3")}</li>
            </ol>
            {gstOk ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-success-fg"><CheckCircle2 size={16} aria-hidden="true" /> {t("gstDone")}</p>
            ) : (
              <>
                <FormField id="gst-username" label={t("gstUsername")} error={errors.gstUsername}>
                  <Input id="gst-username" value={gstUser} autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={!verified || gstSent} invalid={Boolean(errors.gstUsername)} onChange={(e) => setGstUser(e.target.value)} />
                </FormField>
                {!gstSent ? (
                  <Button variant="secondary" disabled={!verified || !gstUser.trim()} loading={busy === "gst"} onClick={() => void sendGstOtp()}>{t("gstSend")}</Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">{t("gstOtpHint")}</p>
                    <OtpInput value={gstOtp} onChange={setGstOtp} onComplete={(c) => void verifyGstOtp(c)} disabled={busy === "gstVerify"} invalid={Boolean(errors.gstOtp)} label={t("gstOtpLabel")} describedBy={errors.gstOtp ? "gst-otp-error" : undefined} />
                    {errors.gstOtp ? <p id="gst-otp-error" role="alert" className="text-sm font-medium text-danger-fg">{errors.gstOtp}</p> : null}
                    <button type="button" className="text-sm font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => { setGstSent(false); setGstOtp(""); }}>
                      {t("gstChange")}
                    </button>
                  </div>
                )}
                {!verified ? <p className="text-xs text-muted">{t("verifyFirst")}</p> : null}
              </>
            )}
          </section>
        ) : null}

        {v.needs.companyBureau || v.needs.personalBureau ? (
          <section aria-labelledby="bureau-title" className="space-y-3 rounded-2xl border border-border p-4">
            <h2 id="bureau-title" className="font-bold text-text"><StepNo n={v.needs.gst ? 3 : 2} /> {t("bureauTitle")}</h2>
            <p className="text-sm text-muted">{t("bureauLead")}</p>
            {v.needs.companyBureau ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="company-pan" label={t("companyPan")} hint={v.panHint.company ? t("panHint", { pan: v.panHint.company }) : undefined} error={errors.companyPan}>
                  <Input id="company-pan" maxLength={10} autoCapitalize="characters" spellCheck={false} disabled={!verified} {...field("companyPan")} />
                </FormField>
                <FormField id="incorporated-on" label={t("incorporatedOn")} error={errors.incorporatedOn}>
                  <Input id="incorporated-on" type="date" disabled={!verified} {...field("incorporatedOn")} />
                </FormField>
              </div>
            ) : null}
            {v.needs.personalBureau ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="personal-pan" label={v.subjectKind === "person" ? t("yourPan") : t("personalPan")} hint={v.panHint.personal ? t("panHint", { pan: v.panHint.personal }) : t("personalPanHint")} error={errors.personalPan}>
                  <Input id="personal-pan" maxLength={10} autoCapitalize="characters" spellCheck={false} disabled={!verified} {...field("personalPan")} />
                </FormField>
                <FormField id="birth-date" label={v.subjectKind === "person" ? t("yourBirthDate") : t("birthDate")} error={errors.birthDate}>
                  <Input id="birth-date" type="date" disabled={!verified} {...field("birthDate")} />
                </FormField>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="rounded-2xl border border-border p-4">
          <Checkbox id="agree" checked={agree} disabled={!verified} onChange={(e) => setAgree(e.target.checked)} label={t("agree", { requester: v.requester.name })} />
          {errors.agree ? <p role="alert" className="mt-1 text-sm font-medium text-danger-fg">{errors.agree}</p> : null}
        </div>

        {generalError}
        <div className="space-y-2">
          <Button className="w-full" disabled={!canApprove} loading={busy === "approve"} onClick={() => void approve()}>{t("approve")}</Button>
          <Button variant="secondary" className="w-full border-danger-fg/40 text-danger-fg" onClick={() => setConfirm("decline")}>{t("decline")}</Button>
        </div>
        <p className="text-xs text-muted">{t("linkValid", { until: when(v.expiresAt) })}</p>
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
      </CardBody>
    </Card>
  );
}

function StepNo({ n }: { n: number }) {
  return <span className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white" aria-hidden="true">{n}</span>;
}

/** S10 marker 2: purpose, the data in plain words, how long the requester sees it, how to withdraw (FR-CON-02). */
function WhatAndWhy({ v }: { v: ConsentPageView }) {
  const t = useTranslations("consent");
  return (
    <section aria-labelledby="what-title" className="space-y-2 rounded-2xl border border-border bg-surface-muted p-4 text-sm">
      <h2 id="what-title" className="sr-only">{t("whatTitle")}</h2>
      <p><span className="font-bold text-text">{t("purpose")}</span> {t(`purposes.${v.purpose}`)}</p>
      <div>
        <p className="font-bold text-text">{t("theyWillSee")}</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-text-2">
          {v.scope.map((s) => <li key={s}>{t(`scope.${s}`)}</li>)}
        </ol>
      </div>
      <p><span className="font-bold text-text">{t("keptFor")}</span> {t("keptForValue")}</p>
      <p className="text-muted">{t("withdrawHow")}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Tag tone="info">{v.subjectKind === "person" ? t("forPerson", { name: v.subjectName ?? "", business: v.buyerName }) : t("forBusiness", { name: v.buyerName })}</Tag>
      </div>
    </section>
  );
}
