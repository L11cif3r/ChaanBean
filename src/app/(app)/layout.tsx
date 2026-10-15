import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Wallet } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { AccountArea, OrgBadge, OrgGate } from "@/components/shell/signed-in";
import { ThemeToggle } from "@/components/shell/theme-switch";
import { Pill, Skeleton } from "@/components/ui";
import { NAV, screen } from "@/lib/screens";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations();

  const groups: NavGroup[] = NAV.map((g) => ({
    label: t(`nav.groups.${g.group}`),
    items: g.items.map((i) => ({
      href: screen(i.id).path,
      label: t(`nav.items.${i.key}`),
      subtitle: t(`nav.subtitles.${i.key}`),
      icon: i.key,
    })),
  }));

  // Plan, wallet and organisation come from the signed-in organisation in Parts 2 and 3.
  const topbar = (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <Pill href="/account/billing" className="hidden md:inline-flex">
          {t("topbar.noPlan")}
        </Pill>
        <Pill href="/account/billing" className="h-11 gap-2.5 border-2 pl-1.5 pr-3.5">
          <span className="flex items-center justify-center rounded-lg bg-primary p-1.5 text-white shadow-sm" aria-hidden="true">
            <Wallet size={16} strokeWidth={2.5} />
          </span>
          <span className="flex flex-col text-left leading-tight">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">{t("topbar.walletLabel")}</span>
            <span className="sr-only">{t("topbar.wallet", { amount: "₹0" })}</span>
            <span className="font-mono text-sm font-black tracking-tight text-primary-text" aria-hidden="true">
              ₹0
            </span>
          </span>
        </Pill>
      </div>
      <ThemeToggle />
      <Suspense fallback={<Skeleton className="h-9 w-9 rounded-full" />}>
        <AccountArea />
      </Suspense>
    </>
  );

  return (
    <AppShell
      groups={groups}
      start={
        <Suspense fallback={<Skeleton className="h-5 w-40" />}>
          <OrgBadge />
        </Suspense>
      }
      topbar={topbar}
      labels={{
        openMenu: t("nav.openMenu"),
        closeMenu: t("nav.closeMenu"),
        mainNavigation: t("nav.mainNavigation"),
        skipToContent: t("app.skipToContent"),
      }}
    >
      <Suspense fallback={<PageSkeleton />}>
        <OrgGate>{children}</OrgGate>
      </Suspense>
    </AppShell>
  );
}
