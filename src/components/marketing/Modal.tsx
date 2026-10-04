"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import s from "./site.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  wide?: boolean;
  children: React.ReactNode;
}

/** Accessible dialog: Escape and backdrop close it, page scroll is locked, focus returns on close. */
export function Modal({ open, onClose, labelledBy, wide = false, children }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={s.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${s.modal} ${wide ? s.modalWide : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button ref={closeRef} type="button" className={s.modalClose} aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
