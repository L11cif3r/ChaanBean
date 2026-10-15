import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shell/placeholder";
import { ButtonLink } from "@/components/ui";

// S03: built in Part 3 (docs/PARTS.md).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S03.title") };
}

export default async function Page() {
  const t = await getTranslations("signup");
  // Until Part 3 builds checkout, a new organisation continues straight to its dashboard.
  return (
    <PlaceholderPage
      id="S03"
      showBack={false}
      action={
        <ButtonLink href="/dashboard" size="sm">
          {t("continueToDashboard")}
        </ButtonLink>
      }
    />
  );
}
