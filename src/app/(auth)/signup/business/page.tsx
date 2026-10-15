import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shell/placeholder";

// S02: built in Part 2 (docs/PARTS.md).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S02.title") };
}

export default function Page() {
  return <PlaceholderPage id="S02" showBack={false} />;
}
