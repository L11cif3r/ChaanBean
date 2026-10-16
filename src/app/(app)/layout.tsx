import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { BillingPills } from "@/components/shell/billing-pills";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { AccountArea, OrgBadge, OrgGate } from "@/components/shell/signed-in";
import { ThemeToggle } from "@/components/shell/theme-switch";
import { Skeleton } from "@/components/ui";
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

  // Plan, wallet and organisation come from the signed-in organisation.
  const topbar = (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <Suspense fallback={<Skeleton className="h-11 w-32 rounded-full" />}>
          <BillingPills />
        </Suspense>
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
