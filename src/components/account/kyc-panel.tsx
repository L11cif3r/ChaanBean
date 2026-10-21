"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Check, Download, FileText, Fingerprint, IdCard, Lock, ScrollText, ShieldCheck } from "lucide-react";
import { Button, Card, CardBody, CardHeader, GradientText, Input, PageHeader, Tag } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatDateTimeIst } from "@/lib/dates";

// v4 11.2: KYC of the person who signed up, with DigiLocker. Aadhaar or PAN is shared by consent; only the name, the
// document type, a masked number and the time are kept.

type Method = "digilocker_aadhaar" | "digilocker_pan";
export interface KycView { status: "not_started" | "pending" | "verified" | "failed"; method: Method | null; name: string | null; docMasked: string | null; verifiedAt: string | null; testMode: boolean }

export interface GstCertView { hasGstin: boolean; savedAt: string | null; testMode: boolean }

export function KycPanel({ kyc, cert, canManage }: { kyc: KycView; cert: GstCertView; canManage: boolean }) {
  const t = useTranslations("kyc");
  const router = useRouter();
  const toast = useToast();
  const [method, setMethod] = useState<Method>(kyc.method ?? "digilocker_aadhaar");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const res = await api<{ redirect: string }>("/api/v1/kyc/start", { body: { method } });
    setBusy(false);
    if (!res.ok) return toast(res.error.message, "danger");
    router.push(res.data.redirect);
  }

  const statusTag =
    kyc.status === "failed" ? <Tag tone="danger">{t("failed")}</Tag>
    : kyc.status === "pending" ? <Tag tone="info">{t("pending")}</Tag>
    : <Tag tone="warning">{t("notVerifiedTag")}</Tag>;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t("eyebrow")} title={<>{t("titleLead")} <GradientText>{t("titleAccent")}</GradientText></>} description={t("subtitle")} />
      {kyc.status === "verified" ? (
        <section aria-labelledby="kyc-hero" className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
          <span className="pointer-events-none absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.18),transparent_65%)] blur-2xl" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-bg text-success-fg" aria-hidden="true"><BadgeCheck size={24} /></span>
            <div className="min-w-0 flex-1">
              <h2 id="kyc-hero" className="font-head text-lg font-bold leading-tight text-text">{t("verifiedTitle")}</h2>
              <p className="mt-0.5 text-sm text-muted">{t("verifiedLead")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Tag tone="success">{t("verifiedTag")}</Tag>
                {kyc.testMode ? <Tag tone="warning">{t("testData")}</Tag> : null}
              </div>
            </div>
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface/80 px-3 py-2.5"><dt className="text-[11px] uppercase tracking-[1px] text-subtle">{t("name")}</dt><dd className="mt-1 truncate text-sm font-semibold text-text">{kyc.name}</dd></div>
            <div className="rounded-xl border border-border bg-surface/80 px-3 py-2.5"><dt className="text-[11px] uppercase tracking-[1px] text-subtle">{t("document")}</dt><dd className="mt-1 text-sm font-semibold text-text">{t(`method.${kyc.method ?? "digilocker_aadhaar"}`)} · <span className="font-mono">{kyc.docMasked}</span></dd></div>
            <div className="rounded-xl border border-border bg-surface/80 px-3 py-2.5"><dt className="text-[11px] uppercase tracking-[1px] text-subtle">{t("verifiedAt")}</dt><dd className="mt-1 text-sm font-semibold text-text">{kyc.verifiedAt ? formatDateTimeIst(new Date(kyc.verifiedAt)) : ""}</dd></div>
          </dl>
        </section>
      ) : (
        <section aria-labelledby="kyc-hero" className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <span className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-soft" aria-hidden="true" />
          <div className="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-orange" aria-hidden="true"><Fingerprint size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id="kyc-hero" className="font-head text-lg font-bold leading-tight text-text">{t("notVerifiedTitle")}</h2>
                {statusTag}
              </div>
              <p className="mt-0.5 text-sm text-muted">{t("chooseTitle")}</p>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <div role="radiogroup" aria-label={t("chooseTitle")} className="grid gap-3 sm:grid-cols-2">
              {(["digilocker_aadhaar", "digilocker_pan"] as const).map((m) => {
                const on = method === m;
                return (
                  <label
                    key={m}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-4 transition-[border-color,box-shadow,translate] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                      on ? "border-primary shadow-[0_0_0_4px_var(--primary-soft)]" : "border-border hover:-translate-y-0.5 hover:border-primary-line hover:shadow-md",
                    )}
                  >
                    <input type="radio" name="kyc-method" checked={on} onChange={() => setMethod(m)} className="sr-only" />
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", on ? "bg-brand text-white" : "bg-soft text-primary-text")} aria-hidden="true">
                      {m === "digilocker_aadhaar" ? <IdCard size={18} /> : <FileText size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-head font-bold text-text">{t(`method.${m}`)}</span>
                      <span className="block text-xs text-muted">{t(`methodHint.${m}`)}</span>
                    </span>
                    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-primary bg-primary text-white" : "border-border-strong")} aria-hidden="true">
                      {on ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="flex items-start gap-2 text-xs text-muted">
              <Lock size={13} className="mt-px shrink-0 text-primary-text" aria-hidden="true" />
              <span>{t("privacy")}</span>
            </p>
            {kyc.testMode ? <p className="rounded-xl bg-warning-bg px-3 py-2 text-xs font-semibold text-warning-fg">{t("testNote")}</p> : null}
            <Button className="h-12 w-full sm:w-auto" loading={busy} onClick={() => void start()} icon={<ShieldCheck />}>{t("start")}</Button>
          </div>
        </section>
      )}
      {cert.hasGstin && canManage ? <GstCertificateCard cert={cert} /> : null}
    </div>
  );
}

/** The business's own GST certificate from GSTN (API Setu): OTP to the primary authorised signatory, then the PDF. */
function GstCertificateCard({ cert }: { cert: GstCertView }) {
  const t = useTranslations("kyc.cert");
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [txnId, setTxnId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const res = await api<{ txnId: string }>("/api/v1/kyc/gst-certificate", { body: { action: "initiate", email } });
    setBusy(false);
    if (!res.ok) return toast(res.error.fields?.email ?? res.error.message, "danger");
    setTxnId(res.data.txnId);
    toast(t("sent"), "success");
  }
  async function verify() {
    if (!txnId) return;
    setBusy(true);
    const res = await api("/api/v1/kyc/gst-certificate", { body: { action: "validate", txnId, otp } });
    setBusy(false);
    if (!res.ok) return toast(res.error.fields?.otp ?? res.error.message, "danger");
    toast(t("saved"), "success");
    setTxnId(null);
    setOtp("");
    router.refresh();
  }
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-soft text-primary-text" aria-hidden="true"><ScrollText size={15} /></span>
            <span className="font-head">{t("title")}</span>
          </span>
        }
        action={cert.savedAt ? <Tag tone="success">{t("savedOn", { at: formatDateTimeIst(new Date(cert.savedAt)) })}</Tag> : null}
      />
      <CardBody className="space-y-3 text-sm">
        <p className="text-muted">{t("body")}</p>
        {cert.testMode ? <p className="rounded-xl bg-warning-bg px-3 py-2 text-xs font-semibold text-warning-fg">{t("testNote")}</p> : null}
        {cert.savedAt ? (
          <a href="/api/v1/kyc/gst-certificate" className="inline-flex min-h-10 items-center gap-1.5 font-bold text-primary-text hover:underline">
            <Download size={15} aria-hidden="true" />
            {t("download")}
          </a>
        ) : null}
        {!txnId ? (
          <form className="flex max-w-lg flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <Input id="gst-cert-email" type="email" aria-label={t("email")} placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 basis-56" />
            <Button type="submit" variant="secondary" loading={busy} disabled={!email.trim()}>{cert.savedAt ? t("again") : t("send")}</Button>
          </form>
        ) : (
          <form className="flex max-w-lg flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void verify(); }}>
            <Input id="gst-cert-otp" inputMode="numeric" maxLength={6} aria-label={t("otp")} placeholder={t("otp")} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="w-40 font-mono tracking-widest" />
            <Button type="submit" loading={busy} disabled={otp.length !== 6}>{t("verify")}</Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

/** The test stand-in for DigiLocker's consent page (development, until the partner access is set up). */
export function KycTestConsent({ state }: { state: string }) {
  const t = useTranslations("kyc");
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  async function answer(approved: boolean) {
    setBusy(approved ? "yes" : "no");
    const res = await api<KycView>("/api/v1/kyc/complete", { body: { state, approved } });
    setBusy(null);
    if (!res.ok) return toast(res.error.message, "danger");
    toast(approved ? t("done") : t("declined"), approved ? "success" : "danger");
    router.push("/account/kyc");
    router.refresh();
  }
  return (
    <Card className="mx-auto max-w-md overflow-hidden">
      <div className="relative isolate flex flex-col items-center px-5 pb-4 pt-6 text-center">
        <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-orange" aria-hidden="true"><ShieldCheck size={22} /></span>
        <h1 className="mt-3 font-head text-lg font-bold text-text">{t("testTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("testBody")}</p>
      </div>
      <CardBody className="grid grid-cols-2 gap-2">
        <Button variant="secondary" loading={busy === "no"} onClick={() => void answer(false)}>{t("deny")}</Button>
        <Button loading={busy === "yes"} onClick={() => void answer(true)}>{t("allow")}</Button>
      </CardBody>
    </Card>
  );
}
