"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileCheck2, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button, FormField, Input } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { api } from "@/lib/api-client";
import { formatDateTimeIst } from "@/lib/dates";
import type { VerifyResult } from "@/server/transactions/verify";

// S22: 1 what verification proves, 2 reference, 3 optional PDF (its SHA-256 is worked out in this browser; the file is
// not uploaded), 4 result with the seal time and the parties' names only.

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function VerifyDocument({ initialReference }: { initialReference: string }) {
  const t = useTranslations("verify");
  const [reference, setReference] = useState(initialReference);
  // Read at "Check" time from the input itself, so a file chosen before the page finished loading still counts.
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setError(null);
    setResult(null);
    const file = fileRef.current?.files?.[0] ?? null;
    if (file && file.size > 20 * 1024 * 1024) {
      setBusy(false);
      return setError(t("tooBig"));
    }
    const hash = file ? await sha256Hex(file) : null;
    const res = await api<VerifyResult>(`/api/v1/public/verify/${encodeURIComponent(reference.trim())}${hash ? `?sha256=${hash}` : ""}`);
    setBusy(false);
    if (!res.ok) return setError(res.error.fields?.reference ?? res.error.message);
    setResult(res.data);
  }

  const good = result?.found && result.matches !== false;
  return (
    <div className="space-y-4">
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface p-4 text-center shadow-sm sm:p-6">
        <span className="pointer-events-none absolute inset-0 -z-10 bg-soft" aria-hidden="true" />
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-orange" aria-hidden="true">
          <FileCheck2 size={22} />
        </span>
        <h1 className="mt-3 text-[1.5rem] font-extrabold leading-tight tracking-tight text-text">
          {t.rich("heading", { accent: (c) => <span className="text-gradient">{c}</span> })}
        </h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{t("lead")}</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <FormField id="ref" label={t("reference")} hint={t("referenceHint")} error={error ?? undefined}>
          <Input id="ref" value={reference} className="h-12 font-mono text-base uppercase tracking-wide" maxLength={20} invalid={Boolean(error)} onChange={(e) => setReference(e.target.value.toUpperCase())} />
        </FormField>
        <FormField id="pdf" label={t("file")} hint={t("fileHint")}>
          <input
            id="pdf"
            type="file"
            accept="application/pdf"
            ref={fileRef}
            className="block w-full rounded-xl border border-dashed border-border-strong bg-surface-muted p-2 text-sm text-text-2 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:font-semibold file:text-text file:shadow-sm"
            onChange={() => setResult(null)}
          />
        </FormField>
        <Button className="h-12 w-full" loading={busy} disabled={reference.trim().length < 13} onClick={() => void check()}>{t("check")}</Button>

        {result ? (
          <div role="status" className={cn("animate-rise space-y-1 rounded-2xl px-4 py-3.5 text-sm", good ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg")}>
            <p className="flex items-center gap-2 text-[15px] font-bold">
              {good ? <ShieldCheck size={20} aria-hidden="true" /> : <ShieldAlert size={20} aria-hidden="true" />}
              {!result.found ? t("notFound") : result.matches === false ? t("noMatch") : result.matches ? t("authentic") : t("exists")}
            </p>
            {result.found && result.parties ? <p>{t("parties", { from: result.parties.from, to: result.parties.to })}</p> : null}
            {result.found && result.sealedAt ? <p>{t("sealed", { at: formatDateTimeIst(new Date(result.sealedAt)), version: result.version ?? 1 })}</p> : null}
          </div>
        ) : null}
      </section>
      <p className="flex items-start justify-center gap-2 px-2 text-center text-xs text-muted">
        <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{t("privacy")}</span>
      </p>
    </div>
  );
}
