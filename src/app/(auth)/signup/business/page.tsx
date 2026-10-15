import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BusinessWizard } from "./business-wizard";

// S02: verify the business behind a new account and create the organisation.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S02.title") };
}

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BusinessWizard />
    </div>
  );
}
