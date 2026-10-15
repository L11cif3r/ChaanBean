"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./button";

/** Modal dialog on the native <dialog> element (focus trap and Escape handling come from the browser). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations("ui");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl border border-border bg-surface p-0 text-text shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text" aria-label={t("close")}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-5 text-sm">{children}</div>
      {footer ? <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div> : null}
    </dialog>
  );
}

/** Every destructive action asks for confirmation (PRD 7 common rules). */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel,
  destructive,
  busy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
  body: ReactNode;
  confirmLabel?: ReactNode;
  destructive?: boolean;
  busy?: boolean;
}) {
  const t = useTranslations("ui");
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel ?? t("confirm")}
          </Button>
        </>
      }
    >
      {body}
    </Dialog>
  );
}
