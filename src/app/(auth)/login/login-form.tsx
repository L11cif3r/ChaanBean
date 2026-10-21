"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Lock, Smartphone } from "lucide-react";
import { Button, Checkbox, FormField, Input } from "@/components/ui";
import { OtpInput } from "@/components/ui/otp-input";
import { api } from "@/lib/api-client";
import { maskMobile } from "@/lib/mask";
import { normaliseMobile } from "@/lib/validators";

type Step = "mobile" | "otp" | "removed";

/** PRD S01: mobile number and 6-digit OTP. There are no passwords in Phase 1. */
export function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const reason = params.get("reason");

  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [trusted, setTrusted] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string; reference?: string } | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [removedFrom, setRemovedFrom] = useState("");

  const digits = normaliseMobile(mobile);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function sendOtp() {
    if (!digits) return;
    setBusy(true);
    setError(null);
    const res = await api<{ resendAfterSeconds: number }>("/api/v1/auth/otp/send", { body: { mobile: digits } });
    setBusy(false);
    if (!res.ok) {
      setError({ field: res.error.fields?.mobile ? "mobile" : undefined, message: res.error.fields?.mobile ?? res.error.message, reference: res.error.reference });
      return;
    }
    setStep("otp");
    setCode("");
    setResendIn(res.data.resendAfterSeconds);
  }

  async function verify(value = code) {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    const res = await api<{ next: string | null; removedFrom?: string }>("/api/v1/auth/otp/verify", {
      body: { mobile: digits, code: value, trusted, next: next ?? undefined },
    });
    setBusy(false);
    if (!res.ok) {
      setCode("");
      setError({ field: "code", message: res.error.fields?.code ?? res.error.message, reference: res.error.status >= 500 ? res.error.reference : undefined });
      return;
    }
    if (res.data.removedFrom) {
      setRemovedFrom(res.data.removedFrom);
      setStep("removed");
      return;
    }
    router.replace(res.data.next ?? "/dashboard");
    router.refresh();
  }

  return (
    <section className="animate-rise space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-lg sm:p-7">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-1 text-[11.5px] font-semibold leading-none text-primary-text">
          <Lock size={12} aria-hidden="true" /> {t("secure")}
        </span>
        <h1 className="mt-3.5 font-head text-[1.65rem] font-extrabold leading-tight tracking-[-0.03em] text-text sm:text-[1.85rem]">
          {t.rich("titleRich", { accent: (c) => <span className="text-gradient">{c}</span> })}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>

      {reason === "idle" || reason === "expired" ? (
        <p role="status" className="rounded-xl bg-info-bg px-3.5 py-2.5 text-[13px] font-semibold text-info-fg">
          {t(reason === "idle" ? "reasonIdle" : "reasonExpired")}
        </p>
      ) : null}

      {step === "mobile" ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void sendOtp();
          }}
        >
          <FormField id="mobile" label={t("mobileLabel")} error={error?.message} required>
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-1.5 left-1.5 flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 text-[0.9rem] font-bold text-text-2"
                aria-hidden="true"
              >
                <Smartphone size={14} className="text-subtle" /> +91
              </span>
              <Input
                id="mobile"
                className="pl-[5.25rem] text-base tracking-[0.02em] site:pl-[5.25rem] site:text-base"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={mobile}
                maxLength={14}
                onChange={(e) => setMobile(e.target.value.replace(/[^\d\s+]/g, ""))}
                error={error?.message}
              />
            </div>
          </FormField>
          <Checkbox id="trusted" label={t("trusted")} checked={trusted} onChange={(e) => setTrusted(e.target.checked)} />
          <Button type="submit" className="w-full" disabled={!digits} loading={busy}>
            {t("sendOtp")}
            {busy ? null : <ArrowRight size={16} aria-hidden="true" />}
          </Button>
          {error?.reference ? <p className="text-xs text-muted">{t("reference", { reference: error.reference })}</p> : null}
        </form>
      ) : null}

      {step === "otp" && digits ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="text-sm text-text-2">{t("otpSentTo", { mobile: `+91 ${maskMobile(digits)}` })}</p>
          <div className="space-y-1.5">
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(v) => void verify(v)}
              disabled={busy}
              invalid={Boolean(error)}
              label={t("otpLabel")}
              describedBy={error ? "otp-error" : undefined}
            />
            {error ? (
              <p id="otp-error" role="alert" className="text-xs font-medium text-danger-fg">
                {error.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={code.length !== 6} loading={busy}>
            {t("verify")}
            {busy ? null : <ArrowRight size={16} aria-hidden="true" />}
          </Button>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <button
              type="button"
              className="-mx-2 inline-flex min-h-10 items-center rounded-lg px-2 font-semibold text-muted hover:bg-hover hover:text-text"
              onClick={() => {
                setStep("mobile");
                setError(null);
              }}
            >
              {t("changeNumber")}
            </button>
            {resendIn > 0 ? (
              <span className="tabular-nums text-subtle">{t("resendIn", { seconds: resendIn })}</span>
            ) : (
              <button
                type="button"
                className="-mx-2 inline-flex min-h-10 items-center rounded-lg px-2 font-bold text-primary-text hover:bg-hover"
                onClick={() => void sendOtp()}
                disabled={busy}
              >
                {t("resend")}
              </button>
            )}
          </div>
        </form>
      ) : null}

      {step === "removed" ? (
        <div className="space-y-3">
          <p role="alert" className="rounded-xl bg-warning-bg px-3.5 py-2.5 text-[13px] font-semibold text-warning-fg">
            {t("removed", { organisation: removedFrom })}
          </p>
          <Link href="/signup/business" className="inline-flex items-center gap-1 text-sm font-bold text-primary-text hover:underline">
            {t("registerNew")} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-[11.5px] leading-relaxed text-subtle">
          {t.rich("legal", {
            terms: (chunks) => (
              <Link href="/legal/terms" target="_blank" className="underline underline-offset-2 hover:text-text">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/legal/privacy" target="_blank" className="underline underline-offset-2 hover:text-text">
                {chunks}
              </Link>
            ),
          })}
        </p>
        {process.env.NODE_ENV !== "production" ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-subtle">
            <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-text-2">{t("devTag")}</span>
            <span>{t("devHint")}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
