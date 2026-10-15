"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
    <Card>
      <CardBody className="space-y-4">
        <h1 className="text-lg font-bold text-text">{t("title")}</h1>
        {state === "done" || state === "error" ? (
          <p role="status" className={state === "done" ? "text-sm text-success-fg" : "text-sm text-danger-fg"}>
            {message}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">{t("body")}</p>
            <Button className="w-full" onClick={() => void confirm()} loading={state === "busy"} disabled={token.length < 20}>
              {t("confirm")}
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}
