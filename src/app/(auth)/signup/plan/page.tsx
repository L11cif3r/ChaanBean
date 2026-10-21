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
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="mx-auto max-w-2xl">
        <SignupSteps current={3} />
      </div>
      <h1 className="animate-rise text-center font-head text-[1.6rem] font-extrabold leading-tight tracking-[-0.03em] text-text sm:text-left sm:text-[1.9rem]">
        {t.rich("titleRich", { accent: (c) => <span className="text-gradient">{c}</span> })}
      </h1>
      <Suspense fallback={<PageSkeleton />}>
        <PlanPageContent searchParams={props.searchParams} returnTo="signup" />
      </Suspense>
    </div>
  );
}
