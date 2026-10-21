import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

// Buttons (design v2): primary is the brand gradient with a warm glow, secondary a white button with a hairline
// border, ghost a quiet text button. Every button presses in slightly. Sign-in and sign-up (inside .site) use the
// taller size.
const base =
  "inline-flex cursor-pointer select-none items-center justify-center gap-2 font-semibold leading-none whitespace-nowrap transition-[transform,scale,box-shadow,border-color,color,background-color,filter] duration-150 ease-[cubic-bezier(.25,1,.5,1)] enabled:active:scale-[0.97] [a&]:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-orange enabled:hover:brightness-105 [a&]:hover:brightness-105",
  secondary: "border border-border bg-surface text-text shadow-sm hover:border-border-strong hover:bg-surface-muted",
  ghost: "text-muted hover:bg-hover hover:text-text",
  danger: "bg-danger text-white shadow-danger hover:bg-danger-hover",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-lg px-3 text-[13px] [&_svg]:size-4",
  md: "h-11 rounded-xl px-4 text-sm site:h-12 site:px-5 site:text-[0.95rem] [&_svg]:size-[18px]",
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
