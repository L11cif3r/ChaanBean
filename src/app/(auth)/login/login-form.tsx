"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardBody, Checkbox, FormField, Input } from "@/components/ui";
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
    <Card className="mx-auto max-w-md">
      <CardBody className="space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-xl font-bold text-text">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>

        {reason === "idle" || reason === "expired" ? (
          <p role="status" className="rounded-lg bg-info-bg px-3 py-2 text-sm text-info-fg">
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
              <div className="flex">
                <span className="inline-flex h-10 items-center rounded-l-lg border border-r-0 border-border-strong bg-surface-muted px-3 text-sm font-medium text-muted">
                  +91
                </span>
                <Input
                  id="mobile"
                  className="rounded-l-none"
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
            </Button>
            {process.env.NODE_ENV !== "production" ? (
              <p className="rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning-fg">{t("devHint")}</p>
            ) : null}
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
            <p className="text-sm text-text">{t("otpSentTo", { mobile: `+91 ${maskMobile(digits)}` })}</p>
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
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="text-primary hover:underline" onClick={() => { setStep("mobile"); setError(null); }}>
                {t("changeNumber")}
              </button>
              {resendIn > 0 ? (
                <span className="tabular-nums text-muted">{t("resendIn", { seconds: resendIn })}</span>
              ) : (
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => void sendOtp()} disabled={busy}>
                  {t("resend")}
                </button>
              )}
            </div>
          </form>
        ) : null}

        {step === "removed" ? (
          <div className="space-y-4">
            <p role="alert" className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              {t("removed", { organisation: removedFrom })}
            </p>
            <Link href="/signup/business" className="text-sm font-medium text-primary hover:underline">
              {t("registerNew")}
            </Link>
          </div>
        ) : null}

        <p className="text-xs text-muted">
          {t.rich("legal", {
            terms: (chunks) => (
              <Link href="/legal/terms" target="_blank" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/legal/privacy" target="_blank" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </CardBody>
    </Card>
  );
}
