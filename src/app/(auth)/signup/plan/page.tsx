import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PlanPageContent } from "@/components/billing/plan-page";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { SignupSteps } from "@/components/shell/signup-steps";

// S03 at the end of sign-up: choose Plan A, Plan B or pay per use, and pay.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S03.title") };
}

export default async function Page(props: PageProps<"/signup/plan">) {
  const t = await getTranslations("billing.choose");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-text sm:text-2xl">{t("title")}</h1>
        <SignupSteps current={3} />
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <PlanPageContent searchParams={props.searchParams} returnTo="signup" />
      </Suspense>
    </div>
  );
}
