import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { AccountArea, OrgGate } from "@/components/shell/signed-in";
import { Pill, Skeleton } from "@/components/ui";
import { NAV, screen } from "@/lib/screens";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations();

  const groups: NavGroup[] = NAV.map((g) => ({
    label: t(`nav.groups.${g.group}`),
    items: g.items.map((i) => ({ href: screen(i.id).path, label: t(`nav.items.${i.key}`) })),
  }));

  // Plan, wallet and organisation come from the signed-in organisation in Parts 2 and 3.
  const topbar = (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <Pill href="/account/billing">{t("topbar.noPlan")}</Pill>
        <Pill href="/account/billing">{t("topbar.wallet", { amount: "₹0" })}</Pill>
      </div>
      <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
        <AccountArea />
      </Suspense>
    </>
  );

  return (
    <AppShell
      groups={groups}
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

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
