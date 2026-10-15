"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "./cn";

/**
 * Six OTP boxes (PRD S01 marker 3): auto-advance, paste fills all, onComplete fires on the sixth digit.
 * autocomplete="one-time-code" lets phones offer the code from the SMS.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  label,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
  describedBy?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const set = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    return clean;
  };

  const onInput = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (!d) return;
    if (d.length > 1) {
      const clean = set(d);
      refs.current[Math.min(clean.length, 5)]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[i] = d;
    const clean = set(arr.join(""));
    if (i < 5 && clean.length > i) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = digits.slice();
      if (arr[i]) arr[i] = "";
      else if (i > 0) {
        arr[i - 1] = "";
        refs.current[i - 1]?.focus();
      }
      onChange(arr.join("").slice(0, 6));
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = set(e.clipboardData.getData("text"));
    refs.current[Math.min(clean.length, 5)]?.focus();
  };

  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className="flex justify-between gap-2 sm:justify-start">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          aria-label={`${label} digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-[52px] w-11 rounded-[14px] border-[1.5px] bg-field text-center text-lg font-bold tabular-nums text-text outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_4px_rgba(252,128,25,0.16)] focus-visible:outline-none sm:w-12",
            invalid ? "border-danger" : "border-border",
          )}
        />
      ))}
    </div>
  );
}
