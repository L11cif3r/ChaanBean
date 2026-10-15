import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shell/placeholder";

// S10: built in Part 8 (docs/PARTS.md).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S10.title") };
}

export default function Page() {
  return <PlaceholderPage id="S10" showBack={false} />;
}
