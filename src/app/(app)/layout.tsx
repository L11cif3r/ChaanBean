import { getTranslations } from "next-intl/server";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { Pill } from "@/components/ui";
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
      <span className="hidden truncate text-sm font-medium text-text md:inline">{t("topbar.organisation")}</span>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-on"
        aria-label={t("topbar.notSignedIn")}
        role="img"
      >
        ?
      </span>
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
      {children}
    </AppShell>
  );
}
