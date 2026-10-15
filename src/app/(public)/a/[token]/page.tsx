import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shell/placeholder";

// S15: built in Part 7 (docs/PARTS.md).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S15.title") };
}

export default function Page() {
  return <PlaceholderPage id="S15" showBack={false} />;
}
