"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export function AcceptInvite({ token }: { token: string }) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await api<{ next: string }>("/api/v1/invites/accept", { body: { token } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    router.replace(res.data.next);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={() => void accept()} loading={busy}>
        {t("accept")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
