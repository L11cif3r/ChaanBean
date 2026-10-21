import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileSpreadsheet, History, Search } from "lucide-react";
import { cn } from "@/components/ui/cn";

// Credit Worthiness sections: one company, many companies from a file, and every past search.
const TABS = [
  { key: "new", href: "/checks/new", icon: Search },
  { key: "bulk", href: "/checks/bulk", icon: FileSpreadsheet },
  { key: "history", href: "/checks/history", icon: History },
] as const;

export async function CwTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  const t = await getTranslations("checks.tabs");
  return (
    <nav aria-label={t("label")} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-surface-strong p-0.5">
      {TABS.map(({ key, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[0.97]",
            active === key ? "bg-surface text-text shadow-control" : "text-muted hover:text-text",
          )}
        >
          <Icon size={14} aria-hidden="true" /> {t(key)}
        </Link>
      ))}
    </nav>
  );
}
