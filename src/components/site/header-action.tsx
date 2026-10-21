import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui";
import { getContext } from "@/server/context";

/** Landing page header: "Sign in" and "Get started" for visitors, "Open dashboard" when already signed in. */
export async function HeaderAction() {
  const [t, ctx] = await Promise.all([getTranslations("landing.nav"), getContext()]);
  if (ctx.user) return <Link href="/dashboard" className={buttonClass("primary", "sm")}>{t("dashboard")}</Link>;
  return (
    <>
      <span className="hidden sm:block">
        <Link href="/login" className={buttonClass("ghost", "sm")}>{t("signIn")}</Link>
      </span>
      <Link href="/login" className={buttonClass("primary", "sm")}>{t("start")}</Link>
    </>
  );
}
