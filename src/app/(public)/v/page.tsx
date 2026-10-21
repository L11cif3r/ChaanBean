import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VerifyDocument } from "@/components/verify/verify-document";

// S22 without a reference (linked from the landing page): the visitor types the reference printed on the document.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S22.title") };
}

export default function Page() {
  return <VerifyDocument initialReference="" />;
}
