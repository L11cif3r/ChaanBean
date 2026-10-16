import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PlanPageContent } from "@/components/billing/plan-page";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { PageHeader } from "@/components/ui";

// S03 from the account: buy a plan after starting on pay per use.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S03.title") };
}

export default async function Page(props: PageProps<"/account/plan/change">) {
  const t = await getTranslations("billing.choose");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <Suspense fallback={<PageSkeleton />}>
        <PlanPageContent searchParams={props.searchParams} returnTo="change" />
      </Suspense>
    </div>
  );
}
