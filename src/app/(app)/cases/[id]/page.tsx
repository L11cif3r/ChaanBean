import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { CaseResults } from "@/components/cases/case-results";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getCaseCheck } from "@/server/cases/service";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";

// S12 results: counters, ranked matches and the review buttons.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S12.title") };
}

export default function Page({ params }: PageProps<"/cases/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Results params={params} />
    </Suspense>
  );
}

async function Results({ params }: { params: PageProps<"/cases/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null; // OrgGate in the layout redirects
  const view = await getCaseCheck({ ...ctx, user: ctx.user, orgId: ctx.orgId }, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  return <CaseResults initial={view} canReview={can(ctx.role, "case.run")} />;
}
