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
  /** Set while the dialog is closed by cleanup rather than by the user, so that close does not call onClose. */
  const silent = useRef(false);
  const t = useTranslations("ui");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    // Close on unmount and when Next hides the page (Cache Components keep the previous page alive but hidden): an open
    // modal dialog would otherwise stay in the top layer and make the new page inert.
    return () => {
      if (d.open) {
        silent.current = true;
        d.close();
      }
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        if (silent.current) silent.current = false;
        else onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border-0 bg-surface p-0 text-text shadow-lg backdrop:bg-black/30 backdrop:backdrop-blur-[2px] open:animate-[cb-dialog_0.22s_cubic-bezier(.25,1,.5,1)_both]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1.5 text-subtle hover:bg-hover hover:text-text" aria-label={t("close")}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4 text-sm">{children}</div>
      {footer ? <div className="flex justify-end gap-2 border-t border-border bg-surface-muted px-5 py-3">{footer}</div> : null}
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
