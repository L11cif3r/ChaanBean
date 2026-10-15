import Image from "next/image";
import Link from "next/link";
import { cn } from "@/components/ui/cn";

/** ChaanBean brand: the logo in a white tile, "Chaan" + orange "Bean" and the tagline (as on the redesigned site). */
export function Logo({
  tone = "dark",
  href = "/dashboard",
  tagline = true,
  className,
}: {
  /** "light" renders the wordmark in white, for use on the orange panel. */
  tone?: "dark" | "light";
  /** null renders the brand without a link (external pages, where the visitor is not signed in). */
  href?: string | null;
  tagline?: boolean;
  className?: string;
}) {
  const cls = cn("inline-flex shrink-0 items-center gap-2.5", className);
  const mark = (
    <>
      <span className="relative inline-flex h-[38px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <Image src="/brand/logo.png" alt="" width={36} height={28} className="h-7 w-9 object-contain" priority />
      </span>
      <span className="leading-none">
        <span className={cn("block text-[1.28rem] font-extrabold leading-[1.1] tracking-[-0.03em]", tone === "light" ? "text-white" : "text-text")}>
          Chaan
          <span className={tone === "light" ? "text-white" : "text-primary"}>Bean</span>
        </span>
        {tagline ? (
          <span
            className={cn("mt-0.5 block text-[0.64rem] font-bold uppercase tracking-[0.1em]", tone === "light" ? "text-white/80" : "text-subtle")}
          >
            Credit &amp; Recovery OS
          </span>
        ) : null}
      </span>
    </>
  );
  if (href === null) return <span className={cls}>{mark}</span>;
  return (
    <Link href={href} className={cls} aria-label="Chaanbean home">
      {mark}
    </Link>
  );
}
