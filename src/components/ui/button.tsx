import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

// Buttons as on the redesigned branch. In the portal: solid #FC8019, rounded-xl, bold. On the site look (sign-in and
// public pages, inside .site): brand gradient with an orange glow, taller, and a small lift on hover.
const base =
  "inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap transition-[transform,box-shadow,border-color,color,background-color] duration-200 ease-[cubic-bezier(.22,1,.36,1)] disabled:cursor-not-allowed disabled:opacity-55 site:enabled:hover:-translate-y-0.5 site:[a&]:hover:-translate-y-0.5";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-hover site:bg-brand site:shadow-orange",
  secondary: "border border-border bg-surface text-text-2 shadow-sm hover:border-primary hover:text-primary-text",
  ghost: "text-primary-text hover:bg-primary-soft",
  danger: "bg-danger text-white shadow-sm hover:bg-danger-hover",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-xl px-4 text-xs site:h-10 site:text-sm",
  md: "h-11 rounded-xl px-5 text-sm site:h-12 site:rounded-[14px] site:px-[22px] site:text-[0.95rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/** Defaults to type="button" so a button inside a form never submits by accident. */
export function Button({ variant, size, loading, icon, className, children, disabled, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
