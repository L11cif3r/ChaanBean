"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "./cn";

// PRD v4.0 section 8 (FR-PAY-02, FR-PAY-05): after "Run search", a short countdown bar with a Cancel button, like placing
// a food order. The server holds the request until the window ends, so closing the app does not skip it; cancelling
// inside the window means nothing is taken. `inline` shows it as a slim bar in the page instead of a dialog body.

export function CancelWindow({ seconds, onCancel, onDone, inline }: { seconds: number; onCancel: () => Promise<void> | void; onDone: () => void; inline?: boolean }) {
  const t = useTranslations("ui.cancelWindow");
  const [left, setLeft] = useState(seconds);
  const [busy, setBusy] = useState(false);
  const stopped = useRef(false);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = Math.max(0, seconds - (Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (!stopped.current) done.current();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [seconds]);

  const cancel = async () => {
    stopped.current = true;
    setBusy(true);
    await onCancel();
    setBusy(false);
  };
  const bar = (
    <div className={cn("overflow-hidden rounded-full bg-surface-strong", inline ? "h-1.5" : "h-2")} aria-hidden="true">
      <div className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear" style={{ width: `${(left / seconds) * 100}%` }} />
    </div>
  );

  if (inline) {
    return (
      <div className="animate-[cb-fade-up_0.25s_ease-out_both] space-y-2.5 rounded-lg border border-primary-line bg-primary-softer p-3" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-md bg-surface text-sm font-semibold tabular-nums text-primary-text shadow-control">
            {Math.ceil(left)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text">{t("starting", { seconds: Math.ceil(left) })}</p>
            <p className="text-xs text-muted">{t("note")}</p>
          </div>
          <Button variant="secondary" size="sm" loading={busy} disabled={left <= 0} onClick={() => void cancel()} icon={<X aria-hidden="true" />}>
            {t("cancel")}
          </Button>
        </div>
        {bar}
      </div>
    );
  }

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-center text-base font-semibold text-text">{t("starting", { seconds: Math.ceil(left) })}</p>
      {bar}
      <p className="text-center text-sm text-muted">{t("note")}</p>
      <Button variant="secondary" className="h-11 w-full" loading={busy} disabled={left <= 0} onClick={() => void cancel()}>
        {t("cancel")}
      </Button>
    </div>
  );
}
