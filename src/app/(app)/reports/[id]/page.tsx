import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ReportView } from "@/components/checks/report-view";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { can } from "@/lib/permissions";
import { getReport } from "@/server/checks/service";
import { getContext } from "@/server/context";
import { AppError } from "@/server/errors";

// S11 (PRD v2.0 Figure 8): the credit report.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S11.title") };
}

export default function Page({ params }: PageProps<"/reports/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: { params: PageProps<"/reports/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.user || !ctx.orgId) return null; // OrgGate in the layout redirects
  const report = await getReport({ ...ctx, user: ctx.user, orgId: ctx.orgId }, id).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  return <ReportView initial={report} canRun={can(ctx.role, "check.run")} />;
}
