"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, MailCheck, MailX } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import { api } from "@/lib/api-client";

export function ConfirmEmail() {
  const t = useTranslations("verifyEmail");
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function confirm() {
    setState("busy");
    const res = await api<{ email: string }>("/api/v1/onboarding/verify-email", { body: { token } });
    if (res.ok) {
      setMessage(t("done", { email: res.data.email }));
      setState("done");
    } else {
      setMessage(res.error.message);
      setState("error");
    }
  }

  return (
    <Card className="animate-rise">
      <CardBody className="flex flex-col items-center px-6 py-9 text-center">
        <span
          className={
            state === "done"
              ? "flex size-12 items-center justify-center rounded-2xl bg-success-bg text-success-fg"
              : state === "error"
                ? "flex size-12 items-center justify-center rounded-2xl bg-danger-bg text-danger-fg"
                : "flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-orange"
          }
          aria-hidden="true"
        >
          {state === "done" ? <MailCheck size={22} /> : state === "error" ? <MailX size={22} /> : <Mail size={22} />}
        </span>
        <h1 className="mt-4 font-head text-[1.35rem] font-extrabold tracking-[-0.02em] text-text">{t("title")}</h1>
        {state === "done" || state === "error" ? (
          <p role="status" className={state === "done" ? "mt-1.5 text-sm font-semibold text-success-fg" : "mt-1.5 text-sm font-semibold text-danger-fg"}>
            {message}
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-muted">{t("body")}</p>
            <Button className="mt-5 w-full" onClick={() => void confirm()} loading={state === "busy"} disabled={token.length < 20}>
              {t("confirm")}
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}
