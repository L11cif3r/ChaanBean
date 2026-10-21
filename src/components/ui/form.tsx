import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

// Form controls. Every input has a visible label, and errors appear next to the field (PRD 7 common rules); the
// ErrorSummary repeats them at the top on submit. Pass the same `id` to FormField and its control.

// Fields (design v2): white, rounded-xl, a soft orange ring on focus. Taller on sign-in and sign-up (inside .site).
const control =
  "block w-full rounded-xl border bg-field px-3.5 text-sm text-text shadow-[0_1px_2px_rgb(16_24_40/0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-placeholder hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)] focus-visible:outline-none disabled:opacity-70 disabled:text-muted site:text-[0.95rem]";

const describedBy = (id: string, hint?: ReactNode, error?: ReactNode) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ id, label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-text-2">
        {label}
        {required ? (
          <span className="text-danger-fg" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface ControlProps {
  invalid?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Input({ id, invalid, hint, error, className, ...rest }: ComponentProps<"input"> & ControlProps & { id: string }) {
  const bad = invalid || Boolean(error);
  return (
    <input
      id={id}
      aria-invalid={bad || undefined}
      aria-describedby={describedBy(id, hint, error)}
      className={cn(control, "h-11 site:h-12", bad ? "border-danger" : "border-border", className)}
      {...rest}
    />
  );
}

export function Textarea({ id, invalid, hint, error, className, ...rest }: ComponentProps<"textarea"> & ControlProps & { id: string }) {
  const bad = invalid || Boolean(error);
  return (
    <textarea
      id={id}
      aria-invalid={bad || undefined}
      aria-describedby={describedBy(id, hint, error)}
      className={cn(control, "min-h-28 py-2.5 site:py-3", bad ? "border-danger" : "border-border", className)}
      {...rest}
    />
  );
}

export function Select({ id, invalid, hint, error, className, children, ...rest }: ComponentProps<"select"> & ControlProps & { id: string }) {
  const bad = invalid || Boolean(error);
  return (
    <select
      id={id}
      aria-invalid={bad || undefined}
      aria-describedby={describedBy(id, hint, error)}
      className={cn(control, "h-11 pr-9 site:h-12", bad ? "border-danger" : "border-border", className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Checkbox({ id, label, className, ...rest }: Omit<ComponentProps<"input">, "type"> & { id: string; label: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input id={id} type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-border accent-[var(--primary)]" {...rest} />
      <label htmlFor={id} className="text-sm text-text">
        {label}
      </label>
    </div>
  );
}

/** On/off switch, used for channel toggles (S09, S14, S20). */
export function Toggle({ id, label, className, ...rest }: Omit<ComponentProps<"input">, "type"> & { id: string; label: ReactNode }) {
  return (
    <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm text-text", className)}>
      <span className="relative inline-flex">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" {...rest} />
        <span className="h-5 w-9 rounded-full bg-border-strong transition-colors peer-checked:bg-[image:var(--grad-brand)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-60" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      {label}
    </label>
  );
}

/** Errors repeated at the top of a form on submit, each linking to its field. */
export function ErrorSummary({ title, errors }: { title: ReactNode; errors: { field: string; message: ReactNode }[] }) {
  if (!errors.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/25 bg-danger-bg p-3.5 text-sm font-medium text-danger-fg">
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 font-medium">
        {errors.map((e) => (
          <li key={e.field}>
            <a href={`#${e.field}`} className="underline underline-offset-2">
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
