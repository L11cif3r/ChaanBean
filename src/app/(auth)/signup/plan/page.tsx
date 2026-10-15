import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shell/placeholder";

// S03: built in Part 3 (docs/PARTS.md).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S03.title") };
}

export default function Page() {
  return <PlaceholderPage id="S03" showBack={false} />;
}
