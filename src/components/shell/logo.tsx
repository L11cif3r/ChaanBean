import Link from "next/link";
import { cn } from "@/components/ui/cn";

/** Text wordmark from the PRD wireframes ("Chaan" + amber "bean") until the brand logo arrives (PRD Q11). */
export function Logo({
  tone = "dark",
  href = "/dashboard",
  className,
}: {
  tone?: "dark" | "light";
  /** null renders the wordmark without a link (external pages, where the visitor is not signed in). */
  href?: string | null;
  className?: string;
}) {
  const cls = cn("inline-flex items-baseline text-xl font-extrabold tracking-tight", className);
  const mark = (
    <>
      <span className={tone === "light" ? "text-white" : "text-text"}>Chaan</span>
      <span className={tone === "light" ? "text-accent" : "text-[#b9771a]"}>bean</span>
    </>
  );
  if (href === null) return <span className={cls}>{mark}</span>;
  return (
    <Link href={href} className={cls} aria-label="Chaanbean home">
      {mark}
    </Link>
  );
}
